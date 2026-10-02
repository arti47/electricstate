// The "never read the manual" probe. A cold start, no seed, no settings — and a player who
// only ever presses the lit button (the one primary action on screen, the first choice in
// a dialog, the Roll in the dice tray, Done once the dice have landed). Nothing else.
//
// Every dead end it found was a real one: a greyed Next with no reason, a Journey whose
// only lit button left it unfinished, a Tension screen with nothing to press, a scene that
// offered the same Roll forever, a fight with nobody on the other side. So the probe fails
// on any screen with no lit button, on any page error, and on not reaching every act of a
// session — creation, the Journey, Tension, a scene, the Countdown, a fight with a hit
// applied — inside its press budget.
import { chromium } from "playwright-core";
import { serve, CHROMIUM } from "./fixtures.js";

const BUDGET = 140;
const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => sessionStorage.setItem("es.splashed", "1"));
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base + "/#/home");
await page.waitForTimeout(400);

const reached = new Set();
const trail = [];
let deadEnd = null;
for (let i = 0; i < BUDGET; i++) {
  const step = await page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.disabled; };
    const mark = (e, label) => { e.setAttribute("data-novice", "1"); return label; };
    const tray = document.querySelector("#tray:not([hidden])");
    const dialog = document.querySelector(".modal-backdrop:last-of-type .modal");
    const j = (() => { try { const d = JSON.parse(localStorage.getItem("electricState.v1")); return d.campaigns[d.activeCampaignId]; } catch { return null; } })();
    const facts = {
      hash: location.hash,
      travelers: Object.keys(j?.characters || {}).length,
      destination: !!j?.journey?.destination,
      tension: Object.values(j?.characters || {}).some((c) => Object.values(c.tension || {}).some((v) => v > 0)),
      scene: j?.journey?.director?.beat === "scene",
      pressure: (j?.journey?.stops || []).some((s) => (s.countdownProgress || 0) > 0),
      fight: (j?.journey?.combat?.combatants || []).some((x) => x.side !== "travelers"),
      hit: (j?.rollLog || []).some((r) => r.label === "Damage")
    };
    let pressed = null;
    if (dialog) {
      const b = [...dialog.querySelectorAll(".btn-primary, button")].filter(vis)[0];
      if (b) pressed = mark(b, b.textContent.trim());
    } else if (tray && tray.getBoundingClientRect().height > 0) {
      const hit = [...tray.querySelectorAll(".btn-primary")].find((b) => vis(b) && /Apply damage/.test(b.textContent));
      const roll = [...tray.querySelectorAll(".actionbar .btn-primary")].filter(vis)[0];
      const b = hit || (tray.querySelector(".result-head") ? tray.querySelector(".tray-close") : roll);
      if (b) pressed = mark(b, b.textContent.trim());
    } else {
      const b = [...document.querySelectorAll(".mode-tile")].filter(vis)[0]
        || [...document.querySelectorAll("#screen .btn-primary, .actionbar .btn-primary")].filter(vis)[0]
        // The one sanctioned non-lit press: the ready-made Traveler, the advertised way in.
        || [...document.querySelectorAll("#screen button")].find((x) => vis(x) && /ready-made/.test(x.textContent));
      if (b) pressed = mark(b, b.textContent.trim());
    }
    return { facts, pressed };
  });
  for (const [k, v] of Object.entries(step.facts)) if (v === true) reached.add(k);
  if (step.facts.travelers) reached.add("travelers");
  trail.push(`${step.facts.hash} → ${step.pressed}`);
  if (!step.pressed) { deadEnd = step.facts.hash; break; }
  if (["destination", "tension", "scene", "pressure", "fight", "hit"].every((k) => reached.has(k))) break;
  await page.click('[data-novice="1"]', { timeout: 3000 }).catch(() => {});
  await page.evaluate(() => document.querySelectorAll("[data-novice]").forEach((e) => e.removeAttribute("data-novice")));
  await page.waitForTimeout(200);
}
await browser.close();
close();

const failures = [];
if (errors.length) failures.push(`page errors: ${errors.join(" | ")}`);
if (deadEnd) failures.push(`dead end at ${deadEnd}: nothing lit to press`);
for (const k of ["travelers", "destination", "tension", "scene", "pressure", "fight", "hit"]) {
  if (!reached.has(k)) failures.push(`never reached: ${k}`);
}
if (failures.length) {
  console.error("novice probe FAILED\n  " + failures.join("\n  ") + "\n  last presses:\n    " + trail.slice(-12).join("\n    "));
  process.exit(1);
}
console.log(`novice probe: pressing only the lit button reaches a whole session in ${trail.length} presses`);
