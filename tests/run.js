// Headless regression harness. Data-layer and rules invariants run without a browser;
// browser smoke tests attach once playwright-core is installed (npm i).
import assert from "node:assert/strict";

const results = [];
const test = async (name, fn) => {
  try { await fn(); results.push(["pass", name]); }
  catch (err) { results.push(["FAIL", name, err.message]); }
};

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
  for (const key of ["terrain", "population", "communications", "size", "prosperity", "weather", "blocker", "need"]) {
    assert.ok(stop[key], `stop missing ${key}`);
  }
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

await test("goal and threat seeds roll three distinct words from their own table", () => {
  for (const table of [names.GOAL_SEEDS, names.THREAT_SEEDS]) {
    for (let i = 0; i < 100; i++) {
      const words = wizardMod.rollDescriptors(names.SEED_ROLLS, table);
      assert.equal(words.length, 3);
      assert.equal(new Set(words).size, 3);
      for (const w of words) assert.ok(table.includes(w), `${w} is not in its own table`);
    }
  }
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
  for (const key of ["JOURNEY_PLACES", "JOURNEY_PURPOSE", "ROUTE_FEATURES", "VEHICLE_DETAILS"]) {
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

await test("the book's own D6 destination table is still available", () => {
  assert.equal(solo.DESTINATIONS.length, 6);
  assert.ok(solo.DESTINATIONS.every((d) => typeof d === "string" && d.length > 5));
});

const failed = results.filter((r) => r[0] === "FAIL");
for (const [status, name, msg] of results) {
  console.log(`${status === "pass" ? "  ok" : "FAIL"}  ${name}${msg ? `\n        ${msg}` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
