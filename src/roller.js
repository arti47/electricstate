// The dice engine (Phase 3): pools, the push economy, opposed rolls, damage and death.
// Pure resolution functions live at the top so the harness can test them without a DOM.
import { el, $, rollDice, countSixes, countOnes, clamp, uid, d6 } from "./core.js";
import { ATTRIBUTES, TALENTS, PUSH, OPPOSED, COMBAT_REACTIONS, TENSION, DEATH, WEAPONS,
         BODY_ARMOR, COVER, NEUROCASTERS, TASER_RULE, TRAUMATIC_EVENTS } from "../data.js";
import { maxHealth, maxHope, conditionModifiers, pushLegality, tracksBliss } from "./derived.js";
import { SURGERY } from "../data-tables.js";
import { getCharacter, saveCharacter, listCharacters, logRoll } from "./store.js";
import { talent as findTalent, buildPool, weapon as findWeapon, rangePenalty } from "./rules.js";
import { Settings } from "./settings.js";
import { showToast, modal, promptModal, confirmModal, explain } from "./ui.js";
import { renderVitals } from "./sheet.js";

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

  // talents that could apply
  const talents = applicableTalents(ch, pending.attr);
  if (talents.length) {
    wrap.append(el("div", { class: "card" }, el("h3", {}, "Talents"),
      ...talents.map((t) => el("label", { class: "card-row", style: "text-transform:none;letter-spacing:0;color:inherit" },
        el("span", {}, el("strong", {}, t.name), el("div", { class: "faint" }, t.effect.when || "")),
        el("input", {
          type: "checkbox", style: "width:auto;min-height:auto",
          checked: pending.talents.includes(t.id),
          onchange: (e) => {
            pending.talents = e.target.checked ? [...pending.talents, t.id] : pending.talents.filter((x) => x !== t.id);
            pending.result = null; rerender();
          }
        })))));
  }

  // gear + modifier
  wrap.append(el("div", { class: "card" },
    numberRow("Gear dice", pending.gear, (v) => { pending.gear = Math.max(0, v); pending.result = null; rerender(); }),
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
  const pool = buildPool({
    attributeValue: ch.attributes[pending.attr],
    talentBonus: talentDice + tension,
    gearBonus: pending.gear,
    modifier: pending.modifier + mods.mod
  });

  wrap.append(el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("strong", {}, `${pool.base} base + ${pool.gear} gear`),
      el("span", { class: "faint" }, `${pool.base + pool.gear} dice`)),
    mods.notes.length ? el("div", { class: "faint" }, "Conditions: " + mods.notes.join(", ")) : null,
    tension ? el("div", { class: "faint" }, `Tension +${tension}`) : null));

  const legality = pushLegality(ch);
  wrap.append(el("div", { class: "btn-row" },
    el("button", { class: "btn btn-primary", onclick: () => doRoll(ch, pool, rerender, false) }, "Roll"),
    Settings.manualDice()
      ? el("button", { class: "btn", onclick: () => doRoll(ch, pool, rerender, true) }, "Enter dice")
      : null));

  if (pending.result) wrap.append(resultCard(ch, pool, legality, rerender));
  wrap.append(el("div", { class: "btn-row", style: "margin-top:16px" },
    el("a", { class: "btn", href: "#/log" }, "Roll log"),
    el("a", { class: "btn", href: "#/neuro" }, "Neuroscape"),
    el("a", { class: "btn", href: "#/combat" }, "Combat")));
  return wrap;
}

function numberRow(label, value, onChange) {
  return el("div", { class: "card-row", style: "padding:6px 0" },
    el("span", {}, label),
    el("div", { class: "btn-row" },
      el("button", { class: "btn", "aria-label": `Lower ${label}`, onclick: () => onChange(value - 1) }, "−"),
      el("span", { class: "mono", style: "min-width:3ch;text-align:center" }, value > 0 ? `+${value}` : value),
      el("button", { class: "btn", "aria-label": `Raise ${label}`, onclick: () => onChange(value + 1) }, "+")));
}

async function doRoll(ch, pool, rerender, manual) {
  let supplied = null;
  if (manual) {
    supplied = await askDice(pool.base, pool.gear, "Enter the dice you rolled");
    if (!supplied) return;
  }
  pending.result = rollPool({ base: pool.base, gear: pool.gear }, supplied);
  pending.pool = pool;
  writeLog(ch, pool, pending.result, false);
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

  card.append(el("div", { class: "btn-row", style: "margin-top:12px" },
    el("button", { class: "btn", onclick: () => { pending.result = null; rerender(); } }, "Clear"),
    el("button", { class: "btn", onclick: () => damageDialog(ch, rerender) }, "Apply damage")));
  return card;
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

function writeLog(ch, pool, result, pushed) {
  logRoll({
    by: ch.name || "Unnamed",
    label: `${ATTRIBUTES.find((a) => a.id === pending.attr)?.label || "Roll"}${pushed ? " (pushed)" : ""}`,
    parts: pool.parts,
    dice: [...result.base, ...result.gear],
    base: result.base, gear: result.gear,
    outcome: `${successes(result)} success${successes(result) === 1 ? "" : "es"}` +
      (pushed && result.hopeLost ? ` · −${result.hopeLost} Hope` : "") +
      (pushed && result.gearDamage ? ` · gear −${result.gearDamage}` : "")
  });
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
  if (outcome.freeze) next.state.frozen = true;
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
  const amount = el("input", { type: "number", value: "1", min: "0", "aria-label": "Damage" });
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

  if (isInstantKill(soaked.damage, hMax)) {
    await modal({
      title: "Killed outright",
      body: el("p", {}, `${soaked.damage} damage is twice the maximum Health of ${hMax}. No death rolls — time to make a new Traveler.`),
      actions: [{ label: "Understood", value: true, class: "btn-danger" }]
    });
  } else if (next.state.health === 0) {
    showToast("Incapacitated — death rolls begin.", "danger");
    await deathRollDialog(next);
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

export function resetRoller() { pending = null; }
