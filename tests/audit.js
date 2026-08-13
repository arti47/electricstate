// Exhaustive button audit: click every control on every screen in isolation and report
// anything that errors or does nothing at all.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const p = normalize(decodeURIComponent(req.url.split("?")[0]));
    const f = join(ROOT, p === "/" ? "index.html" : p);
    if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end("not found"); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

const SEED = {
  characters: {
    a1: {
      id: "a1", name: "Audit One", archetype: "veteran",
      attributes: { strength: 4, agility: 4, wits: 3, empathy: 3 },
      talents: ["hardened", "medic"], conditions: [], tension: { a2: 1 },
      inventory: { items: [{ name: "Handgun", bonus: 2, maxBonus: 2 }], cash: 200 },
      neurocaster: "stimulusTleStandard", dream: "d", flaw: "f", goal: "g", threat: "t",
      state: { health: 4, hope: 3, bliss: 1, permanentBliss: 0 }
    },
    a2: {
      id: "a2", name: "Audit Two", archetype: "doctor",
      attributes: { strength: 3, agility: 3, wits: 4, empathy: 5 },
      talents: ["surgeon"], conditions: [], tension: { a1: 2 },
      inventory: { items: [], cash: 50 },
      neurocaster: "stimulusGo", dream: "d", flaw: "f", goal: "g", threat: "t",
      state: { health: 3, hope: 5, bliss: 0, permanentBliss: 0 }
    }
  },
  journey: {
    destination: "a drone boneyard — the parts are there", start: "a trailer park",
    vehicle: { id: "car2wd", name: "2WD Car", label: "2WD Car", passengers: 4, maneuverability: 2, speed: 3, hull: 6, armor: 4, traits: [{ id: "fast", name: "Fast" }] },
    fuel: 10, sharedItems: [{ roll: 15, name: "First aid kit" }], shift: "Morning", day: 1
  },
  rollLog: [], schema: 1
};

const ROUTES = ["home", "dice", "rules", "tutorial", "solo", "gm", "settings", "log", "create", "journey", "tension", "time", "neuro", "combat", "hazards", "driving", "sheet/a1", "injury/a1"];

const findings = [];

let loaded = false;
async function fresh(page, route) {
  if (!loaded) {
    await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
    loaded = true;
  }
  await page.evaluate(({ seed, route }) => {
    localStorage.setItem("electricState.v1", JSON.stringify(seed));
    localStorage.setItem("electricState.v1.settings", JSON.stringify({ solo: true, gmScreen: true, manualDice: false, theme: "dark" }));
    document.querySelectorAll(".modal-backdrop").forEach((m) => m.remove());
    document.body.style.removeProperty("overflow");
    location.hash = "#/__reset";
    location.hash = `#/${route}`;
  }, { seed: SEED, route });
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
const errors = [];
page.on("pageerror", (e) => errors.push(`${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

for (const route of ROUTES) {
  await fresh(page, route);
  const count = await page.locator("#screen button:visible").count();

  for (let i = 0; i < count; i++) {
    await fresh(page, route);
    const button = page.locator("#screen button:visible").nth(i);
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
server.close();

if (!findings.length) { console.log("button audit: every control on every screen responds"); process.exit(0); }
for (const f of findings) console.log(`${f.kind.toUpperCase().padEnd(12)} ${f.route.padEnd(12)} ${f.label.padEnd(34)} ${f.detail}`);
console.log(`\n${findings.length} finding(s)`);
process.exit(1);
