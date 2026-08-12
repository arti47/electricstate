// Neurocasting — this game's "powers" subsystem (Phase 4).
// Difficulty is a number of successful rolls, each costing a Stretch and each failure a Bliss.
import { el, rollDice, countSixes, clamp, uid } from "./core.js";
import { NEURO_TASKS, INFO_DIFFICULTY, HACK_DIFFICULTY, NEUROCASTERS, BLISS, WIRED_BONUS } from "../data.js";
import { maxHope, tracksBliss } from "./derived.js";
import { getCharacter, saveCharacter, listCharacters, logRoll } from "./store.js";
import { talent as findTalent } from "./rules.js";
import { showToast, modal } from "./ui.js";
import { renderVitals } from "./sheet.js";
import { Settings } from "./settings.js";

const TASK_KINDS = [
  { id: "findInformation", label: "Find information", table: INFO_DIFFICULTY, gear: "processor", attr: "wits", talent: "dataMiner" },
  { id: "hackSystem", label: "Hack a system", table: HACK_DIFFICULTY, gear: "network", attr: "wits", talent: "hacker" },
  { id: "avatarSocial", label: "Persuade an avatar", table: null, gear: "graphics", attr: "empathy", talent: "gamer" },
  { id: "avatarCombat", label: "Fight an avatar", table: null, gear: "graphics", attr: "wits", talent: "gamer" }
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

  wrap.append(el("div", { class: "card" },
    el("div", { class: "card-row" }, el("strong", {}, NEUROCASTERS.find((n) => n.id === ch.neurocaster).name),
      el("span", { class: "mono faint" }, `P${caster.processor} N${caster.network} G${caster.graphics}`)),
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
  } else {
    card.append(el("p", { class: "faint" }, session.kind === "avatarCombat"
      ? `Close combat at Engaged range, but rolled on Wits with Graphics as gear dice.`
      : `Empathy with Graphics as gear dice. An opponent resists with Wits and their own Network.`));
    session.difficulty = 1;
  }
  card.append(el("div", { class: "card-row" },
    el("span", { class: "faint" }, `${spec.attr} + ${spec.gear} · one Stretch per roll`),
    el("span", { class: "mono" }, `${session.progress}/${session.difficulty}`)));
  wrap.append(card);

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

  wrap.append(el("p", { class: "faint" },
    "While wearing a neurocaster you act either out here or in there each round — never both."));
  return wrap;
}

function doNeuroRoll(ch, rerender) {
  if (session.progress >= session.difficulty) { showToast("That task is already done."); return; }
  const result = neuroRoll(ch, session.kind, { wired: session.wired });
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
