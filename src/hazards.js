// Hazards and vehicle handling (Chapter 4). Everything here rolls the book's own dice
// and applies the result, rather than leaving the player to work it out.
import { el, rollDice, countSixes, clamp, d6, d66, pick, fromRangeTable, onReset } from "./core.js";
import { EXPLOSIVES, FIRES, DISEASES, FIRE_SPREAD_PER_ROUND, HAZARD_RULES } from "../data.js";
import { ACCIDENTS, COMPONENT_DAMAGE, CHASE, CHASE_OBSTACLES, ACCIDENT_REROLL_MODIFIER, RAMMING, STUNTS, VEHICLE_DAMAGE } from "../data-vehicles.js";
import { GEAR, REPAIR } from "../data-tables.js";
import { harm, maxHope, pushLegality } from "./derived.js";
import { getCharacter, saveCharacter, listCharacters, logRoll, getJourney, saveJourney } from "./store.js";
import { showToast, modal, explain, related } from "./ui.js";
import { renderVitals } from "./sheet.js";
import { forfeitNextTurn } from "./combat.js";
import { afterHarm, soak, resolvePush } from "./roller.js";
import { atTheWheel } from "./session.js";
import { vehicleArt, hazardArt, driveArt } from "./graphics.js";

// ------------------------------------------------------------------- hazards
/** Blast Power, Fire Intensity and disease Virulence all roll dice the target cannot push. */
export function hazardRoll(power) {
  const dice = rollDice(power);
  return { dice, damage: countSixes(dice) };
}

/** Agility mitigation: each 6 cancels a point. Dodging an explosion costs your next turn. */
export function mitigate(damage, dice) {
  const stopped = countSixes(dice);
  return { stopped, damage: Math.max(0, damage - stopped) };
}

export const fallingDamage = (metres) => Math.floor(metres * HAZARD_RULES.falling.damagePerMetre);

export function hazardScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

let hazardKind = "explosion";   // which of the four is open
let hazardWho = null;

function build(rerender) {
  const chars = listCharacters();
  const wrap = el("div", {}, el("h1", {}, "Hazards"));
  wrap.append(explain("The things that hurt you without swinging: blasts, fire, falls, disease, cold and hunger. Each rolls its own dice — Blast Power, Intensity, Virulence — where every 6 is a point of damage, and none of these rolls can be pushed."));

  if (!chars.length) {
    // An empty screen that does not say what to do next is a dead end, and a dead end is
    // where a first-time player stops.
    wrap.append(el("div", { class: "empty card" },
      el("p", {}, "Hazards happen to somebody. Make a Traveler and this screen fills in."),
      el("a", { class: "btn btn-primary", href: "#/create" }, "Create a Traveler")));
    return wrap;
  }

  // Remembered across the hazard picker, which re-draws the screen.
  const who = el("select", { "aria-label": "Traveler", onchange: (e) => { hazardWho = e.target.value; } },
    ...chars.map((c) => el("option", { value: c.id, selected: c.id === hazardWho }, c.name || "Unnamed")));
  wrap.append(el("div", { class: "field" }, el("label", {}, "Who is exposed"), who));

  const card = (title, blurb, ...kids) => el("div", { class: "card" }, el("h3", {}, title), blurb ? el("p", { class: "faint" }, blurb) : null, ...kids);
  const target = () => getCharacter(who.value) || chars[0];

  // explosions
  const blast = el("select", { "aria-label": "Explosive" },
    ...EXPLOSIVES.map((e) => el("option", { value: e.blastPower }, `${e.name} — Blast Power ${e.blastPower}`)));
  const cards = {};
  cards.explosion = (card("Explosion", "Hits everything at Short range of the impact. You may dodge with Agility, but it costs your next turn.",
    el("div", { class: "field" }, blast),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-primary", onclick: () => applyHazard(target(), "Explosion", +blast.value, { dodgeable: true }, rerender) }, "Roll blast"))));

  // fire
  const fire = el("select", { "aria-label": "Fire" },
    ...FIRES.map((f) => el("option", { value: f.intensity }, `${f.name} — Intensity ${f.intensity}`)));
  cards.fire = (card("Fire", `Burns again every round you stay in it, and spreads by ${FIRE_SPREAD_PER_ROUND} Intensity a round.`,
    el("div", { class: "field" }, fire),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-primary", onclick: () => applyHazard(target(), "Fire", +fire.value, {}, rerender) }, "Roll intensity"))));

  // falling
  const height = el("input", { type: "number", value: "4", min: "1", "aria-label": "Height in metres" });
  cards.falling = (card("Falling", "Damage is half the height in metres, rounded down. A controlled jump rolls Agility to reduce it.",
    el("div", { class: "field" }, el("label", {}, "Height in metres"), height),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-primary", onclick: () => applyFall(target(), Number(height.value) || 0, rerender) }, "Fall"))));

  // disease
  const disease = el("select", { "aria-label": "Disease" },
    ...DISEASES.map((d) => el("option", { value: d.virulence }, `${d.name} — Virulence ${d.virulence}`)));
  // A Nurse who spends a Stretch on them adds their own Wits successes to the patient's.
  const nurses = listCharacters().filter((c) => (c.talents || []).includes("nurse"));
  const nurse = nurses.length
    ? el("select", { "aria-label": "Nursed by" }, el("option", { value: "" }, "No one"),
        ...nurses.map((c) => el("option", { value: c.id }, c.name)))
    : null;
  cards.disease = (card("Disease", "An opposed Strength roll against the Virulence, once a day, until you win one. While sick you cannot heal.",
    el("div", { class: "field" }, disease),
    nurse ? el("div", { class: "field" }, el("label", {}, "Nursed by (a Stretch of care)"), nurse) : null,
    el("div", { class: "btn-row" },
      el("button", {
        class: "btn btn-primary",
        onclick: () => applyDisease(target(), +disease.value, rerender, nurse?.value ? getCharacter(nurse.value) : null)
      }, "Resist"))));

  // Four hazards, one at a time: pick by its picture, and the one card you need is open
  // with its single roll — rather than four rolls stacked down the screen.
  const titles = { explosion: "Explosion", fire: "Fire", falling: "Falling", disease: "Disease" };
  wrap.append(el("div", { class: "haz-pick", role: "group", "aria-label": "Hazard" },
    ...Object.keys(cards).map((k) => el("button", {
      // The open one is not a button to press again.
      class: "haz-tile" + (hazardKind === k ? " is-on" : ""), "aria-pressed": hazardKind === k ? "true" : "false",
      disabled: hazardKind === k,
      onclick: () => { hazardKind = k; rerender(); }
    }, hazardArt(k), el("span", {}, titles[k])))));
  wrap.append(cards[hazardKind]);

  // cold and hunger live on the Time screen, where their intervals belong
  wrap.append(card("Cold, hunger and sleep", "These are checked when time passes, so the controls live on the Time screen — tick Out in the cold there and end a Shift.",
    related([["#/time", "Time", "clock"]])));

  return wrap;
}

async function applyHazard(ch, label, power, { dodgeable = false } = {}, onDone) {
  const roll = hazardRoll(power);
  let final = roll.damage;
  let dodge = null;

  // Someone already down cannot throw themselves clear.
  if (dodgeable && final > 0 && (ch.state?.health ?? 1) > 0) {
    const wants = await modal({
      title: `${label}: ${final} damage`,
      body: el("div", {},
        el("p", { class: "mono faint" }, roll.dice.join(" ")),
        el("p", {}, "Dodge with Agility? Each 6 cancels a point — but you lose your next turn.")),
      actions: [{ label: "Dodge", value: true, class: "btn-primary" }, { label: "Take it", value: false }]
    });
    if (wants) {
      dodge = rollDice(ch.attributes.agility);
      const m = mitigate(final, dodge);
      final = m.damage;
    }
  }

  const next = structuredClone(ch);
  const outcome = harm(next, final);
  // Throwing yourself clear costs the next turn, same as freezing does.
  if (dodge) { next.state.frozen = true; forfeitNextTurn(ch.id, "frozen"); }
  saveCharacter(next);
  renderVitals(next);
  logRoll({ by: ch.name, label, dice: roll.dice, outcome: `${final} damage${dodge ? ` after dodging (${dodge.join(" ")})` : ""}` });

  await modal({
    title: final ? `${final} damage` : "Unhurt",
    body: el("div", {},
      el("p", { class: "mono faint" }, roll.dice.join(" ")),
      dodge ? el("p", { class: "faint" }, `Dodged: ${dodge.join(" ")} — you lose your next turn.`) : null,
      next.state.health === 0 ? el("p", { style: "color:var(--danger)" }, "Incapacitated.") : null),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  await afterHarm(next, outcome, final);
  onDone?.();
}

async function applyFall(ch, metres, onDone) {
  const raw = fallingDamage(metres);
  const controlled = await modal({
    title: `Falling ${metres}m`,
    body: el("p", {}, `That is ${raw} damage. A controlled jump rolls Agility, and each 6 cancels a point.`),
    actions: [{ label: "Controlled jump", value: true, class: "btn-primary" }, { label: "Just fall", value: false }]
  });

  let dice = [];
  let final = raw;
  if (controlled) {
    dice = rollDice(ch.attributes.agility);
    final = mitigate(raw, dice).damage;
  }

  const next = structuredClone(ch);
  const outcome = harm(next, final);
  saveCharacter(next);
  renderVitals(next);
  logRoll({ by: ch.name, label: "Falling", dice, outcome: `${final} damage from ${metres}m` });
  await modal({
    title: final ? `${final} damage` : "Landed clean",
    body: el("p", { class: "mono faint" }, dice.join(" ") || `${metres}m ÷ 2`),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  await afterHarm(next, outcome, final);
  onDone?.();
}

async function applyDisease(ch, virulence, onDone, nurse = null) {
  const mine = rollDice(ch.attributes.strength + ((ch.talents || []).includes("resilient") ? 2 : 0));
  const theirs = rollDice(virulence);
  const nursing = nurse ? rollDice(Math.max(1, nurse.attributes.wits)) : [];
  const my6 = countSixes(mine) + countSixes(nursing), their6 = countSixes(theirs);
  const damage = Math.max(0, their6 - my6);

  const next = structuredClone(ch);
  let diseaseHarm = "hurt";
  if (my6 > their6) {
    next.conditions = (next.conditions || []).filter((c) => c.kind !== "disease");
  } else {
    if (damage) diseaseHarm = harm(next, damage);
    if (!(next.conditions || []).some((c) => c.kind === "disease")) {
      next.conditions = [...(next.conditions || []), { id: `disease-${Date.now()}`, kind: "disease", name: `Disease (Virulence ${virulence})`, effects: [] }];
    }
  }
  saveCharacter(next);
  renderVitals(next);
  logRoll({ by: ch.name, label: "Disease", dice: mine, outcome: my6 > their6 ? "fought it off" : `${damage} damage` });

  await modal({
    title: my6 > their6 ? "Fought it off" : damage ? `${damage} damage` : "Infected, but holding",
    body: el("div", {},
      el("p", { class: "faint" }, `You ${mine.join(" ")}${nursing.length ? ` · ${nurse.name} nursing ${nursing.join(" ")}` : ""} · disease ${theirs.join(" ")}`),
      my6 > their6 ? el("p", {}, "The sickness passes.") : el("p", {}, "Roll again tomorrow. You cannot heal while sick.")),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  await afterHarm(next, diseaseHarm, damage);
  onDone?.();
}

// ------------------------------------------------------------------ vehicles
let driveKind = "stunt";     // which manoeuvre's card is open
let driveTouched = false;    // the player chose one; stop following the chase
onReset(() => { hazardKind = "explosion"; hazardWho = null; driveKind = "stunt"; driveTouched = false; });

export function vehicleScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(buildVehicle(rerender));
  host.append(buildVehicle(rerender));
  return host;
}

function buildVehicle(rerender) {
  const j = getJourney() || {};
  const v = j.vehicle;
  const chars = listCharacters();
  const wrap = el("div", {}, el("h1", {}, "Driving"));
  wrap.append(explain("Stunts, accidents, ramming and chases. A stunt is an Agility roll with the vehicle's Maneuverability as gear dice, and failing one means rolling on the accident table. Chases ignore zones and Speed entirely — each round is one opposed Agility roll."));

  if (!v) {
    wrap.append(el("div", { class: "empty card" },
      el("p", {}, "No vehicle on the Journey yet."),
      el("a", { class: "btn btn-primary", href: "#/journey" }, "The Journey")));
    return wrap;
  }

  // The vehicle is reference; it sits under the manoeuvre you are making, not above it.
  const vehicleCard = (el("div", { class: "card" },
    el("div", { class: "art-row" }, vehicleArt(v, { hull: j.hull ?? v.hull, max: v.hull }),
      el("div", { class: "card-row" }, el("strong", {}, v.label || v.name),
        el("span", { class: "mono faint" }, `Hull ${j.hull ?? v.hull}/${v.hull}`))),
    el("div", { class: "faint" }, `Maneuverability ${maneuverNow(j)}${maneuverNow(j) !== v.maneuverability ? ` of ${v.maneuverability}` : ""} · Speed ${v.speed} · Armor ${v.armor}${j.componentHits ? " · component damage taken" : ""}`),
    inoperable(j) ? el("p", { style: "color:var(--danger)" }, `${inoperable(j)} — it needs repairs and a spare part before it moves again.`) : null,
    related([["#/journey", "Journey", "road"]])));

  // Who is driving is the Journey's, shared with the dashboard and the narration.
  const wheel = atTheWheel(j, chars);
  const driver = el("select", { "aria-label": "Driver", onchange: (e) => { saveJourney({ ...(getJourney() || {}), driverId: e.target.value }); } },
    ...chars.filter((c) => !c.state?.dead).map((c) => el("option", { value: c.id, selected: c.id === wheel?.id }, c.name || "Unnamed")));
  wrap.append(el("div", { class: "field" }, el("label", {}, "Driving"), driver));

  const terrain = el("select", { "aria-label": "Terrain" },
    el("option", { value: "road" }, "On the road"),
    el("option", { value: "boat" }, "On water"),
    el("option", { value: "air" }, "In the air"));

  const cards = {
    stunt: () => el("div", { class: "card" }, el("h3", {}, "Stunt"),
      el("p", { class: "faint" }, "Jumping, hard terrain, breaking through something. Uses your action; failure means an accident."),
      el("div", { class: "field" }, terrain),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-primary", onclick: () => stunt(getCharacter(driver.value), v, terrain.value, rerender) }, "Roll stunt"),
        el("button", { class: "btn", onclick: () => accident(terrain.value, rerender, 0, getCharacter(driver.value)) }, "Accident only"))),
    ramming: () => el("div", { class: "card" }, el("h3", {}, "Ramming"),
      el("p", { class: "faint" }, `Only at Engaged range. Roll Agility with Maneuverability as gear dice; a hit deals half your starting Hull (${Math.ceil(v.hull / 2)}), +1 per extra 6, and you take half the other vehicle's.`),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-primary", onclick: () => ram(getCharacter(driver.value), v, rerender) }, "Ram something"))),
    chase: () => chaseCard(j, v, chars, driver, rerender),
    // Damage and repairs are between-scene work, so they come last.
    repairs: () => hullCard(j, v, chars, rerender)
  };
  // A chase in progress is the thing on screen until it ends.
  if (j.chase && driveKind !== "chase" && !driveTouched) driveKind = "chase";
  const titles = { stunt: "Stunt", ramming: "Ramming", chase: "Chase", repairs: "Hull and repairs" };
  wrap.append(el("div", { class: "haz-pick", role: "group", "aria-label": "Manoeuvre" },
    ...Object.keys(cards).map((k) => el("button", {
      class: "haz-tile drive-tile" + (driveKind === k ? " is-on" : ""), "aria-pressed": driveKind === k ? "true" : "false",
      disabled: driveKind === k,
      onclick: () => { driveKind = k; driveTouched = true; rerender(); }
    }, driveArt(k), el("span", {}, titles[k])))));
  wrap.append(cards[driveKind]());
  wrap.append(vehicleCard);

  return wrap;
}

// ------------------------------------------------------------- vehicle state
/** Hull right now; the Journey only stores it once the vehicle has taken damage. */
export const hullNow = (j) => j?.hull ?? j?.vehicle?.hull ?? 0;
/** Maneuverability right now: a gear bonus, worn down by pushes and accidents (p.105). */
export const maneuverNow = (j) => j?.maneuverability ?? j?.vehicle?.maneuverability ?? 0;
/** Hull zero or Maneuverability zero leaves a vehicle inoperable (VEHICLE_DAMAGE). */
export function inoperable(j) {
  const v = j?.vehicle;
  if (!v) return null;
  if (hullNow(j) <= 0) return "Wrecked";
  // A horse has no Maneuverability rating at all; only a rated one can fail.
  if (v.maneuverability != null && v.maneuverability > 0 && maneuverNow(j) <= 0) return "Maneuverability zero";
  return null;
}
const patchJourney = (fields) => saveJourney({ ...(getJourney() || {}), ...fields });

/**
 * A driving roll: the driver's Agility plus the vehicle's Maneuverability as gear dice, and
 * the one push every roll gets. Base 1s on the push cost Hope; gear 1s wear down the
 * Maneuverability itself, as any gear bonus wears (p.105).
 */
async function driveRoll(ch, label) {
  const j = getJourney() || {};
  let base = rollDice(Math.max(1, ch.attributes[STUNTS.attr]));
  let gear = rollDice(Math.max(0, maneuverNow(j)));
  let pushed = false;
  const sixes = () => countSixes(base) + countSixes(gear);
  const legal = pushLegality(ch);
  if (!sixes() && legal.may) {
    const push = legal.must || await modal({
      title: "No 6",
      body: el("div", {}, el("p", { class: "mono faint" }, [...base, ...gear].join(" ")),
        el("p", {}, "Push it? Everything but 1s and 6s rolls again. A 1 on an Agility die costs a Hope; a 1 on a Maneuverability die wears the vehicle down a point.")),
      actions: [{ label: "Push", value: true, class: "btn-primary" }, { label: "Take it", value: false }]
    });
    if (push) {
      const r = resolvePush({ base, gear });
      base = r.base; gear = r.gear; pushed = true;
      if (r.hopeLost) {
        const next = structuredClone(getCharacter(ch.id));
        next.state.hope = clamp((next.state.hope ?? 0) - r.hopeLost, 0, maxHope(next));
        saveCharacter(next);
        renderVitals(next);
      }
      if (r.gearDamage) patchJourney({ maneuverability: Math.max(0, maneuverNow(getJourney()) - r.gearDamage) });
    }
  }
  const dice = [...base, ...gear];
  logRoll({ by: ch.name, label: pushed ? `${label} (pushed)` : label, dice, outcome: sixes() ? `${sixes()} success${sixes() > 1 ? "es" : ""}` : "failed" });
  return { dice, sixes: sixes(), pushed };
}

/** Refuse a manoeuvre the vehicle cannot make, saying why. */
function canDrive(ch) {
  if (!ch) { showToast("No driver selected."); return false; }
  const why = inoperable(getJourney());
  if (why) { showToast(`${why}: the vehicle needs repairs before it moves.`, "danger"); return false; }
  return true;
}

/**
 * Damage to the vehicle (p.105). Its Armor Level rolls dice like body armor, each 6
 * stopping a point; Hull at zero is Wrecked; half the Hull or more in one hit is component
 * damage, and a second component damage always wrecks it.
 */
export function damageVehicle(j, raw, { armor = true, supplied = null } = {}) {
  const v = j.vehicle;
  const soaked = armor && v.armor ? soak(raw, v.armor, supplied) : { damage: raw, stopped: 0, dice: [] };
  let hull = Math.max(0, hullNow(j) - soaked.damage);
  let componentHits = j.componentHits || 0;
  const component = hull > 0 && soaked.damage >= Math.ceil(v.hull / 2);
  if (component) {
    componentHits += 1;
    if (componentHits >= 2 && VEHICLE_DAMAGE.secondComponentDamageWrecks) hull = 0;
  }
  return { journey: { ...j, hull, componentHits }, ...soaked, raw, wrecked: hull === 0, component: component && hull > 0 };
}

async function hitVehicle(raw, { armor = true, driver = null, label = "Vehicle damage" } = {}) {
  const j = getJourney() || {};
  if (!j.vehicle || raw <= 0) return;
  const r = damageVehicle(j, raw, { armor });
  saveJourney(r.journey);
  logRoll({ by: driver?.name, label, dice: r.dice, outcome: `${r.damage} to the vehicle${r.stopped ? `, ${r.stopped} stopped` : ""}${r.wrecked ? " — Wrecked" : ""}` });
  await modal({
    title: r.wrecked ? "Wrecked" : `${r.damage} damage to the vehicle`,
    body: el("div", {},
      r.dice.length ? el("p", { class: "mono faint" }, `Armor ${r.dice.join(" ")} — stopped ${r.stopped}`) : null,
      el("p", {}, r.wrecked
        ? "The Hull is gone. It needs repairs and a spare part before it moves again."
        : `Hull ${r.journey.hull} of ${j.vehicle.hull}.${r.component ? " That is half its Hull in one hit: component damage." : ""}`)),
    actions: [{ label: "Understood", value: true, class: r.wrecked ? "btn-danger" : "btn-primary" }]
  });
  if (r.component) await componentDamage(r.damage, driver);
}

/** Damage to the people in or on the vehicle, each rolling Agility to cut it (no action). */
async function hitOccupants(amount, { agilityHelps = true } = {}) {
  for (const ch of listCharacters().filter((c) => !c.state?.dead)) {
    const dice = agilityHelps ? rollDice(Math.max(1, ch.attributes.agility)) : [];
    const final = Math.max(0, amount - countSixes(dice));
    const next = structuredClone(getCharacter(ch.id));
    const outcome = harm(next, final);
    saveCharacter(next);
    renderVitals(next);
    logRoll({ by: ch.name, label: "Thrown about", dice, outcome: `${final} damage` });
    if (final) showToast(`${ch.name}: ${final} damage`, "danger");
    await afterHarm(next, outcome, final);
  }
}

async function stunt(ch, vehicle, terrain, onDone) {
  if (!canDrive(ch)) return;
  const r = await driveRoll(ch, "Stunt");
  if (r.sixes) {
    await modal({ title: "Held it", body: el("p", { class: "mono faint" }, r.dice.join(" ")), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
    onDone?.();
    return;
  }
  await modal({ title: "Lost control", body: el("div", {}, el("p", { class: "mono faint" }, r.dice.join(" ")), el("p", {}, "No successes — roll on the accident table.")), actions: [{ label: "Accident", value: true, class: "btn-danger" }] });
  await accident(terrain, onDone, 0, ch);
}

/** What each accident does to the vehicle and the people in it, by name (p.104). */
const ACCIDENT_EFFECTS = {
  Blowout: async () => patchJourney({ maneuverability: Math.max(0, maneuverNow(getJourney()) - 1) }),
  "Engine loss": async () => patchJourney({ maneuverability: 0 }),
  Collision: async (driver) => hitVehicle(getJourney().vehicle.speed, { driver, label: "Collision" }),
  // Wrecked, and everyone aboard takes the Speed; Agility cuts it, vehicle armor does not.
  Tumble: async () => { const s = getJourney().vehicle.speed; patchJourney({ hull: 0 }); await hitOccupants(s); },
  Sinking: async () => { const s = getJourney().vehicle.speed; await hitOccupants(s); patchJourney({ hull: 0 }); }
};

async function accident(terrain, onDone, modifier = 0, driver = null) {
  const roll = Math.min(6, d6() + modifier);
  const table = ACCIDENTS[terrain] || ACCIDENTS.road;
  const entry = table.find((e) => e.d6 === roll) || table[table.length - 1];
  logRoll({ by: driver?.name, label: `Accident (${terrain})`, dice: [roll], outcome: entry.name });

  // A spin is not over: another Agility roll, and failing it rolls again at +2.
  const spins = /^Spin|^Broach/i.test(entry.name);
  const effect = ACCIDENT_EFFECTS[entry.name];
  const again = await modal({
    title: entry.name,
    body: el("div", {}, el("p", {}, entry.effect),
      modifier ? el("p", { class: "faint" }, `Rolled with +${modifier} from the previous result.`) : null),
    actions: spins
      ? [{ label: "Fight the wheel", value: true, class: "btn-primary" }, { label: "Leave it", value: false }]
      : [{ label: effect ? "Apply it" : "Understood", value: false, class: "btn-primary" }]
  });
  if (effect) await effect(driver);

  if (spins && again) {
    const dice = rollDice(Math.max(1, driver?.attributes?.agility || 3));
    const held = countSixes(dice) > 0;
    logRoll({ by: driver?.name, label: "Control the spin", dice, outcome: held ? "brought it round" : "worse" });
    await modal({
      title: held ? "Brought it round" : "It gets away from you",
      body: el("div", {}, el("p", { class: "mono faint" }, dice.join(" ")),
        el("p", {}, held ? "The vehicle straightens out. That roll cost no action." : `Rolling again at +${ACCIDENT_REROLL_MODIFIER}.`)),
      actions: [{ label: "Understood", value: true, class: "btn-primary" }]
    });
    if (!held) { await accident(terrain, onDone, modifier + ACCIDENT_REROLL_MODIFIER, driver); return; }
  }
  onDone?.();
}

/**
 * Hull damage lands from a dozen places — rams, collisions, potholes, gunfire — and the
 * way back is a Wits roll per Shift, stated as Hull or Maneuverability first (p.108). An
 * inoperable vehicle also needs a spare part before the roll means anything.
 */
function hullCard(j, v, chars, rerender) {
  const amount = el("input", { type: "number", value: "1", min: "1", "aria-label": "Hull damage" });
  const living = chars.filter((c) => !c.state?.dead);
  const mechanics = living.length
    ? el("select", { "aria-label": "Who works on it" }, ...living.map((c) => el("option", { value: c.id }, c.name || "Unnamed")))
    : null;
  // What the group carries decides the defaults: tools and spare parts on any sheet.
  const carried = (id) => chars.some((c) => (c.inventory?.items || []).some((i) => i.gearId === id));
  const hasTools = carried("toolsVehicle") || carried("toolsGeneral");
  const tools = el("input", { type: "checkbox", checked: hasTools, "aria-label": "Vehicle tools to hand" });
  const part = el("input", { type: "checkbox", checked: carried("sparePart"), "aria-label": "Spare part to hand" });
  const what = el("select", { "aria-label": "Repair what" },
    el("option", { value: "hull" }, `Hull (${hullNow(j)}/${v.hull})`),
    v.maneuverability > 0 ? el("option", { value: "maneuverability", selected: maneuverNow(j) < v.maneuverability && hullNow(j) >= v.hull }, `Maneuverability (${maneuverNow(j)}/${v.maneuverability})`) : null);

  return el("div", { class: "card" }, el("h3", {}, "Hull and repairs"),
    el("div", { class: "field" }, el("label", {}, "Damage it took"), amount),
    el("div", { class: "btn-row" },
      el("button", {
        class: "btn btn-danger",
        onclick: async () => { await hitVehicle(Math.max(1, Number(amount.value) || 1), { label: "Vehicle hit" }); rerender(); }
      }, "Take the damage"),
      el("button", { class: "btn", onclick: () => { patchJourney({ hull: v.hull, maneuverability: null, componentHits: 0 }); rerender(); } }, "Back to full")),

    el("div", { style: "margin-top:12px;border-top:1px solid var(--line-soft);padding-top:12px" },
      el("p", { class: "faint" }, `A Shift of work and a Wits roll. Each 6 restores a point of whichever you chose. ${REPAIR.vehicleAtZeroRequires === "sparePart" ? "An inoperable vehicle needs a spare part before any of it helps." : ""}`),
      mechanics ? el("div", { class: "field" }, el("label", {}, "Who works on it"), mechanics) : null,
      el("div", { class: "field" }, el("label", {}, "Repairing"), what),
      el("label", { class: "card-row" },
        el("span", {}, "Vehicle tools to hand", el("div", { class: "faint" }, "The tool bonus becomes gear dice.")), tools),
      el("label", { class: "card-row" },
        el("span", {}, "Spare part to hand", el("div", { class: "faint" }, "Only needed once it is inoperable.")), part),
      el("button", {
        class: "btn btn-block",
        onclick: async () => {
          await repairVehicle({ who: mechanics ? getCharacter(mechanics.value) : null, what: what.value, tools: tools.checked, part: part.checked });
          rerender();
        }
      }, "Work on it"),
      related([["#/time", "A Shift passes", "clock"]])));
}

async function repairVehicle({ who, what = "hull", tools, part }) {
  const j = getJourney() || {};
  const v = j.vehicle;
  if (!who) { showToast("Nobody here to do the work."); return; }
  const now = what === "hull" ? hullNow(j) : maneuverNow(j);
  const max = what === "hull" ? v.hull : v.maneuverability;
  if (now >= max) { showToast("Nothing to fix."); return; }
  if (inoperable(j) && !part) { showToast("Inoperable: you need a spare part before the work means anything.", "danger"); return; }

  const mechanic = (who.talents || []).includes("mechanic") ? 2 : 0;
  // Reliable vehicles are the ones that let you put them back together.
  const reliable = (v.traits || []).some((t) => /reliable/i.test(t?.name || t || "")) ? 2 : 0;
  const best = (ids) => Math.max(0, ...ids.map((id) => GEAR.find((g) => g.id === id)?.bonus || 0));
  const toolDice = tools ? best(["toolsVehicle", "toolsGeneral"]) : 0;

  const dice = rollDice(Math.max(1, who.attributes[REPAIR.attr] + mechanic));
  const gear = rollDice(Math.max(0, toolDice + reliable));
  const restored = countSixes(dice) + countSixes(gear);
  const label = what === "hull" ? "Hull" : "Maneuverability";
  const after = Math.min(max, now + restored);
  logRoll({ by: who.name, label: "Repair the vehicle", dice: [...dice, ...gear], outcome: restored ? `+${restored} ${label}` : "no progress" });
  if (restored) {
    // Back to full Hull, the component damage it carried is mended with it.
    patchJourney(what === "hull" ? { hull: after, ...(after >= max ? { componentHits: 0 } : {}) } : { maneuverability: after });
  }

  await modal({
    title: restored ? `+${restored} ${label}` : "No progress",
    body: el("div", {}, el("p", { class: "mono faint" }, [...dice, ...gear].join(" ")),
      el("p", {}, restored
        ? `${label} is ${after} of ${max}. Another Shift buys another roll.`
        : "A Shift gone and nothing to show for it. Try again.")),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
}

async function ram(ch, vehicle, onDone) {
  if (!canDrive(ch)) return;
  const targetHull = await promptHull();
  if (targetHull == null) return;
  // A ram is an attack: Agility plus Maneuverability as gear dice (RAMMING).
  const r = await driveRoll(ch, "Ramming");
  if (!r.sixes) {
    await modal({
      title: "Missed",
      body: el("div", {}, el("p", { class: "mono faint" }, r.dice.join(" ")),
        el("p", {}, "No successes — the ram does not connect.")),
      actions: [{ label: "Understood", value: true, class: "btn-primary" }]
    });
    onDone?.();
    return;
  }
  const dealt = Math.ceil(vehicle.hull / 2) + (r.sixes - 1);
  const taken = Math.ceil(targetHull / 2);
  await modal({
    title: `Rammed for ${dealt}`,
    body: el("div", {},
      el("p", { class: "mono faint" }, r.dice.join(" ")),
      el("p", {}, `The target takes ${dealt} damage — it may still stand tall or dodge. Your vehicle takes ${taken} back.`),
      RAMMING.movementEndsAfter ? el("p", { class: "faint" }, "Your movement ends immediately.") : null),
    actions: [{ label: `Take the ${taken}`, value: true, class: "btn-primary" }]
  });
  await hitVehicle(taken, { armor: RAMMING.armorApplies, driver: ch, label: "Rammed back" });
  onDone?.();
}

async function promptHull() {
  const input = el("input", { type: "number", value: "6", min: "0", "aria-label": "Target Hull" });
  const ok = await modal({
    title: "Ram what?",
    body: el("div", { class: "field" }, el("label", {}, "The other vehicle's Hull — 0 for a person"), input),
    actions: [{ label: "Ram", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  return ok ? Number(input.value) || 0 : null;
}

// A chase is an open opposed Agility roll each round; the margin moves the range band.
const CHASE_BANDS = ["engaged", "short", "medium", "long", "extreme"];

/** Where the chase stands after one round. Positive margin favours whoever rolled it. */
export function chaseStep(bandIndex, myExtra, theirExtra, iAmPrey) {
  const margin = myExtra - theirExtra;
  if (!margin) return { bandIndex, moved: 0, over: false };
  // The prey opens the distance; the pursuer closes it.
  const direction = iAmPrey ? 1 : -1;
  const next = bandIndex + margin * direction * CHASE.rangeShiftPerExtraSuccess;
  if (next > CHASE_BANDS.length - 1) return { bandIndex: CHASE_BANDS.length - 1, moved: margin, over: true, escaped: true };
  return { bandIndex: clamp(next, 0, CHASE_BANDS.length - 1), moved: margin, over: false };
}

function chaseCard(j, v, chars, driver, rerender) {
  const chase = j.chase || null;
  const card = el("div", { class: "card" }, el("h3", {}, "Chase"),
    el("p", { class: "faint" }, "Range bands only — no zones, and Speed is not used. An opposed Agility roll each round, with the vehicle's Maneuverability as gear dice. Every success beyond the other driver's moves you a band."));

  const write = (next) => { const journey = getJourney() || {}; saveJourney({ ...journey, chase: next }); rerender(); };

  if (!chase) {
    const role = el("select", { "aria-label": "Your part in it" },
      el("option", { value: "prey" }, "You are being chased"),
      el("option", { value: "pursuer" }, "You are the pursuer"));
    const theirs = el("input", { type: "number", value: "4", min: "1", "aria-label": "The other driver's dice" });
    card.append(
      el("div", { class: "field" }, el("label", {}, "Your part in it"), role),
      el("div", { class: "field" }, el("label", {}, "The other driver: Agility plus Maneuverability"), theirs),
      el("div", { class: "btn-row" },
        el("button", {
          class: "btn btn-primary",
          onclick: () => write({ role: role.value, theirDice: Math.max(1, Number(theirs.value) || 4), bandIndex: 3, round: 1 })
        }, "Start the chase"),
        el("button", { class: "btn", onclick: () => obstacle(rerender) }, "Roll an obstacle")));
    return card;
  }

  const band = CHASE_BANDS[chase.bandIndex];
  const prey = chase.role === "prey";
  card.append(el("div", { class: "card-row" },
    el("strong", {}, `Round ${chase.round} · ${band}`),
    el("span", { class: "faint" }, prey ? "The pursuer is behind you" : "You are behind the other car")));
  if (band === "engaged") {
    card.append(el("p", { class: "faint" }, "Engaged: the pursuer can ram, or attack in close combat."));
  }
  card.append(el("div", { class: "btn-row" },
    el("button", {
      class: "btn btn-primary",
      onclick: () => chaseRound(getCharacter(driver.value), v, chase, write)
    }, "Drive"),
    el("button", { class: "btn", onclick: () => obstacle(rerender) }, "Roll an obstacle"),
    el("button", { class: "btn btn-danger", onclick: () => write(null) }, "Call it off")));
  return card;
}

async function chaseRound(ch, vehicle, chase, write) {
  if (!canDrive(ch)) return;
  // Agility with Maneuverability as gear dice, pushable like any roll (CHASE.movement).
  const r = await driveRoll(ch, "Chase");
  const mine = r.dice;
  // The other driver is not a Traveler, and NPCs never push.
  const theirs = rollDice(chase.theirDice);
  const step = chaseStep(chase.bandIndex, r.sixes, countSixes(theirs), chase.role === "prey");

  logRoll({ label: "Chase — the other driver", dice: theirs,
    outcome: step.escaped ? "broke away" : `${CHASE_BANDS[step.bandIndex]}` });

  if (step.escaped) {
    write(null);
    await modal({
      title: chase.role === "prey" ? "You shake the pursuer" : "The other car gets away",
      body: el("p", {}, "Past Extreme range the chase is over."),
      actions: [{ label: "Understood", value: true, class: "btn-primary" }]
    });
    return;
  }

  write({ ...chase, bandIndex: step.bandIndex, round: chase.round + 1 });
  await modal({
    title: `${CHASE_BANDS[step.bandIndex]}`,
    body: el("div", {},
      el("p", { class: "faint" }, `You ${mine.join(" ")} · the other car ${theirs.join(" ")}`),
      el("p", {}, step.moved === 0
        ? "Neither of you gains a yard."
        : `${Math.abs(step.moved)} clear — the gap ${(step.moved > 0) === (chase.role === "prey") ? "opens" : "closes"}.`),
      CHASE_BANDS[step.bandIndex] === "engaged"
        ? el("p", { class: "faint" }, "Engaged: the pursuer can ram now, or attack in close combat.")
        : null,
      r.pushed ? el("p", { class: "faint" }, "Pushed — any 1s have been charged.") : null),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
}

async function obstacle(onDone) {
  const roll = d66();
  const entry = fromRangeTable(CHASE_OBSTACLES, roll) || CHASE_OBSTACLES[0];
  logRoll({ label: "Chase obstacle", dice: [roll], outcome: entry.name });
  await modal({
    title: entry.name,
    body: el("div", {}, entry.effect ? el("p", {}, entry.effect) : el("p", { class: "faint" }, "Nothing in the way this round."),
      el("p", { class: "faint" }, "The prey rolls first, then the pursuer.")),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  onDone?.();
}

/**
 * Component damage (p.105): a D6, each result doing what it says to the vehicle or the
 * people in it. Results that name something the group does not have are re-rolled.
 */
async function componentDamage(dealt, driver = null) {
  const living = listCharacters().filter((c) => !c.state?.dead);
  const passengers = living.filter((c) => c.id !== driver?.id);
  const mounted = (getJourney()?.vehicle?.weapons || []).length > 0;
  let entry;
  do { entry = COMPONENT_DAMAGE.find((c) => c.d6 === d6()); }
  while ((entry.d6 === 2 && !passengers.length) || (entry.d6 === 4 && !mounted) || (entry.d6 === 1 && !driver));
  logRoll({ by: driver?.name, label: "Component damage", dice: [entry.d6], outcome: entry.name });

  await modal({
    title: entry.name,
    body: el("p", {}, entry.effect),
    actions: [{ label: "Apply it", value: true, class: "btn-danger" }]
  });

  const hurt = async (who) => {
    const next = structuredClone(getCharacter(who.id));
    const outcome = harm(next, dealt);
    saveCharacter(next);
    renderVitals(next);
    showToast(`${who.name}: ${dealt} damage`, "danger");
    await afterHarm(next, outcome, dealt);
  };
  switch (entry.d6) {
    case 1: await hurt(driver); break;
    case 2: await hurt(pick(passengers)); break;
    case 3: {
      const dice = rollDice(Math.max(1, driver?.attributes?.agility || 3));
      const held = countSixes(dice) > 0;
      logRoll({ by: driver?.name, label: "Severe spin", dice, outcome: held ? "held it" : "Wrecked" });
      if (!held) patchJourney({ hull: 0 });
      await modal({ title: held ? "Held it" : "Wrecked", body: el("p", { class: "mono faint" }, dice.join(" ")), actions: [{ label: "Understood", value: true, class: "btn-primary" }] });
      break;
    }
    case 5: patchJourney({ maneuverability: 0 }); break;
    case 6: patchJourney({ hull: 0 }); break;
    default: break;
  }
}
