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

const failed = results.filter((r) => r[0] === "FAIL");
for (const [status, name, msg] of results) {
  console.log(`${status === "pass" ? "  ok" : "FAIL"}  ${name}${msg ? `\n        ${msg}` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
