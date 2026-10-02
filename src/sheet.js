// The live character sheet and the persistent vitals header (Phase 2).
import { $, el, clamp, die } from "./core.js";
import { ATTRIBUTES, ARCHETYPES, NEUROCASTERS, TENSION, FUEL, DRONE_PILOT_RULES } from "../data.js";
import { GEAR, SURGERY } from "../data-tables.js";
import { BODY_ARMOR } from "../data.js";
import { maxHealth, maxHope, isDronePilot, tracksBliss, usesCash } from "./derived.js";
import { getCharacter, saveCharacter, deleteCharacter, listCharacters, getJourney, saveJourney } from "./store.js";
import { talent as findTalent, rule } from "./rules.js";
import { describeTalent } from "./wizard.js";
import { showToast, modal, promptModal, explain, dismissModal, moreMenu, haptic } from "./ui.js";
import { undoLast } from "./store.js";
import { GENDERS, genderOf, subj, obj, poss, Subj, Poss } from "./pronouns.js";

// ---------------------------------------------------------------- vitals header
/**
 * The bar that follows you around the app.
 *
 * `onSwitch` is how a screen says "I can show a different Traveler without navigating" —
 * the dice screen passes one. Without it, switching goes to that Traveler's sheet. Solo
 * play runs two to four Travelers and every screen had its own select; this is the one
 * control that is always on screen.
 */
let lastShown = null;      // what the bar showed last time, so a change can flash
let lastOpts = {};

export function renderVitals(ch, { onSwitch = null } = {}) {
  const host = $("#vitals");
  if (!host) return;
  if (!ch) { host.hidden = true; host.replaceChildren(); host.classList.remove("is-alarm"); lastShown = null; return; }
  lastOpts = { onSwitch };

  const journey = getJourney();
  const hMax = maxHealth(ch), pMax = maxHope(ch);
  const health = ch.state?.health ?? hMax;
  const hope = ch.state?.hope ?? pMax;
  const bliss = ch.state?.bliss ?? 0;
  const perm = ch.state?.permanentBliss ?? 0;
  const lost = tracksBliss(ch) && bliss >= hope;

  // A tile is a reading and, for the three tracks, a way to change it where you stand:
  // tapping one opens its stepper without leaving the screen.
  const tile = (label, value, cls = "", gauge = null, kind = null) =>
    el(kind ? "button" : "div", {
      class: "vital" + (cls ? ` ${cls}` : ""), "data-kind": kind,
      ...(kind ? { "aria-label": `${label} ${value} — change`, onclick: () => quickStep(ch.id, kind) } : {})
    },
      el("span", { class: "vital-label" }, label),
      el("span", { class: "vital-value" }, value),
      gauge);

  const tiles = [
    tile(isDronePilot(ch) ? "Hull" : "Health", `${health}/${hMax}`, health === 0 ? "is-danger" : "",
      pips(health, hMax, "health", isDronePilot(ch) ? "Hull" : "Health"), "health"),
    tile("Hope", `${hope}/${pMax}`, hope === 0 ? "is-danger" : "", pips(hope, pMax, "hope", "Hope"), "hope")
  ];
  if (tracksBliss(ch)) {
    tiles.push(tile("Bliss", perm ? `${bliss} ⌊${perm}⌋` : String(bliss), lost ? "is-danger" : "is-neuro",
      blissBar(bliss, perm, hope, pMax), "bliss"));
  }
  if (usesCash(ch)) tiles.push(tile("Cash", `$${ch.inventory?.cash ?? 0}`));
  if (journey?.vehicle) tiles.push(tile("Fuel", `${journey.fuel ?? 0}g`, (journey.fuel ?? 0) <= 2 ? "is-danger" : ""));

  host.replaceChildren(...[switcher(ch, onSwitch), ...tiles].filter(Boolean));
  host.hidden = false;

  if (lost) host.append(el("div", { class: "vital is-danger is-wide" },
    el("span", { class: "vital-label" }, "Lost in the Electric State"),
    el("span", { class: "vital-value" }, "cannot disconnect")));

  // Something just got worse: the tile flashes, and the phone says so.
  if (lastShown?.id === ch.id) {
    const flash = (kind) => host.querySelector(`[data-kind="${kind}"]`)?.classList.add("flash");
    if (health < lastShown.health) flash("health");
    if (hope < lastShown.hope) flash("hope");
    if (bliss > lastShown.bliss) flash("bliss");
    if (health < lastShown.health || hope < lastShown.hope || bliss > lastShown.bliss) haptic("loss");
  }
  lastShown = { id: ch.id, health, hope, bliss };
  host.classList.toggle("is-alarm", health === 0 || hope === 0 || lost);
}

/** One segment per point: what is left, and how much there was. */
function pips(value, max, kind, label) {
  const row = el("span", { class: `pips gauge-${kind}`, role: "meter", "aria-label": label,
    "aria-valuemin": "0", "aria-valuemax": String(max), "aria-valuenow": String(value) });
  for (let i = 0; i < max; i++) row.append(el("span", { class: "pip" + (i < value ? " on" : "") }));
  return row;
}

/** Bliss on the Hope scale: hatched floor for Permanent Bliss, a tick where Hope stands. */
function blissBar(bliss, perm, hope, pMax) {
  const scale = Math.max(pMax, bliss, 1);
  const pct = (n) => `${Math.min(100, (n / scale) * 100)}%`;
  return el("span", { class: "bliss-bar", role: "meter", "aria-label": `Bliss, against Hope ${hope}`,
    "aria-valuemin": "0", "aria-valuemax": String(scale), "aria-valuenow": String(bliss) },
    el("span", { class: "bliss-fill", style: `width:${pct(bliss)}` }),
    perm ? el("span", { class: "bliss-floor", style: `width:${pct(perm)}` }) : null,
    el("span", { class: "bliss-mark", style: `left:${pct(hope)}` }));
}

/** The stepper for one track, from the vitals bar, on whatever screen you are on. */
async function quickStep(id, kind) {
  const body = el("div");
  const draw = () => {
    const c = getCharacter(id);
    if (!c) return;
    const patch = (fn) => { const next = structuredClone(getCharacter(id)); fn(next); saveCharacter(next); haptic(); draw(); renderVitals(getCharacter(id), lastOpts); };
    body.replaceChildren(...vitalSteppers(c, patch, kind === "bliss" ? ["bliss", "permanentBliss"] : [kind]));
  };
  draw();
  const ch = getCharacter(id);
  await modal({
    title: kind === "health" ? (isDronePilot(ch) ? "Hull" : "Health") : kind === "hope" ? "Hope" : "Bliss",
    body, actions: [{ label: "Done", value: true, class: "btn-primary" }]
  });
  // The sheet shows the same numbers in its own steppers; bring it up to date.
  if (location.hash.startsWith("#/sheet/") && !document.body.classList.contains("tray-open")) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

/** The vitals steppers, shared by the sheet and the quick stepper behind each tile. */
function vitalSteppers(ch, patch, kinds = ["health", "hope", "bliss", "permanentBliss"]) {
  const hMax = maxHealth(ch), pMax = maxHope(ch);
  const rows = {
    health: () => stepper(isDronePilot(ch) ? "Hull" : "Health", ch.state.health, hMax,
      (v) => patch((c) => { c.state.health = clamp(v, 0, hMax); }), "health"),
    hope: () => stepper("Hope", ch.state.hope, pMax,
      (v) => patch((c) => { c.state.hope = clamp(v, 0, pMax); }), "hope"),
    bliss: () => tracksBliss(ch)
      ? stepper("Bliss", ch.state.bliss, null,
          (v) => patch((c) => { c.state.bliss = Math.max(c.state.permanentBliss || 0, v); }), "bliss",
          ch.state.permanentBliss || 0, blissBar(ch.state.bliss ?? 0, ch.state.permanentBliss ?? 0, ch.state.hope ?? pMax, pMax))   // permanent Bliss is the floor, by rule
      : el("p", { class: "faint" }, "You are a drone: no Bliss, no hunger, no cash."),
    permanentBliss: () => tracksBliss(ch)
      ? stepper("Permanent Bliss", ch.state.permanentBliss, null,
          (v) => patch((c) => {
            c.state.permanentBliss = Math.max(0, v);
            c.state.bliss = Math.max(c.state.bliss, c.state.permanentBliss);
          }), "bliss")
      : null
  };
  return kinds.map((k) => rows[k]()).filter(Boolean);
}

function switcher(ch, onSwitch) {
  const all = listCharacters();
  // With one Traveler the header still says whose numbers these are; it just has nowhere
  // to go, so it is a label rather than a button that would do nothing.
  if (all.length < 2) return el("div", { class: "vital-switch is-static" }, ch.name || "Unnamed");
  return el("button", {
    class: "vital-switch", "aria-label": `Showing ${ch.name || "Unnamed"} — switch Traveler`,
    onclick: async () => {
      const body = el("ul", { class: "list" });
      for (const other of all) {
        body.append(el("li", {}, el("button", {
          class: "row" + (other.id === ch.id ? " is-here" : ""),
          onclick: () => {
            dismissModal(false);
            if (other.id === ch.id) return;
            if (onSwitch) onSwitch(other.id);
            else location.hash = `#/sheet/${other.id}`;
          }
        },
          el("div", { class: "card-row" },
            el("strong", {}, other.name || "Unnamed"),
            el("span", { class: "mono faint" },
              `${other.state?.health ?? "?"}/${maxHealth(other)} · ${other.state?.hope ?? "?"}/${maxHope(other)}`)))));
      }
      await modal({ title: "Which Traveler?", body, actions: [{ label: "Cancel", value: false }] });
    }
  }, ch.name || "Unnamed");
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
    // No Back button: the tab bar and the system's own back gesture already do that.
    // Deleting lives behind ⋯, and is undoable from the toast rather than confirmed first.
    el("div", { class: "titled" },
      el("h1", {}, ch.name || "Unnamed"),
      moreMenu([{
        label: "Delete Traveler", danger: true,
        run: () => {
          const name = ch.name || "This Traveler";
          deleteCharacter(ch.id); clearVitals(); location.hash = "#/home";
          showToast(`${name} deleted.`, "danger", { label: "Undo", run: () => { undoLast(); location.hash = `#/sheet/${ch.id}`; } });
        }
      }], "Traveler actions")),
    el("p", { class: "faint" }, [arch?.name, ch.song].filter(Boolean).join(" · ")),
    // Its own row. Sharing a line with the archetype and a song title meant the switch
    // sat somewhere different on every sheet, and dropped to a second line on the long ones.
    el("div", { class: "identity" },
      el("div", { class: "seg", role: "group", "aria-label": "Gender" },
        ...GENDERS.map((g) => el("button", {
          class: "seg-item" + (genderOf(ch) === g.id ? " is-on" : ""),
          "aria-pressed": genderOf(ch) === g.id ? "true" : "false",
          onclick: () => patch((c) => { c.gender = g.id; })
        }, g.label))),
      el("span", { class: "identity-pronouns" }, `${subj(ch)} · ${obj(ch)} · ${poss(ch)}`)),
    explain("Everything about this Traveler, and everything that happens. The bar at the top follows you around the app. Steppers are clamped to real maxima, injuries and traumas apply dice penalties to rolls automatically, and gear degrades as you push rolls with it."),
    ch.descriptorWords?.length ? el("p", { class: "faint" }, ch.descriptorWords.join(" · ")) : null);

  // --- vitals steppers
  wrap.append(el("div", { class: "card" },
    ...vitalSteppers(ch, patch),
    statusNotes(ch, hMax, pMax, rerender)));

  // The things you reach for mid-scene, directly under the vitals rather than below
  // eight cards of reference. Rally and the death roll appear only when they apply.
  wrap.append(el("div", { class: "btn-grid" },
    // Rolling opens the dice tray over the sheet, already holding this Traveler's pool.
    el("button", { class: "btn btn-primary", onclick: async () => {
      const [{ rollFor }, { openTray }] = await Promise.all([import("./roller.js"), import("./router.js")]);
      rollFor(ch.id); openTray();
    } }, "Roll dice"),
    el("button", { class: "btn", onclick: async () => { const { damageDialog } = await import("./roller.js"); damageDialog(ch, rerender); } }, "Take damage"),
    el("button", { class: "btn", onclick: async () => { const { traumaticEventDialog } = await import("./roller.js"); await traumaticEventDialog(ch, rerender); } }, "Traumatic event"),
    ch.state.health === 0 || ch.state.hope === 0
      ? el("button", { class: "btn", onclick: async () => { const { rallyDialog } = await import("./roller.js"); await rallyDialog(ch, rerender); } }, "Rally")
      : null,
    ch.state.health === 0 && !ch.state.stabilized && !ch.state.dead && !isDronePilot(ch)
      ? el("button", { class: "btn btn-danger", onclick: async () => { const { deathRollDialog } = await import("./roller.js"); await deathRollDialog(ch); rerender(); } }, "Death roll")
      : null));

  // The sheet is five screens with a few injuries and a full pack, and the thing you
  // want is rarely at the top. Jump straight to it.
  wrap.append(el("nav", { class: "jumpbar", "aria-label": "Sheet sections" },
    ...[["sec-attributes", "Attributes"], ["sec-talents", "Talents"], ["sec-conditions", "Conditions"],
        ["sec-caster", "Neurocaster"], ["sec-gear", "Gear"], ["sec-tension", "Tension"]]
      .map(([id, label]) => el("a", {
        href: `#/sheet/${ch.id}`, "data-sec": id,
        onclick: (e) => {
          e.preventDefault();
          document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      }, label))));

  // --- attributes
  const attrGrid = el("div", { class: "card", id: "sec-attributes" }, el("h3", {}, "Attributes"));
  for (const a of ATTRIBUTES) {
    attrGrid.append(el("div", { class: "card-row", style: "padding:4px 0" },
      el("span", {}, a.label),
      el("span", { class: "mono", style: "font-size:1.1rem" }, ch.attributes[a.id])));
  }
  wrap.append(attrGrid);

  // --- talents
  const talents = el("div", { class: "card", id: "sec-talents" }, el("h3", {}, "Talents"));
  if (!ch.talents?.length) talents.append(el("p", { class: "faint" }, "None yet."));
  for (const id of ch.talents || []) {
    const t = findTalent(id, ch);
    if (!t) continue;
    talents.append(el("div", { style: "padding:6px 0" },
      el("strong", {}, t.name), el("div", { class: "faint" }, describeTalent(t))));
  }
  wrap.append(talents);

  // --- dream, flaw, goal, threat: written at creation, read often, edited rarely
  wrap.append(el("details", { class: "card phase-fold" },
    el("summary", {}, "Dream, Flaw, Goal and Threat"),
    field("Dream", ch.dream, (v) => patch((c) => { c.dream = v; })),
    field("Flaw", ch.flaw, (v) => patch((c) => { c.flaw = v; })),
    field("Goal", ch.goal, (v) => patch((c) => { c.goal = v; })),
    ch.goalWords?.length ? el("p", { class: "faint" }, ch.goalWords.join(" · ")) : null,
    field("Threat", ch.threat, (v) => patch((c) => { c.threat = v; })),
    ch.threatWords?.length ? el("p", { class: "faint" }, ch.threatWords.join(" · ")) : null,
    field("Kicker", ch.kicker, (v) => patch((c) => { c.kicker = v; }))));

  // --- conditions
  wrap.append(conditionsCard(ch, patch));

  // --- neurocaster
  wrap.append(neurocasterCard(ch, patch, rerender));

  // --- inventory
  wrap.append(inventoryCard(ch, patch, rerender));

  // --- tension
  wrap.append(tensionCard(ch));

  wrap.append(el("details", { class: "card phase-fold" },
    el("summary", {}, "Notes"),
    el("textarea", { rows: 4, "aria-label": "Notes", onchange: (e) => patch((c) => { c.notes = e.target.value; }) }, ch.notes || "")));

  // Everything under the section bar flows into two columns on a tablet.
  const bar = wrap.querySelector(".jumpbar");
  const cols = el("div", { class: "sheet-cols" });
  while (bar?.nextSibling) cols.append(bar.nextSibling);
  if (bar) wrap.append(cols);
  spySections(bar);


  return wrap;
}

/** The section bar marks whichever section is under it as you scroll. */
function spySections(bar) {
  if (!bar || !("IntersectionObserver" in window)) return;
  requestAnimationFrame(() => {
    const links = [...bar.querySelectorAll("a")];
    const targets = links.map((a) => document.getElementById(a.dataset.sec)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      if (!bar.isConnected) { io.disconnect(); return; }
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!top) return;
      links.forEach((a) => a.classList.toggle("is-here", a.dataset.sec === top.target.id));
    }, { rootMargin: "-30% 0px -60% 0px" });
    targets.forEach((t) => io.observe(t));
  });
}

/** A clamped stepper. At its floor or ceiling the button that cannot move is disabled,
 *  because a control that looks pressable and does nothing reads as a broken app. */
function stepper(label, value, max, onChange, kind, min = 0, gauge = null) {
  const v = value ?? 0;
  return el("div", { class: "card-row", style: "padding:6px 0" },
    el("div", { style: "flex:1;min-width:0" }, el("strong", {}, label),
      max != null ? el("span", { class: "faint" }, ` / ${max}`) : null,
      max != null ? el("div", { style: "margin-top:6px;max-width:160px" }, pips(v, max, kind, label)) : gauge
        ? el("div", { style: "margin-top:8px;max-width:160px" }, gauge) : null),
    el("div", { class: "stepper" },
      el("button", {
        class: "stepper-btn", "aria-label": `Lower ${label}`,
        disabled: min != null && v <= min, onclick: () => onChange(v - 1)
      }, "−"),
      el("span", { class: "stepper-value" }, v),
      el("button", {
        class: "stepper-btn", "aria-label": `Raise ${label}`,
        disabled: max != null && v >= max, onclick: () => onChange(v + 1)
      }, "+")));
}

function statusNotes(ch, hMax, pMax, rerender) {
  const notes = [];
  if (ch.state.health === 0 && isDronePilot(ch)) {
    notes.push(["Disconnected", "The drone's Hull is gone, so you were thrown out of it. Your body is elsewhere, so there are no death rolls — but the drone is dead metal until someone repairs it.", "drones", "repairDrone"]);
  } else if (ch.state.health === 0) {
    notes.push(["Incapacitated", "You can crawl and mumble. No attribute rolls, no talents. Death rolls each turn until stabilized.",
      "deathRoll", ch.state.stabilized || ch.state.dead ? "rally" : "death"]);
  }
  if (ch.state.hope === 0) notes.push(["Breakdown", "You can talk, move and flee, but cannot roll attributes or use talents until rallied.", "breakdown", "rally"]);
  if (tracksBliss(ch) && ch.state.bliss >= ch.state.hope && ch.state.hope > 0)
    notes.push(["Lost in the Electric State", "Bliss has caught your Hope. You cannot leave a neuroscape on your own — someone must pull the helmet off, and that costs everything.", "bliss", "pullOut"]);
  if (ch.state.frozen) notes.push(["Frozen", "Whatever just happened stopped you dead. You lose your next turn — clear this once you have sat it out.", "traumaticEvent", "unfreeze"]);
  if (!notes.length) return null;
  return el("div", { style: "margin-top:8px" },
    ...notes.map(([title, text, ruleId, action]) => el("div", { class: "card", style: "border-left:3px solid var(--danger)" },
      el("strong", {}, title), el("p", { class: "faint" }, text), ruleLink(ruleId),
      action === "death"
        ? el("button", {
            class: "btn btn-danger btn-block", style: "margin-top:8px",
            onclick: async () => {
              const { deathRollDialog } = await import("./roller.js");
              await deathRollDialog(ch);
              rerender();
            }
          }, "Roll for death")
        : null,
      action === "death" || action === "rally"
        ? el("button", {
            class: "btn btn-block", style: "margin-top:8px",
            onclick: async () => {
              const { rallyDialog } = await import("./roller.js");
              await rallyDialog(ch, rerender);
            }
          }, `Someone rallies ${obj(ch)}`)
        : null,
      action === "unfreeze"
        ? el("button", {
            class: "btn btn-block", style: "margin-top:8px",
            onclick: () => {
              const next = structuredClone(ch);
              next.state.frozen = false;
              saveCharacter(next);
              rerender();
            }
          }, "That turn is spent")
        : null,
      action === "repairDrone"
        ? el("button", {
            class: "btn btn-block", style: "margin-top:8px",
            onclick: async () => {
              const { repairDroneBody } = await import("./roller.js");
              await repairDroneBody(ch, rerender);
            }
          }, "Repair the drone")
        : null,
      action === "pullOut" && (ch.talents || []).includes("neuroresistant") && !ch.state.neuroresistantUsed
        ? el("button", {
            class: "btn btn-block", style: "margin-top:8px",
            onclick: async () => {
              const { neuroresistantEscape } = await import("./roller.js");
              await neuroresistantEscape(ch, rerender);
            }
          }, "Neuroresistant: one Wits roll to leave")
        : null,
      action === "pullOut"
        ? el("button", {
            class: "btn btn-danger btn-block", style: "margin-top:8px",
            onclick: async () => {
              const { forcedDisconnect } = await import("./roller.js");
              await forcedDisconnect(ch);
            }
          }, "Someone pulls the helmet off")
        : null)));
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
  const card = el("div", { class: "card", id: "sec-conditions" }, el("h3", {}, "Injuries & trauma"));
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
function neurocasterCard(ch, patch, rerender) {
  const card = el("div", { class: "card", id: "sec-caster" }, el("h3", {}, "Neurocaster"));
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
      }), "caster"));
  }
  const penalty = model.realWorldPenalty ?? -2;
  card.append(el("label", { class: "card-row", style: "text-transform:none;letter-spacing:0;color:inherit;padding:8px 0" },
    el("span", {},
      el("strong", {}, "On your head right now"),
      el("div", { class: "faint" }, `${penalty} dice to real-world actions needing mobility or vision, and you act in one realm per round.`)),
    el("input", {
      type: "checkbox",checked: !!ch.state.wearingCaster,
      "aria-label": "Wearing the neurocaster",
      onchange: (e) => patch((c) => { c.state.wearingCaster = e.target.checked; })
    })));
  if (busted) {
    card.append(el("p", { class: "faint", style: "color:var(--danger)" },
      "Busted: if you were inside a neuroscape, your Hope drops to zero and you roll for mental trauma."));
    card.append(el("button", {
      class: "btn btn-block", onclick: async () => {
        const { repairDialog } = await import("./roller.js");
        const attr = ["processor", "network", "graphics"].find((k) => state[k] <= 0);
        await repairDialog(ch, { kind: "caster", attr, name: `${model.name} ${attr}`, max: model[attr] }, rerender);
      }
    }, "Repair the neurocaster"));
  }
  return card;
}

// ------------------------------------------------------------------- inventory
function inventoryCard(ch, patch, rerender) {
  const card = el("div", { class: "card", id: "sec-gear" }, el("h3", {}, "Gear"));
  if (isDronePilot(ch)) { card.append(el("p", { class: "faint" }, "You carry nothing — you are the machine.")); return card; }

  const items = ch.inventory?.items || [];
  if (!items.length) card.append(el("p", { class: "faint" }, "Empty pockets."));
  for (const [i, item] of items.entries()) {
    const busted = item.bonus != null && item.bonus <= 0;
    card.append(el("div", { style: "padding:8px 0;border-top:1px solid var(--line-soft)" },
      el("div", { class: "card-row" },
        el("span", {}, item.name, busted ? el("span", { class: "faint", style: "color:var(--danger)" }, " · Busted") : null),
        el("button", { class: "btn", onclick: () => patch((c) => { c.inventory.items.splice(i, 1); }) }, "Drop")),
      item.bonus != null && item.bonus <= 0
        ? el("button", {
            class: "btn", onclick: async () => {
              const { repairDialog } = await import("./roller.js");
              await repairDialog(ch, { kind: "item", index: i, name: item.name, max: item.maxBonus ?? 1 }, rerender);
            }
          }, "Repair")
        : null,
      item.bonus != null
        ? stepper("Gear bonus", item.bonus, item.maxBonus ?? item.bonus,
            (v) => patch((c) => { c.inventory.items[i].bonus = Math.max(0, v); }), "gear")
        : null,
      item.uses != null ? el("div", { class: "faint" }, `${item.uses} uses left`) : null,
      item.hope
        ? el("div", {},
            el("div", { class: "faint" }, `A moment with this returns ${item.hope.amount} Hope, once per ${item.hope.per}${item.hope.healthCost ? `, at ${item.hope.healthCost} Health` : ""}.`),
            el("button", {
              class: "btn", onclick: async () => {
                const { useHopeItem } = await import("./lifecycle.js");
                const result = useHopeItem(ch, item);
                if (!result.ok) { showToast(result.reason, "danger"); return; }
                if (item.uses != null) patch((c) => { c.inventory.items[i].uses = Math.max(0, item.uses - 1); });
                else rerender();
                showToast(`${ch.name}: +1 Hope.`);
              }
            }, "Take a moment with it"))
        : null));
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
            c.inventory.items.push({
              name: g.name, bonus: g.bonus || null, maxBonus: g.bonus || null,
              uses: g.uses ?? null, gearId: g.id,
              // Carried through, or the Hope-from-an-item rule has nothing to read.
              hope: g.hope || null, alcohol: !!g.alcohol
            });
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
  const card = el("div", { class: "card", id: "sec-tension" }, el("h3", {}, "Tension"));
  if (!others.length) {
    card.append(el("p", { class: "faint" }, "Tension needs someone to feel it toward."));
    return card;
  }
  for (const other of others) {
    const mine = ch.tension?.[other.id] ?? 0;
    const theirs = other.tension?.[ch.id] ?? 0;
    card.append(el("div", { class: "card-row", style: "padding:4px 0" },
      el("span", {}, other.name || "Unnamed"),
      el("span", { class: "mono faint" }, `you ${mine} · ${subj(other)} ${theirs}`)));
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

    if (isDronePilot(ch)) {
      wrap.append(el("div", { class: "card" },
        el("h3", {}, "Serious injury"),
        el("p", { class: "faint" }, "You are a drone: no broken ribs, no infected wounds. A wrecked Hull is repaired, not healed."),
        el("a", { class: "btn", href: `#/sheet/${id}` }, "Back to the sheet")));
    } else wrap.append(el("div", { class: "card" },
      el("h3", {}, "Serious injury"),
      el("p", { class: "faint" }, "Rolled after surviving Incapacitation. A D66 is two dice read as a two-digit number — the first die is the tens. Anything from 11 to 36 means no lasting harm."),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-primary", onclick: () => { const r = d66(); add(rollInjury(r), "injury"); } }, "Roll D66"),
        el("button", { class: "btn", onclick: () => picker(SERIOUS_INJURIES, "injury", add) }, "Choose"))));

    if (Settings.mentalTrauma()) {
      wrap.append(el("div", { class: "card" },
        el("h3", {}, "Mental trauma"),
        el("p", { class: "faint" }, "Rolled after a Breakdown you were rallied from, or after being Incapacitated inside a neuroscape. Roll it, or pick one if the table would rather choose."),
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
      onclick: () => { dismissModal(false); add(entry, kind); }
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
  for (let i = 0; i < n; i++) total += die(faces);
  return total;
}
