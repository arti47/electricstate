// Combat tracker and the generic progress-task tracker (Phase 4).
// One task component serves neurocasting difficulties, countdowns, healing clocks and diseases.
import { el, uid, rollDice, countSixes, d6, clamp, randomInt } from "./core.js";
import { INITIATIVE, ACTION_ECONOMY, RANGES, COMBAT_REACTIONS } from "../data.js";
import { THREATS, ANIMALS } from "../data-npcs.js";
import { listCharacters, getCharacter, saveCharacter, logRoll, getJourney, saveJourney } from "./store.js";
import { maxHealth, isDronePilot } from "./derived.js";
import { showToast, modal, promptModal, confirmModal, explain, moreMenu } from "./ui.js";
import { renderVitals } from "./sheet.js";
import { rollGender, refer, subj, obj, poss, Subj, Poss } from "./pronouns.js";
import { portrait } from "./graphics.js";

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
    gender: c.gender, zone: 1, acted: false, realm: "real"
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
// ------------------------------------------------------------------ zone map
/** Initials for a token, made longer only where two combatants would otherwise share them. */
function tokenLabel(x, all) {
  const words = (n) => String(n || "?").split(/\s+/).filter(Boolean);
  const short = (n) => words(n).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const mine = short(x.name);
  if (all.filter((o) => short(o.name) === mine).length < 2) return mine;
  const w = words(x.name);
  return (w[0][0] + (w[w.length - 1] || "").slice(0, 2)).toUpperCase();
}
let picked = null;   // the token lifted off the map, waiting for a zone to land in

/**
 * The fight as a map: one column per zone, a token per combatant — amber for Travelers,
 * rust for the other side, teal for anything with a Hull. Tap a token, then a zone.
 */
function zoneMap(c, ordered, upNext, rerender) {
  const top = Math.max(3, ...c.combatants.map((x) => x.zone || 1)) + 1;
  if (picked && !c.combatants.some((x) => x.id === picked)) picked = null;
  const moving = picked ? c.combatants.find((x) => x.id === picked) : null;
  const map = el("div", { class: "zonemap" + (moving ? " is-moving" : ""), role: "group", "aria-label": "Zones" });
  for (let z = 1; z <= top; z++) {
    const here = ordered.filter((x) => (x.zone || 1) === z);
    const lane = moving && moving.zone !== z
      ? el("button", {
          class: "zone is-target", "aria-label": `Move ${moving.name} to zone ${z}`,
          onclick: () => {
            writeCombat({ ...c, combatants: c.combatants.map((x) => (x.id === moving.id ? { ...x, zone: z } : x)) });
            picked = null; rerender();
          }
        })
      : el("div", { class: "zone" });
    lane.append(el("span", { class: "zone-n" }, String(z)));
    for (const x of here) {
      const ch = x.kind === "traveler" ? getCharacter(x.id) : null;
      const machine = x.gender === "neuter" || isDronePilot(ch || {});
      const initials = tokenLabel(x, c.combatants);
      lane.append(el(moving && moving.zone !== z ? "span" : "button", {
        class: ["token", x.side === "travelers" ? "is-ally" : "is-foe", machine && "is-machine",
          x.acted && "is-spent", upNext?.id === x.id && "is-up", picked === x.id && "is-picked"].filter(Boolean).join(" "),
        title: x.name, "aria-label": `${x.name}, zone ${z}${picked === x.id ? " — choose a zone" : " — move"}`,
        onclick: (e) => { e.stopPropagation(); picked = picked === x.id ? null : x.id; rerender(); }
      }, ch ? portrait(ch, { size: 34, frame: false }) : initials));
    }
    map.append(lane);
  }
  return el("div", { class: "card zonecard" }, map,
    moving ? el("p", { class: "faint", style: "margin:8px 0 0" }, `${moving.name}: tap a zone.`) : null);
}

/**
 * Turn order is the thing you are constantly re-deriving at the table: the side that acts
 * first, then whoever has not gone, then the spent. The tracker lists it; the combat strip
 * on every other screen names whoever is up.
 */
export function turnOrder(c = getCombat()) {
  if (!c) return { ordered: [], upNext: null, waiting: 0 };
  const rank = (x) => (x.side === c.startingSide ? 0 : 2) + (x.acted ? 1 : 0);
  const ordered = [...c.combatants].sort((a, b) => rank(a) - rank(b));
  const waiting = ordered.filter((x) => !x.acted);
  return { ordered, upNext: waiting[0] || null, waiting: waiting.length };
}

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

  if (!c && !listCharacters().length) {
    wrap.append(el("div", { class: "empty card" },
      el("p", {}, "A fight needs somebody in it. Make a Traveler and this becomes the tracker: who is where, who has gone, and what health is left."),
      el("a", { class: "btn btn-primary", href: "#/create" }, "Create a Traveler")));
    wrap.append(tasksCard(rerender));
    return wrap;
  }

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
              body: el("p", {}, `${r.mine} against ${r.theirs}. ${r.side === "travelers" ? "The Travelers act" : "The other side acts"} first.`),
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
  const { ordered, upNext, waiting } = turnOrder(c);

  // Ending the fight is behind ⋯ — it discards every Threat's health, so it should not
  // sit as a red block between "Next round" and the person whose turn it is.
  const endFight = async () => {
    const down = c.combatants.filter((x) => x.kind === "threat" && (x.health ?? 1) <= 0).length;
    const ok = await confirmModal("End the fight?",
      `Zones, rounds and every Threat's remaining health are discarded.${down ? ` ${down} of the Threats are already down.` : ""} Each Traveler keeps the Health on the sheet, and anyone Incapacitated still owes a serious injury roll.`,
      "End it");
    if (!ok) return;
    endCombat();
    rerender();
  };
  wrap.append(el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("strong", {}, `Round ${c.round}`),
      el("span", { style: "display:flex;align-items:center;gap:4px" },
        el("span", { class: "faint" }, c.startingSide === "travelers" ? "Travelers act first" : "Enemies act first"),
        moreMenu([{ label: "End combat", danger: true, run: endFight }], "Combat actions"))),
    el("div", { class: "card-row" },
      el("span", {}, upNext ? el("strong", {}, `${upNext.name} is up`) : el("strong", {}, "Everyone has gone")),
      el("span", { class: "faint" }, upNext ? `${waiting} still to act` : "End the round")),
    el("p", { class: "faint" }, `One move and one action, or two moves — the move comes first. A reaction costs your next turn but covers every attack until then.`),
    el("div", { class: "btn-grid" },
      el("button", {
        class: "btn" + (upNext ? "" : " btn-primary"), onclick: () => { nextRound(c); rerender(); }
      }, "Next round"),
      el("button", { class: "btn", onclick: () => addThreat(rerender) }, "Add threat"))));

  // Whoever is up comes first — their turn is the thing to press — then the map of
  // the whole fight, then everyone else.
  const map = zoneMap(c, ordered, upNext, rerender);
  if (!upNext) wrap.append(map);
  for (const combatant of ordered) {
    wrap.append(combatantCard(combatant, c, rerender));
    if (upNext && combatant.id === upNext.id) wrap.append(map);
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

  const health = ch ? `${ch.state.health}/${maxHealth(ch)}` : `${combatant.health ?? "?"} hp`;

  // Ten combatants is five screens of identical cards. Whoever has taken their turn
  // collapses to a line — you only need the ones who have not gone yet.
  if (combatant.acted) {
    return el("div", { class: "card is-spent" },
      el("div", { class: "card-row" },
        el("span", {}, el("strong", {}, combatant.name),
          el("span", { class: "faint" }, ` · zone ${combatant.zone}`)),
        el("div", { class: "btn-row" },
          el("span", { class: "mono faint" }, health),
          el("button", { class: "btn", onclick: () => update({ acted: false }) }, "Undo"))));
  }

  // Whoever is up is the one card that matters this second: amber edge, primary button.
  const isUp = turnOrder(c).upNext?.id === combatant.id;
  const card = el("div", { class: "card" + (isUp ? " is-up" : "") + (combatant.side !== "travelers" ? " is-enemy" : "") },
    el("div", { class: "card-row" },
      el("strong", {}, combatant.name),
      el("span", { class: "mono faint" }, health)));

  if (combatant.forfeit) {
    card.append(el("p", { class: "faint" }, combatant.forfeit === "stunned"
      ? `Stunned — ${subj(combatant)} loses ${poss(combatant)} next turn.`
      : `Reacted — that costs ${poss(combatant)} next turn, but it answers every attack until then.`));
  }
  if (combatant.forfeited) {
    card.append(el("p", { class: "faint" }, combatant.forfeited === "stunned"
      ? "Sitting this round out: stunned."
      : `Sitting this round out: ${subj(combatant)} reacted last round.`));
  }

  card.append(el("div", { class: "card-row", style: "margin-top:6px" },
    el("span", { class: "faint" }, "Zone"),
    el("div", { class: "stepper" },
      el("button", {
        class: "stepper-btn", "aria-label": `${combatant.name} back a zone`,
        disabled: combatant.zone <= 1,
        onclick: () => update({ zone: Math.max(1, combatant.zone - 1) })
      }, "←"),
      el("span", { class: "stepper-value" }, combatant.zone),
      el("button", {
        class: "stepper-btn", "aria-label": `${combatant.name} forward a zone`,
        onclick: () => update({ zone: combatant.zone + 1 })
      }, "→"))));

  // Dual-realm: a character acts in one realm per round and is inert in the other.
  if (ch?.neurocaster) {
    card.append(el("div", { class: "card-row" },
      el("span", { class: "faint" }, "Acts in"),
      el("div", { class: "seg", role: "group", "aria-label": "Realm this round" },
        ...["real", "neuroscape"].map((realm) => el("button", {
          class: "seg-item" + (combatant.realm === realm ? " is-on" : ""),
          "aria-pressed": combatant.realm === realm ? "true" : "false",
          onclick: () => update({ realm })
        }, realm === "real" ? "World" : "Network")))));
    if (combatant.realm === "neuroscape") {
      card.append(el("p", { class: "faint" },
        `Inert out here until ${poss(combatant)} next turn — ${subj(combatant)} cannot answer an attack in the real world.`));
    }
  }

  card.append(el("div", { class: "btn-grid", style: "margin-top:8px" },
    el("button", { class: "btn" + (isUp ? " btn-primary" : ""), onclick: () => update({ acted: true }) }, "Turn spent"),
    el("button", {
      class: "btn", onclick: async () => {
        const { setTarget } = await import("./roller.js");
        setTarget(combatant.id);
        location.hash = "#/dice";
      }
    }, "Attack this"),
    ch ? el("a", { class: "btn", href: `#/sheet/${ch.id}` }, "Sheet") : null,
    // "Law Enforcement 1, 2, 3" gets real names at the table within thirty seconds.
    !ch ? el("button", {
      class: "btn", onclick: async () => {
        const v = await promptModal("Name this one", { label: "Name", value: combatant.name });
        if (v == null || v === "") return;
        update({ name: v });
      }
    }, "Rename") : null,
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
  // A robot is an "it"; anything with a person inside gets a rolled pronoun, so the app
  // can say what happens to that one rather than to "them".
  const additions = Array.from({ length: many }, (_, i) => ({
    id: uid(), kind: "threat", name: many > 1 ? `${t.name} ${i + 1}` : t.name,
    side: "enemies", zone: 2, acted: false,
    gender: t.isDrone || t.hull != null ? "neuter" : rollGender(randomInt),
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
