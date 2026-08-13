// Flow probe: how many taps a table actually needs for the things it does every session.
//
// Reading the code tells you a path exists. It does not tell you the path is four taps
// with two of them below the fold. Each journey below is the shortest route a player can
// take from a cold start, counted in taps, and asserted to still arrive.
//
//   node tests/probe-flow.mjs            report and fail if a journey breaks or bloats
//   node tests/probe-flow.mjs --report   report only
import { chromium } from "playwright-core";
import { serve, CHROMIUM, GAME_HELPERS, MID_SESSION, seedPage } from "./fixtures.js";

const REPORT_ONLY = process.argv.includes("--report");

/**
 * Each journey is a list of taps from the home screen and one assertion about where it
 * lands. `budget` is the tap count the surface is allowed — raise it deliberately, never
 * by accident. Taps are Playwright selectors; `wait` is a settle after the tap.
 */
const JOURNEYS = [
  {
    name: "roll dice for a Traveler",
    budget: 2,
    taps: ['.tabbar [data-tab="dice"]', '#screen .actionbar button'],
    arrive: async (page) => /success|Failure/.test(await page.textContent("#screen"))
  },
  {
    name: "open a Traveler's sheet",
    budget: 1,
    taps: ["#screen .list a"],
    arrive: async (page) => /Attributes/.test(await page.textContent("#screen"))
  },
  {
    name: "damage a Traveler",
    budget: 2,
    taps: ["#screen .list a", '#screen button:has-text("Take damage")'],
    arrive: async (page) => !!(await page.$(".modal"))
  },
  {
    name: "switch which Traveler the header is about",
    budget: 2,
    taps: ["#screen .list a", "#vitals .vital-switch"],
    arrive: async (page) => (await page.$$(".modal .list button")).length >= 2
  },
  {
    name: "end a Shift",
    budget: 2,
    taps: ['#screen .subnav-item[href="#/time"]', '#screen .actionbar button:has-text("Shift")'],
    arrive: async (page) => !!(await page.$(".modal"))
  },
  {
    name: "start a fight",
    budget: 3,
    taps: ['.tabbar [data-tab="dice"]', '#screen .subnav-item[href="#/combat"]', '#screen button:has-text("Start combat")'],
    arrive: async (page) => /Round 1/.test(await page.textContent("#screen"))
  },
  {
    name: "put a Threat in front of the party",
    budget: 4,
    taps: ['.tabbar [data-tab="dice"]', '#screen .subnav-item[href="#/combat"]',
           '#screen button:has-text("Start combat")', '#screen button:has-text("Add threat")'],
    arrive: async (page) => !!(await page.$(".modal"))
  },
  {
    name: "look up a rule",
    budget: 2,
    taps: ['.tabbar [data-tab="rules"]', "#screen details.rule-group >> nth=0 >> summary"],
    arrive: async (page) => (await page.$$("#screen details.rule-group[open]")).length === 1
  },
  {
    name: "read the roll log",
    budget: 2,
    taps: ['.tabbar [data-tab="dice"]', '#screen .subnav-item[href="#/log"]'],
    arrive: async (page) => /Roll log|No rolls/.test(await page.textContent("#screen"))
  },
  {
    name: "draw the next solo card",
    budget: 2,
    taps: ['.tabbar [data-tab="solo"]', '#screen button:has-text("Draw a card")'],
    arrive: async (page) => !!(await page.$(".modal"))
  }
];

const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(GAME_HELPERS);

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

const rows = [];
const failures = [];

for (const journey of JOURNEYS) {
  await seedPage(page, base, MID_SESSION, "home");
  const before = errors.length;
  let taps = 0;
  let broke = null;

  for (const selector of journey.taps) {
    try {
      await page.click(selector, { timeout: 3000 });
      taps += 1;
      await page.waitForTimeout(160);
    } catch (err) {
      broke = `tap ${taps + 1} (${selector}) never became clickable`;
      break;
    }
  }

  let arrived = false;
  if (!broke) { try { arrived = await journey.arrive(page); } catch (err) { arrived = false; } }
  const raised = errors.slice(before);

  rows.push({ name: journey.name, taps, budget: journey.budget, arrived, broke });
  if (broke) failures.push(`${journey.name}: ${broke}`);
  else if (!arrived) failures.push(`${journey.name}: ${taps} taps and it did not arrive`);
  else if (taps > journey.budget) failures.push(`${journey.name}: ${taps} taps, budget ${journey.budget}`);
  if (raised.length) failures.push(`${journey.name}: console error — ${raised[0].slice(0, 120)}`);

  await page.keyboard.press("Escape").catch(() => {});
}

await browser.close();
close();

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(pad("journey", 46) + pad("taps", 6) + pad("budget", 8) + "arrived");
for (const r of rows) {
  console.log(pad(r.name, 46) + pad(r.taps, 6) + pad(r.budget, 8) + (r.broke ? `broke: ${r.broke}` : r.arrived ? "yes" : "NO"));
}

if (!failures.length) { console.log("\nflow probe: every session journey arrives inside its tap budget"); process.exit(0); }
console.log("");
failures.forEach((f) => console.log("FAIL  " + f));
console.log(`\n${failures.length} failure(s)`);
process.exit(REPORT_ONLY ? 0 : 1);
