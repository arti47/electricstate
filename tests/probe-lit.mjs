// Every screen that does something says what to press: exactly one lit (primary) button,
// or at most two where the screen genuinely holds two separate jobs. Zero lit buttons is a
// screen a newcomer stands in front of without knowing where to start; three or more is
// one where the accent has stopped meaning anything.
//
// Reference screens (Rules, the tutorial, the procedure, Settings) are read, not operated,
// and the empty home screen leads with its mode tiles, so they are excused by name.
import { chromium } from "playwright-core";
import { serve, GAME_HELPERS, CHROMIUM, SEEDS, seedPage } from "./fixtures.js";

const ROUTES = ["home", "session", "solo", "gm", "journey", "time", "tension", "sheet/a1", "injury/a1",
  "dice", "combat", "neuro", "hazards", "driving", "log", "create"];
const EXCUSED = (seed, route) =>
  (seed === "fresh" && route === "home")      // the mode tiles lead
  || route === "create"                       // Next waits on a choice, and names it
  || (seed !== "fresh" && route === "log");   // a full log is a record to read

const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(GAME_HELPERS);
await ctx.addInitScript(() => sessionStorage.setItem("es.splashed", "1"));
const page = await ctx.newPage();
const failures = [];
for (const seed of ["fresh", "mid", "stress"]) {
  for (const route of ROUTES) {
    if (EXCUSED(seed, route.split("/")[0])) continue;
    await seedPage(page, base, SEEDS[seed], route);
    await page.waitForTimeout(150);
    const lit = await page.evaluate(() => [...document.querySelectorAll("#screen .btn-primary, .actionbar .btn-primary")]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.disabled; })
      .map((e) => e.textContent.trim().slice(0, 32)));
    if (lit.length === 0) failures.push(`${seed} #/${route}: nothing lit to press`);
    if (lit.length > 2) failures.push(`${seed} #/${route}: ${lit.length} lit buttons (${lit.join(" | ")})`);
  }
}
await browser.close();
close();
if (failures.length) {
  console.error("lit-button probe FAILED\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("lit-button probe: every working screen has one clear thing to press");
