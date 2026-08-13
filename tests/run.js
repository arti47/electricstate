// Headless regression harness. Data-layer and rules invariants run without a browser;
// browser smoke tests attach once playwright-core is installed (npm i).
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const results = [];
const test = async (name, fn) => {
  try { await fn(); results.push(["pass", name]); }
  catch (err) { results.push(["FAIL", name, err.message]); }
};

// Runs first, and on every file: a stray paren in a screen only shows up in the browser,
// where it reads as a hang rather than an error. Fail here instead, by name.
await test("every source file parses", () => {
  const files = [
    ...readdirSync(new URL("../src", import.meta.url)).map((f) => `src/${f}`),
    ...readdirSync(new URL("..", import.meta.url)).filter((f) => /^data.*\.js$/.test(f))
  ].filter((f) => f.endsWith(".js"));
  const broken = [];
  for (const file of files) {
    try { execFileSync(process.execPath, ["--check", new URL(`../${file}`, import.meta.url).pathname], { stdio: "pipe" }); }
    catch (err) { broken.push(`${file}: ${String(err.stderr).split("\n").slice(0, 3).join(" ").trim()}`); }
  }
  assert.deepEqual(broken, [], broken.join(" | "));
});

const data = await import("../data.js");
const tables = await import("../data-tables.js");
const gm = await import("../data-gm.js");
const solo = await import("../data-solo.js");
const pregens = await import("../data-pregens.js");
const vehicles = await import("../data-vehicles.js");
const library = await import("../data-library.js");
const core = await import("../src/core.js");

await test("every D66 generator table has 36 rows", () => {
  for (const key of ["BLOCKERS", "CONFLICT_PARTIES", "CONFLICT_SUBJECTS", "LOCATIONS",
                     "ELECTRIC_STATE_ELEMENTS", "NINETIES_NOSTALGIA", "NPC_QUIRKS"]) {
    assert.equal(gm[key].length, 36, `${key} has ${gm[key].length}`);
  }
});

await test("every D6 setting table has 6 rows", () => {
  for (const [k, v] of Object.entries(gm.SETTING)) assert.equal(v.length, 6, k);
});

await test("d66Index maps the full D66 sequence onto 0..35", () => {
  const seen = gm.D66_ORDER.map((roll) => core.d66Index(roll));
  assert.deepEqual(seen, [...Array(36).keys()]);
});

await test("pregens satisfy the Health and Hope formulas", () => {
  for (const c of pregens.PREGENS) {
    const erratum = pregens.PREGEN_ERRATA.find((e) => e.id === c.id);
    const health = Math.ceil((c.strength + c.agility) / 2) + (c.talents.includes("tough") ? 2 : 0);
    const hope = Math.ceil((c.wits + c.empathy) / 2) + (c.talents.includes("dreamer") ? 2 : 0);
    assert.equal(c.health, health, `${c.id} health`);
    if (!erratum) assert.equal(c.hope, hope, `${c.id} hope`);
    else assert.equal(erratum.computed, hope, `${c.id} recorded erratum still matches the formula`);
  }
});

await test("talent ids are unique and every archetype references real talents", () => {
  const ids = data.TALENTS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate talent id");
  for (const a of data.ARCHETYPES) {
    for (const t of a.talents) assert.ok(ids.includes(t), `${a.id} references unknown talent ${t}`);
    for (const n of a.neurocasters) {
      if (n) assert.ok(data.NEUROCASTERS.some((x) => x.id === n), `${a.id} references unknown neurocaster ${n}`);
    }
  }
});

await test("weapons declare a damage value or an explicit exception", () => {
  for (const w of data.WEAPONS) {
    const ok = typeof w.damage === "number" || typeof w.blastPower === "number" || w.special === "stun";
    assert.ok(ok, `${w.id} has neither damage, blast power nor a special rule`);
    assert.ok(data.RANGES.some((r) => r.id === w.min), `${w.id} bad min range`);
    assert.ok(data.RANGES.some((r) => r.id === w.max), `${w.id} bad max range`);
  }
});

await test("the neodymium cannon draws its gear bonus from the neurocaster", () => {
  const cannon = data.WEAPONS.find((w) => w.id === "neodymiumCannon");
  assert.equal(cannon.gearBonusSource, "neurocasterNetwork");
  assert.equal(cannon.bonus, null);
});

await test("solo decks are 13 cards and encounters cover 2..A", () => {
  assert.equal(Object.keys(solo.NPC_PERSONALITY).length, 13);
  assert.equal(Object.keys(solo.NPC_EMOTION).length, 13);
  assert.deepEqual(Object.keys(solo.MINOR_ENCOUNTERS).sort(), solo.RANKS.slice().sort());
});

await test("solo stop countdown leaves 61-66 unassigned, as printed", () => {
  const covered = solo.STOP_THREAT_COUNTDOWN.flatMap(({ range }) => {
    const out = [];
    for (let r = range[0]; r <= range[1]; r++) if (r % 10 >= 1 && r % 10 <= 6) out.push(r);
    return out;
  });
  assert.ok(!covered.includes(61), "61 should be unassigned");
  assert.equal(solo.STOP_COUNTDOWN_UNASSIGNED.houseRule, "reroll");
});

await test("injury and trauma tables cover 11-36 as None plus 41-66 individually", () => {
  for (const table of [tables.SERIOUS_INJURIES, tables.MENTAL_TRAUMAS]) {
    assert.equal(table.length, 19);
    assert.deepEqual(table[0].range, [11, 36]);
    for (let r = 41; r <= 66; r++) {
      if (r % 10 < 1 || r % 10 > 6) continue;
      assert.ok(core.fromRangeTable(table, r), `no entry for ${r}`);
    }
  }
});

await test("mental traumas that rewrite the engine are marked as rules", () => {
  const ruleBearing = tables.MENTAL_TRAUMAS.filter((t) => (t.effects || []).some((e) => e.rule));
  assert.ok(ruleBearing.length >= 13, `only ${ruleBearing.length} rule-bearing traumas`);
  assert.deepEqual(tables.TRAUMA_CONFLICTS, [["cannotPush", "mustPush"]]);
});

await test("chase obstacles and component damage are complete", () => {
  for (let r = 41; r <= 66; r++) {
    if (r % 10 < 1 || r % 10 > 6) continue;
    assert.ok(core.fromRangeTable(vehicles.CHASE_OBSTACLES, r), `no chase obstacle for ${r}`);
  }
  assert.equal(vehicles.COMPONENT_DAMAGE.length, 6);
});

await test("every rules-library entry has a unique id and real text", () => {
  const ids = library.LIBRARY.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of library.LIBRARY) assert.ok(e.text.length > 40, `${e.id} text too thin`);
});

await test("dice helpers behave", () => {
  for (let i = 0; i < 200; i++) {
    const roll = core.d66();
    assert.ok(roll % 10 >= 1 && roll % 10 <= 6 && roll >= 11 && roll <= 66);
    assert.ok(core.rollNotation("2d6") >= 2 && core.rollNotation("2d6") <= 12);
  }
  assert.equal(core.countSixes([6, 6, 1, 3]), 2);
  assert.equal(core.countOnes([6, 6, 1, 3]), 1);
});

const roller = await import("../src/roller.js");

await test("pushing keeps 1s and 6s and re-rolls the rest", () => {
  const start = { base: [1, 6, 3, 4], gear: [2, 1], pushed: false };
  const pushed = roller.resolvePush(start, { base: [5, 2], gear: [1] });
  assert.deepEqual(pushed.base, [1, 6, 5, 2]);
  assert.deepEqual(pushed.gear, [1, 1]);
  assert.equal(pushed.hopeLost, 1, "one base 1 costs one Hope");
  assert.equal(pushed.gearDamage, 2, "all dice count after the push, kept 1s included");
  assert.throws(() => roller.resolvePush(pushed), /only be pushed once/);
});

await test("opposed rolls bank the margin beyond what was needed", () => {
  assert.deepEqual(roller.resolveOpposed(3, 1, { baseDamage: 2 }), { winner: "attacker", damage: 3, extra: 1 });
  assert.equal(roller.resolveOpposed(2, 2, { kind: "ranged" }).winner, "tie");
  assert.equal(roller.resolveOpposed(2, 2, { kind: "ranged" }).damage, 0);
  const lost = roller.resolveOpposed(1, 3, { baseDamage: 2, kind: "close" });
  assert.equal(lost.winner, "defender");
  assert.equal(lost.damage, 3, "a defender who wins close combat hurts the attacker");
  assert.equal(roller.resolveOpposed(1, 3, { kind: "ranged" }).damage, 0, "a dodged ranged attack simply misses");
});

await test("armor and cover cancel one point per 6", () => {
  assert.deepEqual(roller.soak(4, 3, [6, 6, 2]), { dice: [6, 6, 2], stopped: 2, damage: 2 });
  assert.equal(roller.soak(1, 6, [6, 6, 6, 6, 6, 6]).damage, 0, "damage never goes below zero");
});

await test("death rolls accumulate to three either way", () => {
  let s1 = { successes: 0, failures: 0 };
  s1 = roller.deathRollStep(s1, [6, 2, 3, 4]);
  assert.equal(s1.outcome, "continue");
  s1 = roller.deathRollStep(s1, [6, 6, 1, 2]);
  assert.equal(s1.outcome, "stabilized", "cumulative sixes reach three");

  let s2 = { successes: 0, failures: 0 };
  for (let i = 0; i < 3; i++) s2 = roller.deathRollStep(s2, [1, 2, 3, 4]);
  assert.equal(s2.outcome, "dead");
});

await test("instant kill triggers at twice maximum Health", () => {
  assert.ok(roller.isInstantKill(8, 4));
  assert.ok(!roller.isInstantKill(7, 4));
});

await test("Drama queen doubles the Tension bonus", () => {
  const plain = { tension: { x: 2 }, talents: [] };
  const queen = { tension: { x: 2 }, talents: ["dramaQueen"] };
  assert.equal(roller.tensionToward(plain, "x"), 2);
  assert.equal(roller.tensionToward(queen, "x"), 4);
});

await test("only dice talents matching the attribute are offered", () => {
  const ch = { talents: ["athlete", "charmer", "tough"] };
  const agility = roller.applicableTalents(ch, "agility").map((t) => t.id);
  assert.deepEqual(agility, ["athlete"], "Tough is not a dice talent; Charmer is Empathy");
});

// lifecycle and neurocasting run against a fake localStorage so the store works headless
globalThis.localStorage = {
  _d: new Map(),
  getItem(k) { return this._d.has(k) ? this._d.get(k) : null; },
  setItem(k, v) { this._d.set(k, String(v)); },
  removeItem(k) { this._d.delete(k); }
};
globalThis.window = { dispatchEvent() {}, addEventListener() {} };
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; Object.assign(this, o); } };

const store = await import("../src/store.js");
const lifecycle = await import("../src/lifecycle.js");
const neuro = await import("../src/neurocasting.js");

const makeChar = (over = {}) => store.saveCharacter({
  name: "Test", archetype: "veteran",
  attributes: { strength: 4, agility: 4, wits: 3, empathy: 3 },
  talents: [], conditions: [], tension: {},
  inventory: { items: [], cash: 0 },
  ...over
});

await test("a Shift heals one point while resting and two under a Nurse", () => {
  store.resetAll();
  const ch = makeChar();
  store.saveCharacter({ ...ch, state: { ...ch.state, health: 1 } });
  lifecycle.advanceTime("shift", { resting: true, fed: true });
  assert.equal(store.getCharacter(ch.id).state.health, 2);
  lifecycle.advanceTime("shift", { resting: true, nurse: true, fed: true });
  assert.equal(store.getCharacter(ch.id).state.health, 4);
});

await test("a boundary can be undone exactly once", () => {
  store.resetAll();
  const ch = makeChar();
  store.saveCharacter({ ...ch, state: { ...ch.state, health: 1 } });
  lifecycle.advanceTime("shift", { resting: true, fed: true });
  assert.equal(store.getCharacter(ch.id).state.health, 2);
  assert.ok(lifecycle.canUndo());
  lifecycle.undoLast();
  assert.equal(store.getCharacter(ch.id).state.health, 1, "undo restored the earlier state");
  assert.ok(!lifecycle.canUndo(), "undo is single-step");
});

await test("reducing Tension costs a step from both sides and pays a Hope each", () => {
  store.resetAll();
  const a = makeChar({ name: "A" });
  const b = makeChar({ name: "B" });
  store.saveCharacter({ ...a, tension: { [b.id]: 2 }, state: { ...a.state, hope: 1 } });
  store.saveCharacter({ ...b, tension: { [a.id]: 1 }, state: { ...b.state, hope: 1 } });
  const res = lifecycle.reduceTension(a.id, b.id);
  assert.ok(res.ok);
  assert.equal(store.getCharacter(a.id).tension[b.id], 1);
  assert.equal(store.getCharacter(b.id).tension[a.id], 0);
  assert.equal(store.getCharacter(a.id).state.hope, 2);
  assert.equal(store.getCharacter(b.id).state.hope, 2);
  assert.ok(!lifecycle.reduceTension(a.id, b.id).ok === false);
});

await test("Reclusive trauma blocks Hope from reducing Tension", () => {
  store.resetAll();
  const a = makeChar({ name: "A", conditions: [{ id: "t", name: "Reclusive", effects: [{ rule: "noHopeFromTension" }] }] });
  const b = makeChar({ name: "B" });
  store.saveCharacter({ ...a, tension: { [b.id]: 2 }, state: { ...a.state, hope: 1 } });
  store.saveCharacter({ ...b, tension: { [a.id]: 2 }, state: { ...b.state, hope: 1 } });
  lifecycle.reduceTension(a.id, b.id);
  assert.equal(store.getCharacter(a.id).state.hope, 1, "Reclusive gains nothing");
  assert.equal(store.getCharacter(b.id).state.hope, 2, "the other side still gains");
});

await test("Hope from items is capped at one per Shift and blocked by hunger", () => {
  store.resetAll();
  const ch = makeChar();
  store.saveCharacter({ ...ch, state: { ...ch.state, hope: 1 } });
  const first = lifecycle.useHopeItem(store.getCharacter(ch.id), { name: "Walkman" });
  assert.ok(first.ok);
  assert.equal(store.getCharacter(ch.id).state.hope, 2);
  const second = lifecycle.useHopeItem(store.getCharacter(ch.id), { name: "Book" });
  assert.ok(!second.ok, "a second item in the same Shift is refused");

  const hungry = store.getCharacter(ch.id);
  hungry.state.flags = { hungry: true };
  hungry.state.hope = 1;
  store.saveCharacter(hungry);
  assert.ok(!lifecycle.useHopeItem(store.getCharacter(ch.id), { name: "Walkman" }).ok, "hunger blocks Hope");
});

await test("a failed neurocasting roll adds Bliss before any push", () => {
  store.resetAll();
  const ch = makeChar({ neurocaster: "stimulusTleStandard" });
  const failed = neuro.applyNeuroResult(store.getCharacter(ch.id), { success: false });
  assert.equal(failed.state.bliss, 1);
  const ok = neuro.applyNeuroResult(failed, { success: true });
  assert.equal(ok.state.bliss, 1, "a success costs nothing");
});

await test("Bliss catching Hope means lost in the Electric State", () => {
  store.resetAll();
  const ch = makeChar({ neurocaster: "juryRigged" });
  const c = store.getCharacter(ch.id);
  c.state.hope = 3; c.state.bliss = 2;
  store.saveCharacter(c);
  assert.ok(!neuro.isLost(store.getCharacter(ch.id)));
  const c2 = store.getCharacter(ch.id);
  c2.state.bliss = 3;
  store.saveCharacter(c2);
  assert.ok(neuro.isLost(store.getCharacter(ch.id)));
});

await test("a Drone Pilot never accumulates Bliss", () => {
  store.resetAll();
  const ch = makeChar({ archetype: "dronePilot", neurocaster: "stimulusTlePro" });
  const after = neuro.applyNeuroResult(store.getCharacter(ch.id), { success: false });
  assert.equal(after.state.bliss, 0);
});

const combatMod = await import("../src/combat.js");

await test("progress tasks count successes and optional failures", () => {
  let t = combatMod.makeTask({ name: "Hack the door", requirement: 2, failuresAllowed: 3 });
  t = combatMod.advanceTask(t, { success: true });
  assert.equal(t.progress, 1);
  assert.ok(!t.done);
  t = combatMod.advanceTask(t, { success: true });
  assert.ok(t.done, "reaching the requirement completes the task");

  let d = combatMod.makeTask({ name: "Death roll", requirement: 3, failuresAllowed: 3 });
  for (let i = 0; i < 3; i++) d = combatMod.advanceTask(d, { success: false });
  assert.ok(d.failed, "the failure allowance ends the task too");
});

const soloMod = await import("../src/solo.js");

await test("a fresh deck is 52 unique cards and draws without replacement", () => {
  const deck = soloMod.freshDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((c) => c.suit + c.rank)).size, 52);
  const { card, deck: rest } = soloMod.drawFrom(deck);
  assert.ok(card);
  assert.equal(rest.length, 51);
  assert.ok(!rest.some((c) => c.suit === card.suit && c.rank === card.rank));
});

await test("face cards fire events by suit, others do not", () => {
  assert.equal(soloMod.eventFor({ suit: "spades", rank: "K" }).id, "personalThreat");
  assert.equal(soloMod.eventFor({ suit: "clubs", rank: "J" }).id, "stopCountdown");
  assert.equal(soloMod.eventFor({ suit: "hearts", rank: "Q" }).id, "travelerEvent");
  assert.equal(soloMod.eventFor({ suit: "diamonds", rank: "J" }).id, "conversation");
  assert.equal(soloMod.eventFor({ suit: "spades", rank: "9" }), null);
  assert.equal(soloMod.eventFor({ suit: "spades", rank: "A" }), null, "an ace is not a face card here");
});

await test("tilts read valence from suit and degree from rank", () => {
  assert.equal(soloMod.readTilt({ suit: "hearts", rank: "2" }).good, true);
  assert.equal(soloMod.readTilt({ suit: "hearts", rank: "2" }).degree, "Low");
  assert.equal(soloMod.readTilt({ suit: "spades", rank: "A" }).good, false);
  assert.equal(soloMod.readTilt({ suit: "spades", rank: "A" }).degree, "Extreme");
  assert.equal(soloMod.readTilt({ suit: "clubs", rank: "7" }).degree, "High");
});

await test("the solo Stop Countdown never returns the unassigned 61-66 band", () => {
  for (let i = 0; i < 200; i++) {
    const r = soloMod.rollStopCountdown();
    assert.ok(r.event, "always yields an event");
    if (r.roll != null) assert.ok(r.roll <= 56, `rolled ${r.roll}, which is unassigned in print`);
  }
});

await test("solo generators return complete Stops and Threats", () => {
  const stop = soloMod.generateStop();
  for (const key of ["terrain", "population", "communications", "size", "prosperity", "weather"]) {
    assert.ok(stop.setting[key], `stop missing ${key}`);
  }
  assert.ok(stop.blocker && stop.need);
  assert.equal(stop.locations.length, 3);
  const threat = soloMod.generateThreat();
  assert.ok(threat.type);
});

const derived = await import("../src/derived.js");

await test("worn body armor costs dice on Agility rolls only", () => {
  const ch = { state: { armor: "plateVest" }, conditions: [] };
  assert.equal(derived.conditionModifiers(ch, { attr: "agility" }).mod, -2);
  assert.equal(derived.conditionModifiers(ch, { attr: "strength" }).mod, 0);
});

await test("traumatic events subtract successes and freeze on any loss", () => {
  const plain = { conditions: [] };
  assert.deepEqual(roller.resolveTraumaticEvent(3, 1, plain), { lost: 2, freeze: true, violent: false, breakdown: false });
  assert.deepEqual(roller.resolveTraumaticEvent(2, 2, plain), { lost: 0, freeze: false, violent: false, breakdown: false });

  const flashbacks = { conditions: [{ effects: [{ rule: "traumaticLossPlus", value: 1 }] }] };
  assert.equal(roller.resolveTraumaticEvent(1, 0, flashbacks).lost, 2, "Flashbacks raise every potential loss");

  const violent = { conditions: [{ effects: [{ rule: "attackInsteadOfFreeze" }] }] };
  const v = roller.resolveTraumaticEvent(2, 0, violent);
  assert.ok(v.violent && !v.freeze, "Violent attacks instead of freezing");

  const panic = { conditions: [{ effects: [{ rule: "autoBreakdownOnHopeLoss" }] }] };
  assert.ok(roller.resolveTraumaticEvent(1, 0, panic).breakdown);
});

await test("injuries needing surgery never tick down on their own", () => {
  store.resetAll();
  const ch = makeChar({ conditions: [
    { id: "a", name: "Broken arm", heal: 3, surgery: false, effects: [] },
    { id: "b", name: "Cracked skull", heal: 3, surgery: true, effects: [] }
  ] });
  lifecycle.advanceTime("day", { fed: true });
  const after = store.getCharacter(ch.id).conditions;
  assert.equal(after.find((c) => c.id === "a").heal, 2, "an ordinary injury heals");
  assert.equal(after.find((c) => c.id === "b").heal, 3, "surgery-flagged injuries wait");
});

const names = await import("../data-names.js");
const wizardMod = await import("../src/wizard.js");

await test("house d100 tables are exactly 100 unique rows", () => {
  for (const key of ["FIRST_NAMES", "SURNAMES", "SONGS", "GOAL_SEEDS", "THREAT_SEEDS"]) {
    assert.equal(names[key].length, 100, `${key} has ${names[key].length}`);
    assert.equal(new Set(names[key]).size, 100, `${key} has duplicates`);
  }
  assert.ok(names.HOUSE_AID, "these tables must be flagged as a house aid, not book content");
});

await test("first names are paired the way the book prints its pregens", () => {
  const unpaired = names.FIRST_NAMES.filter((n) => !n.includes("/"));
  assert.equal(unpaired.length, 0, `unpaired entries: ${unpaired.slice(0, 3)}`);
});

await test("d100 covers the whole table and stays in range", () => {
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const roll = core.d100();
    assert.ok(roll >= 1 && roll <= 100);
    seen.add(core.fromD100(names.SURNAMES));
  }
  assert.equal(seen.size, 100, "every row should be reachable");
});

await test("meaning tables hold single words only", () => {
  for (const key of ["GOAL_SEEDS", "THREAT_SEEDS"]) {
    const multiword = names[key].filter((w) => w.includes(" "));
    assert.deepEqual(multiword, [], `${key} still contains phrases: ${multiword.slice(0, 3)}`);
  }
});

await test("meaning tables carry all ten Anything Words", () => {
  assert.equal(names.ANYTHING_WORDS.length, 10);
  for (const key of ["GOAL_SEEDS", "THREAT_SEEDS"]) {
    for (const word of names.ANYTHING_WORDS) {
      assert.ok(names[key].includes(word), `${key} is missing the Anything Word ${word}`);
    }
  }
});

await test("seed rolls keep doubles and mark them as amplified", () => {
  for (const table of [names.GOAL_SEEDS, names.THREAT_SEEDS]) {
    for (let i = 0; i < 300; i++) {
      const roll = wizardMod.rollSeeds(table, names.SEED_ROLLS);
      assert.equal(roll.words.length, 3);
      for (const w of roll.words) assert.ok(table.includes(w), `${w} is not in its own table`);
      const dupes = roll.words.filter((w, idx) => roll.words.indexOf(w) !== idx);
      assert.equal(roll.amplified.length > 0, dupes.length > 0, "amplification must track real doubles");
    }
  }
  const doubled = wizardMod.formatSeeds({ words: ["Decrease", "Decrease", "Signal"], amplified: ["Decrease"] });
  assert.equal(doubled, "Decrease ×2 · Signal");
});

await test("each descriptor table is 100 unique rows", () => {
  assert.equal(names.DESCRIPTOR_TABLES.length, 3);
  for (const { id, table } of names.DESCRIPTOR_TABLES) {
    assert.equal(table.length, 100, `${id} has ${table.length}`);
    assert.equal(new Set(table).size, 100, `${id} has duplicates`);
  }
  const all = names.DESCRIPTOR_TABLES.flatMap((t) => t.table);
  assert.equal(new Set(all).size, all.length, "the three tables must not overlap");
});

await test("a descriptor roll takes one word from each table", () => {
  for (let i = 0; i < 200; i++) {
    const set = wizardMod.rollDescriptorSet();
    assert.equal(set.length, 3);
    assert.deepEqual(set.map((d) => d.id), ["build", "wear", "manner"]);
    for (const entry of set) {
      const source = names.DESCRIPTOR_TABLES.find((t) => t.id === entry.id).table;
      assert.ok(source.includes(entry.word), `${entry.word} is not in the ${entry.id} table`);
    }
  }
});

const journeyTables = await import("../data-journey.js");

await test("journey house tables are 100 unique rows each", () => {
  for (const key of ["JOURNEY_PLACES", "JOURNEY_PURPOSE", "ROUTE_FEATURES", "VEHICLE_DETAILS", "KICKERS"]) {
    assert.equal(journeyTables[key].length, 100, `${key} has ${journeyTables[key].length}`);
    assert.equal(new Set(journeyTables[key]).size, 100, `${key} has duplicates`);
  }
  assert.ok(journeyTables.HOUSE_AID);
});

await test("journey rolls return the requested number of distinct rows", () => {
  for (let i = 0; i < 200; i++) {
    const route = wizardMod.pickDistinct(journeyTables.ROUTE_FEATURES, 3);
    assert.equal(route.length, 3);
    assert.equal(new Set(route).size, 3);
    const details = wizardMod.pickDistinct(journeyTables.VEHICLE_DETAILS, 3);
    assert.equal(new Set(details).size, 3);
  }
});

await test("kickers are finished events, and the book's four examples survive", () => {
  // A content table: each entry is a whole happening, not a word to interpret.
  for (const k of journeyTables.KICKERS) {
    assert.ok(k.split(" ").length >= 4, `"${k}" is too terse to be a Kicker`);
  }
  assert.equal(gm.KICKER_EXAMPLES.length, 4, "the book's own examples stay available");
  const burned = journeyTables.KICKERS.some((k) => /burn/i.test(k));
  assert.ok(burned, "the house table should extend the book's register, not depart from it");
});

await test("the book's own D6 destination table is still available", () => {
  assert.equal(solo.DESTINATIONS.length, 6);
  assert.ok(solo.DESTINATIONS.every((d) => typeof d === "string" && d.length > 5));
});

const hazards = await import("../src/hazards.js");

await test("hazard rolls turn every 6 into a point of damage", () => {
  assert.equal(hazards.mitigate(4, [6, 6, 2]).damage, 2);
  assert.equal(hazards.mitigate(1, [6, 6]).damage, 0, "damage never goes below zero");
  const roll = hazards.hazardRoll(8);
  assert.equal(roll.dice.length, 8);
  assert.equal(roll.damage, roll.dice.filter((d) => d === 6).length);
});

await test("falling is half the height, rounded down", () => {
  assert.equal(hazards.fallingDamage(4), 2);
  assert.equal(hazards.fallingDamage(5), 2);
  assert.equal(hazards.fallingDamage(11), 5);
});

await test("every subsystem the book defines has a screen", () => {
  // Guards against a rules system existing in data but never reaching the player.
  const routes = readFileSync(new URL("../src/router.js", import.meta.url), "utf8");
  for (const path of ["home", "dice", "rules", "tutorial", "solo", "gm", "settings", "log",
                      "create", "journey", "tension", "time", "neuro", "combat", "hazards",
                      "driving", "sheet", "injury"]) {
    assert.ok(routes.includes(`path: "${path}"`), `no route for ${path}`);
  }
});

await test("a Drone Pilot takes damage as a drone, not a human", () => {
  const drone = { archetype: "dronePilot", state: {}, talents: [] };
  const human = { archetype: "veteran", state: {}, talents: [] };
  assert.equal(derived.damageModel(drone), "hull");
  assert.equal(derived.damageModel(human), "health");
  assert.equal(derived.healsByResting(drone), false, "rest cannot mend a machine");
  assert.equal(derived.healsByResting(human), true);
  assert.equal(derived.tracksBliss(drone), false);
  assert.equal(derived.needsFood(drone), false);
});

await test("resting does not repair a Drone Pilot", () => {
  store.resetAll();
  const ch = makeChar({ archetype: "dronePilot" });
  store.saveCharacter({ ...ch, state: { ...ch.state, health: 1 } });
  const notes = lifecycle.advanceTime("shift", { resting: true, fed: true });
  assert.equal(store.getCharacter(ch.id).state.health, 1, "a drone gains nothing from rest");
  assert.ok(notes.some((n) => /repair/i.test(n)), "the Shift summary should say why");
});

await test("combat defence pools come from the combatant, not a guess", () => {
  store.resetAll();
  const ch = makeChar({ name: "Def", attributes: { strength: 5, agility: 2, wits: 3, empathy: 3 } });
  store.saveJourney({
    combat: { active: true, round: 1, combatants: [
      { id: ch.id, kind: "traveler", name: "Def" },
      { id: "t1", kind: "threat", name: "Gang Member", threatId: "gangMember", health: 4 }
    ] }
  });
  assert.equal(combatMod.defencePool(combatMod.findCombatant(ch.id), "close"), 5, "a Traveler defends with their own Strength");
  assert.equal(combatMod.defencePool(combatMod.findCombatant(ch.id), "ranged"), 2, "and dodges on Agility");
  assert.equal(combatMod.defencePool(combatMod.findCombatant("t1"), "close"), 3, "a Threat defends with its stat block");
});

await test("damage lands wherever the combatant's health lives", () => {
  store.resetAll();
  const ch = makeChar({ name: "Def" });
  store.saveJourney({
    combat: { active: true, round: 1, combatants: [
      { id: ch.id, kind: "traveler", name: "Def" },
      { id: "t1", kind: "threat", name: "Gang Member", threatId: "gangMember", health: 4 }
    ] }
  });
  const threatHit = combatMod.damageCombatant("t1", 3);
  assert.equal(threatHit.health, 1, "a Threat's health lives on the combat card");
  assert.equal(combatMod.findCombatant("t1").health, 1);

  const before = store.getCharacter(ch.id).state.health;
  const travelerHit = combatMod.damageCombatant(ch.id, 2);
  assert.equal(travelerHit.health, before - 2, "a Traveler's health lives on their sheet");
  assert.equal(store.getCharacter(ch.id).state.health, before - 2);

  assert.equal(combatMod.damageCombatant("t1", 99).health, 0, "health never goes negative");
});

const stopsMod = await import("../src/stops.js");

await test("solo and the GM screen build the same Stop record", () => {
  store.resetAll();
  const gmStop = stopsMod.makeStop("Littleville");
  const soloStop = soloMod.generateStop();
  assert.deepEqual(Object.keys(gmStop).sort(), Object.keys(soloStop).sort(),
    "one shape, or neither screen can read the other's Stop");
  for (const stop of [gmStop, soloStop]) {
    assert.equal(stop.countdown.length, stopsMod.COUNTDOWN_STEPS);
    assert.equal(new Set(stop.countdown).size, stop.countdown.length, "countdown steps must not repeat");
    assert.equal(stop.countdownProgress, 0);
    assert.ok(stop.setting.terrain && stop.blocker && stop.conflict.a);
  }
});

await test("a Stop's countdown advances once per step and then stops", () => {
  store.resetAll();
  const stop = stopsMod.saveStop(stopsMod.makeStop("Liberty"), { makeActive: true });
  assert.equal(stopsMod.activeStop().id, stop.id);
  for (let i = 1; i <= stopsMod.COUNTDOWN_STEPS; i++) {
    const fired = stopsMod.advanceCountdown(stop.id);
    assert.equal(fired.index, i);
    assert.equal(stopsMod.activeStop().countdownProgress, i);
  }
  assert.equal(stopsMod.advanceCountdown(stop.id), null, "a spent countdown fires nothing");
});

await test("legacy solo Stops migrate into the shared list", () => {
  store.resetAll();
  store.saveJourney({
    solo: { deck: [], events: [], stop: { terrain: "Desert", population: "Quiet", communications: "Isolated",
      size: "Tiny", prosperity: "Poor", weather: "Storm", blocker: "Out of fuel",
      need: "Fuel", conflict: { a: "Farmer", b: "Mobster", over: "Money" },
      locations: ["Garage"], mood: ["Neurograph towers"] } }
  });
  store.importJSON(store.exportJSON());
  const stops = stopsMod.listStops();
  assert.equal(stops.length, 1, "the old solo Stop became a record");
  assert.equal(stops[0].setting.terrain, "Desert");
  assert.equal(stops[0].name, "Solo Stop");
  assert.equal(store.getJourney().solo.stop, null, "and is no longer duplicated in solo state");
});

await test("the roll log attributes each roll and filters by Traveler", () => {
  store.resetAll();
  const a = store.saveCharacter({ name: "Cade", attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 } });
  const b = store.saveCharacter({ name: "Courtney", attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 } });

  store.logRoll({ by: "Cade", label: "Fight", dice: [6, 2], outcome: "hit" });
  store.logRoll({ by: "Courtney", label: "Sneak", dice: [1, 3], outcome: "seen" });
  store.logRoll({ label: "Initiative", dice: [4, 5], outcome: "Travelers act first" });

  const log = store.getRollLog();
  assert.equal(log.length, 3);
  assert.equal(log.find((r) => r.by === "Cade").byId, a.id, "a name is resolved to a Traveler id at write time");
  assert.equal(store.rollLogKey(log.find((r) => r.label === "Initiative")), "table",
    "a roll with nobody behind it belongs to the table");

  assert.equal(store.filterRollLog("all").length, 3);
  assert.equal(store.filterRollLog(a.id).length, 1);
  assert.equal(store.filterRollLog(b.id)[0].label, "Sneak");
  assert.equal(store.filterRollLog("table")[0].label, "Initiative");

  // Renaming must not orphan the rolls already recorded under the old name.
  store.saveCharacter({ ...store.getCharacter(a.id), name: "Cade the Elder" });
  assert.equal(store.filterRollLog(a.id).length, 1, "the id outlives the name");
});

await test("a reaction costs the defender their next turn", () => {
  store.resetAll();
  store.saveCharacter({ name: "Cade", attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 } });
  combatMod.startCombat();
  const me = combatMod.getCombat().combatants[0];

  combatMod.forfeitNextTurn(me.id, "reacted");
  assert.equal(combatMod.findCombatant(me.id).forfeit, "reacted");

  combatMod.nextRound();
  const after = combatMod.findCombatant(me.id);
  assert.equal(after.acted, true, "they start the round already spent");
  assert.equal(after.forfeited, "reacted", "and the card says why");
  assert.equal(after.forfeit, null, "the debt is paid once");

  combatMod.nextRound();
  assert.equal(combatMod.findCombatant(me.id).acted, false, "the round after that they act normally");
});

await test("the neurocaster costs dice only while it is actually worn", () => {
  const base = { name: "Wired", attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 } };
  assert.equal(roller.casterDicePenalty({ ...base, neurocaster: "stimulusTlePro", state: {} }), 0,
    "owning one is not wearing one");
  assert.equal(roller.casterDicePenalty({ ...base, neurocaster: "stimulusTlePro", state: { wearingCaster: true } }), -2);
  // The Stimulus GO is the light model: it only costs one die.
  assert.equal(roller.casterDicePenalty({ ...base, neurocaster: "stimulusGo", state: { wearingCaster: true } }), -1);
  assert.equal(roller.casterDicePenalty({ ...base, neurocaster: null, state: { wearingCaster: true } }), 0);
});

await test("a Lone wolf reduces Tension alone, and nobody else can", () => {
  store.resetAll();
  const wolf = store.saveCharacter({ name: "Wolf", talents: ["loneWolf"],
    attributes: { strength: 3, agility: 3, wits: 4, empathy: 4 } });
  const other = store.saveCharacter({ name: "Other", attributes: { strength: 3, agility: 3, wits: 4, empathy: 4 } });
  store.saveCharacter({ ...store.getCharacter(wolf.id), tension: { [other.id]: 2 },
    state: { ...store.getCharacter(wolf.id).state, hope: 1 } });
  store.saveCharacter({ ...store.getCharacter(other.id), tension: { [wolf.id]: 2 } });

  const alone = lifecycle.reduceTensionAlone(wolf.id, other.id);
  assert.ok(alone.ok);
  assert.equal(store.getCharacter(wolf.id).tension[other.id], 1, "their own Tension drops a step");
  assert.equal(store.getCharacter(wolf.id).state.hope, 2, "and pays a Hope");
  assert.equal(store.getCharacter(other.id).tension[wolf.id], 2, "the other side is untouched — they were not there");

  assert.equal(lifecycle.reduceTensionAlone(other.id, wolf.id).ok, false, "no talent, no solo reduction");
  assert.equal(lifecycle.reduceTension(wolf.id, wolf.id).ok, false, "you cannot talk it through with yourself");
});

await test("a personal Threat belongs to one Traveler and closes in three steps", () => {
  store.resetAll();
  const mine = makeChar({ name: "Hunted" });
  const other = makeChar({ name: "Untroubled" });
  store.saveJourney({ solo: { deck: soloMod.freshDeck(), events: [], history: [] } });

  assert.equal(soloMod.advancePersonalThreat(), null, "nothing advances before one is rolled");
  soloMod.setPersonalThreat(mine.id, "An enemy from the past.");

  const steps = [];
  for (let i = 0; i < 4; i++) steps.push(soloMod.advancePersonalThreat(mine.id));
  assert.deepEqual(steps.map((s) => s && s.index), [1, 2, 3, null],
    "three steps, then it has caught up and stops");
  assert.deepEqual(steps.slice(0, 3).map((s) => s.name), ["Hunted", "Hunted", "Hunted"],
    "every step names whose Threat it is");
  assert.equal(store.getJourney().solo.personalThreats[mine.id].step, 3,
    "the count lives on the Journey, not in the capped event list");
  assert.equal(store.getJourney().solo.personalThreats[other.id], undefined,
    "one Traveler's Threat does not advance another's");
});

await test("a face card advances the Traveler in the spotlight, not just the first one", () => {
  store.resetAll();
  const a = makeChar({ name: "First" });
  const b = makeChar({ name: "Second" });
  store.saveJourney({ solo: { deck: soloMod.freshDeck(), events: [], history: [], leadId: b.id } });
  soloMod.setPersonalThreat(a.id, "A machine.");
  soloMod.setPersonalThreat(b.id, "A personal demon.");
  const step = soloMod.advancePersonalThreat();     // no id: the card does not say whose
  assert.equal(step.name, "Second", "the spotlight Traveler's Threat is the one that closes in");
  assert.equal(store.getJourney().solo.personalThreats[a.id].step, 0);
});

await test("a one-counter save migrates onto the Traveler it was about", () => {
  store.resetAll();
  const ch = makeChar({ name: "Legacy lead" });
  store.saveJourney({ solo: { deck: soloMod.freshDeck(), events: [], history: [],
    leadId: ch.id, personalThreatStep: 2 } });
  assert.equal(soloMod.personalThreats()[ch.id].step, 2, "the progress survives");
  const step = soloMod.advancePersonalThreat(ch.id);
  assert.equal(step.index, 3, "and carries on from where it was");
  assert.equal(store.getJourney().solo.personalThreatStep, undefined, "the old counter is gone");
});

await test("a solo Stop Countdown prefers the Stop's own steps over the D66 table", async () => {
  store.resetAll();
  const stop = stopsMod.saveStop(stopsMod.makeStop("Rust"), { makeActive: true });
  const first = await soloMod.nextStopCountdown();
  assert.equal(first.text, stop.countdown[0], "the prepared step fires first");
  assert.equal(stopsMod.activeStop().countdownProgress, 1);

  for (let i = 1; i < stopsMod.COUNTDOWN_STEPS; i++) await soloMod.nextStopCountdown();
  const spent = await soloMod.nextStopCountdown();
  assert.equal(spent.title, "Stop Countdown", "once spent it falls back to the printed table");
  assert.ok(spent.text.length > 0);
});

await test("a Dirty fighter hits harder bare-handed, and extra sixes still count", () => {
  const plain = { name: "Plain", talents: [] };
  const dirty = { name: "Dirty", talents: ["dirtyFighter"] };
  assert.equal(roller.baseDamage(plain), 1, "a fist does one point");
  assert.equal(roller.baseDamage(dirty), 2, "unless it belongs to a Dirty fighter");
  const knife = data.WEAPONS.find((w) => w.id === "knife");
  assert.equal(roller.baseDamage(dirty, knife.id), knife.damage, "the talent is unarmed only");
  assert.equal(roller.damageWithExtras(dirty, null, 3), 4, "two extra sixes, two extra points");
  assert.equal(roller.damageWithExtras(plain, null, 1), 1);
  assert.equal(roller.damageWithExtras(plain, null, 0), 1, "a miss still reports the weapon's own damage");
});

await test("the Neuroresistant roll returns once Hope climbs clear of Bliss", () => {
  const lost = derived.normalize({ name: "Devotee", attributes: { strength: 3, agility: 3, wits: 4, empathy: 4 },
    state: { hope: 2, bliss: 3, neuroresistantUsed: true } });
  assert.equal(lost.state.neuroresistantUsed, true, "still spent while Bliss holds them");
  const clear = derived.normalize({ ...lost, state: { ...lost.state, bliss: 0 } });
  assert.equal(clear.state.neuroresistantUsed, false, "and comes back when they are out from under it");
});

await test("animals stand in the bestiary beside the Threats", () => {
  const dog = combatMod.bestiaryEntry("guardDog");
  assert.ok(dog, "a guard dog is something you can put on the table");
  assert.equal(combatMod.bestiaryEntry("lawEnforcement").name, "Law Enforcement");
  assert.equal(combatMod.bestiaryEntry("nothing"), null);

  store.resetAll();
  store.saveJourney({ combat: { active: true, round: 1, startingSide: "travelers",
    combatants: [{ id: "d1", kind: "threat", name: "Guard dog", threatId: "guardDog", health: 9, zone: 2 }] } });
  assert.equal(combatMod.defencePool(combatMod.findCombatant("d1"), "close"), dog.strength,
    "and it defends on its own stat block, not a guess");
});

await test("cold bites per Shift, and per Stretch when it is extreme", () => {
  store.resetAll();
  const ch = store.saveCharacter({ name: "Cold", attributes: { strength: 1, agility: 3, wits: 3, empathy: 3 } });
  store.saveJourney({});

  const quiet = lifecycle.advanceTime("stretch", { cold: true });
  assert.ok(!quiet.some((n) => /freezing|keeps the cold out/.test(n)), "ordinary cold waits for the Shift");

  const biting = lifecycle.advanceTime("stretch", { cold: true, extremeCold: true });
  assert.ok(biting.some((n) => /freezing|keeps the cold out/.test(n)), "extreme cold rolls every Stretch");

  lifecycle.advanceTime("shift", { cold: true });
  assert.equal(store.getCharacter(ch.id).state.flags.cold, true, "exposure blocks healing until they are warm");
  lifecycle.advanceTime("shift", {});
  assert.equal(store.getCharacter(ch.id).state.flags.cold, false, "and clears once they are out of it");
});

await test("Tilt degrees split the ranks the way the book's table does", () => {
  const degreeOf = (rank) => soloMod.readTilt({ suit: "hearts", rank }).degree;
  assert.deepEqual(["2", "3"].map(degreeOf), ["Low", "Low"]);
  assert.deepEqual(["4", "5", "6"].map(degreeOf), ["Medium", "Medium", "Medium"]);
  assert.deepEqual(["7", "8", "9"].map(degreeOf), ["High", "High", "High"]);
  assert.deepEqual(["10", "J", "Q", "K", "A"].map(degreeOf), Array(5).fill("Extreme"));
  assert.equal(solo.RANKS.length, 13, "every rank lands in exactly one degree");
  assert.equal(soloMod.readTilt({ suit: "clubs", rank: "J" }).good, false, "clubs are bad news");
  assert.equal(soloMod.readTilt({ suit: "diamonds", rank: "J" }).good, true);
});

await test("a wrecked vehicle needs a spare part before repairs mean anything", () => {
  // The rule lives in the data; the driving screen gates the roll on it.
  assert.equal(tables.REPAIR.vehicleAtZeroRequires, "sparePart");
  assert.equal(tables.REPAIR.attr, "wits");
  assert.equal(tables.REPAIR.eachSuccessRestores, 1);
  assert.ok(tables.GEAR.find((g) => g.id === "toolsVehicle")?.bonus > 0, "vehicle tools supply the gear dice");
  const src = readFileSync(new URL("../src/hazards.js", import.meta.url), "utf8");
  assert.match(src, /hull <= 0 && !part/, "the wrecked-vehicle gate is wired, not just documented");
  assert.match(src, /Hull and repairs/, "and the vehicle has a repair surface at all");
});

await test("the solo spotlight rotates to whoever has led fewest Stops", () => {
  store.resetAll();
  const a = store.saveCharacter({ name: "A", attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 } });
  const b = store.saveCharacter({ name: "B", attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 } });
  const c = store.saveCharacter({ name: "C", attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 } });
  store.saveJourney({ solo: { deck: [], events: [], history: [] } });

  const order = [1, 2, 3, 4].map(() => soloMod.passTheSpotlight().id);
  assert.deepEqual(order, [a.id, b.id, c.id, a.id], "everyone leads once before anyone leads twice");
  assert.equal(store.getJourney().solo.leadId, a.id);

  store.resetAll();
  store.saveCharacter({ name: "Alone", attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 } });
  assert.equal(soloMod.passTheSpotlight(), null, "one Traveler has nobody to hand it to");
});

await test("combat orders the list by who actually acts next", () => {
  store.resetAll();
  store.saveJourney({
    combat: {
      active: true, round: 2, startingSide: "enemies",
      combatants: [
        { id: "t1", kind: "traveler", name: "Traveler spent", side: "travelers", acted: true, zone: 1 },
        { id: "t2", kind: "traveler", name: "Traveler waiting", side: "travelers", acted: false, zone: 1 },
        { id: "e1", kind: "threat", name: "Enemy spent", side: "enemies", acted: true, zone: 2 },
        { id: "e2", kind: "threat", name: "Enemy waiting", side: "enemies", acted: false, zone: 2 }
      ]
    }
  });
  const c = combatMod.getCombat();
  const rank = (x) => (x.side === c.startingSide ? 0 : 2) + (x.acted ? 1 : 0);
  const order = [...c.combatants].sort((a, b) => rank(a) - rank(b)).map((x) => x.id);
  assert.deepEqual(order, ["e2", "e1", "t2", "t1"],
    "acting side first, and within each side whoever still has a turn");
});

await test("the home screen names the next step in the book's own creation order", async () => {
  const screens = await import("../src/screens.js");
  store.resetAll();
  const a = store.saveCharacter({ name: "A", attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 } });
  const b = store.saveCharacter({ name: "B", attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 } });
  const nudge = () => screens.nextStepFor(store.listCharacters(), store.getJourney())?.id ?? null;

  assert.equal(nudge(), "journey", "no destination yet");
  store.saveJourney({ destination: "The coast — to bury someone" });
  assert.equal(nudge(), "vehicle", "destination but nothing to drive");
  store.saveJourney({ destination: "The coast — to bury someone", vehicle: { name: "Van", hull: 6 } });
  assert.equal(nudge(), "tension", "vehicle but nobody carries Tension");

  store.saveCharacter({ ...store.getCharacter(a.id), tension: { [b.id]: 1 } });
  assert.equal(nudge(), null, "once Tension is set the group is ready and the nudge goes away");
  assert.equal(screens.nextStepFor([], null), null, "an empty roster gets the create prompt instead");
  assert.ok(b.id, "two Travelers were needed for the Tension step");
});

const rules = await import("../src/rules.js");

await test("an invented talent resolves from the character that made it up", () => {
  const invented = { id: "custom-1", name: "Wheelman", invented: true,
    effect: { kind: "dice", bonus: 2, when: "keeping a vehicle on the road" } };
  const ch = { id: "a", name: "Driver", archetype: "veteran", talents: ["tough", "custom-1"],
    customTalents: [invented], attributes: { strength: 3, agility: 4, wits: 3, empathy: 3 } };

  assert.equal(rules.talent("custom-1"), null, "the book's list does not know it");
  assert.equal(rules.talent("custom-1", ch).name, "Wheelman", "the character does");
  assert.equal(rules.talent("tough", ch).id, "tough", "printed talents still resolve");

  // It has to reach the pool, or inventing one is decoration.
  const usable = roller.applicableTalents(ch, "agility").map((t) => t.id);
  assert.ok(usable.includes("custom-1"), "an invented dice talent is tappable on a roll");
  assert.ok(!roller.applicableTalents({ ...ch, customTalents: [] }, "agility").some((t) => t.id === "custom-1"),
    "and vanishes if the character no longer carries it");
});

await test("randomness comes from the cryptographic source, not Math.random", () => {
  const sources = readdirSync(new URL("../src", import.meta.url)).map((f) => `src/${f}`);
  const offenders = sources.filter((f) => {
    const text = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    // Strip comments before looking: core.js explains in prose why it does not use it.
    const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    return /Math\.random\s*\(/.test(code);
  });
  assert.deepEqual(offenders, [], `Math.random() in ${offenders.join(", ")}`);
});

await test("randomInt is uniform and never exceeds its bound", () => {
  const N = 60000, faces = 6;
  const counts = new Array(faces).fill(0);
  for (let i = 0; i < N; i++) {
    const v = core.randomInt(faces);
    assert.ok(v >= 0 && v < faces, `randomInt(${faces}) returned ${v}`);
    counts[v] += 1;
  }
  // Chi-square, 5 degrees of freedom. The 99.9% critical value is 20.5; a fair source
  // clears it essentially always, and a modulo-biased one on a 6-face die would not
  // — this test is here to pin the rejection sampling, not to prove cryptography.
  const expected = N / faces;
  const chi = counts.reduce((sum, n) => sum + ((n - expected) ** 2) / expected, 0);
  assert.ok(chi < 20.5, `chi-square ${chi.toFixed(1)} over ${counts.join(",")}`);
  assert.equal(core.randomInt(0), 0, "a zero bound is not a crash");
  assert.equal(core.randomInt(1), 0);
});

await test("shuffle keeps every card and moves them", () => {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  const shuffled = core.shuffle(deck);
  assert.equal(shuffled.length, 52);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), deck, "no card gained or lost");
  assert.deepEqual(deck, Array.from({ length: 52 }, (_, i) => i), "the original is untouched");
  const moved = shuffled.filter((v, i) => v !== i).length;
  assert.ok(moved > 40, `only ${moved} of 52 cards moved`);
});

const screens = await import("../src/screens.js");

await test("the roll log counts d6 faces and ignores everything else", () => {
  const dist = screens.faceDistribution([
    { dice: [6, 6, 1, 3] },
    { dice: [41] },              // a D66 result, not six d6 faces
    { dice: [2] },
    { dice: [] },
    { dice: [87] },              // a D100 result
    {}                           // an entry with no dice at all
  ]);
  assert.deepEqual(dist.counts, [1, 1, 1, 0, 0, 2], "faces 1-6 only");
  assert.equal(dist.total, 5);
  assert.equal(dist.expected, 5 / 6);
  assert.deepEqual(screens.faceDistribution([]).counts, [0, 0, 0, 0, 0, 0]);
});

// --------------------------------------------------- the shell, and what it ships

await test("the service worker caches every file the app actually loads", () => {
  const sw = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  const shell = [...sw.matchAll(/"\.\/([^"]+)"/g)].map((m) => m[1]);
  const onDisk = [
    ...readdirSync(new URL("../src", import.meta.url)).filter((f) => f.endsWith(".js")).map((f) => `src/${f}`),
    ...readdirSync(new URL("..", import.meta.url)).filter((f) => /^data.*\.js$/.test(f))
  ];
  const missing = onDisk.filter((f) => !shell.includes(f));
  assert.deepEqual(missing, [], `not in the service worker shell: ${missing.join(", ")}`);
  const stale = shell.filter((f) => /^(src\/|data)/.test(f) && !onDisk.includes(f));
  assert.deepEqual(stale, [], `shell lists files that no longer exist: ${stale.join(", ")}`);
});

await test("the app and the service worker agree on the cache version", () => {
  const sw = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  const inSw = /CACHE_VERSION = "([^"]+)"/.exec(sw)?.[1];
  assert.equal(inSw, core.CACHE_VERSION,
    "a bumped app version with a stale worker version leaves players on the old build");
});

// ------------------------------------------------------------------- campaigns

await test("a second Journey is separate from the first, and switching returns to it", () => {
  store.resetAll();
  const first = store.activeCampaignId();
  const a = makeChar({ name: "First game" });
  const second = store.createCampaign("Second Journey").id;
  assert.equal(store.listCharacters().length, 0, "a new campaign starts empty");
  makeChar({ name: "Second game" });
  assert.deepEqual(store.listCharacters().map((c) => c.name), ["Second game"]);
  store.switchCampaign(first);
  assert.deepEqual(store.listCharacters().map((c) => c.name), ["First game"]);
  assert.equal(store.getCharacter(a.id).name, "First game");
  store.renameCampaign(second, "Renamed");
  assert.ok(store.listCampaigns().some((c) => c.name === "Renamed"));
  store.deleteCampaign(second);
  assert.equal(store.listCampaigns().length, 1);
  assert.equal(store.activeCampaignId(), first, "deleting the other campaign left this one in play");
});

await test("the last campaign cannot be deleted out from under the player", () => {
  store.resetAll();
  store.deleteCampaign(store.activeCampaignId());
  assert.ok(store.listCampaigns().length >= 1, "there is always a game to play");
  assert.ok(store.activeCampaign(), "and it is the active one");
});

await test("a schema 1 save migrates into a single campaign with everything intact", () => {
  store.resetAll();
  const legacy = {
    schema: 1,
    characters: { z1: { id: "z1", name: "Legacy", archetype: "veteran",
      attributes: { strength: 3, agility: 3, wits: 3, empathy: 3 }, talents: [], conditions: [],
      tension: {}, inventory: { items: [], cash: 0 }, state: { health: 3, hope: 3, bliss: 0 } } },
    journey: { destination: "Somewhere", fuel: 5 },
    rollLog: [{ id: "L1", ts: 1, label: "Strength", dice: [6], outcome: "1 success" }]
  };
  store.importJSON(JSON.stringify(legacy));
  assert.equal(store.listCampaigns().length, 1);
  assert.equal(store.getCharacter("z1").name, "Legacy");
  assert.equal(store.getJourney().destination, "Somewhere");
  assert.equal(store.getRollLog().length, 1);
});

// ------------------------------------------------------------------ undo, record

await test("a destructive action can be taken back", () => {
  store.resetAll();
  const ch = makeChar({ name: "Doomed" });
  store.deleteCharacter(ch.id);
  assert.equal(store.getCharacter(ch.id), null);
  assert.equal(store.canUndo(), true);
  assert.match(store.undoLabel(), /Doomed|Traveler/i, "undo says what it would take back");
  assert.equal(store.undoLast(), true);
  assert.equal(store.getCharacter(ch.id).name, "Doomed");
  assert.equal(store.canUndo(), false, "undo is a single step, not a stack");
});

await test("the session record collects what happened and the debrief clears it", () => {
  store.resetAll();
  const ch = makeChar();
  store.saveCharacter({ ...ch, state: { ...ch.state, health: 1 } });
  lifecycle.advanceTime("shift", { resting: true, fed: true });
  const record = store.getSessionLog();
  assert.ok(record.length >= 1, "the Shift wrote nothing to the record");
  assert.equal(record[0].kind, "shift");
  store.clearSessionLog();
  assert.deepEqual(store.getSessionLog(), []);
});

await test("a data check reports the game rather than silently repairing it", () => {
  store.resetAll();
  makeChar();
  const report = store.checkData();
  assert.equal(report.campaigns, 1);
  assert.equal(report.characters, 1);
  assert.equal(typeof report.repaired, "boolean");
});

await test("the readable export names the Traveler and their numbers", () => {
  store.resetAll();
  makeChar({ name: "Exported", dream: "Get out", flaw: "Stubborn" });
  const text = screens.readableExport();
  assert.match(text, /Exported/i);
  assert.match(text, /Health/);
  assert.match(text, /Hope/);
  assert.match(text, /Get out/, "the Dream is part of the sheet, not just the numbers");
});

// ------------------------------------------------------------------- pronouns

const pronouns = await import("../src/pronouns.js");
const scan = await import("./pronoun-scan.mjs");

await test("a Traveler is he or she, and every word agrees", () => {
  const him = { gender: "male" }, her = { gender: "female" };
  assert.equal(pronouns.subj(him), "he");
  assert.equal(pronouns.obj(him), "him");
  assert.equal(pronouns.poss(him), "his");
  assert.equal(pronouns.refl(him), "himself");
  assert.equal(pronouns.subj(her), "she");
  assert.equal(pronouns.obj(her), "her");
  assert.equal(pronouns.poss(her), "her");
  assert.equal(pronouns.refl(her), "herself");
  assert.equal(pronouns.Subj(her), "She");
  assert.equal(pronouns.Poss(him), "His");
});

await test("a machine is an it, and a save with no gender still reads", () => {
  assert.equal(pronouns.subj({ gender: "neuter" }), "it");
  assert.equal(pronouns.poss({ gender: "neuter" }), "its");
  assert.equal(pronouns.genderOf({}), pronouns.DEFAULT_GENDER, "a Traveler from before the field existed");
  assert.equal(pronouns.genderOf({ gender: "nonsense" }), pronouns.DEFAULT_GENDER);
  assert.equal(pronouns.genderOf("female"), "female", "a bare gender string works too");
});

await test("someone the app has not met yet is named, not pluralised", () => {
  const known = pronouns.refer({ gender: "female" });
  assert.equal(known.s, "she");
  assert.equal(known.P, "Her");
  const unknown = pronouns.refer(null, "the target");
  assert.equal(unknown.s, "the target");
  assert.equal(unknown.p, "the target's");
  assert.equal(unknown.S, "The target");
});

await test("the paired name tables resolve to one half", () => {
  assert.equal(pronouns.splitPairedName("Cade/Courtney", "male"), "Cade");
  assert.equal(pronouns.splitPairedName("Cade/Courtney", "female"), "Courtney");
  assert.equal(pronouns.splitPairedName("Quinn", "female"), "Quinn", "an unpaired name is left alone");
  assert.equal(pronouns.resolvePairedName("Cade/Courtney Draper", "female"), "Courtney Draper");
});

await test("every pregen names both halves the book prints", () => {
  for (const p of pregens.PREGENS) {
    assert.ok(p.names?.male && p.names?.female, `${p.id} has no paired names`);
    for (const half of Object.values(p.names)) {
      assert.ok(!half.includes("/"), `${p.id} still carries a slash: ${half}`);
    }
  }
});

await test("normalize gives every stored Traveler a gender", () => {
  store.resetAll();
  const ch = makeChar({ name: "No gender set" });
  assert.ok(["male", "female"].includes(store.getCharacter(ch.id).gender));
});

await test("no user-facing string calls one person they, them or their", () => {
  const hits = scan.scanAll();
  const shown = hits.slice(0, 8).map((h) => `${h.file}:${h.line} ${h.text.trim().slice(0, 60)}`);
  assert.deepEqual(hits, [], `${hits.length} plural pronoun(s):\n        ${shown.join("\n        ")}`);
});

await test("the pronoun scan reads strings and ignores comments and expressions", () => {
  assert.deepEqual(scan.offenders('// they and their\nconst a = 1;'), [], "comments are for the reader");
  assert.equal(scan.offenders('const a = "they went";').length, 1);
  assert.deepEqual(scan.offenders("const a = `${r.theirs} against ${x}`;"), [],
    "a property called theirs is code, not prose");
  assert.equal(scan.offenders("const a = `${x} lost their turn`;").length, 1,
    "prose around an expression still counts");
});

const failed = results.filter((r) => r[0] === "FAIL");
for (const [status, name, msg] of results) {
  console.log(`${status === "pass" ? "  ok" : "FAIL"}  ${name}${msg ? `\n        ${msg}` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
