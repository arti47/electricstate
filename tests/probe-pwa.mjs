// PWA probe: the app is installed on a phone that will lose signal, so the two things
// that must hold are that it boots with no network and that a new build actually replaces
// the old one. Neither is visible in source — a stale cache looks exactly like a working
// app until the day it is a month behind.
//
//   node tests/probe-pwa.mjs
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { serve, CHROMIUM, GAME_HELPERS, MID_SESSION, SETTINGS_ALL_ON } from "./fixtures.js";

const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: CHROMIUM });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addInitScript(GAME_HELPERS);
const page = await context.newPage();

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

const swSource = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const version = /CACHE_VERSION = "([^"]+)"/.exec(swSource)[1];
const shell = [...swSource.matchAll(/"\.\/([^"]+)"/g)].map((m) => m[1]);

await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
await page.evaluate(([state, settings]) => { window.__game.seed(state, settings); }, [MID_SESSION, SETTINGS_ALL_ON]);
await page.reload({ waitUntil: "networkidle" });

// Put the origin back to how a phone looks the moment before a new build lands: no worker
// yet, and a cache left behind by the previous version. Activation is supposed to delete
// that cache; if it does not, an installed app serves a mix of two builds and fails in
// ways nobody can debug from the outside.
const installed = await page.evaluate(async () => {
  for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
  for (const key of await caches.keys()) await caches.delete(key);
  const stale = await caches.open("es-stale-build");
  await stale.put("/stale", new Response("old"));

  // A distinct script URL is what makes this a real deployment rather than the same
  // registration handed back: same code, new registration, so install and activate both
  // run for real and the cleanup in activate is genuinely exercised.
  const reg = await navigator.serviceWorker.register("service-worker.js?build=probe");
  const deadline = Date.now() + 6000;
  const mine = () => reg.active && /build=probe/.test(reg.active.scriptURL) && reg.active.state === "activated";
  while (!mine() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  return { state: reg.active?.state || "none", script: reg.active?.scriptURL || "" };
});
check(/build=probe/.test(installed.script) && installed.state === "activated",
  `the new build never took over (${JSON.stringify(installed)})`);

// Give the fetch handler a moment to populate the runtime cache, then take the network away.
await page.waitForTimeout(400);

const caching = await page.evaluate(async ({ version }) => {
  const keys = await caches.keys();
  const cache = await caches.open(version);
  const held = (await cache.keys()).map((r) => new URL(r.url).pathname.replace(/^\//, ""));
  return { keys, held };
}, { version });

check(caching.keys.includes(version), `no cache named ${version}; found ${caching.keys.join(", ")}`);
check(!caching.keys.includes("es-stale-build"),
  `an older build's cache survived activation: ${caching.keys.join(", ")}`);

const notHeld = shell.filter((f) => f !== "./" && f !== "" && !caching.held.includes(f));
check(notHeld.length === 0, `declared in the shell but never cached: ${notHeld.join(", ")}`);

// Offline: the whole point of installing it.
await context.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(600);
const offlineHome = await page.textContent("#screen").catch(() => "");
check(/Traveler/i.test(offlineHome), `offline boot rendered nothing useful: "${offlineHome.slice(0, 80)}"`);
check(/Audit One/.test(offlineHome), "offline boot lost the saved Travelers");

// And it still routes offline, because a session does not stop at the home screen.
await page.evaluate(() => { location.hash = "#/dice"; });
await page.waitForTimeout(300);
check(/Dice/.test(await page.textContent("#screen").catch(() => "")), "routing broke offline");

await context.setOffline(false);
check(errors.length === 0, `console errors: ${errors.join(" | ")}`);

await browser.close();
close();

console.log(`cache ${version} · ${caching.held.length} files held · ${caching.keys.length} cache(s) present`);
if (!failures.length) { console.log("pwa probe: installs, cleans up after the last build, and boots with no network"); process.exit(0); }
failures.forEach((f) => console.log("FAIL  " + f));
console.log(`\n${failures.length} failure(s)`);
process.exit(1);
