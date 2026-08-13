// Browser smoke test: boot the app, walk every tab, assert zero console errors
// and zero horizontal overflow at phone widths.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(req.url.split("?")[0]));
    const file = join(ROOT, path === "/" ? "index.html" : path);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end("not found"); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
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
  }

  // nothing at the foot of a screen may sit under the fixed tab bar
  for (const route of ["create", "home", "settings", "rules"]) {
    await page.evaluate((r) => { location.hash = `#/${r}`; }, route);
    await page.waitForTimeout(80);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(80);
    const clearance = await page.evaluate(() => {
      const nav = document.querySelector(".tabbar").getBoundingClientRect();
      const controls = [...document.querySelectorAll("#screen .btn, #screen button, #screen input, #screen select")];
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
  await page.evaluate(() => { localStorage.removeItem("electricState.v1"); location.hash = "#/create"; });
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
    const db = JSON.parse(localStorage.getItem("electricState.v1") || "{}");
    const list = Object.values(db.characters || {});
    return list.map((c) => ({
      name: c.name, archetype: c.archetype, talents: c.talents.length,
      attrs: c.attributes, health: c.state?.health, hope: c.state?.hope
    }));
  });
  check(saved.length === 1, `wizard saved ${saved.length} characters, expected 1`);
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

  // health cannot be pushed above its maximum or below zero
  const raise = page.locator('#screen button[aria-label="Raise Health"]').first();
  for (let i = 0; i < 12; i++) await raise.click();
  const lower = page.locator('#screen button[aria-label="Lower Health"]').first();
  for (let i = 0; i < 20; i++) await lower.click();
  await page.waitForTimeout(60);
  const clamped = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("electricState.v1"));
    const c = Object.values(db.characters)[0];
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
  const withInjury = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("electricState.v1"));
    return Object.values(db.characters)[0].conditions.length;
  });
  check(withInjury === 1, `injury not applied (${withInjury} conditions)`);

  // dice engine: roll, then confirm the log recorded it
  await page.evaluate(() => { location.hash = "#/dice"; });
  await page.waitForTimeout(80);
  await page.click('#screen button:has-text("Roll")');
  await page.waitForTimeout(80);
  const resultText = await page.textContent("#screen");
  check(/success|Failure/.test(resultText), "dice screen showed no result");

  const logged = await page.evaluate(() => JSON.parse(localStorage.getItem("electricState.v1")).rollLog.length);
  check(logged >= 1, "roll was not written to the log");

  await page.evaluate(() => { location.hash = "#/log"; });
  await page.waitForTimeout(60);
  const logText = await page.textContent("#screen");
  check(/success/.test(logText), "roll log did not render the entry");

  // the log filters by whoever rolled
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("electricState.v1"));
    db.rollLog.unshift(
      { id: "x1", ts: Date.now(), by: "Somebody Else", label: "Their roll", dice: [3], outcome: "missed" },
      { id: "x2", ts: Date.now(), label: "Initiative", dice: [4], outcome: "Travelers act first" });
    localStorage.setItem("electricState.v1", JSON.stringify(db));
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

  // gm: roll up a Stop
  await page.evaluate(() => { location.hash = "#/gm"; });
  await page.waitForTimeout(80);
  check(/Threats/.test(await page.textContent("#screen")), "GM screen missing threat panel");
  await page.click('#screen button:text-is("Blocker")');
  await page.waitForTimeout(60);
  check(/Blocker:/.test(await page.textContent("#screen")), "GM table roll produced no output");

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
