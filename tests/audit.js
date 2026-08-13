// Exhaustive button audit: click every control on every screen in isolation and report
// anything that errors or does nothing at all.
import { chromium } from "playwright-core";
import { serve, CHROMIUM, GAME_HELPERS, SETTINGS_ALL_ON, MID_SESSION } from "./fixtures.js";

const { base, close: closeServer } = await serve();
const browser = await chromium.launch({ executablePath: CHROMIUM });

const SEED = MID_SESSION;

const ROUTES = ["home", "dice", "rules", "tutorial", "solo", "gm", "settings", "log", "create", "journey", "tension", "time", "neuro", "combat", "hazards", "driving", "sheet/a1", "injury/a1"];

const findings = [];

let loaded = false;
async function fresh(page, route) {
  if (!loaded) {
    await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
    loaded = true;
  }
  await page.evaluate(({ seed, settings, route }) => {
    __game.seed(seed, settings);
    document.querySelectorAll(".modal-backdrop").forEach((m) => m.remove());
    document.body.style.removeProperty("overflow");
    location.hash = "#/__reset";
    location.hash = `#/${route}`;
  }, { seed: SEED, settings: SETTINGS_ALL_ON, route });
  await page.waitForTimeout(90);
}

const snapshot = (page) => page.evaluate(() => ({
  screen: document.getElementById("screen").innerHTML.length,
  text: document.getElementById("screen").textContent.slice(0, 4000),
  hash: location.hash,
  modal: !!document.querySelector(".modal-backdrop"),
  toast: document.querySelectorAll(".toast").length,
  store: localStorage.getItem("electricState.v1") || "",
  settings: localStorage.getItem("electricState.v1.settings") || ""
}));

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(GAME_HELPERS);
const errors = [];
page.on("pageerror", (e) => errors.push(`${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

for (const route of ROUTES) {
  await fresh(page, route);
  const count = await page.locator("#screen button:visible:not([disabled])").count();

  for (let i = 0; i < count; i++) {
    await fresh(page, route);
    const button = page.locator("#screen button:visible:not([disabled])").nth(i);
    let label = "";
    try { label = ((await button.textContent()) || (await button.getAttribute("aria-label")) || "").trim().slice(0, 40); }
    catch { continue; }
    if (!label) label = `button ${i}`;

    const before = await snapshot(page);
    const errorsBefore = errors.length;
    try {
      await button.click({ timeout: 2500 });
    } catch (err) {
      findings.push({ route, label, kind: "unclickable", detail: err.message.split("\n")[0] });
      continue;
    }
    // Poll rather than trusting one fixed wait: a handler that opens a modal can lose a
    // race with a slow machine and read as a no-op that reproduces nowhere.
    const differs = (a, b) => a.screen !== b.screen || a.text !== b.text || a.hash !== b.hash ||
      b.modal || b.toast > a.toast || a.store !== b.store || a.settings !== b.settings;
    let after = await snapshot(page);
    for (let waited = 0; waited < 1500 && !differs(before, after); waited += 150) {
      await page.waitForTimeout(150);
      after = await snapshot(page);
    }

    const newErrors = errors.slice(errorsBefore);
    if (newErrors.length) findings.push({ route, label, kind: "error", detail: newErrors.join(" | ").slice(0, 200) });

    const changed = differs(before, after);
    // Import JSON opens a native file picker, which is invisible to the page.
    const opensFilePicker = label === "Import JSON";
    if (!changed && !opensFilePicker) {
      findings.push({ route, label, kind: "no-op", detail: "nothing changed: no render, no modal, no toast, no state write, no navigation" });
    }

    // close any modal so the next iteration starts clean
    if (after.modal) await page.keyboard.press("Escape").catch(() => {});
  }
}

await browser.close();
closeServer();

if (!findings.length) { console.log("button audit: every control on every screen responds"); process.exit(0); }
for (const f of findings) console.log(`${f.kind.toUpperCase().padEnd(12)} ${f.route.padEnd(12)} ${f.label.padEnd(34)} ${f.detail}`);
console.log(`\n${findings.length} finding(s)`);
process.exit(1);
