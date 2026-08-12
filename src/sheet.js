// The live character sheet and the persistent vitals header (Phase 2).
import { $, el, clamp } from "./core.js";
import { ATTRIBUTES, ARCHETYPES, NEUROCASTERS, TENSION, FUEL, DRONE_PILOT_RULES } from "../data.js";
import { GEAR, SURGERY } from "../data-tables.js";
import { BODY_ARMOR } from "../data.js";
import { maxHealth, maxHope, isDronePilot, tracksBliss, usesCash } from "./derived.js";
import { getCharacter, saveCharacter, deleteCharacter, listCharacters, getJourney, saveJourney } from "./store.js";
import { talent as findTalent, rule } from "./rules.js";
import { describeTalent } from "./wizard.js";
import { showToast, confirmModal, modal, promptModal } from "./ui.js";

// ---------------------------------------------------------------- vitals header
export function renderVitals(ch) {
  const host = $("#vitals");
  if (!host) return;
  if (!ch) { host.hidden = true; host.replaceChildren(); return; }

  const journey = getJourney();
  const hMax = maxHealth(ch), pMax = maxHope(ch);
  const bliss = ch.state?.bliss ?? 0;
  const perm = ch.state?.permanentBliss ?? 0;
  const lost = tracksBliss(ch) && bliss >= (ch.state?.hope ?? pMax);

  const tile = (label, value, cls = "") =>
    el("div", { class: "vital" + (cls ? ` ${cls}` : "") },
      el("span", { class: "vital-label" }, label),
      el("span", { class: "vital-value" }, value));

  const tiles = [
    tile(isDronePilot(ch) ? "Hull" : "Health", `${ch.state?.health ?? hMax}/${hMax}`,
      (ch.state?.health ?? hMax) === 0 ? "is-danger" : ""),
    tile("Hope", `${ch.state?.hope ?? pMax}/${pMax}`, (ch.state?.hope ?? pMax) === 0 ? "is-danger" : "")
  ];
  if (tracksBliss(ch)) {
    tiles.push(tile("Bliss", perm ? `${bliss} ⌊${perm}⌋` : String(bliss), lost ? "is-danger" : "is-neuro"));
  }
  if (usesCash(ch)) tiles.push(tile("Cash", `$${ch.inventory?.cash ?? 0}`));
  if (journey?.vehicle) tiles.push(tile("Fuel", `${journey.fuel ?? 0}g`, (journey.fuel ?? 0) <= 2 ? "is-danger" : ""));

  host.replaceChildren(...tiles);
  host.hidden = false;

  if (lost) host.append(el("div", { class: "vital is-danger", style: "grid-column:1/-1" },
    el("span", { class: "vital-label" }, "Lost in the Electric State"),
    el("span", { class: "vital-value" }, "cannot disconnect")));
}

export function clearVitals() { renderVitals(null); }

// --------------------------------------------------------------------- sheet
export function sheetScreen(id) {
  const host = el("div");
  const rerender = () => {
    const ch = getCharacter(id);
    renderVitals(ch);
    host.replaceChildren(ch ? build(ch, rerender) : missing());
  };
  rerender();
  return host;
}

const missing = () => el("div", { class: "empty card" },
  el("p", {}, "That Traveler is gone."), el("a", { class: "btn", href: "#/home" }, "Back"));

function build(ch, rerender) {
  const hMax = maxHealth(ch), pMax = maxHope(ch);
  const arch = ARCHETYPES.find((a) => a.id === ch.archetype);
  const patch = (fn) => { const next = structuredClone(ch); fn(next); saveCharacter(next); rerender(); };

  const wrap = el("div", {},
    el("div", { class: "card-row" },
      el("h1", { style: "margin:0" }, ch.name || "Unnamed"),
      el("a", { class: "btn", href: "#/home" }, "Back")),
    el("p", { class: "faint" }, [arch?.name, ch.song].filter(Boolean).join(" · ")),
    ch.descriptorWords?.length ? el("p", { class: "faint" }, ch.descriptorWords.join(" · ")) : null);

  // --- vitals steppers
  wrap.append(el("div", { class: "card" },
    stepper(isDronePilot(ch) ? "Hull" : "Health", ch.state.health, hMax,
      (v) => patch((c) => { c.state.health = clamp(v, 0, hMax); }), "health"),
    stepper("Hope", ch.state.hope, pMax,
      (v) => patch((c) => { c.state.hope = clamp(v, 0, pMax); }), "hope"),
    tracksBliss(ch)
      ? stepper("Bliss", ch.state.bliss, null,
          (v) => patch((c) => { c.state.bliss = Math.max(c.state.permanentBliss || 0, v); }), "bliss")
      : el("p", { class: "faint" }, "You are a drone: no Bliss, no hunger, no cash."),
    tracksBliss(ch)
      ? stepper("Permanent Bliss", ch.state.permanentBliss, null,
          (v) => patch((c) => {
            c.state.permanentBliss = Math.max(0, v);
            c.state.bliss = Math.max(c.state.bliss, c.state.permanentBliss);
          }), "bliss")
      : null,
    statusNotes(ch, hMax, pMax)));

  // --- attributes
  const attrGrid = el("div", { class: "card" }, el("h3", {}, "Attributes"));
  for (const a of ATTRIBUTES) {
    attrGrid.append(el("div", { class: "card-row", style: "padding:4px 0" },
      el("span", {}, a.label),
      el("span", { class: "mono", style: "font-size:1.1rem" }, ch.attributes[a.id])));
  }
  wrap.append(attrGrid);

  // --- talents
  const talents = el("div", { class: "card" }, el("h3", {}, "Talents"));
  if (!ch.talents?.length) talents.append(el("p", { class: "faint" }, "None yet."));
  for (const id of ch.talents || []) {
    const t = findTalent(id);
    if (!t) continue;
    talents.append(el("div", { style: "padding:6px 0" },
      el("strong", {}, t.name), el("div", { class: "faint" }, describeTalent(t))));
  }
  wrap.append(talents);

  // --- dream, flaw, goal, threat
  wrap.append(el("div", { class: "card" },
    field("Dream", ch.dream, (v) => patch((c) => { c.dream = v; })),
    field("Flaw", ch.flaw, (v) => patch((c) => { c.flaw = v; })),
    field("Goal", ch.goal, (v) => patch((c) => { c.goal = v; })),
    field("Threat", ch.threat, (v) => patch((c) => { c.threat = v; }))));

  // --- conditions
  wrap.append(conditionsCard(ch, patch));

  // --- neurocaster
  wrap.append(neurocasterCard(ch, patch));

  // --- inventory
  wrap.append(inventoryCard(ch, patch));

  // --- tension
  wrap.append(tensionCard(ch));

  wrap.append(el("div", { class: "card" },
    el("h3", {}, "Notes"),
    el("textarea", { rows: 4, "aria-label": "Notes", onchange: (e) => patch((c) => { c.notes = e.target.value; }) }, ch.notes || "")));

  wrap.append(el("div", { class: "btn-row", style: "margin:16px 0" },
    el("a", { class: "btn btn-primary", href: "#/dice" }, "Roll dice"),
    el("button", { class: "btn", onclick: async () => { const { damageDialog } = await import("./roller.js"); damageDialog(ch, rerender); } }, "Take damage"),
    el("button", { class: "btn", onclick: async () => { const { traumaticEventDialog } = await import("./roller.js"); await traumaticEventDialog(ch, rerender); } }, "Traumatic event"),
    ch.state.health === 0 || ch.state.hope === 0
      ? el("button", { class: "btn", onclick: async () => { const { rallyDialog } = await import("./roller.js"); await rallyDialog(ch, rerender); } }, "Rally")
      : null,
    ch.state.health === 0 && !ch.state.stabilized && !ch.state.dead
      ? el("button", { class: "btn btn-danger", onclick: async () => { const { deathRollDialog } = await import("./roller.js"); await deathRollDialog(ch); rerender(); } }, "Death roll")
      : null));

  wrap.append(el("button", {
    class: "btn btn-danger btn-block",
    onclick: async () => {
      if (await confirmModal("Delete this Traveler?", `${ch.name || "This Traveler"} will be removed from this device. This cannot be undone.`, "Delete")) {
        deleteCharacter(ch.id); clearVitals(); location.hash = "#/home";
      }
    }
  }, "Delete Traveler"));

  return wrap;
}

function stepper(label, value, max, onChange, kind) {
  const v = value ?? 0;
  return el("div", { class: "card-row", style: "padding:6px 0" },
    el("div", {}, el("strong", {}, label),
      max != null ? el("span", { class: "faint" }, ` / ${max}`) : null),
    el("div", { class: "btn-row" },
      el("button", { class: "btn", "aria-label": `Lower ${label}`, onclick: () => onChange(v - 1) }, "−"),
      el("span", { class: "mono", style: "min-width:2.5ch;text-align:center;font-size:1.2rem" }, v),
      el("button", { class: "btn", "aria-label": `Raise ${label}`, onclick: () => onChange(v + 1) }, "+")));
}

function statusNotes(ch, hMax, pMax) {
  const notes = [];
  if (ch.state.health === 0) notes.push(["Incapacitated", "You can crawl and mumble. No attribute rolls, no talents. Death rolls each turn until stabilized.", "deathRoll"]);
  if (ch.state.hope === 0) notes.push(["Breakdown", "You can talk, move and flee, but cannot roll attributes or use talents until rallied.", "breakdown"]);
  if (tracksBliss(ch) && ch.state.bliss >= ch.state.hope && ch.state.hope > 0)
    notes.push(["Lost in the Electric State", "Bliss has caught your Hope. You cannot leave a neuroscape on your own.", "bliss"]);
  if (!notes.length) return null;
  return el("div", { style: "margin-top:8px" },
    ...notes.map(([title, text, ruleId]) => el("div", { class: "card", style: "border-left:3px solid var(--danger)" },
      el("strong", {}, title), el("p", { class: "faint" }, text), ruleLink(ruleId))));
}

export function ruleLink(id) {
  const r = rule(id);
  if (!r) return null;
  return el("a", { class: "faint", href: `#/rules`, onclick: () => sessionStorage.setItem("ruleFocus", id) }, `Rules: ${r.title} →`);
}

function field(label, value, onSave) {
  return el("div", { class: "field" },
    el("label", {}, label),
    el("input", { value: value || "", onchange: (e) => onSave(e.target.value) }));
}

// ------------------------------------------------------------------ conditions
function conditionsCard(ch, patch) {
  const card = el("div", { class: "card" }, el("h3", {}, "Injuries & trauma"));
  if (!ch.conditions?.length) card.append(el("p", { class: "faint" }, "None. It won't last."));
  for (const cond of ch.conditions || []) {
    card.append(el("div", { style: "padding:8px 0; border-top:1px solid var(--line-soft)" },
      el("div", { class: "card-row" },
        el("strong", {}, cond.name),
        el("button", {
          class: "btn", onclick: () => patch((c) => { c.conditions = c.conditions.filter((x) => x.id !== cond.id); })
        }, "Heal")),
      el("div", { class: "faint" }, describeCondition(cond)),
      cond.heal ? el("div", { class: "faint" }, `Healing time: ${cond.heal} days${cond.surgery ? " — requires surgery first" : ""}`) : null,
      cond.surgery ? el("button", {
        class: "btn", onclick: async () => { const { surgeryDialog } = await import("./roller.js"); await surgeryDialog(ch, cond, patch); }
      }, `Operate ($${SURGERY.cashAlternative} or a Surgeon)`) : null));
  }
  card.append(el("a", { class: "btn btn-block", href: `#/injury/${ch.id}` }, "Add injury or trauma"));
  return card;
}

export function describeCondition(cond) {
  const parts = [];
  for (const e of cond.effects || []) {
    if (typeof e.dice === "number") {
      const attrs = Array.isArray(e.attr) ? e.attr.join(" and ") : e.attr;
      parts.push(`${e.dice > 0 ? "+" : ""}${e.dice} dice${attrs ? ` to ${attrs}` : ""}${e.when ? ` when ${e.when}` : ""}`);
    } else if (e.rule === "moveOrAction") parts.push("Move or act in a round, not both");
    else if (e.rule === "cannotPush") parts.push("Cannot push any roll");
    else if (e.rule === "mustPush") parts.push("Must push every roll");
    else if (e.rule) parts.push(e.rule.replace(/([A-Z])/g, " $1").toLowerCase());
  }
  return parts.join(" · ") || "No mechanical effect.";
}

// ----------------------------------------------------------------- neurocaster
function neurocasterCard(ch, patch) {
  const card = el("div", { class: "card" }, el("h3", {}, "Neurocaster"));
  const model = NEUROCASTERS.find((n) => n.id === ch.neurocaster);
  if (!model) {
    card.append(el("p", { class: "faint" }, "None. Without one you cannot enter a neuroscape at all."));
    return card;
  }
  const state = ch.state.caster || { processor: model.processor, network: model.network, graphics: model.graphics };
  const busted = ["processor", "network", "graphics"].some((k) => state[k] <= 0);
  card.append(el("div", { class: "card-row" },
    el("strong", {}, model.name),
    busted ? el("span", { class: "faint", style: "color:var(--danger)" }, "Busted") : null));
  for (const key of ["processor", "network", "graphics"]) {
    card.append(stepper(key[0].toUpperCase() + key.slice(1), state[key], model[key],
      (v) => patch((c) => {
        c.state.caster = { ...state, [key]: clamp(v, 0, model[key]) };
      }), "gear"));
  }
  card.append(el("p", { class: "faint" },
    model.realWorldPenalty === -1 ? "Only −1 die to real-world actions while worn." : "−2 dice to real-world actions while worn."));
  if (busted) card.append(el("p", { class: "faint", style: "color:var(--danger)" },
    "Busted: if you were inside a neuroscape, your Hope drops to zero and you roll for mental trauma."));
  return card;
}

// ------------------------------------------------------------------- inventory
function inventoryCard(ch, patch) {
  const card = el("div", { class: "card" }, el("h3", {}, "Gear"));
  if (isDronePilot(ch)) { card.append(el("p", { class: "faint" }, "You carry nothing — you are the machine.")); return card; }

  const items = ch.inventory?.items || [];
  if (!items.length) card.append(el("p", { class: "faint" }, "Empty pockets."));
  for (const [i, item] of items.entries()) {
    const busted = item.bonus != null && item.bonus <= 0;
    card.append(el("div", { style: "padding:8px 0;border-top:1px solid var(--line-soft)" },
      el("div", { class: "card-row" },
        el("span", {}, item.name, busted ? el("span", { class: "faint", style: "color:var(--danger)" }, " · Busted") : null),
        el("button", { class: "btn", onclick: () => patch((c) => { c.inventory.items.splice(i, 1); }) }, "Drop")),
      item.bonus != null
        ? stepper("Gear bonus", item.bonus, item.maxBonus ?? item.bonus,
            (v) => patch((c) => { c.inventory.items[i].bonus = Math.max(0, v); }), "gear")
        : null,
      item.uses != null ? el("div", { class: "faint" }, `${item.uses} uses left`) : null));
  }

  // Body armor: worn armor soaks damage but costs Agility, so it is equipped, not just carried.
  const armorSelect = el("select", { "aria-label": "Body armor" },
    el("option", { value: "" }, "No body armor"),
    ...BODY_ARMOR.map((a) => el("option", { value: a.id, selected: ch.state.armor === a.id },
      `${a.name} — armor ${a.armor}, ${a.agility} Agility`)));
  armorSelect.addEventListener("change", (e) => patch((c) => { c.state.armor = e.target.value || null; }));
  const worn = BODY_ARMOR.find((a) => a.id === ch.state.armor);
  card.append(el("div", { class: "field", style: "margin-top:12px" },
    el("label", {}, "Worn armor"), armorSelect,
    worn ? el("p", { class: "faint" }, `Every Agility roll takes ${worn.agility} dice while you wear it.`) : null));

  const pick = el("select", { "aria-label": "Add gear" },
    el("option", { value: "" }, "Add from the gear list…"),
    ...GEAR.map((g) => el("option", { value: g.id }, `${g.name}${g.price ? ` — $${g.price}` : ""}`)));
  card.append(el("div", { class: "field", style: "margin-top:12px" }, pick),
    el("div", { class: "btn-row" },
      el("button", {
        class: "btn", onclick: () => {
          const g = GEAR.find((x) => x.id === pick.value);
          if (!g) return;
          patch((c) => {
            c.inventory.items.push({ name: g.name, bonus: g.bonus || null, maxBonus: g.bonus || null, uses: g.uses ?? null, gearId: g.id });
          });
        }
      }, "Add"),
      el("button", {
        class: "btn", onclick: async () => {
          const v = await promptModal("Adjust cash", { label: "Dollars (use a minus sign to spend)", value: "" });
          if (v == null || v === "") return;
          const delta = Number(v);
          if (Number.isNaN(delta)) { showToast("That is not a number.", "danger"); return; }
          patch((c) => { c.inventory.cash = Math.max(0, (c.inventory.cash || 0) + delta); });
        }
      }, `Cash $${ch.inventory?.cash ?? 0}`)));
  return card;
}

// --------------------------------------------------------------------- tension
function tensionCard(ch) {
  const others = listCharacters().filter((c) => c.id !== ch.id);
  const card = el("div", { class: "card" }, el("h3", {}, "Tension"));
  if (!others.length) {
    card.append(el("p", { class: "faint" }, "Tension needs someone to feel it toward."));
    return card;
  }
  for (const other of others) {
    const mine = ch.tension?.[other.id] ?? 0;
    const theirs = other.tension?.[ch.id] ?? 0;
    card.append(el("div", { class: "card-row", style: "padding:4px 0" },
      el("span", {}, other.name || "Unnamed"),
      el("span", { class: "mono faint" }, `you ${mine} · them ${theirs}`)));
  }
  card.append(el("p", { class: "faint" }, TENSION.reduce.hopeGain === 1
    ? "Talking it through in a calm scene lowers both by 1 and returns 1 Hope each."
    : ""));
  card.append(el("a", { class: "btn btn-block", href: "#/tension" }, "Adjust Tension"));
  return card;
}

// ------------------------------------------------------- injury / trauma picker
import { SERIOUS_INJURIES, MENTAL_TRAUMAS } from "../data-tables.js";
import { d66, uid } from "./core.js";
import { rollInjury, rollTrauma } from "./rules.js";
import { Settings } from "./settings.js";

export function injuryScreen(id) {
  const host = el("div");
  const rerender = () => host.replaceChildren(build());
  function build() {
    const ch = getCharacter(id);
    if (!ch) return missing();
    const wrap = el("div", {},
      el("div", { class: "card-row" }, el("h1", { style: "margin:0" }, "Injury & trauma"),
        el("a", { class: "btn", href: `#/sheet/${id}` }, "Back")));

    const add = (entry, kind) => {
      if (!entry || entry.name === "None") { showToast("No lasting harm this time."); return; }
      const next = structuredClone(ch);
      next.conditions = [...(next.conditions || []), {
        id: uid(), kind, name: entry.name, effects: entry.effects || [],
        heal: entry.heal ? rollNotationSafe(entry.heal) : null, surgery: !!entry.surgery
      }];
      saveCharacter(next);
      showToast(`${entry.name} applied.`);
      location.hash = `#/sheet/${id}`;
    };

    wrap.append(el("div", { class: "card" },
      el("h3", {}, "Serious injury"),
      el("p", { class: "faint" }, "Rolled after surviving Incapacitation. 11–36 means no lasting harm."),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-primary", onclick: () => { const r = d66(); add(rollInjury(r), "injury"); } }, "Roll D66"),
        el("button", { class: "btn", onclick: () => picker(SERIOUS_INJURIES, "injury", add) }, "Choose"))));

    if (Settings.mentalTrauma()) {
      wrap.append(el("div", { class: "card" },
        el("h3", {}, "Mental trauma"),
        el("p", { class: "faint" }, "Rolled after a Breakdown you were rallied from, or after being Incapacitated inside a neuroscape."),
        el("div", { class: "btn-row" },
          el("button", { class: "btn btn-primary", onclick: () => { const r = d66(); add(rollTrauma(r), "trauma"); } }, "Roll D66"),
          el("button", { class: "btn", onclick: () => picker(MENTAL_TRAUMAS, "trauma", add) }, "Choose"))));
    } else {
      wrap.append(el("div", { class: "card" },
        el("p", { class: "faint" }, "Mental trauma is switched off for this table. Turn it back on in Settings.")));
    }
    return wrap;
  }
  rerender();
  return host;
}

function picker(table, kind, add) {
  const body = el("ul", { class: "list" });
  for (const entry of table) {
    if (entry.name === "None") continue;
    body.append(el("li", {}, el("button", {
      class: "row",
      onclick: () => { document.querySelector(".modal-backdrop")?.remove(); document.body.style.removeProperty("overflow"); add(entry, kind); }
    },
      el("div", { class: "card-row" }, el("strong", {}, entry.name), el("span", { class: "faint mono" }, entry.roll)),
      el("div", { class: "faint" }, describeCondition(entry)))));
  }
  modal({ title: kind === "injury" ? "Serious injuries" : "Mental traumas", body, actions: [{ label: "Cancel", value: false }] });
}

function rollNotationSafe(notation) {
  const m = /^(\d*)d(\d+)$/i.exec(String(notation));
  if (!m) return null;
  const n = m[1] ? +m[1] : 1, faces = +m[2];
  let total = 0;
  for (let i = 0; i < n; i++) total += 1 + Math.floor(Math.random() * faces);
  return total;
}
