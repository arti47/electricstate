// Hazards and vehicle handling (Chapter 4). Everything here rolls the book's own dice
// and applies the result, rather than leaving the player to work it out.
import { el, rollDice, countSixes, clamp, d6, d66, fromRangeTable, rollNotation } from "./core.js";
import { EXPLOSIVES, FIRES, DISEASES, HAZARD_RULES, FIRE_SPREAD_PER_ROUND, VEHICLES } from "../data.js";
import { STUNTS, ACCIDENTS, RAMMING, COMPONENT_DAMAGE, CHASE, CHASE_OBSTACLES, ACCIDENT_REROLL_MODIFIER } from "../data-vehicles.js";
import { maxHealth } from "./derived.js";
import { getCharacter, saveCharacter, listCharacters, logRoll, getJourney, saveJourney } from "./store.js";
import { showToast, modal, explain } from "./ui.js";
import { renderVitals } from "./sheet.js";
import { forfeitNextTurn } from "./combat.js";

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

export const fallingDamage = (metres) => Math.floor(metres / 2);

export function hazardScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

function build(rerender) {
  const chars = listCharacters();
  const wrap = el("div", {}, el("h1", {}, "Hazards"));
  wrap.append(explain("The things that hurt you without swinging: blasts, fire, falls, disease, cold and hunger. Each rolls its own dice — Blast Power, Intensity, Virulence — where every 6 is a point of damage, and none of them can be pushed."));

  if (!chars.length) {
    wrap.append(el("div", { class: "empty card" }, el("p", {}, "Create a Traveler first.")));
    return wrap;
  }

  const who = el("select", { "aria-label": "Traveler" }, ...chars.map((c) => el("option", { value: c.id }, c.name || "Unnamed")));
  wrap.append(el("div", { class: "field" }, el("label", {}, "Who is exposed"), who));

  const card = (title, blurb, ...kids) => el("div", { class: "card" }, el("h3", {}, title), blurb ? el("p", { class: "faint" }, blurb) : null, ...kids);
  const target = () => getCharacter(who.value) || chars[0];

  // explosions
  const blast = el("select", { "aria-label": "Explosive" },
    ...EXPLOSIVES.map((e) => el("option", { value: e.blastPower }, `${e.name} — Blast Power ${e.blastPower}`)));
  wrap.append(card("Explosion", "Hits everything at Short range of the impact. You may dodge with Agility, but it costs your next turn.",
    el("div", { class: "field" }, blast),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-primary", onclick: () => applyHazard(target(), "Explosion", +blast.value, { dodgeable: true }, rerender) }, "Roll blast"))));

  // fire
  const fire = el("select", { "aria-label": "Fire" },
    ...FIRES.map((f) => el("option", { value: f.intensity }, `${f.name} — Intensity ${f.intensity}`)));
  wrap.append(card("Fire", `Burns again every round you stay in it, and spreads by ${FIRE_SPREAD_PER_ROUND} Intensity a round.`,
    el("div", { class: "field" }, fire),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-primary", onclick: () => applyHazard(target(), "Fire", +fire.value, {}, rerender) }, "Roll intensity"))));

  // falling
  const height = el("input", { type: "number", value: "4", min: "1", "aria-label": "Height in metres" });
  wrap.append(card("Falling", "Damage is half the height in metres, rounded down. A controlled jump rolls Agility to reduce it.",
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
  wrap.append(card("Disease", "An opposed Strength roll against the Virulence, once a day, until you win one. While sick you cannot heal.",
    el("div", { class: "field" }, disease),
    nurse ? el("div", { class: "field" }, el("label", {}, "Nursed by (a Stretch of care)"), nurse) : null,
    el("div", { class: "btn-row" },
      el("button", {
        class: "btn btn-primary",
        onclick: () => applyDisease(target(), +disease.value, rerender, nurse?.value ? getCharacter(nurse.value) : null)
      }, "Resist"))));

  // cold and hunger live on the Time screen, where their intervals belong
  wrap.append(card("Cold, hunger and sleep", "These are checked when time passes, so they live on the Time screen — tick Out in the cold there and end a Shift.",
    el("a", { class: "btn", href: "#/time" }, "Time")));

  return wrap;
}

async function applyHazard(ch, label, power, { dodgeable = false } = {}, onDone) {
  const roll = hazardRoll(power);
  let final = roll.damage;
  let dodge = null;

  if (dodgeable && final > 0) {
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
  const hMax = maxHealth(next);
  next.state.health = clamp(next.state.health - final, 0, hMax);
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
  next.state.health = clamp(next.state.health - final, 0, maxHealth(next));
  saveCharacter(next);
  renderVitals(next);
  logRoll({ by: ch.name, label: "Falling", dice, outcome: `${final} damage from ${metres}m` });
  await modal({
    title: final ? `${final} damage` : "Landed clean",
    body: el("p", { class: "mono faint" }, dice.join(" ") || `${metres}m ÷ 2`),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  onDone?.();
}

async function applyDisease(ch, virulence, onDone, nurse = null) {
  const mine = rollDice(ch.attributes.strength + ((ch.talents || []).includes("resilient") ? 2 : 0));
  const theirs = rollDice(virulence);
  const nursing = nurse ? rollDice(Math.max(1, nurse.attributes.wits)) : [];
  const my6 = countSixes(mine) + countSixes(nursing), their6 = countSixes(theirs);
  const damage = Math.max(0, their6 - my6);

  const next = structuredClone(ch);
  if (my6 > their6) {
    next.conditions = (next.conditions || []).filter((c) => c.kind !== "disease");
  } else {
    if (damage) next.state.health = clamp(next.state.health - damage, 0, maxHealth(next));
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
  onDone?.();
}

// ------------------------------------------------------------------ vehicles
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
  wrap.append(explain("Stunts, accidents, ramming and chases. A stunt is an Agility roll with the vehicle's Maneuverability as gear dice, and failing one means rolling on the accident table. Chases ignore zones and Speed entirely — they are an opposed Agility roll each round."));

  if (!v) {
    wrap.append(el("div", { class: "empty card" },
      el("p", {}, "No vehicle on the Journey yet."),
      el("a", { class: "btn btn-primary", href: "#/journey" }, "The Journey")));
    return wrap;
  }

  wrap.append(el("div", { class: "card" },
    el("div", { class: "card-row" }, el("strong", {}, v.label || v.name),
      el("span", { class: "mono faint" }, `Hull ${j.hull ?? v.hull}/${v.hull}`)),
    el("div", { class: "faint" }, `Maneuverability ${v.maneuverability >= 0 ? "+" : ""}${v.maneuverability} · Speed ${v.speed} · Armor ${v.armor}`),
    (j.hull ?? v.hull) <= 0 ? el("p", { style: "color:var(--danger)" }, "Wrecked — it needs repairs and a spare part before it moves again.") : null));

  const driver = el("select", { "aria-label": "Driver" }, ...chars.map((c) => el("option", { value: c.id }, c.name || "Unnamed")));
  wrap.append(el("div", { class: "field" }, el("label", {}, "Driving"), driver));

  const terrain = el("select", { "aria-label": "Terrain" },
    el("option", { value: "road" }, "On the road"),
    el("option", { value: "boat" }, "On water"),
    el("option", { value: "air" }, "In the air"));

  wrap.append(el("div", { class: "card" }, el("h3", {}, "Stunt"),
    el("p", { class: "faint" }, "Jumping, hard terrain, breaking through something. Uses your action; failure means an accident."),
    el("div", { class: "field" }, terrain),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-primary", onclick: () => stunt(getCharacter(driver.value), v, terrain.value, rerender) }, "Roll stunt"),
      el("button", { class: "btn", onclick: () => accident(terrain.value, rerender) }, "Accident only"))));

  wrap.append(el("div", { class: "card" }, el("h3", {}, "Ramming"),
    el("p", { class: "faint" }, `Only at Engaged range. You deal half your starting Hull (${Math.ceil(v.hull / 2)}) and take half theirs.`),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-primary", onclick: () => ram(v, rerender) }, "Ram something"))));

  wrap.append(el("div", { class: "card" }, el("h3", {}, "Chase"),
    el("p", { class: "faint" }, "Range categories only, no zones, and Speed is not used. Both sides may push."),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-primary", onclick: () => obstacle(rerender) }, "Roll an obstacle"),
      el("button", { class: "btn", onclick: () => componentDamage(rerender) }, "Component damage"))));

  return wrap;
}

async function stunt(ch, vehicle, terrain, onDone) {
  if (!ch) { showToast("No driver selected."); return; }
  const dice = rollDice(Math.max(1, ch.attributes.agility));
  const gear = rollDice(Math.max(0, vehicle.maneuverability || 0));
  const sixes = countSixes(dice) + countSixes(gear);
  logRoll({ by: ch.name, label: "Stunt", dice: [...dice, ...gear], outcome: sixes ? "held it" : "accident" });

  if (sixes) {
    await modal({ title: "Held it", body: el("p", { class: "mono faint" }, [...dice, ...gear].join(" ")), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
    onDone?.();
    return;
  }
  await modal({ title: "Lost control", body: el("p", {}, "No successes — roll on the accident table."), actions: [{ label: "Accident", value: true, class: "btn-danger" }] });
  await accident(terrain, onDone, 0, ch);
}

async function accident(terrain, onDone, modifier = 0, driver = null) {
  const roll = Math.min(6, d6() + modifier);
  const table = ACCIDENTS[terrain] || ACCIDENTS.road;
  const entry = table.find((e) => e.d6 === roll) || table[table.length - 1];
  logRoll({ label: `Accident (${terrain})`, dice: [roll], outcome: entry.name });

  // A spin is not over: another Agility roll, and failing it rolls again at +2.
  const spins = /^Spin/i.test(entry.name);
  const again = await modal({
    title: entry.name,
    body: el("div", {}, el("p", {}, entry.effect),
      modifier ? el("p", { class: "faint" }, `Rolled with +${modifier} from the previous result.`) : null),
    actions: spins
      ? [{ label: "Fight the wheel", value: true, class: "btn-primary" }, { label: "Leave it", value: false }]
      : [{ label: "Understood", value: false, class: "btn-primary" }]
  });

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

async function ram(vehicle, onDone) {
  const targetHull = await promptHull();
  if (targetHull == null) return;
  const dealt = Math.ceil(vehicle.hull / 2);
  const taken = Math.ceil(targetHull / 2);
  const j = getJourney() || {};
  const hull = Math.max(0, (j.hull ?? vehicle.hull) - Math.max(0, taken - (vehicle.armor || 0)));
  saveJourney({ ...j, hull });
  logRoll({ label: "Ramming", dice: [], outcome: `dealt ${dealt}, took ${taken}` });
  await modal({
    title: `Dealt ${dealt}, took ${taken}`,
    body: el("div", {},
      el("p", {}, `Your armor stops ${vehicle.armor || 0} of it. Hull is now ${hull}.`),
      el("p", { class: "faint" }, "Your movement ends immediately.")),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  onDone?.();
}

async function promptHull() {
  const input = el("input", { type: "number", value: "6", min: "1", "aria-label": "Target Hull" });
  const ok = await modal({
    title: "Ram what?",
    body: el("div", { class: "field" }, el("label", {}, "The other vehicle's Hull"), input),
    actions: [{ label: "Ram", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  return ok ? Number(input.value) || 0 : null;
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

async function componentDamage(onDone) {
  const roll = d6();
  const entry = COMPONENT_DAMAGE.find((c) => c.d6 === roll);
  logRoll({ label: "Component damage", dice: [roll], outcome: entry.name });
  await modal({
    title: entry.name,
    body: el("p", {}, entry.effect),
    actions: [{ label: "Understood", value: true, class: "btn-primary" }]
  });
  onDone?.();
}
