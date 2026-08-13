// The dice engine (Phase 3): pools, the push economy, opposed rolls, damage and death.
// Pure resolution functions live at the top so the harness can test them without a DOM.
import { el, $, rollDice, countSixes, countOnes, clamp, uid, d6 } from "./core.js";
import { ATTRIBUTES, TALENTS, PUSH, OPPOSED, COMBAT_REACTIONS, TENSION, DEATH, WEAPONS,
         BODY_ARMOR, COVER, NEUROCASTERS, NEUROCASTER_DEFAULT_PENALTY, TASER_RULE,
         FULL_AUTO_MAX_BURSTS, TRAUMATIC_EVENTS, RANGES } from "../data.js";
import { STUNTS } from "../data-vehicles.js";
import { maxHealth, maxHope, conditionModifiers, pushLegality, tracksBliss, isDronePilot } from "./derived.js";
import { SURGERY } from "../data-tables.js";
import { getCharacter, saveCharacter, listCharacters, logRoll } from "./store.js";
import { talent as findTalent, buildPool, weapon as findWeapon, rangePenalty } from "./rules.js";
import { Settings } from "./settings.js";
import { showToast, modal, promptModal, confirmModal, explain } from "./ui.js";
import { renderVitals } from "./sheet.js";
import { getCombat, findCombatant, defencePool, damageCombatant, forfeitNextTurn } from "./combat.js";

// ============================================================ pure resolution

/** Roll a pool. Base dice and gear dice stay separate — their 1s cost different things. */
export function rollPool({ base, gear }, supplied = null) {
  return {
    base: supplied ? supplied.base.slice() : rollDice(base),
    gear: supplied ? supplied.gear.slice() : rollDice(gear),
    pushed: false
  };
}

export const successes = (r) => countSixes(r.base) + countSixes(r.gear);

/**
 * Push: re-roll everything that is not a 1 or a 6. Base 1s after the push cost Hope,
 * gear 1s reduce the gear bonus. Dice showing 1 or 6 stay on the table (PUSH.rerollExcludes).
 */
export function resolvePush(result, supplied = null) {
  if (result.pushed) throw new Error("A roll may only be pushed once.");
  const keep = (d) => PUSH.rerollExcludes.includes(d);
  const reroll = (dice, given) => {
    let i = 0;
    return dice.map((d) => (keep(d) ? d : given ? given[i++] : d6()));
  };
  const next = {
    base: reroll(result.base, supplied?.base),
    gear: reroll(result.gear, supplied?.gear),
    pushed: true
  };
  next.hopeLost = countOnes(next.base);
  next.gearDamage = countOnes(next.gear);
  return next;
}

/** Opposed roll outcome. Margin drives damage: base + 1 per success beyond what was needed. */
export function resolveOpposed(attackerSixes, defenderSixes, { baseDamage = 0, kind = "close" } = {}) {
  if (attackerSixes > defenderSixes) {
    const extra = attackerSixes - defenderSixes - 1;
    return { winner: "attacker", damage: baseDamage + extra, extra };
  }
  if (attackerSixes === defenderSixes) {
    return { winner: "tie", damage: 0, note: kind === "close" ? COMBAT_REACTIONS.close.active.tie : COMBAT_REACTIONS.ranged.active.tie };
  }
  if (kind === "close") {
    const extra = defenderSixes - attackerSixes - 1;
    return { winner: "defender", damage: baseDamage + extra, extra, note: "attackerTakesDefenderWeaponDamage" };
  }
  return { winner: "defender", damage: 0, note: "miss" };
}

/** Armor and cover roll their level in dice; each 6 cancels one point. */
export function soak(damage, armorLevel, supplied = null) {
  const dice = supplied || rollDice(armorLevel);
  const stopped = countSixes(dice);
  return { dice, stopped, damage: Math.max(0, damage - stopped) };
}

/** One death roll: cumulative successes to 3 stabilizes, three failed rolls kills. */
export function deathRollStep(state, dice) {
  const sixes = countSixes(dice);
  const next = {
    successes: state.successes + sixes,
    failures: state.failures + (sixes === 0 ? 1 : 0),
    dice
  };
  next.outcome = next.successes >= DEATH.successesToStabilize ? "stabilized"
    : next.failures >= DEATH.failuresToDie ? "dead" : "continue";
  return next;
}

export const isInstantKill = (damage, maxHp) => damage >= maxHp * DEATH.instantKillMultiplier;

// ============================================================ character effects

/** Talents that could plausibly apply to a roll on this attribute, for tap-to-use. */
export function applicableTalents(ch, attr) {
  return (ch.talents || [])
    .map(findTalent)
    .filter((t) => t && t.effect?.kind === "dice" && (!t.effect.attr || t.effect.attr === attr));
}

/**
 * Base damage for the attack on the table: the weapon's own, or a bare fist —
 * which a Dirty fighter throws harder than anyone else.
 */
export function baseDamage(ch, weaponId = null) {
  const weapon = weaponId ? findWeapon(weaponId) : WEAPONS.find((w) => w.unarmed);
  if (!weapon) return 1;
  const dirty = TALENTS.find((t) => t.effect?.rule === "unarmedDamage");
  if (weapon.unarmed && (ch?.talents || []).includes(dirty?.id)) return dirty.effect.value;
  return weapon.damage ?? 1;
}

/** Every extra 6 beyond the first is another point of damage. */
export const damageWithExtras = (ch, weaponId, sixes) =>
  baseDamage(ch, weaponId) + Math.max(0, (sixes || 0) - 1);

/**
 * What the helmet costs out here. Zero unless one is actually on their head —
 * the Stimulus GO is the light one at −1, everything else is −2 (p.92).
 */
export function casterDicePenalty(ch) {
  if (!ch?.state?.wearingCaster || !ch.neurocaster) return 0;
  const model = NEUROCASTERS.find((n) => n.id === ch.neurocaster);
  return model?.realWorldPenalty ?? NEUROCASTER_DEFAULT_PENALTY;
}

export function tensionToward(ch, otherId) {
  const raw = ch.tension?.[otherId] ?? 0;
  const doubled = (ch.talents || []).includes("dramaQueen") && TENSION.dramaQueenDoublesBonus;
  return doubled ? raw * 2 : raw;
}

function applyRollCosts(ch, { hopeLost = 0, gearDamage = 0, gearRef = null, bliss = 0 }) {
  const next = structuredClone(ch);
  if (hopeLost) next.state.hope = clamp(next.state.hope - hopeLost, 0, maxHope(next));
  if (bliss && tracksBliss(next)) next.state.bliss = (next.state.bliss || 0) + bliss;
  if (gearDamage && gearRef?.kind === "caster") {
    const model = NEUROCASTERS.find((n) => n.id === next.neurocaster);
    const caster = next.state.caster || { processor: model.processor, network: model.network, graphics: model.graphics };
    caster[gearRef.attr] = Math.max(0, caster[gearRef.attr] - gearDamage);
    next.state.caster = caster;
  } else if (gearDamage && gearRef?.kind === "item") {
    const item = next.inventory.items[gearRef.index];
    if (item && item.bonus != null) item.bonus = Math.max(0, item.bonus - gearDamage);
  }
  saveCharacter(next);
  return next;
}

// ==================================================================== UI: dice

let pending = null;   // the roll currently on the table

export function diceScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

function build(rerender) {
  const chars = listCharacters();
  const wrap = el("div", {}, el("h1", {}, "Dice"));
  wrap.append(explain('Build a pool and roll it. Attribute dice plus any talent you tap, plus gear, plus whatever the situation is worth. One 6 succeeds; extra 6s add damage or a better outcome. Pushing re-rolls everything that is not a 1 or a 6, and the app charges the Hope and gear damage that follow.'));

  if (!chars.length) {
    wrap.append(el("div", { class: "empty card" },
      el("p", {}, "Create a Traveler first — rolls belong to someone."),
      el("a", { class: "btn btn-primary", href: "#/create" }, "Create a Traveler")));
    return wrap;
  }

  pending = pending || { charId: chars[0].id, attr: "strength", gear: 0, modifier: 0, talents: [], opposedId: null, result: null, weaponId: null };
  const ch = getCharacter(pending.charId) || chars[0];
  pending.charId = ch.id;

  // who
  wrap.append(el("div", { class: "field" }, el("label", {}, "Traveler"),
    el("select", { onchange: (e) => { pending.charId = e.target.value; pending.result = null; rerender(); } },
      ...chars.map((c) => el("option", { value: c.id, selected: c.id === ch.id }, c.name || "Unnamed")))));

  // attribute
  wrap.append(el("div", { class: "field" }, el("label", {}, "Attribute"),
    el("div", { class: "btn-row" },
      ...ATTRIBUTES.map((a) => el("button", {
        class: "btn" + (pending.attr === a.id ? " btn-primary" : ""),
        onclick: () => { pending.attr = a.id; pending.talents = []; pending.result = null; rerender(); }
      }, `${a.label} ${ch.attributes[a.id]}`)))));

  // Talents that swap one attribute for another: Menacing threatens on Strength,
  // Techno babbler argues on Wits, both in place of Empathy.
  const swaps = (ch.talents || []).map(findTalent)
    .filter((t) => t?.effect?.rule === "substituteAttribute" && t.effect.from === pending.attr);
  if (swaps.length) {
    const card = el("div", { class: "card" }, el("h3", {}, "Instead of that"));
    for (const t of swaps) {
      card.append(el("div", { class: "card-row" },
        el("span", {}, el("strong", {}, t.name),
          el("div", { class: "faint" }, `${t.effect.when} — roll ${t.effect.to}${t.effect.bonus ? ` and add ${t.effect.bonus} dice` : ""}.`)),
        el("button", {
          class: "btn", onclick: () => {
            pending.attr = t.effect.to;
            pending.talents = [];
            pending.modifier = (pending.modifier || 0) + (t.effect.bonus || 0);
            pending.result = null;
            rerender();
          }
        }, `Use ${t.effect.to}`)));
    }
    wrap.append(card);
  }

  // talents that could apply
  const talents = applicableTalents(ch, pending.attr);
  if (talents.length) {
    wrap.append(el("div", { class: "card" }, el("h3", {}, "Talents"),
      ...talents.map((t) => el("label", { class: "card-row", style: "text-transform:none;letter-spacing:0;color:inherit" },
        el("span", {}, el("strong", {}, t.name), el("div", { class: "faint" }, t.effect.when || "")),
        el("input", {
          type: "checkbox",
          checked: pending.talents.includes(t.id),
          onchange: (e) => {
            pending.talents = e.target.checked ? [...pending.talents, t.id] : pending.talents.filter((x) => x !== t.id);
            pending.result = null; rerender();
          }
        })))));
  }

  // target: when combat is running, attacks resolve against a real combatant
  const combat = getCombat();
  if (combat?.active) {
    const targets = combat.combatants.filter((c) => c.id !== ch.id);
    wrap.append(el("div", { class: "card-row", style: "margin-bottom:var(--gap)" },
      el("span", { class: "faint" }, `Round ${combat.round} — a fight is running`),
      el("a", { class: "btn", href: "#/combat" }, "Back to combat")));
    wrap.append(el("div", { class: "field" }, el("label", {}, "Target"),
      el("select", { onchange: (e) => { pending.targetId = e.target.value || null; rerender(); } },
        el("option", { value: "" }, "No target"),
        ...targets.map((c) => el("option", { value: c.id, selected: pending.targetId === c.id },
          `${c.name}${c.kind === "threat" ? ` — ${c.health ?? "?"} hp` : ""}`)))));
  } else if (pending.targetId) {
    pending.targetId = null;
  }

  // weapon: sets the gear dice, the range penalty and the base damage in one place
  const weapons = WEAPONS.filter((w) => !w.explosive);
  const weaponSelect = el("select", { "aria-label": "Weapon",
    onchange: (e) => { pending.weaponId = e.target.value || null; pending.result = null; rerender(); } },
    el("option", { value: "" }, "No weapon"),
    ...weapons.map((w) => el("option", { value: w.id, selected: pending.weaponId === w.id }, w.name)));
  const rangeSelect = el("select", { "aria-label": "Range",
    onchange: (e) => { pending.range = e.target.value; pending.result = null; rerender(); } },
    ...RANGES.map((r) => el("option", { value: r.id, selected: (pending.range || "engaged") === r.id }, r.label)));

  const chosen = pending.weaponId ? findWeapon(pending.weaponId) : null;
  const rangeMod = chosen ? rangePenalty(chosen, pending.range || "engaged") : 0;
  const weaponCard = el("div", { class: "card" }, el("h3", {}, "Weapon"),
    el("div", { class: "field" }, weaponSelect),
    chosen ? el("div", { class: "field" }, el("label", {}, "Range to the target"), rangeSelect) : null);

  if (chosen) {
    weaponCard.append(el("p", { class: "faint" },
      `${chosen.gearBonusSource === "neurocasterNetwork" ? "Gear dice from your neurocaster's Network" : `+${chosen.bonus || 0} gear dice`}` +
      ` · damage ${chosen.damage ?? (chosen.special === "stun" ? "stun only" : `blast ${chosen.blastPower}`)}` +
      ` · ${chosen.min} to ${chosen.max}`));
    if (rangeMod === null) weaponCard.append(el("p", { style: "color:var(--danger)" }, "Out of range — this weapon cannot reach that far."));
    else if (rangeMod < 0) weaponCard.append(el("p", { class: "faint" }, `${rangeMod} dice for firing inside its minimum range.`));
    // A gun used at arm's length is still a gun, but it is Strength that lands the shot.
    if (chosen.min !== "engaged" && (pending.range || "engaged") === "engaged" && pending.attr !== "strength") {
      weaponCard.append(el("div", { class: "card-row" },
        el("span", { class: "faint" }, "A firearm in close combat hits on Strength, not Agility."),
        el("button", {
          class: "btn", onclick: () => { pending.attr = "strength"; pending.talents = []; pending.result = null; rerender(); }
        }, "Use Strength")));
    }
    if (chosen.fullAuto) weaponCard.append(toggleRow("Full auto", "fullAuto", "On a hit you may fire again, up to three bursts. Empties the magazine.", rerender));
    // You cannot ambush someone already fighting: anyone in the tracker is in active combat.
    if (combat?.active) {
      pending.ambush = false;
      weaponCard.append(el("p", { class: "faint" }, "No ambush: everyone here is already in active combat."));
    } else {
      weaponCard.append(toggleRow("Ambush", "ambush", "An unaware target cannot fight back or dodge. Sneaking into close combat costs 3 dice.", rerender));
    }
    if (chosen.special === "stun") weaponCard.append(el("p", { class: "faint" }, "No damage: the target rolls Strength at −2 dice or loses their next turn."));
  }
  wrap.append(weaponCard);

  // circumstances that cost dice wherever you are: the helmet on your head, the wheel in your hands
  const casterPenalty = casterDicePenalty(ch);
  // Most things you do with a helmet on need eyes or legs, so it starts applied.
  if (casterPenalty && pending.casterOn === undefined) pending.casterOn = true;
  const circumstances = el("div", { class: "card" }, el("h3", {}, "Circumstances"));
  if (casterPenalty) {
    circumstances.append(toggleRow("Wearing the neurocaster",
      "casterOn",
      `${casterPenalty} dice on any real-world action needing mobility or vision. Untick it for something you could do blind and still.`,
      rerender));
  }
  circumstances.append(toggleRow("Doing this while driving", "driving",
    `${STUNTS.otherActionsWhileDriving} dice for anything that is not maneuvering the vehicle.`, rerender));
  wrap.append(circumstances);

  const casterMod = pending.casterOn && casterPenalty ? casterPenalty : 0;
  const drivingMod = pending.driving ? STUNTS.otherActionsWhileDriving : 0;

  // gear + modifier
  wrap.append(el("div", { class: "card" },
    numberRow("Gear dice", pending.gear, (v) => { pending.gear = Math.max(0, v); pending.result = null; rerender(); }),
    numberRow("Helpers", pending.helpers || 0, (v) => { pending.helpers = clamp(v, 0, 3); pending.result = null; rerender(); }),
    numberRow("Modifier", pending.modifier, (v) => { pending.modifier = v; pending.result = null; rerender(); })));

  // opposed
  const others = chars.filter((c) => c.id !== ch.id);
  if (others.length) {
    wrap.append(el("div", { class: "field" }, el("label", {}, "Opposed by another Traveler (adds Tension dice)"),
      el("select", { onchange: (e) => { pending.opposedId = e.target.value || null; pending.result = null; rerender(); } },
        el("option", { value: "" }, "No one"),
        ...others.map((c) => el("option", { value: c.id, selected: pending.opposedId === c.id }, c.name || "Unnamed")))));
  }

  // pool preview
  const mods = conditionModifiers(ch, { attr: pending.attr });
  const talentDice = pending.talents.reduce((sum, id) => sum + (findTalent(id)?.effect.bonus || 0), 0);
  const tension = pending.opposedId ? tensionToward(ch, pending.opposedId) : 0;
  const weaponGear = chosen && chosen.gearBonusSource !== "neurocasterNetwork" ? (chosen.bonus || 0) : 0;
  const ambushMod = pending.ambush && (pending.range || "engaged") === "engaged" ? -3 : 0;
  const pool = buildPool({
    attributeValue: ch.attributes[pending.attr],
    talentBonus: talentDice + tension,
    gearBonus: pending.gear + weaponGear,
    modifier: pending.modifier + mods.mod + (rangeMod || 0) + ambushMod + (pending.helpers || 0)
      + casterMod + drivingMod
  });

  wrap.append(el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("strong", {}, `${pool.base} base + ${pool.gear} gear`),
      el("span", { class: "faint" }, `${pool.base + pool.gear} dice`)),
    mods.notes.length ? el("div", { class: "faint" }, "Conditions: " + mods.notes.join(", ")) : null,
    tension ? el("div", { class: "faint" }, `Tension +${tension}`) : null,
    rangeMod ? el("div", { class: "faint" }, `Range ${rangeMod}`) : null,
    pending.helpers ? el("div", { class: "faint" }, `${pending.helpers} helping (+${pending.helpers}) — helping costs their turn in combat`) : null,
    ambushMod ? el("div", { class: "faint" }, `Ambush ${ambushMod}`) : null,
    casterMod ? el("div", { class: "faint" }, `Neurocaster ${casterMod}`) : null,
    drivingMod ? el("div", { class: "faint" }, `Driving ${drivingMod}`) : null));

  const legality = pushLegality(ch);
  if (pending.result) wrap.append(resultCard(ch, pool, legality, rerender));

  // Roll is the most-pressed control in the game and sat below seven cards of setup.
  // It lives above the tab bar now, carrying the pool size with it.
  wrap.append(el("div", { class: "actionbar-spacer" }));
  wrap.append(el("div", { class: "actionbar" },
    el("div", { class: "actionbar-inner" },
      el("span", { class: "pool" }, `${pool.base + pool.gear}`,
        el("small", {}, `${pool.base} base · ${pool.gear} gear`)),
      el("button", { class: "btn btn-primary", onclick: () => doRoll(ch, pool, rerender, false) }, "Roll"),
      Settings.manualDice()
        ? el("button", { class: "btn", onclick: () => doRoll(ch, pool, rerender, true) }, "Enter dice")
        : null)));

  // The sheet's own header follows the Traveler you are rolling for.
  renderVitals(ch);
  return wrap;
}

function toggleRow(label, key, blurb, rerender) {
  return el("label", { class: "card-row", style: "text-transform:none;letter-spacing:0;color:inherit;padding:6px 0" },
    el("span", {}, el("strong", {}, label), el("div", { class: "faint" }, blurb)),
    el("input", {
      type: "checkbox",checked: !!pending[key],
      "aria-label": label,
      onchange: (e) => { pending[key] = e.target.checked; pending.result = null; rerender(); }
    }));
}

function numberRow(label, value, onChange) {
  return el("div", { class: "card-row", style: "padding:6px 0" },
    el("span", {}, label),
    el("div", { class: "btn-row" },
      el("button", { class: "btn", "aria-label": `Lower ${label}`, onclick: () => onChange(value - 1) }, "−"),
      el("span", { class: "mono", style: "min-width:3ch;text-align:center" }, value > 0 ? `+${value}` : value),
      el("button", { class: "btn", "aria-label": `Raise ${label}`, onclick: () => onChange(value + 1) }, "+")));
}

async function doRoll(ch, pool, rerender, manual, burst = 1) {
  let supplied = null;
  if (manual) {
    supplied = await askDice(pool.base, pool.gear, burst > 1 ? `Burst ${burst} — enter the dice` : "Enter the dice you rolled");
    if (!supplied) return;
  }
  pending.result = rollPool({ base: pool.base, gear: pool.gear }, supplied);
  pending.pool = pool;
  pending.burst = burst;
  writeLog(ch, pool, pending.result, false, burst);
  rerender();
}

/** Manual entry: two stages, so a push charges Hope and degrades gear from the right dice. */
async function askDice(baseCount, gearCount, title) {
  const parse = (text, count) => {
    const values = String(text).match(/[1-6]/g)?.map(Number) || [];
    return values.length === count ? values : null;
  };
  const baseText = await promptModal(title, { label: `${baseCount} base dice, e.g. ${Array.from({ length: baseCount }, () => 4).join(" ")}` });
  if (baseText == null) return null;
  const base = parse(baseText, baseCount);
  if (!base) { showToast(`Enter exactly ${baseCount} numbers from 1 to 6.`, "danger"); return null; }
  let gear = [];
  if (gearCount) {
    const gearText = await promptModal(title, { label: `${gearCount} gear dice` });
    if (gearText == null) return null;
    gear = parse(gearText, gearCount);
    if (!gear) { showToast(`Enter exactly ${gearCount} numbers from 1 to 6.`, "danger"); return null; }
  }
  return { base, gear };
}

function resultCard(ch, pool, legality, rerender) {
  const r = pending.result;
  const total = successes(r);
  const card = el("div", { class: "card", "aria-live": "polite" },
    el("div", { class: "card-row" },
      el("h3", { style: "margin:0" }, total ? `${total} success${total > 1 ? "es" : ""}` : "Failure"),
      el("span", { class: "mono faint" }, [...r.base, ...r.gear].join(" "))),
    el("div", { class: "faint" },
      `base ${r.base.join(" ") || "—"}${r.gear.length ? ` · gear ${r.gear.join(" ")}` : ""}`));

  if (total > 1) card.append(el("p", { class: "faint" }, `${total - 1} extra ${total - 1 === 1 ? "success" : "successes"} — +${total - 1} damage in combat, or a better result elsewhere.`));

  if (!r.pushed) {
    const rerollable = [...r.base, ...r.gear].filter((d) => !PUSH.rerollExcludes.includes(d)).length;
    if (!legality.may) {
      card.append(el("p", { class: "faint" }, "A trauma prevents you from pushing."));
    } else if (rerollable === 0) {
      card.append(el("p", { class: "faint" }, "Nothing left to re-roll — every die shows a 1 or a 6."));
    } else {
      card.append(el("button", {
        class: "btn btn-block" + (legality.must ? " btn-primary" : ""),
        onclick: () => doPush(ch, pool, rerender)
      }, legality.must ? `Push (${rerollable} dice — a trauma compels you)` : `Push ${rerollable} dice`));
      card.append(el("p", { class: "faint" }, "Each 1 on a base die costs a point of Hope; each 1 on a gear die degrades the gear."));
    }
  } else {
    const bits = [];
    if (r.hopeLost) bits.push(`${r.hopeLost} Hope lost`);
    if (r.gearDamage) bits.push(`gear reduced by ${r.gearDamage}`);
    card.append(el("p", { class: "faint" }, bits.join(" · ") || "Pushed at no cost."));
  }

  const weapon = pending.weaponId ? findWeapon(pending.weaponId) : null;
  const burst = pending.burst || 1;

  // Full auto: a hit buys another burst, up to three rolls, at the same target or a new one.
  if (weapon?.fullAuto && pending.fullAuto && total > 0) {
    if (burst < FULL_AUTO_MAX_BURSTS) {
      card.append(el("button", {
        class: "btn btn-block", style: "margin-top:8px",
        onclick: () => doRoll(ch, pool, rerender, Settings.manualDice(), burst + 1)
      }, `Fire burst ${burst + 1} of ${FULL_AUTO_MAX_BURSTS}`));
      card.append(el("p", { class: "faint" }, "Same target or another. The magazine is empty either way — reloading is an action."));
    } else {
      card.append(el("p", { class: "faint" }, "Three bursts is the limit. The magazine is empty; reloading is an action."));
    }
  }

  // A taser deals no damage: the target rolls Strength at −2 or loses their next turn.
  if (weapon?.special === "stun" && total > 0) {
    card.append(el("button", {
      class: "btn btn-block", style: "margin-top:8px", onclick: () => stunDialog(rerender)
    }, "They resist the stun"));
  }

  const actions = el("div", { class: "btn-row", style: "margin-top:12px" },
    el("button", { class: "btn", onclick: () => { pending.result = null; rerender(); } }, "Clear"));
  if (pending.ambush) {
    card.append(el("p", { class: "faint" }, "Ambushed — they are unaware, so they cannot fight back or dodge. They take the hit."));
  } else {
    actions.append(el("button", { class: "btn", onclick: () => opposedDialog(ch, total, rerender) }, "They fight back"));
  }
  if (weapon?.special !== "stun") {
    actions.append(el("button", { class: "btn", onclick: () => damageDialog(ch, rerender) }, "Apply damage"));
  }
  card.append(actions);
  return card;
}

/** The taser: no damage, a Strength roll at −2, and a lost turn on a failure (p.81). */
async function stunDialog(onDone) {
  const target = pending.targetId ? findCombatant(pending.targetId) : null;
  const pool = el("input", {
    type: "number", min: "1", "aria-label": "Their Strength",
    value: String(target ? defencePool(target, "close") : 3)
  });
  const go = await modal({
    title: "Stunned?",
    body: el("div", {},
      el("p", { class: "faint" }, `They roll Strength at ${TASER_RULE.modifier} dice. No 6 and they lose their next turn.`),
      target ? el("p", {}, el("strong", {}, target.name), el("span", { class: "faint" }, " is resisting.")) : null,
      el("div", { class: "field" }, el("label", {}, "Their Strength"), pool)),
    actions: [{ label: "Roll", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  if (!go) return;

  const dice = rollDice(Math.max(1, (Number(pool.value) || 1) + TASER_RULE.modifier));
  const held = countSixes(dice) > 0;
  if (!held && target) forfeitNextTurn(target.id, "stunned");
  logRoll({ label: "Resist the stun", by: target?.name, dice, outcome: held ? "shook it off" : "loses their next turn" });
  await modal({
    title: held ? "Shook it off" : "Stunned",
    body: el("div", {},
      el("p", { class: "mono faint" }, dice.join(" ")),
      el("p", {}, held ? "They stay on their feet and act as normal." : "They lose their next turn."),
      !held && !target ? el("p", { class: "faint" }, "Nothing tracked to mark — remember it costs them their next turn.") : null),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  onDone?.();
}

async function doPush(ch, pool, rerender) {
  let supplied = null;
  if (Settings.manualDice()) {
    const rerollBase = pending.result.base.filter((d) => !PUSH.rerollExcludes.includes(d)).length;
    const rerollGear = pending.result.gear.filter((d) => !PUSH.rerollExcludes.includes(d)).length;
    if (rerollBase || rerollGear) {
      supplied = await askDice(rerollBase, rerollGear, "Enter only the dice you re-rolled");
      if (!supplied) return;
    }
  }
  const pushed = resolvePush(pending.result, supplied);
  pending.result = pushed;

  const updated = applyRollCosts(ch, {
    hopeLost: pushed.hopeLost,
    gearDamage: pushed.gearDamage,
    gearRef: pending.gearRef || null
  });
  writeLog(updated, pool, pushed, true);
  renderVitals(updated);
  if (pushed.hopeLost && updated.state.hope === 0) showToast("Hope has run out — Breakdown.", "danger");
  rerender();
}

function writeLog(ch, pool, result, pushed, burst = 1) {
  logRoll({
    by: ch.name || "Unnamed",
    label: `${ATTRIBUTES.find((a) => a.id === pending.attr)?.label || "Roll"}${burst > 1 ? ` — burst ${burst}` : ""}${pushed ? " (pushed)" : ""}`,
    parts: pool.parts,
    dice: [...result.base, ...result.gear],
    base: result.base, gear: result.gear,
    outcome: `${successes(result)} success${successes(result) === 1 ? "" : "es"}` +
      (pushed && result.hopeLost ? ` · −${result.hopeLost} Hope` : "") +
      (pushed && result.gearDamage ? ` · gear −${result.gearDamage}` : "")
  });
}

// ============================================================ opposed resolution
/**
 * The defender declares before dice: take the hit / stand tall, or fight back / dodge.
 * A reaction makes it opposed and costs their next turn.
 */
export async function opposedDialog(attacker, attackerSixes, onDone) {
  const target = pending.targetId ? findCombatant(pending.targetId) : null;
  const defaultKind = (pending.range || "engaged") === "engaged" ? "close" : "ranged";

  const kindSelect = el("select", { "aria-label": "Kind of attack" },
    el("option", { value: "close", selected: defaultKind === "close" }, "Close combat — they can fight back"),
    el("option", { value: "ranged", selected: defaultKind === "ranged" }, "Ranged — they can dodge"));
  const dicePool = el("input", {
    type: "number", min: "1", "aria-label": "Defender's dice",
    value: String(target ? defencePool(target, defaultKind) : 4)
  });
  kindSelect.addEventListener("change", () => {
    if (target) dicePool.value = String(defencePool(target, kindSelect.value));
  });
  const damage = el("input", {
    type: "number", min: "0", "aria-label": "Base damage",
    value: String(baseDamage(attacker, pending.weaponId))
  });

  const go = await modal({
    title: `You rolled ${attackerSixes}`,
    body: el("div", {},
      el("p", { class: "faint" }, "A defender who reacts turns this into an opposed roll and forfeits their next turn — but it covers every attack until then."),
      target ? el("p", {}, el("strong", {}, target.name), el("span", { class: "faint" }, " is defending — their dice are filled in below.")) : null,
      el("div", { class: "field" }, el("label", {}, "Kind of attack"), kindSelect),
      el("div", { class: "field" }, el("label", {}, "Defender's dice"), dicePool),
      el("div", { class: "field" }, el("label", {}, "Base damage"), damage)),
    actions: [{ label: "They react", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  if (!go) return;

  const defenderDice = rollDice(Math.max(1, Number(dicePool.value) || 1));
  const defenderSixes = countSixes(defenderDice);
  // Reacting is not free: it costs the defender their next turn, however the roll lands.
  if (target) forfeitNextTurn(target.id, "reacted");
  const outcome = resolveOpposed(attackerSixes, defenderSixes, {
    baseDamage: Math.max(0, Number(damage.value) || 0),
    kind: kindSelect.value
  });

  logRoll({
    by: attacker.name, label: `Opposed (${kindSelect.value})`, dice: defenderDice,
    outcome: `${attackerSixes} vs ${defenderSixes} — ${outcome.winner}${outcome.damage ? `, ${outcome.damage} damage` : ""}`
  });

  const readings = {
    attacker: `You get through for ${outcome.damage} damage.`,
    tie: kindSelect.value === "close"
      ? "Tooth and nail — neither of you gets the upper hand, and nobody is hurt."
      : "Even — the shot misses.",
    defender: kindSelect.value === "close"
      ? `They turn it around: you take ${outcome.damage} damage from their weapon.`
      : "They get clear. The shot misses."
  };

  await modal({
    title: `${attackerSixes} against ${defenderSixes}`,
    body: el("div", {},
      el("p", { class: "mono faint" }, defenderDice.join(" ")),
      el("p", {}, readings[outcome.winner]),
      el("p", { class: "faint" }, "Reacting costs them their next turn, but covers every attack until then.")),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });

  if (outcome.winner === "defender" && outcome.damage) {
    const next = structuredClone(getCharacter(attacker.id));
    next.state.health = clamp(next.state.health - outcome.damage, 0, maxHealth(next));
    saveCharacter(next);
    renderVitals(next);
  }

  // A hit on a tracked combatant lands on them, wherever their health lives.
  if (outcome.winner === "attacker" && outcome.damage && target) {
    const result = damageCombatant(target.id, outcome.damage);
    if (result) {
      showToast(`${result.name}: ${result.health} left${result.health === 0 ? " — down" : ""}`,
        result.health === 0 ? "danger" : "");
      if (result.kind === "traveler") renderVitals(getCharacter(target.id));
    }
  }
  onDone?.();
}

// ============================================================ traumatic events
/** Empathy resists the loss; any Hope actually lost also costs your next turn (freeze). */
export function resolveTraumaticEvent(potential, sixes, ch) {
  const flashbacks = (ch.conditions || []).some((c) => (c.effects || []).some((e) => e.rule === "traumaticLossPlus"));
  const worse = flashbacks ? potential + 1 : potential;
  const lost = Math.max(0, worse - sixes);
  const panic = (ch.conditions || []).some((c) => (c.effects || []).some((e) => e.rule === "autoBreakdownOnHopeLoss"));
  const violent = (ch.conditions || []).some((c) => (c.effects || []).some((e) => e.rule === "attackInsteadOfFreeze"));
  return { lost, freeze: lost > 0 && !violent, violent: lost > 0 && violent, breakdown: lost > 0 && panic };
}

export async function traumaticEventDialog(ch, onDone) {
  const level = el("select", { "aria-label": "Potential Hope loss" },
    ...TRAUMATIC_EVENTS.map((e) => el("option", { value: e.hope }, `${e.event} — ${e.hope}`)),
    el("option", { value: "1" }, "Something else — 1"),
    el("option", { value: "2" }, "Something else — 2"),
    el("option", { value: "3" }, "Something else — 3"));

  const go = await modal({
    title: "Traumatic event",
    body: el("div", {},
      el("p", { class: "faint" }, "Roll Empathy — each 6 cancels a point of the loss. Pushing risks losing more."),
      el("div", { class: "field" }, el("label", {}, "Potential Hope loss"), level)),
    actions: [{ label: "Roll Empathy", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  if (!go) return;

  const hardened = (ch.talents || []).includes("hardened") ? 2 : 0;
  const overwhelmed = (ch.conditions || []).some((c) => (c.effects || []).some((e) => e.dice === -2 && e.when === "resisting traumatic events")) ? -2 : 0;
  const dice = rollDice(Math.max(1, ch.attributes.empathy + hardened + overwhelmed));
  const outcome = resolveTraumaticEvent(Number(level.value), countSixes(dice), ch);

  const next = structuredClone(ch);
  next.state.hope = clamp(next.state.hope - outcome.lost, 0, maxHope(next));
  if (outcome.freeze) { next.state.frozen = true; forfeitNextTurn(ch.id, "frozen"); }
  saveCharacter(next);
  renderVitals(next);

  logRoll({ by: ch.name, label: "Resist trauma", dice, outcome: `${outcome.lost} Hope lost${outcome.freeze ? " · frozen" : ""}` });

  await modal({
    title: outcome.lost ? `${outcome.lost} Hope lost` : "Held together",
    body: el("div", {},
      el("p", { class: "mono faint" }, dice.join(" ")),
      outcome.freeze ? el("p", {}, "You freeze — you lose your next turn.") : null,
      outcome.violent ? el("p", {}, "Instead of freezing you attack the nearest person in close combat, and fight until you take damage.") : null,
      outcome.breakdown ? el("p", { style: "color:var(--danger)" }, "Panic attacks: this triggers an immediate Breakdown.") : null,
      next.state.hope === 0 ? el("p", { style: "color:var(--danger)" }, "Hope is gone — Breakdown.") : null),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  onDone?.();
}

// ================================================================ rally / stabilize
export async function rallyDialog(target, onDone) {
  const helpers = listCharacters().filter((c) => c.id !== target.id && c.state.health > 0);
  if (!helpers.length) { showToast("Nobody else is standing.", "danger"); return; }

  const who = el("select", { "aria-label": "Who helps" }, ...helpers.map((c) => el("option", { value: c.id }, c.name)));
  const isBreakdown = target.state.hope === 0;
  const body = el("div", {},
    el("p", { class: "faint" }, isBreakdown
      ? "An Empathy roll from someone in the same zone. Success restores Hope equal to the number of 6s."
      : "An Empathy roll from someone in the same zone. Success restores Health equal to the number of 6s — but does not stabilize; death rolls continue."),
    el("div", { class: "field" }, el("label", {}, "Who helps"), who));

  const mode = await modal({
    title: isBreakdown ? "Rally from Breakdown" : "Rally the Incapacitated", body,
    actions: [
      { label: "Rally (Empathy)", value: "rally", class: "btn-primary" },
      !isBreakdown ? { label: "Stabilize (Medic)", value: "stabilize" } : null,
      { label: "Cancel", value: null }
    ].filter(Boolean)
  });
  if (!mode) return;

  const helper = getCharacter(who.value);
  const leader = (helper.talents || []).includes("leader") ? 2 : 0;

  if (mode === "stabilize") {
    if (!(helper.talents || []).includes("medic")) { showToast("Only someone with the Medic talent can stabilize.", "danger"); return; }
    const dice = rollDice(Math.max(1, helper.attributes.wits));
    const ok = countSixes(dice) > 0;
    logRoll({ by: helper.name, label: "Stabilize", dice, outcome: ok ? "stabilized" : "failed" });
    if (ok) {
      const next = structuredClone(getCharacter(target.id));
      next.state.death = null;
      next.state.stabilized = true;
      saveCharacter(next);
    }
    await modal({
      title: ok ? "Stabilized" : "No good",
      body: el("p", {}, ok ? "The death rolls stop. They are still Incapacitated until rallied." : "The bleeding continues — death rolls go on."),
      actions: [{ label: "Understood", value: true, class: "btn-primary" }]
    });
    onDone?.();
    return;
  }

  const depressed = isBreakdown && (target.conditions || []).some((c) => (c.effects || []).some((e) => e.rule === "cannotBeRallied"));
  if (depressed) { showToast("Depressed: this Traveler cannot be rallied by anyone.", "danger"); return; }

  const dice = rollDice(Math.max(1, helper.attributes.empathy + leader));
  const sixes = countSixes(dice);
  const next = structuredClone(getCharacter(target.id));
  if (sixes) {
    if (isBreakdown) next.state.hope = clamp(next.state.hope + sixes, 0, maxHope(next));
    else next.state.health = clamp(next.state.health + sixes, 0, maxHealth(next));
    saveCharacter(next);
    renderVitals(next);
  }
  logRoll({ by: helper.name, label: isBreakdown ? "Rally (Hope)" : "Rally (Health)", dice, outcome: sixes ? `+${sixes}` : "failed" });

  await modal({
    title: sixes ? `Back on their feet — +${sixes}` : "No response",
    body: el("div", {},
      el("p", { class: "mono faint" }, dice.join(" ")),
      !isBreakdown && sixes ? el("p", {}, "Still not stabilized — the death rolls continue until a Medic stops them.") : null),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  onDone?.();
}

// ================================================================ damage flow
export async function damageDialog(ch, onDone) {
  const combatTarget = pending?.targetId ? findCombatant(pending.targetId) : null;
  // Default to what this attack actually did: the weapon's damage plus every extra 6.
  const sixes = pending?.result ? successes(pending.result) : 0;
  const amount = el("input", {
    type: "number", min: "0", "aria-label": "Damage",
    value: String(sixes ? damageWithExtras(ch, pending.weaponId, sixes) : 1)
  });
  const armor = el("select", { "aria-label": "Armor or cover" },
    el("option", { value: "0" }, "None"),
    ...BODY_ARMOR.map((a) => el("option", { value: a.armor }, `${a.name} (${a.armor})`)),
    ...COVER.map((c) => el("option", { value: c.armor }, `Cover: ${c.name} (${c.armor})`)));
  const body = el("div", {},
    el("div", { class: "field" }, el("label", {}, "Damage"), amount),
    el("div", { class: "field" }, el("label", {}, "Armor or cover"), armor));

  const go = await modal({
    title: "Apply damage", body,
    actions: [{ label: "Apply", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  if (!go) return;

  const raw = Math.max(0, Number(amount.value) || 0);
  const level = Number(armor.value) || 0;
  const soaked = level ? soak(raw, level) : { damage: raw, stopped: 0, dice: [] };

  // If a combatant is targeted and it is not this character, the damage lands on them.
  if (combatTarget && combatTarget.id !== ch.id) {
    const result = damageCombatant(combatTarget.id, soaked.damage);
    logRoll({ by: ch.name, label: "Damage", dice: soaked.dice, outcome: `${soaked.damage} to ${result?.name ?? "target"}` });
    await modal({
      title: `${soaked.damage} to ${result?.name ?? "the target"}`,
      body: el("p", {}, result ? `${result.health} left${result.health === 0 ? " — down." : "."}` : "Applied."),
      actions: [{ label: "Understood", value: true, class: "btn-primary" }]
    });
    onDone?.();
    return;
  }

  const hMax = maxHealth(ch);

  const next = structuredClone(ch);
  next.state.health = clamp(next.state.health - soaked.damage, 0, hMax);
  saveCharacter(next);
  renderVitals(next);

  logRoll({
    by: ch.name, label: "Damage",
    dice: soaked.dice,
    outcome: `${raw} damage${soaked.stopped ? `, ${soaked.stopped} stopped` : ""} → ${next.state.health}/${hMax} Health`
  });

  // A Drone Pilot takes damage as a drone: Hull zero disconnects the operator and the
  // drone is unusable until repaired. No death rolls, and no flesh injuries either.
  if (isDronePilot(next) && next.state.health === 0) {
    next.state.disconnected = true;
    next.state.death = null;
    saveCharacter(next);
    renderVitals(next);
    await modal({
      title: "Hull breached — disconnected",
      body: el("div", {},
        el("p", {}, "The drone's Hull is gone, so the operator is thrown out of it immediately."),
        el("p", { class: "faint" }, "No death rolls: your body is elsewhere. The drone cannot be used again until someone repairs it.")),
      actions: [{ label: "Understood", value: true, class: "btn-danger" }]
    });
    onDone?.();
    return;
  }

  if (isInstantKill(soaked.damage, hMax)) {
    await modal({
      title: "Killed outright",
      body: el("p", {}, `${soaked.damage} damage is twice the maximum Health of ${hMax}. No death rolls — time to make a new Traveler.`),
      actions: [{ label: "Understood", value: true, class: "btn-danger" }]
    });
  } else if (next.state.health === 0) {
    // More damage on someone already down restarts the death rolls from zero,
    // stabilized or not — the old tally does not carry over.
    const again = !!(next.state.stabilized || next.state.death);
    next.state.stabilized = false;
    next.state.death = { successes: 0, failures: 0 };
    saveCharacter(next);
    showToast(again ? "Hit while down — death rolls start over." : "Incapacitated — death rolls begin.", "danger");
    await deathRollDialog(getCharacter(next.id));
  }
  onDone?.();
}

// ================================================================= death rolls
export async function deathRollDialog(ch) {
  let state = ch.state.death || { successes: 0, failures: 0 };
  const nineLives = (ch.talents || []).includes("nineLives");
  const diceCount = nineLives ? 6 : DEATH.rollDice;

  while (true) {
    const body = el("div", {},
      el("p", { class: "faint" }, `Roll ${diceCount} dice each turn. This roll can never be pushed. Three 6s in total stabilizes you; three rolls without a 6 kills you.`),
      el("div", { class: "card-row" },
        el("span", {}, "Successes"), el("span", { class: "mono" }, `${state.successes}/${DEATH.successesToStabilize}`)),
      el("div", { class: "card-row" },
        el("span", {}, "Failed rolls"), el("span", { class: "mono" }, `${state.failures}/${DEATH.failuresToDie}`)),
      nineLives ? el("p", { class: "faint" }, "Nine lives: six dice instead of four.") : null);

    const action = await modal({
      title: "Death roll", body, dismissible: false,
      actions: [
        { label: "Roll", value: "roll", class: "btn-primary" },
        Settings.manualDice() ? { label: "Enter dice", value: "manual" } : null,
        { label: "Pause", value: "pause" }
      ].filter(Boolean)
    });
    if (action === "pause" || action === undefined) break;

    let dice;
    if (action === "manual") {
      const supplied = await askDice(diceCount, 0, "Enter your death roll");
      if (!supplied) continue;
      dice = supplied.base;
    } else {
      dice = rollDice(diceCount);
    }

    state = deathRollStep(state, dice);
    const next = structuredClone(getCharacter(ch.id) || ch);
    next.state.death = { successes: state.successes, failures: state.failures };

    logRoll({ by: ch.name, label: "Death roll", dice, outcome: `${countSixes(dice)} success · ${state.successes}/3 up, ${state.failures}/3 down` });

    if (state.outcome === "stabilized") {
      next.state.death = null;
      next.state.stabilized = true;
      saveCharacter(next);
      await modal({ title: "Stabilized", body: el("p", {}, "Three successes. The death rolls stop — but you are still Incapacitated until someone rallies you."), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
      break;
    }
    if (state.outcome === "dead") {
      next.state.dead = true;
      saveCharacter(next);
      await modal({ title: "Dead", body: el("p", {}, "Three failed death rolls. Time to make a new Traveler."), actions: [{ label: "Understood", value: true, class: "btn-danger" }] });
      break;
    }
    saveCharacter(next);
  }
  renderVitals(getCharacter(ch.id));
}

// ==================================================================== surgery
/** Surgery takes a Shift and a Wits roll from a Surgeon; failure re-Incapacitates the patient.
    Paid surgery is the cash alternative for a Traveler with no Surgeon in the group. */
export async function surgeryDialog(patient, condition, onDone) {
  const surgeons = listCharacters().filter((c) => (c.talents || []).includes("surgeon"));
  const who = el("select", { "aria-label": "Surgeon" },
    ...surgeons.map((c) => el("option", { value: c.id }, c.name)),
    el("option", { value: "__paid" }, `Pay for it — $${SURGERY.cashAlternative}`));

  const mode = await modal({
    title: `Operate — ${condition.name}`,
    body: el("div", {},
      el("p", { class: "faint" }, "A Shift of work and a Wits roll. A failed operation leaves the patient Incapacitated. Until it succeeds, this injury does not heal at all."),
      el("div", { class: "field" }, el("label", {}, "Who operates"), who)),
    actions: [{ label: "Operate", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  if (!mode) return;

  const clear = () => onDone?.((c) => {
    const target = c.conditions.find((x) => x.id === condition.id);
    if (target) target.surgery = false;
  });

  if (who.value === "__paid") {
    const cash = patient.inventory?.cash ?? 0;
    if (cash < SURGERY.cashAlternative) { showToast(`Not enough money — $${SURGERY.cashAlternative} is needed.`, "danger"); return; }
    onDone?.((c) => {
      c.inventory.cash -= SURGERY.cashAlternative;
      const target = c.conditions.find((x) => x.id === condition.id);
      if (target) target.surgery = false;
    });
    showToast("Paid for. The injury can heal now.");
    return;
  }

  const surgeon = getCharacter(who.value);
  const kit = (patient.inventory?.items || []).some((i) => i.gearId === "surgicalInstruments") ? 2 : 0;
  const dice = rollDice(Math.max(1, surgeon.attributes.wits + kit));
  const ok = countSixes(dice) > 0;
  logRoll({ by: surgeon.name, label: `Surgery — ${condition.name}`, dice, outcome: ok ? "succeeded" : "failed" });

  if (ok) { clear(); showToast("The operation holds. It can heal now."); }
  else {
    onDone?.((c) => { c.state.health = 0; });
    showToast("The operation fails — the patient is Incapacitated.", "danger");
  }
}

// ==================================================================== repairs
/** Repairs need tools, a Shift and a Wits roll; each 6 restores a point of the bonus. */
export async function repairDialog(ch, ref, onDone) {
  const helpers = listCharacters();
  const who = el("select", { "aria-label": "Who repairs it" }, ...helpers.map((c) => el("option", { value: c.id }, c.name)));
  const toolMap = { caster: "toolsNeurocaster", item: "toolsGeneral" };
  const go = await modal({
    title: `Repair ${ref.name}`,
    body: el("div", {},
      el("p", { class: "faint" }, "A Shift of work and a Wits roll. Each 6 restores one point of the gear bonus. The right tools add gear dice."),
      el("div", { class: "field" }, el("label", {}, "Who repairs it"), who)),
    actions: [{ label: "Repair", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  if (!go) return;

  const mechanic = getCharacter(who.value);
  const tools = (mechanic.inventory?.items || []).find((i) => i.gearId === toolMap[ref.kind] || i.gearId === "toolsGeneral");
  const toolDice = tools?.bonus || 0;
  const talentDice = (mechanic.talents || []).includes(ref.kind === "caster" ? "electronics" : "mechanic") ? 2 : 0;
  const dice = rollDice(Math.max(1, mechanic.attributes.wits + talentDice));
  const gear = rollDice(toolDice);
  const restored = countSixes(dice) + countSixes(gear);

  if (restored) {
    const next = structuredClone(getCharacter(ch.id));
    if (ref.kind === "caster") {
      const model = NEUROCASTERS.find((n) => n.id === next.neurocaster);
      const caster = next.state.caster || { processor: model.processor, network: model.network, graphics: model.graphics };
      caster[ref.attr] = Math.min(ref.max, caster[ref.attr] + restored);
      next.state.caster = caster;
    } else {
      const item = next.inventory.items[ref.index];
      if (item) item.bonus = Math.min(ref.max, (item.bonus || 0) + restored);
    }
    saveCharacter(next);
  }
  logRoll({ by: mechanic.name, label: `Repair — ${ref.name}`, dice: [...dice, ...gear], outcome: restored ? `+${restored}` : "no progress" });
  await modal({
    title: restored ? `Restored ${restored}` : "No progress",
    body: el("p", { class: "mono faint" }, [...dice, ...gear].join(" ")),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  onDone?.();
}

/** Forcing someone out of the Electric State: Hope to zero, and a mental trauma. */
/**
 * Neuroresistant: one Wits roll to walk out of a neuroscape even with Bliss at or above
 * Hope. One roll only — the app remembers it until Bliss falls back below Hope (p.93).
 */
export async function neuroresistantEscape(ch, onDone) {
  const current = getCharacter(ch.id);
  if (current.state.neuroresistantUsed) { showToast("That roll has already been made."); return; }

  const go = await modal({
    title: "Pull yourself out",
    body: el("div", {},
      el("p", { class: "faint" }, "Neuroresistant buys one Wits roll to leave under your own power. One 6 is enough. There is no second attempt."),
      el("p", {}, `Rolling ${current.attributes.wits} dice.`)),
    actions: [{ label: "Roll Wits", value: true, class: "btn-primary" }, { label: "Not yet", value: false }]
  });
  if (!go) return;

  const dice = rollDice(Math.max(1, current.attributes.wits));
  const out = countSixes(dice) > 0;
  const next = structuredClone(current);
  next.state.neuroresistantUsed = true;
  if (out) next.state.wearingCaster = false;
  saveCharacter(next);
  logRoll({ by: ch.name, label: "Neuroresistant escape", dice, outcome: out ? "walked out" : "still in there" });

  await modal({
    title: out ? "Out" : "Still in there",
    body: el("div", {},
      el("p", { class: "mono faint" }, dice.join(" ")),
      el("p", {}, out
        ? "You take the helmet off yourself. Nothing else is lost."
        : "It does not let go. Someone else will have to pull it off you.")),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  onDone?.();
}

export async function forcedDisconnect(ch) {
  const sure = await confirmModal("Pull the helmet off?",
    "They cannot leave on their own. Forcing them out drops their Hope to zero and inflicts a mental trauma — but the alternative is dying of thirst in there.", "Pull them out");
  if (!sure) return;

  const next = structuredClone(getCharacter(ch.id));
  next.state.hope = 0;
  saveCharacter(next);
  renderVitals(next);
  logRoll({ by: ch.name, label: "Forced disconnect", dice: [], outcome: "Hope to zero, roll for trauma" });
  await modal({
    title: "They are out",
    body: el("p", {}, "Hope is gone and a Breakdown with it. Roll a mental trauma on the injury screen."),
    actions: [{ label: "Roll trauma", value: true, class: "btn-primary" }]
  });
  location.hash = `#/injury/${ch.id}`;
}

/** Repairing a wrecked drone body: Wits, tools, a Shift; each 6 restores a point of Hull. */
export async function repairDroneBody(ch, onDone) {
  const helpers = listCharacters();
  const who = el("select", { "aria-label": "Who repairs it" }, ...helpers.map((c) => el("option", { value: c.id }, c.name)));
  const go = await modal({
    title: "Repair the drone",
    body: el("div", {},
      el("p", { class: "faint" }, "A Shift of work and a Wits roll, with gear dice from vehicle or general tools. Each 6 restores a point of Hull. The Mechanic talent helps."),
      el("div", { class: "field" }, el("label", {}, "Who works on it"), who)),
    actions: [{ label: "Repair", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  if (!go) return;

  const mechanic = getCharacter(who.value);
  const tools = (mechanic.inventory?.items || []).find((i) => i.gearId === "toolsVehicle" || i.gearId === "toolsGeneral");
  const talentDice = (mechanic.talents || []).includes("mechanic") ? 2 : 0;
  const dice = rollDice(Math.max(1, mechanic.attributes.wits + talentDice));
  const gear = rollDice(tools?.bonus || 0);
  const restored = countSixes(dice) + countSixes(gear);

  const next = structuredClone(getCharacter(ch.id));
  if (restored) {
    next.state.health = clamp(next.state.health + restored, 0, maxHealth(next));
    if (next.state.health > 0) next.state.disconnected = false;
    saveCharacter(next);
    renderVitals(next);
  }
  logRoll({ by: mechanic.name, label: "Repair drone", dice: [...dice, ...gear], outcome: restored ? `+${restored} Hull` : "no progress" });
  await modal({
    title: restored ? `Restored ${restored} Hull` : "No progress",
    body: el("div", {},
      el("p", { class: "mono faint" }, [...dice, ...gear].join(" ")),
      next.state.health > 0 ? el("p", {}, "It moves again — you are back inside it.") : el("p", { class: "faint" }, "Still dead metal. Try again next Shift.")),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  onDone?.();
}

/** Called from the combat tracker: pick a target, then send the player to the dice. */
export function setTarget(id) {
  pending = pending || { charId: null, attr: "strength", gear: 0, modifier: 0, talents: [], opposedId: null, result: null, weaponId: null };
  pending.targetId = id;
  pending.result = null;
}

export function resetRoller() { pending = null; }
