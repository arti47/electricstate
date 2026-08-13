// Browser smoke test: boot the app, walk every tab, assert zero console errors
// and zero horizontal overflow at phone widths.
import { chromium } from "playwright-core";
import { serve, CHROMIUM, GAME_HELPERS } from "./fixtures.js";

const { base, close } = await serve();
const server = { close };

const browser = await chromium.launch({ executablePath: CHROMIUM });
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  // The store's shape is the store's business; tests go through one seam.
  await page.addInitScript(GAME_HELPERS);
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  // enable the gated tabs so every route renders
  await page.evaluate(() => {
    localStorage.setItem("electricState.v1.settings", JSON.stringify({ solo: true, gmScreen: true, theme: "dark" }));
  });
  await page.reload({ waitUntil: "networkidle" });

  for (const route of ["home", "dice", "rules", "solo", "gm", "settings", "log", "create", "journey", "tension", "time", "neuro", "combat", "tutorial", "sheet"]) {
    await page.evaluate((r) => { location.hash = `#/${r}`; }, route);
    await page.waitForTimeout(60);
    const heading = await page.textContent("#screen h1").catch(() => null);
    check(heading && heading.trim().length > 0, `${viewport.width}px: route ${route} rendered no heading`);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check(!overflow, `${viewport.width}px: route ${route} overflows horizontally`);
    // A nullish value handed to a bare node.append() stringifies onto the page as its
    // own text node, so look for that exactly rather than for a substring in the copy.
    const stray = await page.evaluate(() => {
      const walk = document.createTreeWalker(document.getElementById("screen"), NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (["null", "undefined", "NaN", "[object Object]"].includes(n.textContent.trim())) return n.textContent.trim();
      }
      return null;
    });
    check(!stray, `route ${route} rendered a stray "${stray}"`);
  }

  // nothing at the foot of a screen may sit under the fixed tab bar
  for (const route of ["create", "home", "settings", "rules", "dice", "time"]) {
    await page.evaluate((r) => { location.hash = `#/${r}`; }, route);
    await page.waitForTimeout(80);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(80);
    const clearance = await page.evaluate(() => {
      const nav = document.querySelector(".tabbar").getBoundingClientRect();
      // Controls inside a collapsed panel keep their last layout position in Chromium,
      // so they read as buried under the nav while being unreachable. Skip them.
      const controls = [...document.querySelectorAll("#screen .btn, #screen button, #screen input, #screen select")]
        .filter((c) => !c.closest("details:not([open])"));
      const worst = controls.reduce((acc, c) => {
        const r = c.getBoundingClientRect();
        if (r.height === 0) return acc;
        return Math.min(acc, nav.top - r.bottom);
      }, Infinity);
      return { worst, controls: controls.length };
    });
    if (clearance.controls) {
      check(clearance.worst >= 0, `${route} at ${viewport.width}px: a control is ${Math.abs(Math.round(clearance.worst))}px under the tab bar`);
    }
  }

  // section nav reaches the routes that hang off a tab, and marks where you are
  await page.evaluate(() => { location.hash = "#/dice"; });
  await page.waitForTimeout(80);
  const diceNav = await page.evaluate(() => ({
    items: [...document.querySelectorAll("#screen .subnav-item")].map((a) => a.getAttribute("href")),
    here: document.querySelector("#screen .subnav-item.is-here")?.getAttribute("href")
  }));
  for (const href of ["#/combat", "#/neuro", "#/hazards", "#/driving", "#/log"]) {
    check(diceNav.items.includes(href), `section nav does not reach ${href}`);
  }
  check(diceNav.here === "#/dice", `section nav marks ${diceNav.here} as current, expected #/dice`);

  // A running fight is state you need from anywhere, so the nav says so
  const noBadge = await page.evaluate(() => !document.querySelector("#screen .subnav-badge"));
  check(noBadge, "combat badge shows with no fight running");
  await page.evaluate(() => {
    __game.edit((g) => {
      g.journey = { ...(g.journey || {}), combat: { active: true, round: 3, startingSide: "travelers", combatants: [] } };
    });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/dice"; });
  await page.waitForTimeout(100);
  const badge = await page.textContent("#screen .subnav-badge").catch(() => null);
  check(badge === "R3", `combat badge showed "${badge}", expected R3`);
  await page.evaluate(() => { __game.edit((g) => { g.journey.combat = null; }); });
  await page.reload({ waitUntil: "networkidle" });
  await page.click('#screen .subnav-item[href="#/combat"]');
  await page.waitForTimeout(80);
  check(await page.evaluate(() => location.hash) === "#/combat", "section nav did not navigate");
  // the wizard is somewhere you go into, not a sibling to flick between
  await page.evaluate(() => { location.hash = "#/create"; });
  await page.waitForTimeout(80);
  check(await page.evaluate(() => !document.querySelector("#screen .subnav")), "the wizard should not carry section nav");

  // rules page is an accordion, collapsed by default, and every panel carries an explainer
  await page.evaluate(() => { location.hash = "#/rules"; });
  await page.waitForTimeout(80);
  const rulesState = await page.evaluate(() => ({
    groups: document.querySelectorAll("#screen details.rule-group").length,
    openGroups: document.querySelectorAll("#screen details.rule-group[open]").length,
    entries: document.querySelectorAll("#screen details.rule-entry").length
  }));
  check(rulesState.groups >= 8, `rules page has ${rulesState.groups} groups, expected grouping`);
  check(rulesState.openGroups === 0, "rules groups should start collapsed");
  check(rulesState.entries === 38, `rules page shows ${rulesState.entries} entries, expected all 38`);

  const explainers = await page.evaluate(() => document.querySelectorAll("#screen details.explain").length);
  check(explainers >= 1, "rules page has no what-this-does note");
  const explainerOpen = await page.evaluate(() => document.querySelectorAll("#screen details.explain[open]").length);
  check(explainerOpen === 0, "what-this-does notes must start collapsed");

  // tutorial exists and covers solo
  await page.evaluate(() => { location.hash = "#/tutorial"; });
  await page.waitForTimeout(80);
  const tut = await page.textContent("#screen");
  check(/First session/.test(tut), "tutorial did not render");
  check(/Playing alone/.test(tut), "tutorial does not cover solo play");
  check(await page.evaluate(() => document.querySelectorAll("#screen details.step").length) >= 10,
    "tutorial should have both the table steps and the solo steps");

  // rules search filters
  await page.evaluate(() => { location.hash = "#/rules"; });
  await page.waitForTimeout(60);
  await page.fill('input[type="search"]', "bliss");
  await page.waitForTimeout(60);
  const found = await page.evaluate(() => ({
    entries: document.querySelectorAll("#screen details.rule-entry").length,
    open: document.querySelectorAll("#screen details.rule-entry[open]").length
  }));
  check(found.entries > 0 && found.entries < 38, `rules search did not filter (got ${found.entries})`);
  check(found.open === found.entries, "search results should open automatically");

  // theme toggle switches the document attribute
  await page.click("#themeToggle");
  const themed = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  check(themed !== null, "theme toggle did not set data-theme");

  // walk the creation wizard end to end and assert the character persists
  await page.evaluate(() => { __game.reset(); location.hash = "#/create"; });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/create"; });
  await page.waitForTimeout(80);

  await page.click("#screen .list button");                       // first archetype
  await page.click('#screen button:has-text("Next")');
  await page.click('#screen button:has-text("Roll four dice")');
  for (let i = 0; i < 4; i++) {
    const sel = page.locator("#screen select").nth(i);
    await sel.selectOption({ index: 1 });
  }
  await page.click('#screen button:has-text("Next")');
  const allowance = await page.evaluate(() =>
    document.querySelector("#screen p.muted")?.textContent.match(/Choose (\d)/)?.[1]);
  await page.locator("#screen .card .btn-row .btn").first().click();
  if (allowance === "2") await page.locator("#screen .card .btn-row .btn").nth(1).click();
  await page.click('#screen button:has-text("Next")');
  await page.click('#screen button[aria-label="Roll a name"]');
  await page.waitForTimeout(60);
  const rolledName = await page.inputValue("#screen input >> nth=0");
  check(/\S+\s\S+/.test(rolledName), `name roll produced "${rolledName}"`);
  await page.click('#screen button:has-text("Roll 3 words")');
  await page.waitForTimeout(60);
  const words = await page.textContent("#screen");
  check(/ · /.test(words), "descriptor roll produced no words");
  await page.fill("#screen input >> nth=0", "Test Traveler");
  await page.locator('#screen button:has-text("D6")').nth(0).click();  // dream
  await page.locator('#screen button:has-text("D6")').nth(1).click();  // flaw
  await page.click('#screen button:has-text("Next")');
  await page.click('#screen button:has-text("Next")');
  // journey step: roll Goal and Threat seeds
  await page.click('#screen button[aria-label="Roll seeds for Personal Goal"]');
  await page.click('#screen button[aria-label="Roll seeds for Personal Threat"]');
  await page.waitForTimeout(60);
  const seeded = await page.evaluate(() => document.querySelectorAll("#screen .field .faint").length);
  check(seeded >= 2, "goal and threat seed words did not render");
  await page.click('#screen button[aria-label="Roll a Kicker"]');
  await page.waitForTimeout(60);
  const kicker = await page.inputValue('#screen input >> nth=2');
  check(kicker.split(" ").length >= 4, `kicker roll produced "${kicker}"`);
  await page.click('#screen button:has-text("Next")');
  await page.click('#screen button:has-text("Create Traveler")');
  await page.waitForTimeout(120);

  const saved = await page.evaluate(() => {
    return __game.characters().map((c) => ({
      name: c.name, archetype: c.archetype, talents: c.talents.length,
      attrs: c.attributes, health: c.state?.health, hope: c.state?.hope
    }));
  });
  check(saved.length === 1, `wizard saved ${saved.length} characters, expected 1`);

  // Home takes a different branch once a Traveler exists, and another once the group is
  // ready — the state where the next-step nudge returns nothing. That is exactly where a
  // bare append(null) printed the word "null" above the New Traveler button.
  for (const journey of [null, { destination: "The coast", vehicle: { name: "Van", hull: 6 } }]) {
    await page.evaluate((j) => { __game.write({ journey: j }); location.hash = "#/home"; }, journey);
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => { location.hash = "#/home"; });
    await page.waitForTimeout(80);
    const homeStray = await page.evaluate(() => {
      const walk = document.createTreeWalker(document.getElementById("screen"), NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (["null", "undefined", "NaN"].includes(n.textContent.trim())) return n.textContent.trim();
      }
      return null;
    });
    check(!homeStray, `home rendered a stray "${homeStray}" (journey ${journey ? "set" : "empty"})`);
  }
  if (saved[0]) {
    const c = saved[0];
    const total = Object.values(c.attrs).reduce((a, b) => a + b, 0);
    check(c.name === "Test Traveler", "wizard did not persist the name");
    check(Object.values(c.attrs).every((v) => v >= 2 && v <= 6), `attributes out of range: ${JSON.stringify(c.attrs)}`);
    check(c.talents === (total <= 15 ? 2 : 1), `talent count ${c.talents} wrong for attribute total ${total}`);
    check(c.health === Math.ceil((c.attrs.strength + c.attrs.agility) / 2) ||
          c.health === Math.ceil((c.attrs.strength + c.attrs.agility) / 2) + 2,
          `health ${c.health} does not match the formula`);
  }
  await page.evaluate(() => { location.hash = "#/home"; });
  await page.waitForTimeout(60);
  const listed = await page.textContent("#screen");
  check(listed.includes("Test Traveler"), "new Traveler not listed on the home screen");

  // open the sheet: vitals header, steppers clamped, injury flow
  await page.click("#screen .list a");
  await page.waitForTimeout(80);
  const vitalsVisible = await page.evaluate(() => !document.getElementById("vitals").hidden);
  check(vitalsVisible, "vitals header did not appear on the sheet");
  const tiles = await page.locator("#vitals .vital .vital-label").allTextContents();
  check(tiles.includes("Health") || tiles.includes("Hull"), `vitals missing health tile: ${tiles}`);
  check(tiles.includes("Hope") && tiles.includes("Cash"), `vitals missing tiles: ${tiles}`);

  // Health cannot be pushed above its maximum or below zero, and at either limit the
  // button that cannot do anything is disabled rather than left looking pressable.
  const raise = page.locator('#screen button[aria-label="Raise Health"]').first();
  for (let i = 0; i < 12 && (await raise.isEnabled()); i++) await raise.click();
  check(!(await raise.isEnabled()), "Raise Health is still pressable at the maximum");
  const lower = page.locator('#screen button[aria-label="Lower Health"]').first();
  for (let i = 0; i < 20 && (await lower.isEnabled()); i++) await lower.click();
  check(!(await lower.isEnabled()), "Lower Health is still pressable at zero");
  await page.waitForTimeout(60);
  const clamped = await page.evaluate(() => {
    const c = __game.first();
    const max = Math.ceil((c.attributes.strength + c.attributes.agility) / 2) + (c.talents.includes("tough") ? 2 : 0);
    return { health: c.state.health, max };
  });
  check(clamped.health === 0, `health floor not enforced (${clamped.health})`);
  const incap = await page.textContent("#screen");
  check(incap.includes("Incapacitated"), "zero Health did not surface the Incapacitated note");

  // apply an injury from the picker
  await page.click('#screen a:has-text("Add injury or trauma")');
  await page.waitForTimeout(80);
  await page.click('#screen button:has-text("Choose")');
  await page.waitForTimeout(80);
  await page.click(".modal .list button");
  await page.waitForTimeout(100);
  const withInjury = await page.evaluate(() => __game.first().conditions.length);
  check(withInjury === 1, `injury not applied (${withInjury} conditions)`);

  // dice engine: roll, then confirm the log recorded it
  await page.evaluate(() => { location.hash = "#/dice"; });
  await page.waitForTimeout(80);
  await page.click('#screen button:has-text("Roll")');
  await page.waitForTimeout(80);
  const resultText = await page.textContent("#screen");
  check(/success|Failure/.test(resultText), "dice screen showed no result");

  const logged = await page.evaluate(() => __game.read().rollLog.length);
  check(logged >= 1, "roll was not written to the log");

  // Roll sits in a bar above the tab bar, reachable without scrolling the builder
  const bar = await page.evaluate(() => {
    const b = document.querySelector("#screen .actionbar");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const nav = document.querySelector(".tabbar").getBoundingClientRect();
    return { visible: r.top < window.innerHeight && r.bottom > 0, clearsNav: r.bottom <= nav.top + 1,
             hasRoll: !!b.querySelector("button"), pool: b.querySelector(".pool")?.textContent || "" };
  });
  check(bar !== null, "dice screen has no action bar");
  check(bar && bar.visible, "action bar is off screen");
  check(bar && bar.clearsNav, "action bar overlaps the tab bar");
  check(bar && bar.hasRoll && /\d/.test(bar.pool), `action bar shows no pool size (${bar && bar.pool})`);

  // a worn neurocaster takes dice off the pool, and unticking it gives them back
  await page.evaluate(() => {
    __game.edit((g) => {
      const ch = Object.values(g.characters)[0];
      ch.neurocaster = "stimulusTlePro";
      ch.state.wearingCaster = true;
    });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/dice"; });
  await page.waitForTimeout(120);
  const withCaster = await page.textContent("#screen");
  check(/Neurocaster\s*[-−]2/.test(withCaster), "the worn neurocaster did not reach the pool");
  const poolWith = Number((withCaster.match(/(\d+) base \+ \d+ gear/) || [])[1]);
  await page.click('#screen input[aria-label="Wearing the neurocaster"]');
  await page.waitForTimeout(120);
  const poolWithout = Number(((await page.textContent("#screen")).match(/(\d+) base \+ \d+ gear/) || [])[1]);
  check(poolWithout > poolWith, `untick did not restore dice (${poolWith} then ${poolWithout})`);

  await page.evaluate(() => { location.hash = "#/log"; });
  await page.waitForTimeout(60);
  const logText = await page.textContent("#screen");
  check(/success/.test(logText), "roll log did not render the entry");

  // the log filters by whoever rolled
  await page.evaluate(() => {
    __game.edit((g) => {
      g.rollLog.unshift(
        { id: "x1", ts: Date.now(), by: "Somebody Else", label: "Their roll", dice: [3], outcome: "missed" },
        { id: "x2", ts: Date.now(), label: "Initiative", dice: [4], outcome: "Travelers act first" });
    });
    location.hash = "#/home";
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/log"; });
  await page.waitForTimeout(80);
  const chips = await page.$$("#screen .chip");
  check(chips.length >= 3, `roll log showed ${chips.length} filter chips, expected one per roller plus All`);
  await page.click('#screen .chip:has-text("Table")');
  await page.waitForTimeout(80);
  const filtered = await page.textContent("#screen .list");
  check(/Initiative/.test(filtered) && !/Their roll/.test(filtered), "filtering by Table did not narrow the log");

  // The action a screen exists for must be reachable without scrolling, and every
  // checkbox must have a finger-sized target rather than a 22px box.
  for (const [route, expect] of [["dice", "Roll"], ["time", "Shift"], ["neuro", "Roll"], ["create", "Next"]]) {
    await page.evaluate((r) => { location.hash = `#/${r}`; }, route);
    await page.waitForTimeout(120);
    await page.evaluate(() => window.scrollTo(0, 0));
    const reach = await page.evaluate((label) => {
      const nav = document.querySelector(".tabbar").getBoundingClientRect();
      const btns = [...document.querySelectorAll("#screen .btn-primary")]
        .filter((b) => !b.closest("details:not([open])"));
      const wanted = btns.find((b) => b.textContent.trim().startsWith(label)) || btns[0];
      if (!wanted) return null;
      const r = wanted.getBoundingClientRect();
      return { text: wanted.textContent.trim().slice(0, 20), top: Math.round(r.top), limit: Math.round(nav.top) };
    }, expect);
    check(reach !== null, `${route} has no primary action`);
    check(reach && reach.top < reach.limit,
      `${route}: "${reach && reach.text}" starts ${reach && reach.top - reach.limit}px below the fold`);
  }

  await page.evaluate(() => { location.hash = "#/settings"; });
  await page.waitForTimeout(100);
  const tinyTargets = await page.evaluate(() =>
    [...document.querySelectorAll("#screen input[type=checkbox]")]
      .map((c) => ({ label: c.getAttribute("aria-label") || "", h: Math.round((c.closest("label") || c).getBoundingClientRect().height) }))
      .filter((x) => x.h < 40));
  check(tinyTargets.length === 0,
    `settings toggles with a target under 40px: ${tinyTargets.map((t) => `${t.label} ${t.h}px`).join(", ")}`);

  // dense state: a full log pages rather than running to eight screens, and combatants
  // who have taken their turn collapse to a line
  await page.evaluate(() => {
    __game.edit((g) => {
      g.rollLog = Array.from({ length: 100 }, (_, i) => ({
        id: "r" + i, ts: Date.now() - i * 60000, by: "Test Traveler", label: "Strength",
        dice: [6, 2, 3], outcome: "1 success"
      }));
      const me = Object.values(g.characters)[0];
      g.journey = { ...(g.journey || {}), combat: { active: true, round: 2, startingSide: "travelers",
        combatants: [
          { id: me.id, kind: "traveler", name: me.name, side: "travelers", zone: 1, acted: false, realm: "real" },
          ...Array.from({ length: 6 }, (_, i) => ({ id: "x" + i, kind: "threat", name: "Law Enforcement " + i,
            threatId: "lawEnforcement", side: "enemies", zone: 2, acted: i < 4, health: 4 }))
        ] } };
    });
  });
  await page.reload({ waitUntil: "networkidle" });

  await page.evaluate(() => { location.hash = "#/log"; });
  await page.waitForTimeout(120);
  const paged = await page.evaluate(() => ({
    rows: document.querySelectorAll("#screen .list li").length,
    more: !!document.querySelector('#screen button')
      && [...document.querySelectorAll("#screen button")].some((b) => /Show older/.test(b.textContent))
  }));
  check(paged.rows <= 25, `roll log rendered ${paged.rows} rows at once`);
  check(paged.more, "roll log gives no way to see older entries");
  await page.click('#screen button:has-text("Show older")');
  await page.waitForTimeout(100);
  const grown = await page.evaluate(() => document.querySelectorAll("#screen .list li").length);
  check(grown > paged.rows, `"Show older" did not add rows (${paged.rows} then ${grown})`);

  await page.evaluate(() => { location.hash = "#/combat"; });
  await page.waitForTimeout(120);
  const cards = await page.evaluate(() => {
    const heights = [...document.querySelectorAll("#screen .card")]
      .filter((c) => /Law Enforcement/.test(c.textContent))
      .map((c) => Math.round(c.getBoundingClientRect().height));
    const sorted = [...heights].sort((a, b) => a - b);
    return { heights, smallest: sorted[0], largest: sorted[sorted.length - 1] };
  });
  check(cards.largest > cards.smallest * 1.8,
    `combatants who acted did not collapse: heights ${JSON.stringify(cards.heights)}`);
  check(cards.heights.filter((h) => h === cards.smallest).length === 4,
    `expected the four who acted to be compact, got ${JSON.stringify(cards.heights)}`);

  // journey: roll a destination and route features
  await page.evaluate(() => { location.hash = "#/journey"; });
  await page.waitForTimeout(80);
  await page.click('#screen button[aria-label="Roll a destination"]');
  await page.waitForTimeout(80);
  const dest = await page.inputValue('#screen input >> nth=1');
  check(/ — /.test(dest), `destination roll produced "${dest}"`);
  await page.click('#screen button[aria-label="Roll a starting point"]');
  await page.waitForTimeout(60);
  const start = await page.inputValue('#screen input >> nth=0');
  check(start.length > 3, `starting point roll produced "${start}"`);

  // a gated screen reached while switched off explains itself and can be enabled in place
  await page.evaluate(() => {
    localStorage.setItem("electricState.v1.settings", JSON.stringify({ theme: "dark" }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/gm"; });
  await page.waitForTimeout(80);
  check(await page.evaluate(() => location.hash) === "#/gm", "gated route silently redirected instead of explaining");
  const gatedText = await page.textContent("#screen");
  check(/switched off/i.test(gatedText), "gated screen did not explain why it is empty");
  const homeHint = await page.evaluate(() => { location.hash = "#/home"; return true; });
  await page.waitForTimeout(60);
  check(/Switched off/.test(await page.textContent("#screen")), "home screen does not mention the hidden surfaces");
  await page.evaluate(() => { location.hash = "#/gm"; });
  await page.waitForTimeout(60);
  await page.click('#screen button:has-text("Turn it on")');
  await page.waitForTimeout(120);
  check(/Roll up a Stop/.test(await page.textContent("#screen")), "enabling in place did not render the GM screen");
  check(await page.evaluate(() => !document.querySelector('[data-tab="gm"]').hidden), "GM tab still hidden after enabling");

  // restore both gated tabs for the remaining checks
  await page.evaluate(() => {
    localStorage.setItem("electricState.v1.settings", JSON.stringify({ solo: true, gmScreen: true, theme: "dark" }));
  });
  await page.reload({ waitUntil: "networkidle" });

  // solo: draw a card and confirm the deck depletes
  await page.evaluate(() => { location.hash = "#/solo"; });
  await page.waitForTimeout(80);
  const before = await page.textContent("#screen");
  check(/52 cards left/.test(before), "solo deck did not start at 52");
  await page.click('#screen button:has-text("Draw a card")');
  await page.waitForTimeout(80);
  await page.click('.modal button:has-text("Good")');
  await page.waitForTimeout(80);
  const after = await page.textContent("#screen");
  check(/51 cards left/.test(after), "drawing did not deplete the deck");

  await page.click('#screen button:has-text("Generate a Stop")');
  await page.waitForTimeout(80);
  check(/Blocker/.test(await page.textContent("#screen")), "solo Stop generator produced nothing");

  // a Countdown event must land on the screen, not just in a modal that closes
  await page.click('#screen button:has-text("Stop Countdown")');
  await page.waitForTimeout(100);
  const modalText = (await page.textContent(".modal")) || "";
  const eventLine = modalText.replace(/^Countdown \d+ of \d+/, "").replace(/^Stop Countdown/, "").replace(/Good$/, "").trim();
  await page.click('.modal button:has-text("Good")');
  await page.waitForTimeout(100);
  const soloText = await page.textContent("#screen");
  check(/What has happened/.test(soloText), "solo screen has no event log");
  check(soloText.includes(eventLine.slice(0, 20)), `countdown result "${eventLine.slice(0, 30)}" was not recorded on the screen`);

  // and it survives a reload, because it is Journey state
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/solo"; });
  await page.waitForTimeout(100);
  check(/What has happened/.test(await page.textContent("#screen")), "solo events did not persist across a reload");

  // The dice are cryptographic and the log carries the evidence: a distribution panel
  // once there is enough of a sample to mean anything.
  await page.evaluate(() => {
    __game.write({ rollLog: Array.from({ length: 30 }, (_, i) => ({
      id: "d" + i, ts: Date.now(), by: "Test Traveler", label: "Strength",
      dice: [1 + (i % 6), 1 + ((i + 3) % 6)], outcome: "rolled"
    })) });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/log"; });
  await page.waitForTimeout(120);
  const fairness = await page.evaluate(() => {
    const panel = [...document.querySelectorAll("#screen details.explain")]
      .find((d) => /Are these dice fair/.test(d.textContent));
    return panel ? { open: panel.hasAttribute("open"), bars: panel.querySelectorAll(".bar").length } : null;
  });
  check(fairness !== null, "roll log has no fairness panel with a full sample");
  check(fairness && fairness.bars === 6, `fairness panel drew ${fairness && fairness.bars} bars, expected 6`);
  check(fairness && !fairness.open, "the fairness panel should start collapsed");
  const cryptoOnly = await page.evaluate(() => typeof crypto.getRandomValues === "function");
  check(cryptoOnly, "no crypto.getRandomValues in this browser");

  // A Stop's setting values are sentences. Laid out as a card-row they centre against
  // their label and a two-line value straddles it, so they are stacked definition rows.
  await page.evaluate(() => {
    __game.edit((g) => {
    g.journey = { ...(g.journey || {}), activeStopId: "s-fmt", stops: [{
      id: "s-fmt", name: "The Stop", createdAt: Date.now(),
      setting: { terrain: "Forest", population: "Densely populated. Hundreds or even thousands.",
        communications: "Isolated. Small road passing by. One neurocaster terminal.",
        size: "Small. Several houses and facilities within easy walking range.",
        prosperity: "Prosperous. People live well, roads are cared for.", weather: "Unusually hot or cold" },
      blocker: "Road covered by sand or fallen rocks", need: "Medicine",
      conflict: { a: "Store owner", b: "Neurine addicts", over: "Money" },
      locations: ["Market"], mood: ["Neurograph towers"],
      countdown: ["A", "B", "C"], countdownProgress: 0, threat: null, resolved: false
    }] };
    });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/solo"; });
  await page.waitForTimeout(150);
  const defs = await page.evaluate(() =>
    [...document.querySelectorAll("#screen .def")].map((d) => {
      const k = d.querySelector(".def-key").getBoundingClientRect();
      const v = d.querySelector(".def-value").getBoundingClientRect();
      return { key: d.querySelector(".def-key").textContent, straddles: v.top < k.bottom - 1 };
    }));
  check(defs.length === 6, `Stop setting rendered ${defs.length} rows, expected 6`);
  check(defs.every((d) => !d.straddles),
    `a Stop value overlaps its label: ${defs.filter((d) => d.straddles).map((d) => d.key).join(", ")}`);

  // gm: roll up a Stop
  await page.evaluate(() => { location.hash = "#/gm"; });
  await page.waitForTimeout(80);
  check(/Threats/.test(await page.textContent("#screen")), "GM screen missing threat panel");
  await page.click('#screen button:text-is("Blocker")');
  await page.waitForTimeout(60);
  check(/Blocker:/.test(await page.textContent("#screen")), "GM table roll produced no output");

  // Hide GM content: a phone that gets passed around must not show what has not happened.
  await page.evaluate(() => {
    localStorage.setItem("electricState.v1.settings",
      JSON.stringify({ solo: true, gmScreen: true, theme: "dark", hideGmContent: true }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/solo"; });
  await page.waitForTimeout(150);
  const hidden = await page.evaluate(() => ({
    spoilers: document.querySelectorAll("#screen .spoil").length,
    blurred: [...document.querySelectorAll("#screen .spoil")]
      .every((n) => /blur/.test(getComputedStyle(n).filter))
  }));
  check(hidden.spoilers >= 1, "hideGmContent is on but nothing is hidden");
  check(hidden.blurred, "a hidden element is not actually blurred");
  await page.click("#screen .spoil");
  await page.waitForTimeout(80);
  const revealed = await page.evaluate(() => document.querySelectorAll("#screen .spoil").length);
  check(revealed === hidden.spoilers - 1, `tapping a spoiler did not reveal it (${hidden.spoilers} then ${revealed})`);

  await page.evaluate(() => {
    localStorage.setItem("electricState.v1.settings", JSON.stringify({ solo: true, gmScreen: true, theme: "dark" }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { location.hash = "#/solo"; });
  await page.waitForTimeout(120);
  check(await page.evaluate(() => !document.querySelector("#screen .spoil")),
    "content stays hidden with the setting off");

  // The vitals header carries whoever it is about, and a way to change them.
  await page.evaluate(() => { location.hash = "#/dice"; });
  await page.waitForTimeout(120);
  const switcher = await page.evaluate(() => {
    const b = document.querySelector("#vitals .vital-switch");
    return b ? { text: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) } : null;
  });
  check(switcher !== null, "the vitals header does not say who it is about");
  check(switcher && switcher.h >= 24, `the Traveler switcher is only ${switcher && switcher.h}px tall`);

  // A dialog that closes from inside its own body used to remove the backdrop by hand and
  // leave the open-modal count high, so `overflow: hidden` stayed on the body for the rest
  // of the session: the app simply stopped scrolling.
  const charId = await page.evaluate(() => Object.values(__game.read().characters)[0].id);
  const overflowAfter = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate((id) => { location.hash = `#/injury/${id}`; }, charId);
    await page.waitForTimeout(120);
    await page.locator('#screen button:has-text("Choose")').first().click();
    await page.waitForTimeout(120);
    await page.locator(".modal .list button").first().click();
    await page.waitForTimeout(180);
    overflowAfter.push(await page.evaluate(() => ({
      overflow: getComputedStyle(document.body).overflow,
      modals: document.querySelectorAll(".modal-backdrop").length
    })));
  }
  check(overflowAfter.every((x) => x.modals === 0), "a modal was left on screen after choosing from it");
  check(overflowAfter.every((x) => x.overflow !== "hidden"),
    `the page stopped scrolling after using a dialog: ${JSON.stringify(overflowAfter)}`);

  // The defect only shows on the NEXT dialog: a hand-closed one left the count high, so the
  // following dialog's own close decremented to one and never took the lock off. Open one
  // that closes properly and check the page is still free.
  await page.evaluate(() => { location.hash = "#/combat"; });
  await page.waitForTimeout(150);
  // A fight may already be running from the density checks above; start one only if not.
  if (await page.locator('#screen button:has-text("Start combat")').count()) {
    await page.locator('#screen button:has-text("Start combat")').first().click();
    await page.waitForTimeout(150);
  }
  await page.locator('#screen button:has-text("Add threat")').first().click();
  await page.waitForTimeout(150);
  await page.locator('.modal button:has-text("Cancel")').first().click();
  await page.waitForTimeout(200);
  const afterNormalClose = await page.evaluate(() => ({
    overflow: getComputedStyle(document.body).overflow,
    modals: document.querySelectorAll(".modal-backdrop").length
  }));
  check(afterNormalClose.modals === 0, "the second dialog stayed on screen");
  check(afterNormalClose.overflow !== "hidden",
    "a dialog closed from its own body left the scroll lock for the next one to inherit");

  // And the router refuses to leave a lock behind, whatever put it there.
  await page.evaluate(() => { location.hash = "#/home"; });
  await page.waitForTimeout(120);
  await page.evaluate(() => { document.body.style.overflow = "hidden"; location.hash = "#/rules"; });
  await page.waitForTimeout(150);
  check(await page.evaluate(() => getComputedStyle(document.body).overflow) !== "hidden",
    "navigating did not clear a stuck scroll lock");

  // Gender is on the sheet, and it changes what the app calls this Traveler.
  const sheetId = await page.evaluate(() => Object.values(__game.read().characters)[0].id);
  await page.evaluate((id) => { location.hash = `#/sheet/${id}`; }, sheetId);
  await page.waitForTimeout(150);
  await page.locator("#screen details.phase-fold >> nth=0 >> summary").click();
  await page.waitForTimeout(120);
  const genderControls = await page.evaluate(() =>
    [...document.querySelectorAll("#screen button")].map((b) => b.textContent.trim()));
  check(genderControls.includes("Man") && genderControls.includes("Woman"),
    `the sheet has no gender control: ${genderControls.slice(0, 12).join(", ")}`);

  await page.locator('#screen button:has-text("Woman")').first().click();
  await page.waitForTimeout(180);
  const asWoman = await page.evaluate(() => ({
    stored: Object.values(__game.read().characters)[0].gender,
    text: document.getElementById("screen").textContent
  }));
  check(asWoman.stored === "female", `gender did not persist (${asWoman.stored})`);
  check(/she, her, her/.test(asWoman.text), "the sheet does not show the pronouns it will use");

  // And the app narrates with it: a Traveler at zero Health is offered a rally by name.
  await page.evaluate((id) => {
    __game.edit((g) => { g.characters[id].state.health = 0; });
  }, sheetId);
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate((id) => { location.hash = `#/sheet/${id}`; }, sheetId);
  await page.waitForTimeout(180);
  const narrated = await page.textContent("#screen");
  check(/Someone rallies her/.test(narrated), "status notes still speak in the plural");
  check(!/\b(they|them|their)\b/i.test(narrated), `a plural pronoun reached the sheet: ${(narrated.match(/.{0,40}\b(they|them|their)\b.{0,40}/i) || [])[0]}`);
  await page.evaluate((id) => {
    __game.edit((g) => { g.characters[id].state.health = 3; g.characters[id].gender = "male"; });
  }, sheetId);
  await page.reload({ waitUntil: "networkidle" });

  // zoom is locked off
  const zoom = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]')?.content || "";
    const input = document.createElement("input");
    document.body.append(input);
    const size = parseFloat(getComputedStyle(input).fontSize);
    input.remove();
    return {
      meta,
      inputFontSize: size,
      touchAction: getComputedStyle(document.documentElement).touchAction
    };
  });
  check(/user-scalable=no/.test(zoom.meta), `viewport allows scaling: ${zoom.meta}`);
  check(/maximum-scale=1/.test(zoom.meta), `viewport lacks maximum-scale: ${zoom.meta}`);
  check(zoom.touchAction === "manipulation", `touch-action is ${zoom.touchAction}, so double-tap can still zoom`);
  check(zoom.inputFontSize >= 16, `inputs render at ${zoom.inputFontSize}px, which makes iOS zoom on focus`);

  check(errors.length === 0, `${viewport.width}px: console errors: ${errors.join(" | ")}`);
  await page.close();
}

await browser.close();
server.close();

if (failures.length) { failures.forEach((f) => console.log("FAIL  " + f)); console.log(`\n${failures.length} failure(s)`); process.exit(1); }
console.log("browser smoke: all routes render, no console errors, no horizontal overflow at 360 and 390px");
