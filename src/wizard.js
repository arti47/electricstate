// Creation wizard (Phase 1). Follows the book's 17-step order, grouped into screens.
// Rolling is the default method (p.52); point-buy is offered as the book's stated alternative.
import { el, clamp, d6, rollNotation, uid } from "./core.js";
import { ATTRIBUTES, ARCHETYPES, TALENTS, NEUROCASTERS, VEHICLES, VEHICLE_TRAITS, FUEL,
         ATTRIBUTE_MIN, ATTRIBUTE_MAX, POINT_BUY_TOTAL, BONUS_TALENT_THRESHOLD, TENSION } from "../data.js";
import { SHARED_ITEMS } from "../data-tables.js";
import { PREGENS, PREGEN_ERRATA } from "../data-pregens.js";
import { maxHealth, maxHope, attributeTotal, qualifiesForBonusTalent, isDronePilot } from "./derived.js";
import { listCharacters, saveCharacter, getJourney, saveJourney } from "./store.js";
import { showToast, modal, confirmModal } from "./ui.js";
import { talent as findTalent } from "./rules.js";

const STEPS = ["archetype", "attributes", "talents", "identity", "gear", "journey", "review"];

let draft = null;

function blankDraft() {
  return {
    id: uid(), name: "", archetype: null,
    method: "roll",                        // the book's primary method
    attributes: { strength: null, agility: null, wits: null, empathy: null },
    rolled: null,                          // the four rolled scores awaiting assignment
    talents: [], dream: "", flaw: "", song: "", description: "",
    neurocaster: null, personalItem: "", cash: 0,
    goal: "", threat: "", step: 0
  };
}

const takenArchetypes = () => new Set(listCharacters().map((c) => c.archetype));
const knownTalents = (d) => new Set(d.talents);

// ---------------------------------------------------------------- step: archetype
function stepArchetype(rerender) {
  const taken = takenArchetypes();
  const wrap = el("div", {},
    el("p", { class: "muted" }, "Who are you in this collapsing world? One archetype per group — the rest are greyed out."));
  const list = el("ul", { class: "list" });
  for (const a of ARCHETYPES) {
    const isTaken = taken.has(a.id) && draft.archetype !== a.id;
    list.append(el("li", {},
      el("button", {
        class: "row", disabled: isTaken,
        style: isTaken ? "opacity:.4" : "",
        onclick: () => { draft.archetype = a.id; draft.talents = []; rerender(); }
      },
        el("div", { class: "card-row" },
          el("strong", {}, a.name),
          el("span", { class: "faint" }, draft.archetype === a.id ? "✓" : ATTRIBUTES.find((x) => x.id === a.key)?.label)),
        isTaken ? el("div", { class: "faint" }, "Already in the group") : null)));
  }
  wrap.append(el("div", { class: "card" }, list));
  if (draft.archetype && isDronePilot(draft)) {
    wrap.append(el("div", { class: "card" },
      el("h3", {}, "You are a drone"),
      el("p", { class: "faint" }, "No gear, no cash, and no hunger. You take damage as a drone rather than as a body, you never accumulate Bliss, and you can only reach global neuroscapes.")));
  }
  return wrap;
}

// --------------------------------------------------------------- step: attributes
function stepAttributes(rerender) {
  const wrap = el("div");
  const method = el("div", { class: "btn-row", style: "margin-bottom:12px" },
    el("button", { class: "btn" + (draft.method === "roll" ? " btn-primary" : ""), onclick: () => { draft.method = "roll"; rerender(); } }, "Roll (default)"),
    el("button", { class: "btn" + (draft.method === "buy" ? " btn-primary" : ""), onclick: () => { draft.method = "buy"; draft.rolled = null; rerender(); } }, "Distribute 16"));
  wrap.append(method);

  if (draft.method === "roll") {
    wrap.append(el("p", { class: "faint" }, "Roll four dice, re-rolling 1s until every die shows 2 or higher, then assign the scores as you like."));
    if (!draft.rolled) {
      wrap.append(el("button", {
        class: "btn btn-primary btn-block",
        onclick: () => {
          draft.rolled = Array.from({ length: 4 }, () => { let v = d6(); while (v === 1) v = d6(); return v; });
          draft.attributes = { strength: null, agility: null, wits: null, empathy: null };
          rerender();
        }
      }, "Roll four dice"));
    } else {
      wrap.append(el("div", { class: "card" },
        el("div", { class: "card-row" },
          el("span", { class: "mono", style: "font-size:1.4rem;letter-spacing:.3em" }, draft.rolled.join(" ")),
          el("button", { class: "btn", onclick: () => { draft.rolled = null; rerender(); } }, "Re-roll"))));
      const used = Object.values(draft.attributes).filter((v) => v != null);
      const pool = [...draft.rolled];
      for (const v of used) { const i = pool.indexOf(v); if (i > -1) pool.splice(i, 1); }
      for (const attr of ATTRIBUTES) {
        const current = draft.attributes[attr.id];
        const options = [...new Set([...(current != null ? [current] : []), ...pool])].sort((a, b) => b - a);
        wrap.append(el("div", { class: "field" },
          el("label", {}, `${attr.label} — ${attr.blurb}`),
          el("select", {
            "aria-label": attr.label,
            onchange: (e) => { draft.attributes[attr.id] = e.target.value ? +e.target.value : null; rerender(); }
          },
            el("option", { value: "", selected: current == null }, "—"),
            ...options.map((v) => el("option", { value: v, selected: current === v }, v)))));
      }
    }
  } else {
    const spent = Object.values(draft.attributes).reduce((a, b) => a + (b || ATTRIBUTE_MIN), 0);
    wrap.append(el("p", { class: "faint" }, `Distribute ${POINT_BUY_TOTAL} points, nothing below ${ATTRIBUTE_MIN} or above ${ATTRIBUTE_MAX}. Spent: ${spent}/${POINT_BUY_TOTAL}.`));
    for (const attr of ATTRIBUTES) {
      const v = draft.attributes[attr.id] ?? ATTRIBUTE_MIN;
      wrap.append(el("div", { class: "field" },
        el("label", {}, `${attr.label} — ${attr.blurb}`),
        el("div", { class: "card-row" },
          el("button", { class: "btn", "aria-label": `Lower ${attr.label}`, onclick: () => { draft.attributes[attr.id] = clamp(v - 1, ATTRIBUTE_MIN, ATTRIBUTE_MAX); rerender(); } }, "−"),
          el("span", { class: "mono", style: "font-size:1.2rem" }, v),
          el("button", { class: "btn", "aria-label": `Raise ${attr.label}`, onclick: () => { draft.attributes[attr.id] = clamp(v + 1, ATTRIBUTE_MIN, ATTRIBUTE_MAX); rerender(); } }, "+"))));
    }
  }

  const total = attributeTotal({ attributes: filledAttributes() });
  if (Object.values(draft.attributes).every((v) => v != null)) {
    wrap.append(el("div", { class: "card" },
      el("div", { class: "card-row" }, el("span", { class: "faint" }, "Total"), el("span", { class: "mono" }, total)),
      el("div", { class: "card-row" }, el("span", { class: "faint" }, "Health"), el("span", { class: "mono" }, maxHealth({ attributes: filledAttributes(), talents: draft.talents }))),
      el("div", { class: "card-row" }, el("span", { class: "faint" }, "Hope"), el("span", { class: "mono" }, maxHope({ attributes: filledAttributes(), talents: draft.talents }))),
      qualifiesForBonusTalent(total)
        ? el("p", { class: "faint", style: "margin-top:8px" }, `Total is ${total} — ${BONUS_TALENT_THRESHOLD} or lower, so you get a second starting talent.`)
        : null));
  }
  return wrap;
}

const filledAttributes = () =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a.id, draft.attributes[a.id] ?? ATTRIBUTE_MIN]));

// ------------------------------------------------------------------ step: talents
function talentAllowance() {
  return qualifiesForBonusTalent(attributeTotal({ attributes: filledAttributes() })) ? 2 : 1;
}

function stepTalents(rerender) {
  const arch = ARCHETYPES.find((a) => a.id === draft.archetype);
  const allowed = talentAllowance();
  const wrap = el("div", {},
    el("p", { class: "muted" }, `Choose ${allowed} talent${allowed > 1 ? "s" : ""}. Your archetype suggests three, but any talent is legal.`));

  const suggested = el("div", { class: "card" }, el("h3", {}, "Suggested"),
    el("div", { class: "btn-row" },
      ...(arch?.talents || []).map((id) => {
        const t = findTalent(id);
        return el("button", {
          class: "btn" + (draft.talents.includes(id) ? " btn-primary" : ""),
          onclick: () => toggleTalent(id, allowed, rerender)
        }, t?.name || id);
      }),
      el("button", {
        class: "btn", onclick: () => {
          const pick = arch.talents[Math.floor((d6() - 1) / 2)];
          if (!draft.talents.includes(pick)) toggleTalent(pick, allowed, rerender);
          else showToast("You already have that one — pick another.");
        }
      }, "Roll D6")));
  wrap.append(suggested);

  const all = el("select", {
    "aria-label": "All talents",
    onchange: (e) => { if (e.target.value) toggleTalent(e.target.value, allowed, rerender); }
  }, el("option", { value: "" }, "Every talent…"),
     ...TALENTS.map((t) => el("option", { value: t.id, disabled: draft.talents.includes(t.id) }, t.name)));
  wrap.append(el("div", { class: "field" }, el("label", {}, "Or choose any"), all));

  if (draft.talents.length) {
    const chosen = el("ul", { class: "list" });
    for (const id of draft.talents) {
      const t = findTalent(id);
      chosen.append(el("li", {}, el("div", { style: "padding:10px 4px" },
        el("div", { class: "card-row" },
          el("strong", {}, t.name),
          el("button", { class: "btn", onclick: () => { draft.talents = draft.talents.filter((x) => x !== id); rerender(); } }, "Remove")),
        el("div", { class: "faint" }, describeTalent(t)))));
    }
    wrap.append(el("div", { class: "card" }, el("h3", {}, `Chosen (${draft.talents.length}/${allowed})`), chosen));
  }
  return wrap;
}

function toggleTalent(id, allowed, rerender) {
  if (draft.talents.includes(id)) draft.talents = draft.talents.filter((x) => x !== id);
  else if (draft.talents.length >= allowed) { showToast(`You may only take ${allowed} starting talent${allowed > 1 ? "s" : ""}.`, "danger"); return; }
  else draft.talents.push(id);
  rerender();
}

export function describeTalent(t) {
  const e = t.effect || {};
  if (e.kind === "dice") return `+${e.bonus} dice${e.attr ? ` to ${e.attr}` : ""}${e.when ? ` when ${e.when}` : ""}.`;
  if (e.kind === "stat") return `Maximum ${e.stat === "hopeMax" ? "Hope" : "Health"} +${e.value}.`;
  return "Changes how a rule works — see the rules library.";
}

// ----------------------------------------------------------------- step: identity
function stepIdentity(rerender) {
  const arch = ARCHETYPES.find((a) => a.id === draft.archetype);
  const wrap = el("div");
  const field = (label, key, placeholder) => el("div", { class: "field" },
    el("label", {}, label),
    el("input", { value: draft[key] || "", placeholder: placeholder || "", oninput: (e) => { draft[key] = e.target.value; } }));

  wrap.append(field("Name", "name", "A name that fits 1997"));
  wrap.append(rollableField("Dream", "dream", arch?.dreams, rerender));
  wrap.append(rollableField("Flaw", "flaw", arch?.flaws, rerender));
  wrap.append(field("Favorite '90s song", "song", "No mechanical effect"));
  wrap.append(el("div", { class: "field" },
    el("label", {}, "Description"),
    el("textarea", { rows: 3, oninput: (e) => { draft.description = e.target.value; } }, draft.description || "")));
  return wrap;
}

function rollableField(label, key, options, rerender) {
  const input = el("input", { value: draft[key] || "", oninput: (e) => { draft[key] = e.target.value; } });
  return el("div", { class: "field" },
    el("label", {}, label),
    el("div", { class: "card-row" }, input,
      options ? el("button", {
        class: "btn", "aria-label": `Roll ${label}`,
        onclick: () => { draft[key] = options[Math.floor((d6() - 1) / 2)]; rerender(); }
      }, "D6") : null));
}

// --------------------------------------------------------------------- step: gear
function stepGear(rerender) {
  const arch = ARCHETYPES.find((a) => a.id === draft.archetype);
  const wrap = el("div");

  if (isDronePilot(draft)) {
    wrap.append(el("div", { class: "card" },
      el("h3", {}, "No gear, no cash"),
      el("p", { class: "faint" }, "You are a drone. You carry nothing and hold no money.")));
  }

  const casters = (arch?.neurocasters || []).map((id, i) => ({ id, slot: i }));
  wrap.append(el("div", { class: "card" }, el("h3", {}, "Neurocaster"),
    el("div", { class: "btn-row" },
      ...casters.map(({ id }) => el("button", {
        class: "btn" + (draft.neurocaster === id ? " btn-primary" : ""),
        onclick: () => { draft.neurocaster = id; rerender(); }
      }, id ? NEUROCASTERS.find((n) => n.id === id)?.name : "None")),
      el("button", { class: "btn", onclick: () => { draft.neurocaster = casters[Math.floor((d6() - 1) / 2)].id; rerender(); } }, "D6")),
    draft.neurocaster ? el("p", { class: "faint", style: "margin-top:8px" }, casterBlurb(draft.neurocaster)) : null));

  if (!isDronePilot(draft)) {
    wrap.append(el("div", { class: "card" }, el("h3", {}, "Personal item"),
      el("div", { class: "btn-row" },
        ...(arch?.items || []).map((item) => el("button", {
          class: "btn" + (draft.personalItem === item ? " btn-primary" : ""),
          onclick: () => { draft.personalItem = item; rerender(); }
        }, item)),
        el("button", { class: "btn", onclick: () => { draft.personalItem = arch.items[Math.floor((d6() - 1) / 2)]; rerender(); } }, "D6"))));

    const cash = arch?.cash;
    wrap.append(el("div", { class: "card" }, el("h3", {}, "Starting cash"),
      el("div", { class: "card-row" },
        el("span", { class: "mono", style: "font-size:1.2rem" }, `$${draft.cash || 0}`),
        cash ? el("button", {
          class: "btn",
          onclick: () => { draft.cash = cash.mult * rollNotation(cash.dice); rerender(); }
        }, `Roll ${cash.mult} × ${cash.dice}`) : null)));
  }
  return wrap;
}

const casterBlurb = (id) => {
  const n = NEUROCASTERS.find((x) => x.id === id);
  if (!n) return "Without a neurocaster you cannot enter a neuroscape at all.";
  return `Processor +${n.processor}, Network +${n.network}, Graphics +${n.graphics}. ${n.realWorldPenalty === -1 ? "Only −1 die to real-world actions." : "−2 dice to real-world actions while worn."}`;
};

// ------------------------------------------------------------------ step: journey
function stepJourney(rerender) {
  const wrap = el("div", {},
    el("p", { class: "muted" }, "Your Goal is specific and should echo your Dream. Your Threat is whatever stands in its way."));
  wrap.append(el("div", { class: "field" }, el("label", {}, "Personal Goal"),
    el("input", { value: draft.goal, oninput: (e) => { draft.goal = e.target.value; } })));
  wrap.append(el("div", { class: "field" }, el("label", {}, "Personal Threat"),
    el("input", { value: draft.threat, oninput: (e) => { draft.threat = e.target.value; } })));

  const journey = getJourney();
  wrap.append(el("div", { class: "card" },
    el("h3", {}, "The Journey"),
    journey
      ? el("div", {}, el("p", {}, journey.destination || "Destination not set"),
          el("p", { class: "faint" }, `${journey.vehicle?.name || "No vehicle"} · ${journey.sharedItems?.length || 0} shared items`),
          el("a", { class: "btn", href: "#/journey" }, "Edit the Journey"))
      : el("div", {}, el("p", { class: "faint" }, "No Journey yet. The group shares one Destination, one vehicle and three items."),
          el("a", { class: "btn", href: "#/journey" }, "Set up the Journey"))));
  return wrap;
}

// ------------------------------------------------------------------- step: review
function stepReview() {
  const attrs = filledAttributes();
  const ch = { attributes: attrs, talents: draft.talents, archetype: draft.archetype };
  const row = (k, v) => el("div", { class: "card-row" }, el("span", { class: "faint" }, k), el("span", { class: "mono" }, v));
  return el("div", {},
    el("div", { class: "card" },
      el("h3", {}, draft.name || "Unnamed"),
      el("p", { class: "faint" }, ARCHETYPES.find((a) => a.id === draft.archetype)?.name || ""),
      ...ATTRIBUTES.map((a) => row(a.label, attrs[a.id])),
      row("Health", maxHealth(ch)), row("Hope", maxHope(ch)),
      isDronePilot(draft) ? row("Bliss", "not tracked") : null),
    el("div", { class: "card" },
      el("h3", {}, "Talents"),
      el("p", {}, draft.talents.map((id) => findTalent(id)?.name).join(", ") || "None")),
    el("div", { class: "card" },
      el("h3", {}, "Dream"), el("p", {}, draft.dream || "—"),
      el("h3", {}, "Flaw"), el("p", {}, draft.flaw || "—")),
    el("p", { class: "faint" }, "Tension with the other Travelers is set once more than one exists — start at 1 toward one or two of them."));
}

// -------------------------------------------------------------------- validation
function problems() {
  const out = [];
  const step = STEPS[draft.step];
  if (step === "archetype" && !draft.archetype) out.push("Choose an archetype.");
  if (step === "attributes") {
    if (Object.values(draft.attributes).some((v) => v == null)) out.push("Assign all four attributes.");
    else if (draft.method === "buy" && attributeTotal({ attributes: filledAttributes() }) !== POINT_BUY_TOTAL)
      out.push(`Distribute exactly ${POINT_BUY_TOTAL} points.`);
  }
  if (step === "talents" && draft.talents.length !== talentAllowance())
    out.push(`Choose ${talentAllowance()} talent${talentAllowance() > 1 ? "s" : ""}.`);
  if (step === "identity") {
    if (!draft.name.trim()) out.push("Your Traveler needs a name.");
    if (!draft.dream.trim()) out.push("Choose a Dream — it drives advancement.");
    if (!draft.flaw.trim()) out.push("Choose a Flaw — overcoming it is the arc of the game.");
  }
  return out;
}

// ------------------------------------------------------------------------ screen
export function wizardScreen() {
  if (!draft) draft = blankDraft();
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

function build(rerender) {
  const step = STEPS[draft.step];
  const titles = {
    archetype: "Archetype", attributes: "Attributes", talents: "Talents",
    identity: "Who you are", gear: "Gear", journey: "The road ahead", review: "Review"
  };
  const body = {
    archetype: stepArchetype, attributes: stepAttributes, talents: stepTalents,
    identity: stepIdentity, gear: stepGear, journey: stepJourney, review: stepReview
  }[step](rerender);

  const issues = problems();
  const wrap = el("div", {},
    el("h1", {}, titles[step]),
    el("p", { class: "faint" }, `Step ${draft.step + 1} of ${STEPS.length}`),
    body,
    issues.length ? el("div", { class: "card" }, ...issues.map((i) => el("p", { class: "faint" }, i))) : null,
    el("div", { class: "btn-row", style: "margin-top:16px" },
      draft.step > 0 ? el("button", { class: "btn", onclick: () => { draft.step--; rerender(); } }, "Back") : null,
      draft.step < STEPS.length - 1
        ? el("button", { class: "btn btn-primary", disabled: issues.length > 0, onclick: () => { draft.step++; rerender(); } }, "Next")
        : el("button", { class: "btn btn-primary", onclick: finish }, "Create Traveler"),
      draft.step === 0 ? el("button", { class: "btn", onclick: choosePregen }, "Use a pregen") : null));
  return wrap;
}

function finish() {
  const ch = {
    id: draft.id, name: draft.name.trim(), archetype: draft.archetype,
    attributes: filledAttributes(), talents: draft.talents,
    dream: draft.dream, flaw: draft.flaw, song: draft.song, description: draft.description,
    neurocaster: draft.neurocaster, personalItem: draft.personalItem,
    goal: draft.goal, threat: draft.threat,
    inventory: { items: draft.personalItem ? [{ name: draft.personalItem }] : [], cash: draft.cash || 0 },
    conditions: [], tension: {}, createdAt: Date.now()
  };
  saveCharacter(ch);
  draft = null;
  showToast("Traveler created.");
  location.hash = "#/home";
}

async function choosePregen() {
  const body = el("ul", { class: "list" });
  for (const p of PREGENS) {
    const erratum = PREGEN_ERRATA.find((e) => e.id === p.id);
    body.append(el("li", {}, el("button", {
      class: "row",
      onclick: () => { instantiatePregen(p); document.querySelector(".modal-backdrop")?.remove(); document.body.style.removeProperty("overflow"); }
    },
      el("div", { class: "card-row" }, el("strong", {}, p.name),
        el("span", { class: "faint mono" }, `${p.health}/${p.hope}`)),
      el("div", { class: "faint" }, p.blurb),
      erratum ? el("div", { class: "faint" }, `Note: the printed sheet shows Hope ${erratum.printed}; the formula gives ${erratum.computed}, which is what this app uses.`) : null)));
  }
  await modal({ title: "Pre-made Travelers", body, actions: [{ label: "Cancel", value: false }] });
}

function instantiatePregen(p) {
  const taken = takenArchetypes();
  if (taken.has(p.archetype)) { showToast("Someone in the group already has that archetype.", "danger"); return; }
  saveCharacter({
    id: uid(), name: p.name, archetype: p.archetype,
    attributes: { strength: p.strength, agility: p.agility, wits: p.wits, empathy: p.empathy },
    talents: p.talents, dream: p.dream, flaw: p.flaw, song: p.favoriteSong,
    description: p.blurb, neurocaster: p.neurocaster,
    inventory: { items: (p.gear || []).map((g) => ({ name: g })), cash: 0 },
    conditions: [], tension: {}, fromPregen: p.id, createdAt: Date.now()
  });
  draft = null;
  showToast(`${p.name} joins the Journey.`);
  location.hash = "#/home";
}

export function resetWizard() { draft = null; }

// ============================================================ Journey / vehicle
// The group entity: one Destination, one vehicle, three shared items (p.62).
export function journeyScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(buildJourney(rerender));
  host.append(buildJourney(rerender));
  return host;
}

function buildJourney(rerender) {
  const j = getJourney() || { destination: "", route: "", stops: null, vehicle: null, sharedItems: [], fuel: null };
  const save = (patch) => { saveJourney({ ...j, ...patch }); rerender(); };

  const wrap = el("div", {}, el("h1", {}, "The Journey"));

  wrap.append(el("div", { class: "card" },
    el("div", { class: "field" }, el("label", {}, "Destination"),
      el("input", { value: j.destination || "", onchange: (e) => save({ destination: e.target.value }) })),
    el("div", { class: "field" }, el("label", {}, "Route notes"),
      el("input", { value: j.route || "", onchange: (e) => save({ route: e.target.value }) }))));

  // vehicle
  const vehicleCard = el("div", { class: "card" }, el("h3", {}, "Vehicle"));
  if (j.vehicle) {
    const v = j.vehicle;
    vehicleCard.append(
      el("div", { class: "card-row" }, el("strong", {}, v.label || v.name), el("span", { class: "faint mono" }, `Hull ${v.hull}`)),
      el("div", { class: "faint" }, `Passengers ${v.passengers ?? "—"} · Maneuverability ${v.maneuverability >= 0 ? "+" : ""}${v.maneuverability ?? "—"} · Speed ${v.speed} · Armor ${v.armor}`),
      v.traits?.length ? el("p", { class: "faint" }, "Traits: " + v.traits.map((t) => t.name).join(", ")) : null,
      el("div", { class: "card-row", style: "margin-top:8px" },
        el("span", { class: "faint" }, `Fuel ${j.fuel ?? Math.round(FUEL.tankGallons * FUEL.startingFraction)} / ${FUEL.tankGallons} gal`),
        el("button", { class: "btn", onclick: () => save({ vehicle: null }) }, "Change")));
  } else {
    const select = el("select", { "aria-label": "Vehicle" },
      el("option", { value: "" }, "Choose a vehicle…"),
      ...VEHICLES.map((v) => el("option", { value: v.id }, `${v.name}${v.price ? ` — $${v.price.toLocaleString()}` : ""}`)));
    vehicleCard.append(el("div", { class: "field" }, select),
      el("button", {
        class: "btn btn-primary btn-block",
        onclick: () => {
          const base = VEHICLES.find((v) => v.id === select.value);
          if (!base) { showToast("Pick a vehicle first."); return; }
          const trait = rollTrait();
          save({
            vehicle: { ...base, label: base.name, traits: [trait], ...applyTrait(base, trait) },
            fuel: Math.round(FUEL.tankGallons * FUEL.startingFraction)
          });
        }
      }, "Take this one (rolls one trait)"));
  }
  wrap.append(vehicleCard);

  // shared items
  const itemsCard = el("div", { class: "card" }, el("h3", {}, `Shared items (${(j.sharedItems || []).length}/3)`));
  const list = el("ul", { class: "list" });
  for (const item of j.sharedItems || []) {
    list.append(el("li", {}, el("div", { style: "padding:10px 4px" },
      el("div", { class: "card-row" }, el("strong", {}, item.name),
        el("button", { class: "btn", onclick: () => save({ sharedItems: j.sharedItems.filter((x) => x !== item) }) }, "Drop")))));
  }
  itemsCard.append(list);
  if ((j.sharedItems || []).length < 3) {
    const pick = el("select", { "aria-label": "Shared item" },
      el("option", { value: "" }, "Choose an item…"),
      ...SHARED_ITEMS.map((i) => el("option", { value: i.roll }, `${i.roll} · ${i.name}`)));
    itemsCard.append(el("div", { class: "field" }, pick),
      el("div", { class: "btn-row" },
        el("button", {
          class: "btn", onclick: () => {
            const item = SHARED_ITEMS.find((i) => i.roll === +pick.value);
            if (item) save({ sharedItems: [...(j.sharedItems || []), item] });
          }
        }, "Add"),
        el("button", {
          class: "btn btn-primary", onclick: () => {
            const item = SHARED_ITEMS[Math.floor(Math.random() * SHARED_ITEMS.length)];
            save({ sharedItems: [...(j.sharedItems || []), item] });
          }
        }, "Roll D66")));
  }
  wrap.append(itemsCard);
  wrap.append(el("a", { class: "btn btn-block", href: "#/home" }, "Done"));
  return wrap;
}

function rollTrait() {
  const roll = (d6() * 10) + d6();
  return VEHICLE_TRAITS.find((t) => roll >= t.range[0] && roll <= t.range[1]) || VEHICLE_TRAITS[0];
}

function applyTrait(base, trait) {
  const e = trait.effect || {};
  const out = {};
  for (const key of ["speed", "passengers", "hull", "maneuverability", "armor"]) {
    if (typeof e[key] === "number") {
      const floor = key === "armor" ? 0 : key === "hull" ? 1 : key === "maneuverability" ? 1 : 0;
      out[key] = Math.max(floor, (base[key] ?? 0) + e[key]);
    }
  }
  return out;
}

// ------------------------------------------------------------------- Tension
export function tensionScreen() {
  const chars = listCharacters();
  const host = el("div");
  const rerender = () => host.replaceChildren(buildTension(rerender, chars));
  host.append(buildTension(rerender, chars));
  return host;
}

function buildTension(rerender, chars) {
  const wrap = el("div", {}, el("h1", {}, "Tension"));
  if (chars.length < 2) {
    wrap.append(el("div", { class: "empty card" },
      el("p", {}, "Tension needs at least two Travelers. It runs between people, not inside them.")));
    return wrap;
  }
  wrap.append(el("p", { class: "faint" }, "Asymmetric on purpose: what you feel toward someone need not be returned. Start at 1 toward one or two others, 0 toward the rest."));
  for (const from of chars) {
    const card = el("div", { class: "card" }, el("h3", {}, from.name || "Unnamed"));
    for (const to of chars) {
      if (to.id === from.id) continue;
      const value = from.tension?.[to.id] ?? 0;
      card.append(el("div", { class: "card-row", style: "margin:6px 0" },
        el("span", {}, `toward ${to.name || "Unnamed"}`),
        el("div", { class: "btn-row" },
          ...[0, 1, 2].map((n) => el("button", {
            class: "btn" + (value === n ? " btn-primary" : ""),
            "aria-label": `${from.name} tension ${n} toward ${to.name}`,
            onclick: () => {
              saveCharacter({ ...from, tension: { ...(from.tension || {}), [to.id]: n } });
              rerender();
            }
          }, n)))));
    }
    card.append(el("p", { class: "faint" }, TENSION.labels[Math.max(...Object.values(from.tension || { x: 0 }))] || TENSION.labels[0]));
    wrap.append(card);
  }
  return wrap;
}
