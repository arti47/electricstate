// GM screen (Phase 6): Stop builder, threat reference and every rollable table.
import { el, d6, d66, roll2d6, uid, fromRangeTable } from "./core.js";
import { SETTING, BLOCKERS, NEEDS, CONFLICT_PARTIES, CONFLICT_SUBJECTS, LOCATIONS,
         ELECTRIC_STATE_ELEMENTS, NINETIES_NOSTALGIA, NPC_QUIRKS, COUNTDOWN_ELEMENTS,
         COUNTDOWN_PRINCIPLE, NEUROSCAPE, NPC_REACTIONS, COMBAT_MORALE, JOURNEY_LENGTH,
         KICKER_EXAMPLES, WHY_STICK_TOGETHER, MINOR_NPC_BASELINE, D66_ORDER } from "../data-gm.js";
import { THREATS, THREAT_RULES, SPECIAL_ABILITIES, PERSONAL_THREAT_RULES } from "../data-npcs.js";
import { listCharacters, getJourney, saveJourney } from "./store.js";
import { maxHealth, maxHope } from "./derived.js";
import { showToast, modal, promptModal } from "./ui.js";

const d66Pick = (table) => table[D66_ORDER.indexOf(d66())];
const d6Pick = (table) => table[d6() - 1];

export function gmScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

const stops = () => getJourney()?.stops || [];
const writeStops = (list) => { const j = getJourney() || {}; saveJourney({ ...j, stops: list }); };

function build(rerender) {
  const wrap = el("div", {}, el("h1", {}, "GM"));

  wrap.append(partyCard());
  wrap.append(stopBuilder(rerender));
  wrap.append(threatCard());
  wrap.append(tablesCard());
  return wrap;
}

// ------------------------------------------------------------------- party
function partyCard() {
  const chars = listCharacters();
  const card = el("div", { class: "card" }, el("h3", {}, "The party"));
  if (!chars.length) { card.append(el("p", { class: "faint" }, "No Travelers yet.")); return card; }
  for (const c of chars) {
    const bliss = c.state?.bliss ?? 0;
    const lost = bliss >= (c.state?.hope ?? 0);
    card.append(el("div", { style: "padding:8px 0;border-top:1px solid var(--line-soft)" },
      el("div", { class: "card-row" },
        el("strong", {}, c.name || "Unnamed"),
        el("span", { class: "mono faint" },
          `H ${c.state?.health ?? "?"}/${maxHealth(c)} · Hp ${c.state?.hope ?? "?"}/${maxHope(c)} · B ${bliss}`)),
      el("div", { class: "faint" }, [c.goal && `Goal: ${c.goal}`, c.threat && `Threat: ${c.threat}`].filter(Boolean).join(" · ") || "No Goal or Threat set"),
      lost && bliss > 0 ? el("div", { class: "faint", style: "color:var(--danger)" }, "Lost in the Electric State") : null,
      (c.conditions || []).length ? el("div", { class: "faint" }, (c.conditions || []).map((x) => x.name).join(", ")) : null));
  }
  return card;
}

// ------------------------------------------------------------- stop builder
function stopBuilder(rerender) {
  const list = stops();
  const card = el("div", { class: "card" }, el("h3", {}, "Stops"));

  for (const stop of list) {
    card.append(el("div", { style: "padding:8px 0;border-top:1px solid var(--line-soft)" },
      el("div", { class: "card-row" },
        el("strong", {}, stop.name),
        el("button", { class: "btn", onclick: () => { writeStops(list.filter((s) => s.id !== stop.id)); rerender(); } }, "Remove")),
      el("div", { class: "faint" }, `${stop.setting.terrain} · ${stop.setting.size.split(".")[0]} · ${stop.setting.weather}`),
      el("div", { class: "faint" }, `Blocker: ${stop.blocker}`),
      el("div", { class: "faint" }, `${stop.conflict.a} vs ${stop.conflict.b} over ${stop.conflict.over.toLowerCase()}`),
      el("div", { class: "faint" }, `Locations: ${stop.locations.join(", ")}`),
      el("details", {}, el("summary", { class: "faint" }, "Countdown"),
        el("ol", {}, ...stop.countdown.map((step) => el("li", { class: "faint" }, step))))));
  }

  card.append(el("button", {
    class: "btn btn-block", style: "margin-top:8px",
    onclick: async () => {
      const name = await promptModal("New Stop", { label: "Name it", value: "" });
      if (!name) return;
      writeStops([...stops(), rollStop(name)]);
      rerender();
    }
  }, "Roll up a Stop"));
  card.append(el("p", { class: "faint" }, COUNTDOWN_PRINCIPLE));
  return card;
}

function rollStop(name) {
  const countdown = [];
  const pool = [...COUNTDOWN_ELEMENTS];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    countdown.push(pool.splice(idx, 1)[0]);
  }
  return {
    id: uid(), name,
    setting: {
      terrain: d6Pick(SETTING.terrain), population: d6Pick(SETTING.population),
      communications: d6Pick(SETTING.communications), size: d6Pick(SETTING.size),
      prosperity: d6Pick(SETTING.prosperity), weather: d6Pick(SETTING.weather)
    },
    blocker: d66Pick(BLOCKERS),
    need: d6Pick(NEEDS),
    conflict: { a: d66Pick(CONFLICT_PARTIES), b: d66Pick(CONFLICT_PARTIES), over: d66Pick(CONFLICT_SUBJECTS) },
    locations: [d66Pick(LOCATIONS), d66Pick(LOCATIONS), d66Pick(LOCATIONS)],
    mood: [d66Pick(ELECTRIC_STATE_ELEMENTS), d66Pick(NINETIES_NOSTALGIA)],
    countdown
  };
}

// ----------------------------------------------------------------- threats
function threatCard() {
  const card = el("div", { class: "card" }, el("h3", {}, "Threats"));
  const select = el("select", { "aria-label": "Threat" }, ...THREATS.map((t) => el("option", { value: t.id }, t.name)));
  const detail = el("div", { class: "faint" });

  const show = () => {
    const t = THREATS.find((x) => x.id === select.value);
    detail.replaceChildren();
    if (!t) return;
    if (t.unstatted) detail.append(el("p", {}, t.note));
    else {
      const stats = ["strength", "agility", "wits", "empathy", "health", "hull", "armor"]
        .filter((k) => t[k] != null).map((k) => `${k} ${t[k]}`).join(" · ");
      detail.append(el("p", { class: "mono" }, stats));
      if (t.talents) detail.append(el("p", {}, `Talents: ${t.talents.join(", ")}`));
      if (t.gear) detail.append(el("p", {}, `Gear: ${t.gear.join(", ")}`));
      if (t.weapons) detail.append(el("p", {}, t.weapons.map((w) => `${w.name} (damage ${w.damage ?? "—"})`).join(" · ")));
      if (t.note) detail.append(el("p", {}, t.note));
    }
    if (t.countdown) detail.append(el("ol", {}, ...t.countdown.map((c) => el("li", {}, c))));
  };
  select.addEventListener("change", show);

  card.append(el("div", { class: "field" }, select), detail);
  card.append(el("p", { class: "faint" }, "Threats have no Hope, never push, and make no death rolls — you decide whether an Incapacitated Threat dies."));
  card.append(el("p", { class: "faint" }, `Minor NPCs: ${MINOR_NPC_BASELINE.allAttributes} in every attribute, optionally one talent.`));
  show();
  return card;
}

// ------------------------------------------------------------------ tables
function tablesCard() {
  const out = el("div", { class: "faint", "aria-live": "polite", style: "margin-top:8px" });
  const roll = (label, fn) => el("button", { class: "btn", onclick: () => { out.replaceChildren(el("strong", {}, `${label}: `), fn()); } }, label);

  const card = el("div", { class: "card" }, el("h3", {}, "Roll a table"),
    el("div", { class: "btn-row" },
      roll("Blocker", () => d66Pick(BLOCKERS)),
      roll("Need", () => d6Pick(NEEDS)),
      roll("Location", () => d66Pick(LOCATIONS)),
      roll("Conflict", () => `${d66Pick(CONFLICT_PARTIES)} vs ${d66Pick(CONFLICT_PARTIES)} over ${d66Pick(CONFLICT_SUBJECTS).toLowerCase()}`),
      roll("Electric State", () => d66Pick(ELECTRIC_STATE_ELEMENTS)),
      roll("'90s", () => d66Pick(NINETIES_NOSTALGIA)),
      roll("Quirk", () => d66Pick(NPC_QUIRKS)),
      roll("Reaction", () => {
        const r = roll2d6();
        return `${fromRangeTable(NPC_REACTIONS.map((x) => ({ range: x.roll, ...x })), r).reaction} (${r})`;
      }),
      roll("Morale", () => {
        const r = roll2d6();
        return `${fromRangeTable(COMBAT_MORALE.map((x) => ({ range: x.roll, ...x })), r).reaction} (${r})`;
      }),
      roll("Neuroscape", () => `${d6Pick(NEUROSCAPE.type)} · ${d6Pick(NEUROSCAPE.theme)} · ${d6Pick(NEUROSCAPE.mood)}`),
      roll("Countdown step", () => COUNTDOWN_ELEMENTS[Math.floor(Math.random() * COUNTDOWN_ELEMENTS.length)]),
      roll("Kicker", () => KICKER_EXAMPLES[Math.floor(Math.random() * KICKER_EXAMPLES.length)]),
      roll("Why together", () => d6Pick(WHY_STICK_TOGETHER))),
    out);
  return card;
}
