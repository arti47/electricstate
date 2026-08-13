// Neurocasting — this game's "powers" subsystem (Phase 4).
// Difficulty is a number of successful rolls, each costing a Stretch and each failure a Bliss.
import { el, rollDice, countSixes, clamp, uid } from "./core.js";
import { NEURO_TASKS, INFO_DIFFICULTY, HACK_DIFFICULTY, NEUROCASTERS, BLISS, WIRED_BONUS, DRONES } from "../data.js";
import { maxHope, maxHealth, tracksBliss } from "./derived.js";
import { getCharacter, saveCharacter, listCharacters, logRoll } from "./store.js";
import { talent as findTalent } from "./rules.js";
import { showToast, modal, explain } from "./ui.js";
import { renderVitals } from "./sheet.js";
import { Settings } from "./settings.js";

const TASK_KINDS = [
  { id: "findInformation", label: "Find information", table: INFO_DIFFICULTY, gear: "processor", attr: "wits", talent: "dataMiner" },
  { id: "hackSystem", label: "Hack a system", table: HACK_DIFFICULTY, gear: "network", attr: "wits", talent: "hacker" },
  { id: "avatarSocial", label: "Persuade an avatar", table: null, gear: "graphics", attr: "empathy", talent: "gamer" },
  { id: "avatarCombat", label: "Fight an avatar", table: null, gear: "graphics", attr: "wits", talent: "gamer" },
  { id: "avatarManipulation", label: "Rewrite what an avatar believes", table: null, gear: "graphics", attr: "empathy", talent: "gamer", difficultyRange: [2, 4], perRoll: "shift" },
  { id: "droneControl", label: "Pilot a drone", table: null, gear: "network", attr: "wits", talent: "droneOperator", drone: true }
];

export const casterState = (ch) => {
  const model = NEUROCASTERS.find((n) => n.id === ch.neurocaster);
  if (!model) return null;
  return ch.state.caster || { processor: model.processor, network: model.network, graphics: model.graphics };
};

export const isBusted = (ch) => {
  const s = casterState(ch);
  return s ? ["processor", "network", "graphics"].some((k) => s[k] <= 0) : false;
};

export const isLost = (ch) => tracksBliss(ch) && (ch.state.bliss || 0) >= ch.state.hope;

/** One roll toward a Difficulty-N task. A failure before pushing costs a point of Bliss. */
export function neuroRoll(ch, kind, { wired = false, extraModifier = 0 } = {}) {
  const spec = TASK_KINDS.find((k) => k.id === kind);
  const caster = casterState(ch);
  const gearDice = caster ? caster[spec.gear] : 0;
  const talentDice = (ch.talents || []).includes(spec.talent) ? findTalent(spec.talent).effect.bonus : 0;
  const baseDice = Math.max(1, ch.attributes[spec.attr] + talentDice + extraModifier + (wired ? WIRED_BONUS : 0));

  const base = rollDice(baseDice);
  const gear = rollDice(gearDice);
  const sixes = countSixes(base) + countSixes(gear);
  return { base, gear, sixes, success: sixes > 0, spec, gearDice, baseDice };
}

export function applyNeuroResult(ch, result) {
  const next = structuredClone(ch);
  if (!result.success && tracksBliss(next)) {
    next.state.bliss = (next.state.bliss || 0) + BLISS.perFailedRoll;
  }
  saveCharacter(next);
  return next;
}

// ==================================================================== screen
export function neuroScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

let session = null;

function build(rerender) {
  const chars = listCharacters();
  const wrap = el("div", {}, el("h1", {}, "Neuroscape"));
  wrap.append(explain("Jacking in. A task's Difficulty is how many successful rolls it needs, one per Stretch, with gear dice from whichever neurocaster attribute suits the job. Every failed roll adds a point of Bliss before you even consider pushing — which is how the network takes people."));
  if (!chars.length) {
    wrap.append(el("div", { class: "empty card" }, el("p", {}, "No Travelers yet.")));
    return wrap;
  }

  session = session || { charId: chars[0].id, kind: "findInformation", difficulty: 1, wired: false, progress: 0, rolls: [] };
  const ch = getCharacter(session.charId) || chars[0];
  session.charId = ch.id;

  wrap.append(el("div", { class: "field" }, el("label", {}, "Traveler"),
    el("select", { onchange: (e) => { session = { ...session, charId: e.target.value, progress: 0, rolls: [] }; rerender(); } },
      ...chars.map((c) => el("option", { value: c.id, selected: c.id === ch.id }, c.name)))));

  const caster = casterState(ch);
  if (!caster) {
    wrap.append(el("div", { class: "card" }, el("p", {}, "No neurocaster. Without one there is no way in.")));
    return wrap;
  }
  if (isBusted(ch)) {
    wrap.append(el("div", { class: "card", style: "border-left:3px solid var(--danger)" },
      el("strong", {}, "Neurocaster Busted"),
      el("p", { class: "faint" }, "Repair it before connecting. Being cut off mid-session drops Hope to zero and inflicts a trauma.")));
    return wrap;
  }

  // Being in here means the helmet is on, which the real world charges you for.
  if (!ch.state.wearingCaster) {
    const worn = structuredClone(ch);
    worn.state.wearingCaster = true;
    saveCharacter(worn);
  }

  wrap.append(el("div", { class: "card" },
    el("div", { class: "card-row" }, el("strong", {}, NEUROCASTERS.find((n) => n.id === ch.neurocaster).name),
      el("span", { class: "mono faint" }, `P${caster.processor} N${caster.network} G${caster.graphics}`)),
    el("p", { class: "faint" }, "The helmet is on: real-world actions needing mobility or vision lose dice, and you act in one realm per round. Take it off on the sheet when you are done."),
    el("label", { class: "card-row", style: "text-transform:none;letter-spacing:0;color:inherit;margin-top:8px" },
      el("span", {}, el("strong", {}, "Plugged into a terminal"), el("div", { class: "faint" }, `+${WIRED_BONUS} dice to everything`)),
      el("input", { type: "checkbox", checked: session.wired, style: "width:auto;min-height:auto", onchange: (e) => { session.wired = e.target.checked; } })),
    isLost(ch) ? el("p", { class: "faint", style: "color:var(--danger)" },
      "Bliss has caught Hope. You can still act in here — you simply cannot leave on your own.") : null));

  // task setup
  const kindSelect = el("select", { "aria-label": "Task",
    onchange: (e) => { session.kind = e.target.value; session.progress = 0; session.rolls = []; rerender(); } },
    ...TASK_KINDS.map((k) => el("option", { value: k.id, selected: session.kind === k.id }, k.label)));
  const spec = TASK_KINDS.find((k) => k.id === session.kind);

  const card = el("div", { class: "card" }, el("h3", {}, "Task"), el("div", { class: "field" }, kindSelect));
  if (spec.table) {
    card.append(el("div", { class: "field" }, el("label", {}, "Difficulty"),
      el("select", { onchange: (e) => { session.difficulty = +e.target.value; session.progress = 0; session.rolls = []; rerender(); } },
        ...spec.table.map((row) => el("option", { value: row.difficulty, selected: session.difficulty === row.difficulty },
          `${row.what} — ${row.difficulty}`)))));
    if (session.kind === "hackSystem") {
      card.append(el("p", { class: "faint" }, "Add 1 to take control rather than merely disable it, and another to hold it for a Shift."));
    }
  } else if (spec.id === "avatarManipulation") {
    card.append(el("div", { class: "field" }, el("label", {}, "Scope of the change"),
      el("select", { onchange: (e) => { session.difficulty = +e.target.value; session.progress = 0; session.rolls = []; rerender(); } },
        ...[2, 3, 4].map((n) => el("option", { value: n, selected: session.difficulty === n }, `${n} successful rolls`)))));
    card.append(el("p", { class: "faint" }, "One roll per Shift. Convinces an avatar their core beliefs are wrong — non-human entities do this to people too."));
    if (session.difficulty < 2) session.difficulty = 2;
  } else if (spec.id === "droneControl") {
    const drone = el("select", { "aria-label": "Drone",
      onchange: (e) => { session.droneId = e.target.value; rerender(); } },
      ...DRONES.map((d) => el("option", { value: d.id, selected: session.droneId === d.id }, d.name)));
    card.append(el("div", { class: "field" }, el("label", {}, "Drone"), drone));
    const d = DRONES.find((x) => x.id === (session.droneId || DRONES[0].id));
    card.append(el("p", { class: "faint" },
      `Strength ${d.strength} · Agility ${d.agility} · Hull ${d.hull} · Armor ${d.armor} · damage ${d.damage} (${d.min}–${d.max}).`),
      el("p", { class: "faint" },
        "The drone's Strength and Agility replace yours; your Wits and Empathy stay your own; every roll gains Network as gear dice. Every failed roll still adds Bliss, which is how pilots stop being able to unplug."));
    session.difficulty = 1;
  } else {
    card.append(el("p", { class: "faint" }, session.kind === "avatarCombat"
      ? `Close combat at Engaged range, but rolled on Wits with Graphics as gear dice.`
      : `Empathy with Graphics as gear dice. An opponent resists with Wits and their own Network.`));
    session.difficulty = 1;
  }
  // Helpers on the same neuroscape lend a die each and can do nothing else that Stretch.
  card.append(el("div", { class: "card-row", style: "padding:6px 0" },
    el("span", {}, "Helpers in here",
      el("div", { class: "faint" }, "+1 die each, up to three. They can do nothing else.")),
    el("div", { class: "btn-row" },
      el("button", { class: "btn", "aria-label": "Fewer helpers", onclick: () => { session.helpers = Math.max(0, (session.helpers || 0) - 1); rerender(); } }, "−"),
      el("span", { class: "mono", style: "min-width:3ch;text-align:center" }, String(session.helpers || 0)),
      el("button", { class: "btn", "aria-label": "More helpers", onclick: () => { session.helpers = Math.min(3, (session.helpers || 0) + 1); rerender(); } }, "+"))));

  card.append(el("div", { class: "card-row" },
    el("span", { class: "faint" }, `${spec.attr} + ${spec.gear} · one Stretch per roll`),
    el("span", { class: "mono" }, `${session.progress}/${session.difficulty}`)));
  wrap.append(card);

  if (spec.id === "avatarCombat") wrap.append(avatarCombatCard(ch, rerender));

  wrap.append(el("button", {
    class: "btn btn-primary btn-block",
    onclick: () => doNeuroRoll(ch, rerender)
  }, "Roll"));

  if (session.rolls.length) {
    const log = el("div", { class: "card" }, el("h3", {}, "This task"));
    for (const r of session.rolls) {
      log.append(el("div", { class: "card-row", style: "padding:4px 0" },
        el("span", { class: "mono faint" }, r.dice.join(" ")),
        el("span", {}, r.success ? "success" : "+1 Bliss")));
    }
    if (session.progress >= session.difficulty) {
      log.append(el("p", { style: "color:var(--ok)" }, "Task complete."));
      log.append(el("button", { class: "btn", onclick: () => { session.progress = 0; session.rolls = []; rerender(); } }, "New task"));
    }
    wrap.append(log);
  }

  wrap.append(scriptedExperienceCard(ch, rerender));
  wrap.append(el("p", { class: "faint" },
    "While wearing a neurocaster you act either out here or in there each round — never both."));
  return wrap;
}

/**
 * Avatar combat cuts the person, not the picture: damage lands on the user's Health,
 * and Incapacitation in here throws them out with a trauma to roll (p.97).
 */
function avatarCombatCard(ch, rerender) {
  const amount = el("input", { type: "number", value: "1", min: "1", "aria-label": "Damage taken" });
  const card = el("div", { class: "card" }, el("h3", {}, "Taking a hit in here"),
    el("p", { class: "faint" }, "Damage in a neuroscape reduces your own Health. At zero you are Incapacitated and thrown out — you come round a Stretch later on 1 Health, with a mental trauma to roll."),
    el("div", { class: "field" }, el("label", {}, "Damage taken"), amount),
    el("button", {
      class: "btn btn-block btn-danger",
      onclick: async () => {
        const current = getCharacter(ch.id);
        const next = structuredClone(current);
        const dealt = Math.max(1, Number(amount.value) || 1);
        next.state.health = clamp(next.state.health - dealt, 0, maxHealth(next));
        const out = next.state.health === 0;
        if (out) next.state.wearingCaster = false;
        saveCharacter(next);
        renderVitals(next);
        logRoll({ by: ch.name, label: "Avatar combat", dice: [], outcome: `${dealt} damage${out ? " — Incapacitated and disconnected" : ""}` });
        rerender();
        if (!out) return;

        const go = await modal({
          title: "Thrown out",
          body: el("div", {},
            el("p", {}, "Incapacitated inside the neuroscape: the connection drops and the helmet comes off."),
            el("p", { class: "faint" }, "A Stretch later you come round on 1 Health, with no death rolls in between — but the mind keeps the mark.")),
          actions: [{ label: "A Stretch passes", value: "rally", class: "btn-primary" }, { label: "Leave it", value: false }]
        });
        if (go !== "rally") return;
        const woken = structuredClone(getCharacter(ch.id));
        woken.state.health = Math.max(1, woken.state.health);
        saveCharacter(woken);
        renderVitals(woken);
        rerender();
        location.hash = `#/injury/${ch.id}`;
      }
    }, "Apply it"));
  return card;
}

/**
 * A scripted experience can push Bliss on you whether you fail anything or not.
 * Wits resists it, a point per 6 (p.93).
 */
function scriptedExperienceCard(ch, rerender) {
  const amount = el("input", { type: "number", value: "1", min: "1", "aria-label": "Bliss inflicted" });
  return el("details", { class: "explain" }, el("summary", {}, "A scripted experience"),
    el("p", { class: "faint" }, `Some experiences hand you Bliss directly. Roll ${BLISS.resistExperience.attr} — each 6 cancels a point.`),
    el("div", { class: "field" }, el("label", {}, "Bliss it carries"), amount),
    el("button", {
      class: "btn btn-block",
      onclick: async () => {
        const current = getCharacter(ch.id);
        const dice = rollDice(Math.max(1, current.attributes[BLISS.resistExperience.attr]));
        const carried = Math.max(1, Number(amount.value) || 1);
        const stopped = countSixes(dice) * BLISS.resistExperience.eachSuccessReduces;
        const taken = Math.max(0, carried - stopped);
        const next = structuredClone(current);
        if (taken && tracksBliss(next)) next.state.bliss = (next.state.bliss || 0) + taken;
        saveCharacter(next);
        renderVitals(next);
        logRoll({ by: ch.name, label: "Scripted experience", dice, outcome: `${taken} Bliss` });
        rerender();
        await modal({
          title: taken ? `${taken} Bliss` : "Shrugged it off",
          body: el("div", {}, el("p", { class: "mono faint" }, dice.join(" ")),
            el("p", {}, stopped ? `${stopped} of ${carried} cancelled.` : "Nothing cancelled.")),
          actions: [{ label: "Understood", value: true, class: "btn-primary" }]
        });
      }
    }, "Resist it"));
}

function doNeuroRoll(ch, rerender) {
  if (session.progress >= session.difficulty) { showToast("That task is already done."); return; }
  const result = neuroRoll(ch, session.kind, { wired: session.wired, extraModifier: session.helpers || 0 });
  const updated = applyNeuroResult(ch, result);

  session.rolls.push({ dice: [...result.base, ...result.gear], success: result.success });
  if (result.success) session.progress += 1;

  logRoll({
    by: ch.name, label: `Neurocasting — ${result.spec.label}`,
    dice: [...result.base, ...result.gear],
    outcome: result.success
      ? `success ${session.progress}/${session.difficulty}`
      : `failed · +1 Bliss (now ${updated.state.bliss})`
  });

  renderVitals(updated);
  if (!result.success && isLost(updated)) {
    modal({
      title: "Lost in the Electric State",
      body: el("p", {}, "Bliss has reached your current Hope. You cannot disconnect on your own. Someone must pull the helmet off — and that drops your Hope to zero and inflicts a mental trauma."),
      actions: [{ label: "Understood", value: true, class: "btn-danger" }]
    });
  }
  rerender();
}

export function resetNeuro() { session = null; }
