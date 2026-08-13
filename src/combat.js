// Combat tracker and the generic progress-task tracker (Phase 4).
// One task component serves neurocasting difficulties, countdowns, healing clocks and diseases.
import { el, uid, rollDice, countSixes, d6, clamp } from "./core.js";
import { INITIATIVE, ACTION_ECONOMY, RANGES, COMBAT_REACTIONS } from "../data.js";
import { THREATS, ANIMALS } from "../data-npcs.js";
import { listCharacters, getCharacter, saveCharacter, logRoll, getJourney, saveJourney } from "./store.js";
import { maxHealth } from "./derived.js";
import { showToast, modal, promptModal, confirmModal, explain } from "./ui.js";
import { renderVitals } from "./sheet.js";

// ------------------------------------------------------------- progress tasks
/** A task is N successes against an optional opposing count. Used everywhere. */
export function makeTask({ name, requirement, kind = "generic", failuresAllowed = null }) {
  return { id: uid(), name, requirement, kind, progress: 0, failures: 0, failuresAllowed, done: false, log: [] };
}

export function advanceTask(task, { success, note = "" }) {
  const next = { ...task, log: [...task.log, { success, note, at: Date.now() }] };
  if (success) next.progress += 1;
  else next.failures += 1;
  next.done = next.progress >= next.requirement;
  next.failed = next.failuresAllowed != null && next.failures >= next.failuresAllowed;
  return next;
}

const tasks = () => getJourney()?.tasks || [];
const writeTasks = (list) => { const j = getJourney() || {}; saveJourney({ ...j, tasks: list }); };

// ------------------------------------------------------------------- combat
export const getCombat = () => getJourney()?.combat || null;
const combat = getCombat;
const writeCombat = (c) => { const j = getJourney() || {}; saveJourney({ ...j, combat: c }); };

export function startCombat(side = "attackers") {
  const combatants = listCharacters().map((c) => ({
    id: c.id, kind: "traveler", name: c.name || "Unnamed", side: "travelers",
    zone: 1, acted: false, realm: "real"
  }));
  writeCombat({ active: true, round: 1, startingSide: side, combatants });
  return combat();
}

export function endCombat() { writeCombat(null); }

export const findCombatant = (id) => (getCombat()?.combatants || []).find((c) => c.id === id) || null;

/** Anything with a stat block that can stand opposite the Travelers, animals included. */
export const bestiaryEntry = (id) => [...THREATS, ...ANIMALS].find((t) => t.id === id) || null;

/** Defence pool for a combatant: their own attribute if a Traveler, the block's if a Threat. */
export function defencePool(combatant, kind = "close") {
  if (!combatant) return 4;
  if (combatant.kind === "traveler") {
    const ch = getCharacter(combatant.id);
    return ch ? ch.attributes[kind === "close" ? "strength" : "agility"] : 4;
  }
  const threat = bestiaryEntry(combatant.threatId);
  if (!threat) return 4;
  return (kind === "close" ? threat.strength : threat.agility) ?? 4;
}

/** Damage a combatant wherever their health actually lives. */
export function damageCombatant(id, amount) {
  const c = getCombat();
  const combatant = findCombatant(id);
  if (!combatant) return null;

  if (combatant.kind === "traveler") {
    const ch = getCharacter(combatant.id);
    if (!ch) return null;
    const next = structuredClone(ch);
    next.state.health = clamp(next.state.health - amount, 0, maxHealth(next));
    saveCharacter(next);
    return { name: combatant.name, health: next.state.health, kind: "traveler" };
  }

  const health = Math.max(0, (combatant.health ?? 0) - amount);
  writeCombat({ ...c, combatants: c.combatants.map((x) => (x.id === id ? { ...x, health } : x)) });
  return { name: combatant.name, health, kind: "threat" };
}

/**
 * A reaction covers every attack until the defender's next turn, and costs that turn.
 * The same flag carries a stun: both mean "does not act next round".
 */
export function forfeitNextTurn(id, reason = "reacted") {
  const c = getCombat();
  if (!c) return null;
  const combatant = findCombatant(id);
  if (!combatant) return null;
  writeCombat({ ...c, combatants: c.combatants.map((x) => (x.id === id ? { ...x, forfeit: reason } : x)) });
  return combatant;
}

/** Advance a round: everyone acts again except whoever spent their turn reacting. */
export function nextRound(c = getCombat()) {
  if (!c) return null;
  const next = {
    ...c, round: c.round + 1,
    combatants: c.combatants.map((x) => x.forfeit
      ? { ...x, acted: true, forfeit: null, forfeited: x.forfeit }
      : { ...x, acted: false, forfeited: null })
  };
  writeCombat(next);
  return next;
}

export function rollInitiative() {
  const a = d6(), b = d6();
  const travelers = listCharacters();
  const bestWits = travelers.length ? Math.max(...travelers.map((c) => c.attributes.wits)) : 0;
  const enemyWits = 3;
  const mine = a + bestWits, theirs = b + enemyWits;
  if (mine === theirs) return rollInitiative();
  logRoll({ label: "Initiative", dice: [a, b], outcome: mine > theirs ? "Travelers act first" : "The other side acts first" });
  return { mine, theirs, side: mine > theirs ? "travelers" : "enemies" };
}

// ==================================================================== screen
export function combatScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

function build(rerender) {
  const c = combat();
  const wrap = el("div", {}, el("h1", {}, "Combat"));
  wrap.append(explain('Zones rather than a grid. The side that starts the fight acts first, everyone gets a move and an action, and a reaction costs your next turn. Anyone wearing a neurocaster picks a realm each round and is inert in the other one.'));

  if (!c) {
    wrap.append(el("div", { class: "card" },
      el("p", { class: "faint" }, "Zones, not grids. The side that starts the fight acts first — if that is unclear, roll a die and add the best Wits on each side."),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-primary", onclick: () => { startCombat(); rerender(); } }, "Start combat"),
        el("button", {
          class: "btn", onclick: async () => {
            const r = rollInitiative();
            await modal({
              title: "Initiative",
              body: el("p", {}, `${r.mine} against ${r.theirs}. ${r.side === "travelers" ? "The Travelers" : "The other side"} acts first.`),
              actions: [{ label: "Start combat", value: true, class: "btn-primary" }]
            });
            startCombat(r.side === "travelers" ? "travelers" : "enemies");
            rerender();
          }
        }, "Roll initiative"))));
    wrap.append(tasksCard(rerender));
    return wrap;
  }

  // Turn order is the thing you are constantly re-deriving at the table, so the list
  // states it: the side that acts first, then whoever has not gone, then the spent.
  const rank = (x) => (x.side === c.startingSide ? 0 : 2) + (x.acted ? 1 : 0);
  const ordered = [...c.combatants].sort((a, b) => rank(a) - rank(b));
  const upNext = ordered.find((x) => !x.acted);
  const waiting = ordered.filter((x) => !x.acted).length;

  wrap.append(el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("strong", {}, `Round ${c.round}`),
      el("span", { class: "faint" }, c.startingSide === "travelers" ? "Travelers act first" : "Enemies act first")),
    el("div", { class: "card-row" },
      el("span", {}, upNext ? el("strong", {}, `${upNext.name} is up`) : el("strong", {}, "Everyone has gone")),
      el("span", { class: "faint" }, upNext ? `${waiting} still to act` : "End the round")),
    el("p", { class: "faint" }, `One move and one action, or two moves — the move comes first. A reaction costs your next turn but covers every attack until then.`),
    el("div", { class: "btn-row" },
      el("button", {
        class: "btn" + (upNext ? "" : " btn-primary"), onclick: () => { nextRound(c); rerender(); }
      }, "Next round"),
      el("button", { class: "btn", onclick: () => addThreat(rerender) }, "Add threat"),
      el("button", { class: "btn btn-danger", onclick: () => { endCombat(); rerender(); } }, "End combat"))));

  for (const combatant of ordered) {
    wrap.append(combatantCard(combatant, c, rerender));
  }
  wrap.append(tasksCard(rerender));
  return wrap;
}

function combatantCard(combatant, c, rerender) {
  const ch = combatant.kind === "traveler" ? getCharacter(combatant.id) : null;
  const update = (patch) => {
    writeCombat({ ...c, combatants: c.combatants.map((x) => (x.id === combatant.id ? { ...x, ...patch } : x)) });
    rerender();
  };

  const card = el("div", { class: "card", style: combatant.acted ? "opacity:.55" : "" },
    el("div", { class: "card-row" },
      el("strong", {}, combatant.name),
      ch ? el("span", { class: "mono faint" }, `${ch.state.health}/${maxHealth(ch)}`)
         : el("span", { class: "mono faint" }, `${combatant.health ?? "?"} hp`)));

  if (combatant.forfeit) {
    card.append(el("p", { class: "faint" }, combatant.forfeit === "stunned"
      ? "Stunned — they lose their next turn."
      : "Reacted — that costs their next turn, but it answers every attack until then."));
  }
  if (combatant.forfeited) {
    card.append(el("p", { class: "faint" }, combatant.forfeited === "stunned"
      ? "Sitting this round out: stunned."
      : "Sitting this round out: they reacted last round."));
  }

  card.append(el("div", { class: "card-row", style: "margin-top:6px" },
    el("span", { class: "faint" }, `Zone ${combatant.zone}`),
    el("div", { class: "btn-row" },
      el("button", { class: "btn", "aria-label": `${combatant.name} back a zone`, onclick: () => update({ zone: Math.max(1, combatant.zone - 1) }) }, "←"),
      el("button", { class: "btn", "aria-label": `${combatant.name} forward a zone`, onclick: () => update({ zone: combatant.zone + 1 }) }, "→"))));

  // Dual-realm: a character acts in one realm per round and is inert in the other.
  if (ch?.neurocaster) {
    card.append(el("div", { class: "card-row" },
      el("span", { class: "faint" }, "This round acts in"),
      el("div", { class: "btn-row" },
        ...["real", "neuroscape"].map((realm) => el("button", {
          class: "btn" + (combatant.realm === realm ? " btn-primary" : ""),
          onclick: () => update({ realm })
        }, realm === "real" ? "The world" : "The network")))));
    if (combatant.realm === "neuroscape") {
      card.append(el("p", { class: "faint" }, "Inert out here until their next turn — they cannot answer an attack in the real world."));
    }
  }

  card.append(el("div", { class: "btn-row", style: "margin-top:8px" },
    el("button", { class: "btn" + (combatant.acted ? "" : " btn-primary"), onclick: () => update({ acted: !combatant.acted }) },
      combatant.acted ? "Undo turn" : "Took their turn"),
    el("button", {
      class: "btn", onclick: async () => {
        const { setTarget } = await import("./roller.js");
        setTarget(combatant.id);
        location.hash = "#/dice";
      }
    }, "Attack this"),
    ch ? el("a", { class: "btn", href: `#/sheet/${ch.id}` }, "Sheet") : null,
    !ch ? el("button", {
      class: "btn", onclick: async () => {
        const v = await promptModal("Damage the threat", { label: "Points of damage", value: "1" });
        if (v == null) return;
        const dmg = Number(v) || 0;
        const health = Math.max(0, (combatant.health ?? 0) - dmg);
        update({ health });
        if (health === 0) showToast(`${combatant.name} is Incapacitated. Threats make no death rolls — you decide.`);
      }
    }, "Damage") : null));
  return card;
}

async function addThreat(rerender) {
  const select = el("select", { "aria-label": "Threat" },
    ...THREATS.filter((t) => !t.unstatted).map((t) => el("option", { value: t.id }, t.name)),
    el("optgroup", { label: "Animals" }, ...ANIMALS.map((a) => el("option", { value: a.id }, a.name))));
  const count = el("input", { type: "number", value: "1", min: "1", "aria-label": "How many" });
  const body = el("div", {},
    el("div", { class: "field" }, el("label", {}, "Threat"), select),
    el("div", { class: "field" }, el("label", {}, "How many"), count));
  const go = await modal({ title: "Add a threat", body, actions: [{ label: "Add", value: true, class: "btn-primary" }, { label: "Cancel", value: false }] });
  if (!go) return;

  const t = bestiaryEntry(select.value);
  const c = combat();
  const many = Math.max(1, Number(count.value) || 1);
  const additions = Array.from({ length: many }, (_, i) => ({
    id: uid(), kind: "threat", name: many > 1 ? `${t.name} ${i + 1}` : t.name,
    side: "enemies", zone: 2, acted: false,
    health: t.health ?? t.hull ?? 4, threatId: t.id
  }));
  writeCombat({ ...c, combatants: [...c.combatants, ...additions] });
  rerender();
}

// -------------------------------------------------------------- tasks card
function tasksCard(rerender) {
  const list = tasks();
  const card = el("div", { class: "card" }, el("h3", {}, "Progress tasks"),
    el("p", { class: "faint" }, "Countdowns, neurocasting difficulties, healing clocks, diseases — anything resolved over several rolls."));

  for (const task of list) {
    const bar = el("div", { class: "card-row" },
      el("span", {}, task.name),
      el("span", { class: "mono" }, `${task.progress}/${task.requirement}${task.failuresAllowed ? ` · ${task.failures}/${task.failuresAllowed} failed` : ""}`));
    const controls = el("div", { class: "btn-row" },
      el("button", {
        class: "btn", onclick: () => { writeTasks(list.map((t) => (t.id === task.id ? advanceTask(t, { success: true }) : t))); rerender(); }
      }, "Success"),
      el("button", {
        class: "btn", onclick: () => { writeTasks(list.map((t) => (t.id === task.id ? advanceTask(t, { success: false }) : t))); rerender(); }
      }, "Setback"),
      el("button", { class: "btn btn-danger", onclick: () => { writeTasks(list.filter((t) => t.id !== task.id)); rerender(); } }, "Drop"));
    card.append(el("div", { style: "padding:8px 0;border-top:1px solid var(--line-soft)" }, bar, controls,
      task.done ? el("p", { style: "color:var(--ok)" }, "Complete.") : null,
      task.failed ? el("p", { style: "color:var(--danger)" }, "Failed.") : null));
  }

  card.append(el("button", {
    class: "btn btn-block", style: "margin-top:8px",
    onclick: async () => {
      const name = await promptModal("New task", { label: "What is being attempted?" });
      if (!name) return;
      const req = await promptModal("How many successes?", { label: "Requirement", value: "3" });
      const requirement = Math.max(1, Number(req) || 3);
      writeTasks([...tasks(), makeTask({ name, requirement })]);
      rerender();
    }
  }, "New task"));
  return card;
}
