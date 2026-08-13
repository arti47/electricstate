// Character-derived calculations. Pure functions over a character object.
import { ceilHalf, clamp } from "./core.js";
import { TALENTS, DERIVED, ATTRIBUTE_MIN, ATTRIBUTE_MAX, DRONE_PILOT_RULES, BODY_ARMOR } from "../data.js";
import { genderOf } from "./pronouns.js";

const talentEffect = (id) => TALENTS.find((t) => t.id === id)?.effect;

export function maxHealth(ch) {
  const base = ceilHalf((ch.attributes?.strength || 0) + (ch.attributes?.agility || 0));
  const bonus = (ch.talents || []).some((t) => t === "tough") ? DERIVED.health.talentBonus.tough : 0;
  return base + bonus;
}
export function maxHope(ch) {
  const base = ceilHalf((ch.attributes?.wits || 0) + (ch.attributes?.empathy || 0));
  const bonus = (ch.talents || []).some((t) => t === "dreamer") ? DERIVED.hope.talentBonus.dreamer : 0;
  return base + bonus;
}

/** The Drone Pilot takes damage as a drone and never tracks Bliss (p.70). */
export const isDronePilot = (ch) => ch.archetype === DRONE_PILOT_RULES.archetype;
/** "hull" for a Drone Pilot: no death rolls, no flesh injuries — disconnection and repair. */
export const damageModel = (ch) => (isDronePilot(ch) ? DRONE_PILOT_RULES.damageAs : "health");
export const healsByResting = (ch) => !isDronePilot(ch);
export const tracksBliss = (ch) => !isDronePilot(ch);
export const usesCash = (ch) => !isDronePilot(ch);
export const needsFood = (ch) => !isDronePilot(ch);

export function attributeTotal(ch) {
  return Object.values(ch.attributes || {}).reduce((a, b) => a + (b || 0), 0);
}
export const qualifiesForBonusTalent = (total) => total <= 15;

export function validAttributes(attrs) {
  return Object.values(attrs || {}).every((v) => v >= ATTRIBUTE_MIN && v <= ATTRIBUTE_MAX);
}

/** Sum of dice modifiers a character's conditions impose on a given roll context. */
export function conditionModifiers(ch, context = {}) {
  let mod = 0;
  const notes = [];
  // Worn body armor is clumsy: it costs dice on every Agility roll.
  const armor = BODY_ARMOR.find((a) => a.id === ch.state?.armor);
  if (armor && context.attr === "agility") { mod += armor.agility; notes.push(`${armor.name} ${armor.agility}`); }
  for (const cond of ch.conditions || []) {
    for (const eff of cond.effects || []) {
      if (typeof eff.dice !== "number") continue;
      const attrs = Array.isArray(eff.attr) ? eff.attr : eff.attr ? [eff.attr] : null;
      const attrMatch = !attrs || (context.attr && attrs.includes(context.attr));
      const whenMatch = !eff.when || (context.tags || []).includes(eff.when);
      if (attrMatch && (whenMatch || !eff.when)) { mod += eff.dice; notes.push(`${cond.name} ${eff.dice}`); }
    }
  }
  return { mod, notes };
}

/** Trauma rules that rewrite the push economy. Later traumas win (TRAUMA_CONFLICTS). */
export function pushLegality(ch) {
  const rules = (ch.conditions || []).flatMap((c) => (c.effects || []).map((e) => e.rule)).filter(Boolean);
  const last = [...rules].reverse();
  const forbidIdx = last.indexOf("cannotPush");
  const forceIdx = last.indexOf("mustPush");
  if (forbidIdx === -1 && forceIdx === -1) return { may: true, must: false };
  if (forbidIdx === -1) return { may: true, must: true };
  if (forceIdx === -1) return { may: false, must: false };
  return forbidIdx < forceIdx ? { may: false, must: false } : { may: true, must: true };
}

export function normalize(ch) {
  const c = { ...ch };
  c.attributes = { strength: 2, agility: 2, wits: 2, empathy: 2, ...(c.attributes || {}) };
  c.talents = c.talents || [];
  c.conditions = c.conditions || [];
  c.inventory = c.inventory || { items: [], cash: 0 };
  c.tension = c.tension || {};
  // Every Traveler has one, because every sentence the app writes about them needs it.
  c.gender = genderOf(c);
  c.state = c.state || {};
  const hMax = maxHealth(c), pMax = maxHope(c);
  c.state.health = clamp(c.state.health ?? hMax, 0, hMax);
  c.state.hope = clamp(c.state.hope ?? pMax, 0, pMax);
  c.state.bliss = c.state.bliss ?? 0;
  c.state.permanentBliss = c.state.permanentBliss ?? 0;
  // The one Neuroresistant roll is spent per stretch of being lost, so it comes back
  // as soon as Hope climbs clear of Bliss again.
  if (c.state.neuroresistantUsed && c.state.bliss < c.state.hope) c.state.neuroresistantUsed = false;
  return c;
}
