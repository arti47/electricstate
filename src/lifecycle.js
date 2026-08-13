// Scene/session lifecycle, rest and recovery, and the advancement debrief (Phase 4).
// The app owns the boundaries: each one fires a bundle, shows what it did, and can be undone once.
import { el, d6, uid, rollDice, countSixes, clamp } from "./core.js";
import { RECOVERY, BLISS, ADVANCEMENT, SHIFT_NAMES, SHIFTS_PER_DAY, TIME_UNITS, ATTRIBUTES,
         ARCHETYPES, TALENTS, TENSION } from "../data.js";
import { maxHealth, maxHope, tracksBliss, needsFood, healsByResting, isDronePilot } from "./derived.js";
import { listCharacters, saveCharacter, getJourney, saveJourney, logRoll, noteEvent,
         getSessionLog, clearSessionLog, snapshot, undoLast, canUndo } from "./store.js";
import { talent as findTalent } from "./rules.js";
import { subj, obj, poss, Subj } from "./pronouns.js";
import { showToast, modal, confirmModal, explain, actionBar } from "./ui.js";
import { renderVitals } from "./sheet.js";
import { describeTalent } from "./wizard.js";

// Undo lives in the store now, so every destructive action shares one stack.
export { undoLast, canUndo } from "./store.js";

// ------------------------------------------------------------------- bundles
/**
 * Advance time. Returns a list of human-readable effects so the confirmation
 * summary reports exactly what changed.
 */
/**
 * Cold with no shelter or clothing: a Strength roll, a point of damage on a failure,
 * and no natural healing until they are warm again (p.89).
 */
function exposure(ch, hMax, name) {
  const notes = [];
  const dice = rollDice(Math.max(1, ch.attributes.strength));
  const ok = countSixes(dice) > 0;
  logRoll({ by: name, label: "Cold", dice, outcome: ok ? "endured" : "1 damage" });
  if (!ok) {
    ch.state.health = clamp(ch.state.health - 1, 0, hMax);
    notes.push(`${name} is freezing — 1 damage.`);
  } else notes.push(`${name} keeps the cold out.`);
  ch.state.flags.cold = true;
  return notes;
}

export function advanceTime(unit, options = {}) {
  snapshot(`end of ${unit}`);
  const notes = [];
  const journey = getJourney() || {};

  for (const raw of listCharacters()) {
    const ch = structuredClone(raw);
    const hMax = maxHealth(ch), pMax = maxHope(ch);
    const name = ch.name || "Unnamed";
    ch.state.flags = ch.state.flags || {};

    if (unit === "stretch") {
      // Unaided rally after a Stretch: 1 Health, only while Incapacitated.
      if (ch.state.health === 0 && !ch.state.dead) {
        ch.state.health = 1;
        ch.state.death = null;
        notes.push(`${name} rallies alone — 1 Health.`);
      }
      // Extreme cold bites every Stretch rather than every Shift.
      if (options.cold && options.extremeCold) notes.push(...exposure(ch, hMax, name));
    }

    if (unit === "shift") {
      ch.state.flags.hopeItemUsedThisShift = false;
      if (options.cold && !options.extremeCold) notes.push(...exposure(ch, hMax, name));
      if (!options.cold) ch.state.flags.cold = false;

      const blocked = (ch.conditions || []).some((c) => c.kind === "disease") ||
        ch.state.flags.hungry || ch.state.flags.cold;
      if (!healsByResting(ch) && ch.state.health < hMax) {
        notes.push(`${name} is a drone — rest does nothing. It needs repairing.`);
      } else if (options.resting && ch.state.health > 0 && ch.state.health < hMax && !blocked) {
        const rate = options.nurse ? RECOVERY.healthPerShiftWithNurse : RECOVERY.healthPerShift;
        ch.state.health = clamp(ch.state.health + rate, 0, hMax);
        notes.push(`${name} heals ${rate} Health.`);
      } else if (blocked && ch.state.health < hMax) {
        notes.push(`${name} cannot heal — disease, hunger or cold.`);
      }

      if (ch.state.hope === 0 && !ch.state.dead) {
        ch.state.hope = RECOVERY.breakdownSelfRallyHope;
        notes.push(`${name} recovers 1 Hope after the Breakdown.`);
      }

      ch.state.flags.shiftsAwake = (ch.state.flags.shiftsAwake || 0) + 1;
      if (options.slept) {
        ch.state.flags.shiftsAwake = 0;
        ch.state.flags.sleepDeprived = false;
      } else if (ch.state.flags.shiftsAwake >= SHIFTS_PER_DAY && !ch.state.flags.sleepDeprived) {
        ch.state.flags.sleepDeprived = true;
        notes.push(`${name} is sleep deprived — no Hope recovery until a Shift is slept.`);
      }
    }

    if (unit === "day") {
      // Bliss fades by one, but each point may stick for good.
      if (tracksBliss(ch) && ch.state.bliss > (ch.state.permanentBliss || 0) && !options.neurocastToday) {
        const die = d6();
        if (BLISS.permanenceRoll.permanentOn.includes(die)) {
          ch.state.permanentBliss = (ch.state.permanentBliss || 0) + 1;
          notes.push(`${name} rolled a 1 — that point of Bliss is permanent now (${ch.state.permanentBliss} total).`);
        } else {
          ch.state.bliss = Math.max(ch.state.permanentBliss || 0, ch.state.bliss - BLISS.decayPerDayOffcast);
          notes.push(`${name} sheds a point of Bliss.`);
        }
        logRoll({ by: name, label: "Bliss decay", dice: [die], outcome: die === 1 ? "became permanent" : "faded" });
      }

      if (needsFood(ch) && !options.fed) {
        const dice = rollDice(ch.attributes.strength);
        const ok = countSixes(dice) > 0;
        logRoll({ by: name, label: "Hunger", dice, outcome: ok ? "endured" : "1 damage" });
        if (!ok) {
          ch.state.health = clamp(ch.state.health - 1, 0, hMax);
          notes.push(`${name} goes hungry — 1 damage.`);
        }
        ch.state.flags.hungry = true;
      } else if (options.fed) {
        ch.state.flags.hungry = false;
      }

      // Injury healing clocks tick down; surgery-flagged injuries wait for surgery.
      for (const cond of ch.conditions || []) {
        if (cond.heal == null || cond.surgery) continue;
        cond.heal -= 1;
      }
      const healed = (ch.conditions || []).filter((c) => c.heal != null && c.heal <= 0);
      if (healed.length) {
        ch.conditions = ch.conditions.filter((c) => !healed.includes(c));
        notes.push(`${name} recovers from ${healed.map((h) => h.name).join(", ")}.`);
      }
    }

    saveCharacter(ch);
  }

  if (unit === "shift" && options.travelled && journey.vehicle) {
    const burn = options.gallons ?? 5;
    const fuel = Math.max(0, (journey.fuel ?? 0) - burn);
    saveJourney({ ...journey, fuel });
    notes.push(`Fuel down to ${fuel} gallons.`);
    if (fuel === 0) notes.push("The tank is dry. That is a Blocker in itself.");
  }

  if (unit === "shift") {
    const j = getJourney();
    if (j) {
      const idx = SHIFT_NAMES.indexOf(j.shift || SHIFT_NAMES[0]);
      const next = (idx + 1) % SHIFT_NAMES.length;
      saveJourney({ ...j, shift: SHIFT_NAMES[next], day: (j.day || 1) + (next === 0 ? 1 : 0) });
      notes.push(`It is now ${SHIFT_NAMES[next]}.`);
    }
  }

  if (!notes.length) notes.push("Nothing changed.");
  // The debrief asks what the session was about; this is where the answer accumulates.
  noteEvent(unit, notes.filter((n) => n !== "Nothing changed.").join(" "));
  return notes;
}

// -------------------------------------------------------------- recovery: Hope
/** A Lone wolf works it out alone: their own Tension drops a step and they regain a Hope. */
export function reduceTensionAlone(aId, towardId) {
  const a = listCharacters().find((c) => c.id === aId);
  if (!a) return { ok: false, reason: "No such Traveler." };
  if (!(a.talents || []).includes("loneWolf") || !TENSION.loneWolfMayReduceAlone) {
    return { ok: false, reason: "Only a Lone wolf can settle it without the other person there." };
  }
  const mine = a.tension?.[towardId] ?? 0;
  if (mine < TENSION.reduce.minimumTensionToReduce) return { ok: false, reason: "No Tension there to work off." };

  snapshot();
  const next = structuredClone(a);
  const blocked = (next.conditions || []).some((c) => (c.effects || []).some((e) => e.rule === "noHopeFromTension"));
  next.tension = { ...(next.tension || {}), [towardId]: Math.max(0, mine - 1) };
  const notes = [`${next.name}: Tension ${mine} → ${mine - 1}.`];
  if (blocked) notes.push(`${next.name} is too withdrawn to gain Hope this way.`);
  else if (next.state.hope < maxHope(next)) { next.state.hope += TENSION.reduce.hopeGain; notes.push("+1 Hope."); }
  else notes.push("Already at full Hope.");
  saveCharacter(next);
  return { ok: true, notes };
}

/** Reduce Tension between two Travelers: both drop one step and each regains a Hope. */
export function reduceTension(aId, bId) {
  const a = listCharacters().find((c) => c.id === aId);
  const b = listCharacters().find((c) => c.id === bId);
  if (aId === bId) return { ok: false, reason: "Pick two different Travelers." };
  if (!a || !b) return { ok: false, reason: "Both Travelers must exist." };

  const aT = a.tension?.[bId] ?? 0, bT = b.tension?.[aId] ?? 0;
  if (aT < TENSION.reduce.minimumTensionToReduce && bT < TENSION.reduce.minimumTensionToReduce) {
    return { ok: false, reason: "Neither of you carries any Tension toward the other." };
  }
  snapshot();
  const notes = [];
  for (const [self, other, mine] of [[a, b, aT], [b, a, bT]]) {
    const next = structuredClone(self);
    const blocked = (next.conditions || []).some((c) => (c.effects || []).some((e) => e.rule === "noHopeFromTension"));
    next.tension = { ...(next.tension || {}), [other.id]: Math.max(0, mine - 1) };
    if (blocked) notes.push(`${next.name} is too withdrawn to gain Hope this way.`);
    else if (next.state.hope < maxHope(next)) {
      next.state.hope += TENSION.reduce.hopeGain;
      notes.push(`${next.name}: Tension ${mine} → ${Math.max(0, mine - 1)}, +1 Hope.`);
    } else notes.push(`${next.name}: Tension ${mine} → ${Math.max(0, mine - 1)}, already at full Hope.`);
    saveCharacter(next);
  }
  return { ok: true, notes };
}

/** Hope-restoring gear, capped at one point per Shift however many items you own. */
export function useHopeItem(ch, item) {
  const next = structuredClone(ch);
  next.state.flags = next.state.flags || {};
  if (next.state.flags.hopeItemUsedThisShift) return { ok: false, reason: "You have already drawn Hope from an item this Shift." };
  if (next.state.flags.hungry || next.state.flags.sleepDeprived) return { ok: false, reason: "Hunger and exhaustion block any Hope recovery." };
  const onlyFrom = (next.conditions || []).flatMap((c) => (c.effects || []).filter((e) => e.rule === "hopeOnlyFrom"));
  if (onlyFrom.length && !onlyFrom.some((e) => e.source === "alcohol" && item.alcohol)) {
    return { ok: false, reason: "Your trauma allows Hope from only one source." };
  }
  const pMax = maxHope(next);
  if (next.state.hope >= pMax) return { ok: false, reason: "Your Hope is already full." };

  next.state.hope = clamp(next.state.hope + 1, 0, pMax);
  next.state.flags.hopeItemUsedThisShift = true;
  if (item.healthCost) next.state.health = clamp(next.state.health - item.healthCost, 0, maxHealth(next));
  saveCharacter(next);
  return { ok: true, character: next };
}

// ==================================================================== UI
export function lifecycleScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

function build(rerender) {
  const j = getJourney() || {};
  const chars = listCharacters();
  const wrap = el("div", {}, el("h1", {}, "Time"));
  wrap.append(explain('The app owns the clock. Say what the group did, then end a Stretch, Shift, Day or session — each fires its whole bundle of healing, hunger, sleep, fuel and Bliss decay, tells you exactly what changed, and can be undone once. Reducing Tension here is the main way Hope comes back.'));
  wrap.append(el("p", { class: "faint" },
    TIME_UNITS.map((u) => `${u.label} ${u.duration}`).join(" · ") + ` · ${SHIFTS_PER_DAY} Shifts a day`));

  wrap.append(el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("strong", {}, j.shift || SHIFT_NAMES[0]),
      el("span", { class: "faint" }, `Day ${j.day || 1}`)),
    j.vehicle ? el("div", { class: "faint" }, `Fuel ${j.fuel ?? 0} gallons`) : null));

  const opts = { resting: true, slept: false, fed: true, travelled: false, nurse: false, neurocastToday: false };
  const optionRow = (label, key, blurb) => el("label", { class: "card-row", style: "text-transform:none;letter-spacing:0;color:inherit;padding:6px 0" },
    el("span", {}, el("strong", {}, label), blurb ? el("div", { class: "faint" }, blurb) : null),
    el("input", {
      type: "checkbox", checked: opts[key],
      onchange: (e) => { opts[key] = e.target.checked; }
    }));

  wrap.append(el("div", { class: "card" }, el("h3", {}, "What happened"),
    optionRow("Resting", "resting", "Health returns only if nobody is fighting or marching."),
    optionRow("Under a Nurse's care", "nurse", "2 Health per Shift instead of 1."),
    optionRow("Slept this Shift", "slept"),
    optionRow("Ate and drank", "fed", "Going without means a Strength roll and no recovery at all."),
    optionRow("Out in the cold", "cold", "No shelter or warm clothing: a Strength roll each Shift, and no healing until the Traveler is warm."),
    optionRow("Extreme cold", "extremeCold", "Bites every Stretch instead of every Shift."),
    optionRow("Travelled", "travelled", "Burns fuel."),
    optionRow("Neurocast today", "neurocastToday", "Bliss only fades on a day spent off-cast.")));

  wrap.append(el("details", { class: "explain" }, el("summary", {}, "Bigger boundaries"),
    el("p", { class: "faint" }, "End of session is the debrief where Travelers improve. A week is the interval mental trauma recovers on. Ending the Journey rolls each Traveler's epilogue and closes the campaign."),
    el("div", { class: "btn-row" },
      el("button", { class: "btn", onclick: () => debrief(rerender) }, "End session"),
      el("button", { class: "btn", onclick: () => weekPasses(rerender) }, "A week passes"),
      el("button", { class: "btn btn-danger", onclick: () => epilogue(rerender) }, "End the Journey"))));

  // Tension → Hope
  if (chars.length > 1) {
    const a = el("select", { "aria-label": "First Traveler" }, ...chars.map((c) => el("option", { value: c.id }, c.name)));
    const b = el("select", { "aria-label": "Second Traveler" }, ...chars.map((c, i) => el("option", { value: c.id, selected: i === 1 }, c.name)));
    wrap.append(el("div", { class: "card" }, el("h3", {}, "Talk it through"),
      el("p", { class: "faint" }, "A Stretch with no immediate threat. Both sides drop a step of Tension and each regains a point of Hope — the only reliable way Hope comes back."),
      el("div", { class: "field" }, a), el("div", { class: "field" }, b),
      el("button", {
        class: "btn btn-block", onclick: async () => {
          const res = reduceTension(a.value, b.value);
          if (!res.ok) { showToast(res.reason, "danger"); return; }
          await summary("Tension reduced", res.notes, rerender);
        }
      }, "Reduce Tension"),
      // Lone wolf settles it without the other person in the room.
      chars.some((c) => (c.talents || []).includes("loneWolf"))
        ? el("button", {
            class: "btn btn-block", style: "margin-top:8px", onclick: async () => {
              const res = reduceTensionAlone(a.value, b.value);
              if (!res.ok) { showToast(res.reason, "danger"); return; }
              await summary("Worked out alone", res.notes, rerender);
            }
          }, "Lone wolf: settle it alone")
        : null));
  }

  if (canUndo()) {
    wrap.append(el("button", {
      class: "btn btn-block", style: "margin-top:12px",
      onclick: () => { undoLast(); showToast("Reverted."); rerender(); }
    }, "Undo the last boundary"));
  }

  // Seven option rows pushed these off the bottom of the screen; they are the point of it.
  const clock = getJourney() || {};
  wrap.append(...actionBar({
    lead: el("span", { class: "pool" }, clock.shift || "Morning", el("small", {}, `Day ${clock.day || 1}`)),
    children: [
      el("button", { class: "btn", onclick: () => fire("stretch", opts, rerender) }, "Stretch"),
      el("button", { class: "btn btn-primary", onclick: () => fire("shift", opts, rerender) }, "Shift"),
      el("button", { class: "btn", onclick: () => fire("day", opts, rerender) }, "Day")
    ]
  }));
  return wrap;
}

async function fire(unit, opts, rerender) {
  const notes = advanceTime(unit, opts);
  await summary(`End of ${unit}`, notes, rerender);
}

async function summary(title, notes, rerender) {
  const body = el("ul", { class: "list" }, ...notes.map((n) => el("li", {}, el("div", { style: "padding:8px 4px" }, n))));
  const undo = await modal({
    title, body,
    actions: [{ label: "Good", value: false, class: "btn-primary" }, { label: "Undo", value: true }]
  });
  if (undo && undoLast()) showToast("Reverted.");
  listCharacters().forEach(() => {});
  renderVitals(null);
  rerender();
}

/** Mental trauma allows one Wits or Empathy roll a week to shake it. */
async function weekPasses(rerender) {
  snapshot();
  const notes = [];
  for (const raw of listCharacters()) {
    const ch = structuredClone(raw);
    const traumas = (ch.conditions || []).filter((c) => c.kind === "trauma");
    if (!traumas.length) continue;
    for (const trauma of traumas) {
      const attr = ch.attributes.wits >= ch.attributes.empathy ? "wits" : "empathy";
      const dice = rollDice(ch.attributes[attr]);
      const ok = countSixes(dice) > 0;
      logRoll({ by: ch.name, label: `Recover from ${trauma.name}`, dice, outcome: ok ? "recovered" : "still there" });
      if (ok) {
        ch.conditions = ch.conditions.filter((c) => c.id !== trauma.id);
        notes.push(`${ch.name} shakes off ${trauma.name}.`);
      } else {
        notes.push(`${ch.name} is still living with ${trauma.name}.`);
      }
    }
    saveCharacter(ch);
  }
  if (!notes.length) notes.push("Nobody is carrying a mental trauma.");
  await summary("A week passes", notes, rerender);
}

/** End of the Journey: each player rolls three base dice, each one a life event. */
async function epilogue(rerender) {
  const chars = listCharacters();
  if (!chars.length) { showToast("No Travelers."); return; }
  const body = el("div", {},
    el("p", { class: "faint" }, "Three dice each. A high result is fortune, wealth or happiness; a low one is not. Put the three in any order, decide how much time passes between one and the next, and tell the story round the table."));
  for (const ch of chars) {
    const dice = rollDice(3);
    logRoll({ by: ch.name, label: "Epilogue", dice, outcome: dice.join(" ") });
    body.append(el("div", { class: "card" },
      el("div", { class: "card-row" }, el("strong", {}, ch.name || "Unnamed"), el("span", { class: "mono" }, dice.join(" "))),
      el("div", { class: "faint" }, dice.map((d) => (d >= 5 ? "good fortune" : d >= 3 ? "mixed" : "hard times")).join(" · "))));
  }
  await modal({ title: "The road ends", body, actions: [{ label: "Tell it", value: true, class: "btn-primary" }] });
  rerender();
}

// ------------------------------------------------------------------ debrief
async function debrief(rerender) {
  const chars = listCharacters();
  if (!chars.length) { showToast("No Travelers to debrief."); return; }

  // "Say how this Traveler followed their Dream this session" is a memory test three weeks
  // after the fact. The app watched the whole thing; show it before asking.
  const record = getSessionLog();
  if (record.length) {
    const body = el("div", {}, el("p", { class: "faint" }, "What the app saw happen since the last debrief."));
    for (const e of record.slice(0, 20)) {
      body.append(el("div", { style: "padding:4px 0;border-top:1px solid var(--line-soft)" },
        el("strong", {}, e.kind), el("div", { class: "faint" }, e.text || "—")));
    }
    await modal({
      title: "This session", body,
      actions: [{ label: "Debrief", value: true, class: "btn-primary" }]
    });
  }

  for (const ch of chars) {
    if (ch.state?.improvementLocked) {
      await modal({
        title: `${ch.name}`,
        body: el("p", { class: "faint" }, `This Traveler overcame the Flaw, so ${subj(ch)} cannot improve further — the debrief is still worth playing for the story and for Tension.`),
        actions: [{ label: "Next", value: true }]
      });
      continue;
    }
    await debriefOne(ch);
  }
  clearSessionLog();   // the record covers one session; the next one starts empty
  rerender();
}

async function debriefOne(ch) {
  const attrSelect = el("select", { "aria-label": "Attribute" },
    ...ATTRIBUTES.map((a) => el("option", { value: a.id }, `${a.label} ${ch.attributes[a.id]}`)));

  const body = el("div", {},
    el("p", { class: "faint" }, `Say how this Traveler followed the Dream or the Flaw this session. If the table agrees, choose the attribute that best matches what ${subj(ch)} learned.`),
    el("div", { class: "card" }, el("h3", {}, "Dream"), el("p", {}, ch.dream || "—"),
      el("h3", {}, "Flaw"), el("p", {}, ch.flaw || "—")),
    el("div", { class: "field" }, el("label", {}, "Attribute"), attrSelect));

  const choice = await modal({
    title: `Debrief — ${ch.name || "Unnamed"}`, body,
    actions: [
      { label: "Improvement roll", value: "roll", class: "btn-primary" },
      { label: "Overcame the Flaw", value: "flaw", class: "btn-danger" },
      { label: "Skip", value: null }
    ]
  });
  if (!choice) return;

  if (choice === "flaw") {
    const sure = await confirmModal("Overcome the Flaw?",
      "Three improvement rolls right now, the Flaw is removed — and this Traveler can never improve again. The book advises leaving a session or two of play after this.", "Do it");
    if (!sure) return;
    for (let i = 0; i < ADVANCEMENT.overcomeFlaw.immediateImprovementRolls; i++) {
      await improvementRoll(ch, attrSelect.value, i + 1);
    }
    const next = structuredClone(listCharacters().find((c) => c.id === ch.id));
    next.flaw = "";
    next.state.improvementLocked = true;
    saveCharacter(next);
    showToast(`${ch.name} is changed for good.`);
    return;
  }
  await improvementRoll(ch, attrSelect.value);
}

/** d6 against the attribute: higher raises it, equal or lower grants a talent. */
async function improvementRoll(ch, attrId, index) {
  const current = listCharacters().find((c) => c.id === ch.id);
  const value = current.attributes[attrId];
  const die = d6();
  logRoll({ by: current.name, label: "Improvement", dice: [die], outcome: die > value ? `${attrId} +1` : "new talent" });

  if (die > value) {
    const next = structuredClone(current);
    next.attributes[attrId] = Math.min(6, value + 1);
    const beforeH = maxHealth(current), beforeP = maxHope(current);
    const afterH = maxHealth(next), afterP = maxHope(next);
    if (afterH > beforeH) next.state.health += afterH - beforeH;
    if (afterP > beforeP) next.state.hope += afterP - beforeP;
    saveCharacter(next);
    await modal({
      title: index ? `Improvement ${index} of 3` : "Improvement",
      body: el("p", {}, `Rolled ${die} against ${value}. ${ATTRIBUTES.find((a) => a.id === attrId).label} rises to ${next.attributes[attrId]}.`),
      actions: [{ label: "Good", value: true, class: "btn-primary" }]
    });
    return;
  }

  // Forty-six names in a select tells you nothing about what any of them do. The
  // archetype's own three come first, and the chosen one describes itself.
  const arch = ARCHETYPES.find((a) => a.id === current.archetype);
  const owned = new Set(current.talents || []);
  const suggested = (arch?.talents || []).filter((id) => !owned.has(id));
  const available = [
    ...suggested.map((id) => findTalent(id)),
    ...TALENTS.filter((t) => !owned.has(t.id) && !suggested.includes(t.id))
  ].filter(Boolean);

  const pick = el("select", { "aria-label": "New talent" },
    ...available.map((t) => el("option", { value: t.id },
      suggested.includes(t.id) ? `${t.name} — from your archetype` : t.name)));
  const detail = el("p", { class: "faint" }, describeTalent(available[0]));
  pick.addEventListener("change", () => {
    detail.textContent = describeTalent(available.find((t) => t.id === pick.value));
  });

  const body = el("div", {},
    el("p", {}, `Rolled ${die} against ${value} — no attribute gain, but experience turns into a talent. Justify it from something that happened in play.`),
    el("div", { class: "field" }, pick),
    detail);
  const confirmed = await modal({
    title: index ? `Improvement ${index} of 3` : "Improvement", body,
    actions: [
      { label: "Take it", value: "take", class: "btn-primary" },
      { label: "Invent one", value: "invent" },
      { label: "Skip", value: false }
    ]
  });
  if (!confirmed) return;

  const next = structuredClone(listCharacters().find((c) => c.id === ch.id));
  if (confirmed === "invent") {
    const invented = await inventTalent();
    if (!invented) return;
    next.customTalents = [...(next.customTalents || []), invented];
    next.talents = [...(next.talents || []), invented.id];
    saveCharacter(next);
    showToast(`${invented.name} learned.`);
    return;
  }
  next.talents = [...(next.talents || []), pick.value];
  saveCharacter(next);
  showToast(`${findTalent(pick.value)?.name} learned.`);
}

/** "You can choose any talent listed on page 56 or even create a new one" (p.65). */
async function inventTalent() {
  const name = el("input", { "aria-label": "Talent name", placeholder: "Wheelman" });
  const when = el("input", { "aria-label": "When it applies", placeholder: "keeping a vehicle on the road in bad weather" });
  const dice = el("input", { type: "checkbox", checked: true, "aria-label": "Gives two dice" });

  const ok = await modal({
    title: "Invent a talent",
    body: el("div", {},
      el("p", { class: "faint" }, "The book allows one of your own, so long as you can justify it from play. Most printed talents are worth two dice in a named situation."),
      el("div", { class: "field" }, el("label", {}, "Name"), name),
      el("div", { class: "field" }, el("label", {}, "When it applies"), when),
      el("label", { class: "card-row", style: "text-transform:none;letter-spacing:0;color:inherit" },
        el("span", {}, "Worth two dice", el("div", { class: "faint" }, "Leave it off for a talent that changes a rule instead.")),
        dice)),
    actions: [{ label: "Learn it", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  if (!ok || !name.value.trim()) return null;

  const text = when.value.trim();
  return {
    id: `custom-${uid()}`, name: name.value.trim(), invented: true,
    effect: dice.checked
      ? { kind: "dice", bonus: 2, when: text }
      : { kind: "rule", rule: "invented", when: text }
  };
}
