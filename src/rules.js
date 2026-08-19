// Pure lookups over the data libraries. No state, no DOM.
import { d66Index, fromRangeTable } from "./core.js";
import { TALENTS, ARCHETYPES, WEAPONS, NEUROCASTERS, ATTRIBUTES, RANGES, BELOW_MIN_RANGE_PENALTY } from "../data.js";
import { SERIOUS_INJURIES, MENTAL_TRAUMAS, GEAR, SHARED_ITEMS, SERVICES } from "../data-tables.js";
import { BY_ID as LIBRARY_BY_ID, LIBRARY, GLOSSARY, GLOSSARY_BY_TERM } from "../data-library.js";

/**
 * A talent by id. The book lets a Traveler invent one at a debrief ("or even create a
 * new one"), so an invented talent lives on the character and is resolved from there.
 */
export const talent = (id, ch = null) =>
  TALENTS.find((t) => t.id === id) || (ch?.customTalents || []).find((t) => t.id === id) || null;
export const talentByName = (name) => {
  const n = String(name).toLowerCase();
  return TALENTS.find((t) => t.name.toLowerCase() === n || (t.aliases || []).some((a) => a.toLowerCase() === n)) || null;
};
export const archetype = (id) => ARCHETYPES.find((a) => a.id === id) || null;
export const weapon = (id) => WEAPONS.find((w) => w.id === id) || null;
export const neurocaster = (id) => NEUROCASTERS.find((n) => n.id === id) || null;
export const gearItem = (id) => GEAR.find((g) => g.id === id) || null;
export const service = (id) => SERVICES.find((s) => s.id === id) || null;
export const attribute = (id) => ATTRIBUTES.find((a) => a.id === id) || null;
export const rule = (id) => LIBRARY_BY_ID[id] || null;

export function searchLibrary(query) {
  const q = query.trim().toLowerCase();
  if (!q) return LIBRARY;
  return LIBRARY.filter((e) =>
    e.title.toLowerCase().includes(q) || e.text.toLowerCase().includes(q) || (e.tags || []).some((t) => t.includes(q)));
}

/** One word, one sentence. The other index into the rules, for a player who has not read them. */
export const glossary = (term) => GLOSSARY_BY_TERM[String(term).toLowerCase()] || null;

export function searchGlossary(query) {
  const q = query.trim().toLowerCase();
  if (!q) return GLOSSARY;
  return GLOSSARY.filter((g) => g.term.toLowerCase().includes(q) || g.text.toLowerCase().includes(q));
}

export const rangeBand = (id) => RANGES.find((r) => r.id === id)?.band ?? 0;

/** Dice penalty for attacking inside a weapon's minimum range; null if out of range entirely. */
export function rangePenalty(w, targetRange) {
  const target = rangeBand(targetRange);
  const min = rangeBand(w.min), max = rangeBand(w.max);
  if (target > max) return null;
  if (target < min) return (min - target) * BELOW_MIN_RANGE_PENALTY;
  return 0;
}

export const rollInjury = (roll) => fromRangeTable(SERIOUS_INJURIES, roll);
export const rollTrauma = (roll) => fromRangeTable(MENTAL_TRAUMAS, roll);
export const sharedItem = (roll) => SHARED_ITEMS.find((i) => i.roll === roll) || null;
/** Look up a 36-entry D66 table (stored in D66_ORDER sequence) by its rolled value. */
export const d66Lookup = (table, roll) => table[d66Index(roll)] ?? null;

/** Assemble the dice pool for a roll, showing its parts so the log can re-derive it. */
export function buildPool({ attributeValue = 0, talentBonus = 0, gearBonus = 0, modifier = 0 }) {
  const parts = [
    { source: "attribute", dice: attributeValue },
    { source: "talent", dice: talentBonus },
    { source: "gear", dice: gearBonus },
    { source: "modifier", dice: modifier }
  ].filter((p) => p.dice);
  const total = Math.max(1, parts.reduce((sum, p) => sum + p.dice, 0));
  return { parts, base: Math.max(1, attributeValue + talentBonus + modifier), gear: Math.max(0, gearBonus), total };
}
