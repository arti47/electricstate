// Onboarding probe: what the app tells someone who has never read the rulebook and has
// never played a solo RPG.
//
// The other probes measure whether a control is reachable. This one measures whether it is
// understandable: does every screen say what it is for, does every empty screen say what to
// do first, and does the app ever use a word from the book without ever explaining it.
//
//   node tests/probe-onboarding.mjs            report and fail on a gap
//   node tests/probe-onboarding.mjs --report   report only
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { serve, CHROMIUM, GAME_HELPERS, SEEDS, seedPage } from "./fixtures.js";

const REPORT_ONLY = process.argv.includes("--report");

const ROUTES = ["home", "dice", "rules", "solo", "gm", "settings", "log", "create", "journey",
  "tension", "time", "neuro", "combat", "hazards", "driving", "tutorial", "play"];

/**
 * Words the book uses that mean nothing to a new player. Each must be explained somewhere
 * the app can reach — the rules library, the tutorial, or in place on the screen that uses it.
 */
const JARGON = [
  "Traveler", "Journey", "Stop", "Blocker", "Countdown", "Tilt", "Kicker",
  "Bliss", "Hope", "Tension", "Neurocaster", "Neuroscape", "Neurine",
  "Push", "Pushing", "Archetype", "Talent", "Attribute", "Gear dice", "Base dice",
  "Stretch", "Shift", "Threat", "Dream", "Flaw", "Incapacitated", "Breakdown",
  "Avatar", "Drone", "Hull", "Zone", "Engaged"
];

const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(GAME_HELPERS);

const rows = [];
const gaps = [];

// ---- 1. every screen, cold: does it introduce itself and say what to do first?
for (const route of ROUTES) {
  await seedPage(page, base, SEEDS.fresh, route);
  const m = await page.evaluate(() => {
    const screen = document.getElementById("screen");
    const text = screen.textContent.replace(/\s+/g, " ").trim();
    const explain = screen.querySelector("details.explain");
    // Anything a finger can usefully land on counts as a way on: a button, a link, an
    // accordion you can open, a search box. A closed accordion's own summary is the way
    // into it, so only an ancestor being closed hides a control.
    const hidden = (n) => (n.tagName === "SUMMARY" ? n.parentElement.parentElement : n)
      ?.closest("details:not([open])");
    const actions = [...screen.querySelectorAll("button, a.btn, details > summary, input")]
      .filter((b) => !hidden(b) && b.getBoundingClientRect().height > 0);
    return {
      heading: screen.querySelector("h1")?.textContent.trim() || "",
      explain: explain ? explain.textContent.replace(/^What this does/, "").trim() : "",
      // An empty screen must not be a blank page with a title: it needs a sentence and a way on.
      emptyState: !!screen.querySelector(".empty"),
      words: text.split(" ").length,
      actionCount: actions.length,
      actions: actions.map((b) => b.textContent.trim()).filter(Boolean).slice(0, 6)
    };
  });
  rows.push({ route, ...m });

  // The tutorial and the wizard are themselves the explanation; everything else owes one.
  if (!m.explain && route !== "tutorial") {
    gaps.push(`${route}: no "what this does" note — a cold player has nothing to read`);
  }
  if (!m.actionCount) gaps.push(`${route}: nothing to press and nothing to go on to`);
}

// ---- 2. jargon: every book word the app shows must be explained somewhere reachable
const rulesText = await (async () => {
  await seedPage(page, base, SEEDS.fresh, "rules");
  return page.evaluate(() => {
    document.querySelectorAll("#screen details").forEach((d) => d.setAttribute("open", ""));
    return document.getElementById("screen").textContent;
  });
})();
const tutorialText = await (async () => {
  await seedPage(page, base, SEEDS.fresh, "tutorial");
  return page.evaluate(() => {
    document.querySelectorAll("#screen details").forEach((d) => d.setAttribute("open", ""));
    return document.getElementById("screen").textContent;
  });
})();

const explained = (term) => {
  // "Base dice" and "Base die" are the same word to a reader, so match the stem.
  const stem = term.replace(/ /g, "\\s+").replace(/(die|dice)$/i, "di(e|ce)");
  const re = new RegExp(`\\b${stem}`, "i");
  return { rules: re.test(rulesText), tutorial: re.test(tutorialText) };
};
const jargonRows = JARGON.map((term) => ({ term, ...explained(term) }));
for (const j of jargonRows) {
  if (!j.rules && !j.tutorial) gaps.push(`jargon "${j.term}" appears nowhere in the rules library or the tutorial`);
}

// ---- 3. the cold path: install to first roll, with nothing read
await seedPage(page, base, SEEDS.fresh, "home");
const coldPath = await page.evaluate(() => {
  const screen = document.getElementById("screen");
  const text = screen.textContent;
  return {
    namesTheFirstStep: /New Traveler|Create a Traveler/i.test(text),
    offersTheTutorial: !!screen.querySelector('a[href="#/tutorial"]'),
    explainsWhatThisIs: text.length > 120
  };
});
if (!coldPath.namesTheFirstStep) gaps.push("home (empty): does not name the first thing to do");
if (!coldPath.offersTheTutorial) gaps.push("home (empty): does not offer the tutorial to someone who has never played");
if (!coldPath.explainsWhatThisIs) gaps.push("home (empty): does not say what the app is");

// The session guide must say how to start, how to keep going, and how to stop.
await seedPage(page, base, SEEDS.mid, "play");
const guide = await page.evaluate(() => {
  document.querySelectorAll("#screen details").forEach((d) => d.setAttribute("open", ""));
  const t = document.getElementById("screen").textContent;
  return {
    starting: /Getting started/.test(t),
    sustaining: /Keeping it going/.test(t),
    ending: /Stopping well/.test(t),
    saysWhereYouAre: !!document.querySelector("#screen .whatnow"),
    stuck: /going badly/i.test(t)
  };
});
for (const [key, label] of [["starting", "how to start"], ["sustaining", "how to keep going"],
                            ["ending", "how to stop"], ["saysWhereYouAre", "where the group is right now"],
                            ["stuck", "what to do when a session stalls"]]) {
  if (!guide[key]) gaps.push(`the session guide does not cover ${label}`);
}

// ---- 4. the first five minutes, with nothing read and nothing decided
const firstMinutes = [];
const tap = async (selector, label) => {
  try { await page.click(selector, { timeout: 3000 }); await page.waitForTimeout(180); return true; }
  catch { firstMinutes.push(`could not ${label} (${selector})`); return false; }
};

// The tutorial is one tap from a cold start.
await seedPage(page, base, SEEDS.fresh, "home");
if (await tap('#screen a[href="#/tutorial"]', "reach the tutorial from the home screen")) {
  const tut = await page.textContent("#screen");
  if (!/First session/.test(tut)) firstMinutes.push("the first-time link does not land on the tutorial");
}

// A ready-made Traveler, without deciding anything: Travelers, New Traveler, pregen, pick.
await seedPage(page, base, SEEDS.fresh, "home");
let taps = 0;
if (await tap('#screen a[href="#/create"]', "start creation")) taps++;
if (await tap('#screen button:has-text("ready-made")', "open the ready-made Travelers")) taps++;
if (await tap('.modal .btn-row button', "take one")) taps++;
const madeOne = await page.evaluate(() => __game.characters().length);
if (!madeOne) firstMinutes.push("a ready-made Traveler cannot be taken without making decisions");
else if (taps > 3) firstMinutes.push(`a ready-made Traveler took ${taps} taps`);

// And that Traveler can roll immediately, with nothing configured.
if (madeOne) {
  await page.evaluate(() => { location.hash = "#/dice"; });
  await page.waitForTimeout(200);
  if (await tap("#screen .actionbar button", "roll straight away")) {
    const result = await page.textContent("#screen");
    if (!/success|did not work|It works/.test(result)) firstMinutes.push("the roll result does not say what happened");
  }
}
gaps.push(...firstMinutes.map((f) => `first five minutes: ${f}`));

await browser.close();
close();

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(pad("route", 12) + pad("words", 7) + pad("explains", 10) + "first actions");
for (const r of rows) {
  console.log(pad(r.route, 12) + pad(r.words, 7) + pad(r.explain ? "yes" : "NO", 10) + r.actions.join(" · ").slice(0, 70));
}
console.log("\njargon                 rules  tutorial");
for (const j of jargonRows) {
  console.log(pad(j.term, 23) + pad(j.rules ? "yes" : "—", 7) + (j.tutorial ? "yes" : "—"));
}

if (!gaps.length) { console.log("\nonboarding probe: every screen introduces itself and every book word is explained"); process.exit(0); }
console.log("");
gaps.forEach((g) => console.log("GAP   " + g));
console.log(`\n${gaps.length} gap(s)`);
process.exit(REPORT_ONLY ? 0 : 1);
