// Solo play (Phase 6). The deck is the pacing timer: no reshuffle until it runs out.
import { el, d6, d66, uid, shuffle, fromRangeTable } from "./core.js";
import { SUITS, RANKS, FACE_RANKS, EVENT_TRIGGERS, TILT, NPC_PERSONALITY, NPC_EMOTION,
         NPC_MOTIVE, NPC_METHOD, MINOR_ENCOUNTERS, CONVERSATION_SUBJECTS, TRAVELER_EVENTS,
         THREAT_TYPES, THREAT_SUBTYPES, STOP_THREAT_COUNTDOWN, STOP_COUNTDOWN_UNASSIGNED,
         PERSONAL_THREAT_COUNTDOWN, START_SHIFT_BY_SUIT, DESTINATIONS, SOLO_PERSONAL_THREATS,
         NINETIES_VEHICLES, SOLO_UNSTICK, SOLO_PREP_STEPS, SOLO_ARCHETYPE_HOOKS,
         SOLO_PRINCIPLES, INTERNAL_THREATS_ALLOWED } from "../data-solo.js";
import { SETTING, BLOCKERS, NEEDS, CONFLICT_PARTIES, CONFLICT_SUBJECTS, LOCATIONS,
         ELECTRIC_STATE_ELEMENTS, NINETIES_NOSTALGIA, NPC_QUIRKS, D66_ORDER } from "../data-gm.js";
import { getJourney, saveJourney, listCharacters, saveCharacter } from "./store.js";
import { makeStop, saveStop, activeStop, setActiveStop, advanceCountdown, attachThreat,
         resolveStop, stopCard as sharedStopCard } from "./stops.js";
import { showToast, modal, explain, actionBar } from "./ui.js";

const SUIT_GLYPH = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };

// ---------------------------------------------------------------------- deck
export function freshDeck() {
  const cards = [];
  for (const suit of SUITS) for (const rank of RANKS) cards.push({ suit, rank });
  return shuffle(cards);
}

export function drawFrom(deck) {
  if (!deck.length) return { card: null, deck, exhausted: true };
  const [card, ...rest] = deck;
  return { card, deck: rest, exhausted: rest.length === 0 };
}

export const isFace = (card) => FACE_RANKS.includes(card.rank);

/** Tilt: suit decides good or bad, rank decides how much. */
export function readTilt(card) {
  const good = TILT.good.includes(card.suit);
  const degree = TILT.degrees.find((d) => d.ranks.includes(card.rank))?.degree || "Low";
  return { good, degree, label: `${degree} — ${good ? "good for the Travelers" : "bad for the Travelers"}` };
}

export const eventFor = (card) => (isFace(card) ? EVENT_TRIGGERS[card.suit] : null);

const d66Pick = (table) => table[D66_ORDER.indexOf(d66())];
const d6Pick = (table) => table[d6() - 1];

/** The printed Stop Countdown table stops at 56; 61-66 re-roll (house aid). */
export function rollStopCountdown() {
  for (let i = 0; i < 20; i++) {
    const roll = d66();
    const hit = fromRangeTable(STOP_THREAT_COUNTDOWN, roll);
    if (hit) return { roll, ...hit };
  }
  return { roll: null, event: STOP_THREAT_COUNTDOWN[0].event };
}

/** Solo and the GM screen build the same record, so either can pick up the other's Stop. */
export function generateStop(name = "") {
  return makeStop(name);
}

export function generateThreat() {
  const type = THREAT_TYPES[d6() - 1];
  const subs = THREAT_SUBTYPES[type.type];
  let sub = null;
  if (subs) {
    const roll = d6();
    sub = subs.find((s) => s.d6.includes(roll))?.sub || subs[subs.length - 1].sub;
  }
  return { type: type.type, note: type.note, sub };
}

export function generateNPC(cards) {
  return {
    personality: NPC_PERSONALITY[cards[0].rank],
    emotion: NPC_EMOTION[cards[1].rank],
    motive: NPC_MOTIVE[cards[2].suit],
    method: NPC_METHOD[cards[3].suit],
    quirk: d66Pick(NPC_QUIRKS),
    predisposition: readTilt(cards[4])
  };
}

// ================================================================== screen
export function soloScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

const state = () => {
  const j = getJourney() || {};
  return j.solo || { deck: freshDeck(), history: [], events: [], stop: null, threat: null };
};
const write = (patch) => {
  const j = getJourney() || {};
  saveJourney({ ...j, solo: { ...state(), ...patch } });
};

/** Which Traveler is this about? Solo runs two to four, so most things have to ask. */
async function pickTraveler(title, cast = listCharacters()) {
  if (cast.length < 2) return cast[0] || null;
  let picked = null;
  const body = el("ul", { class: "list" });
  for (const c of cast) {
    body.append(el("li", {}, el("button", {
      class: "row", onclick: () => {
        picked = c;
        document.querySelector(".modal-backdrop")?.remove();
        document.body.style.removeProperty("overflow");
      }
    }, el("strong", {}, c.name || "Unnamed"))));
  }
  await modal({ title, body, actions: [{ label: "Cancel", value: false }] });
  return picked;
}

/** Records an event on the Journey so it survives the modal and the screen refresh. */
function logEvent(kind, text, card = null) {
  const s = state();
  write({ events: [{ id: uid(), kind, text, card, at: Date.now() }, ...(s.events || [])].slice(0, 30) });
}

// ------------------------------------------------------- personal Threats
/**
 * A personal Threat belongs to one Traveler, so solo runs one clock per Traveler rather
 * than one for the table. It is the mechanical half of the Threat written on their sheet:
 * the sheet says what it is, this says how close it has got — three steps, you hear about
 * it, it makes contact, it attacks.
 *
 * Stored on the Journey as `{ [charId]: { text, step } }`, because the event list is
 * capped and cannot be trusted to count.
 */
export const PERSONAL_THREAT_STEPS = PERSONAL_THREAT_COUNTDOWN.length;

export function personalThreats() {
  const s = state();
  if (s.personalThreats) return s.personalThreats;
  // Older saves kept one counter for the whole party. Keep the progress; give it an owner.
  if (s.personalThreatStep == null) return {};
  const owner = s.leadId || listCharacters()[0]?.id || "party";
  return { [owner]: { text: "", step: s.personalThreatStep } };
}

const writeThreats = (map) => write({ personalThreats: map, personalThreatStep: undefined });

export function setPersonalThreat(charId, text) {
  const map = { ...personalThreats(), [charId]: { text, step: 0 } };
  writeThreats(map);
  return map[charId];
}

/** Whoever still has a Threat that has not caught up with them. */
export const armedThreats = () =>
  Object.entries(personalThreats()).filter(([, t]) => (t.step || 0) < PERSONAL_THREAT_STEPS);

/**
 * Advance one Traveler's Threat. Named explicitly by the button; a face card advances the
 * Traveler in the spotlight, or the only one armed, because the card does not say whose.
 */
export function advancePersonalThreat(charId = null) {
  const map = { ...personalThreats() };
  const armed = armedThreats();
  if (!armed.length) return null;
  const lead = state().leadId;
  const chosen = (charId && map[charId] && (map[charId].step || 0) < PERSONAL_THREAT_STEPS)
    ? charId
    : (armed.find(([id]) => id === lead) || armed[0])[0];

  const entry = map[chosen];
  const done = entry.step || 0;
  map[chosen] = { ...entry, step: done + 1 };
  writeThreats(map);

  const who = listCharacters().find((c) => c.id === chosen);
  return {
    ...PERSONAL_THREAT_COUNTDOWN[done],
    index: done + 1, of: PERSONAL_THREAT_STEPS,
    charId: chosen, name: who?.name || "The party", text: entry.text || ""
  };
}

/** The live Stop's own Countdown if there is one, otherwise the printed D66 table. */
export async function nextStopCountdown() {
  const current = activeStop();
  if (current && current.countdownProgress < current.countdown.length) {
    const fired = advanceCountdown(current.id);
    if (fired) return { text: fired.step, title: `Countdown ${fired.index} of ${fired.of}` };
  }
  const r = rollStopCountdown();
  return { text: r.event, title: "Stop Countdown" };
}

/** Steps still to come across every armed Threat, for the button that fires them. */
const threatStepsLeft = () =>
  armedThreats().reduce((n, [, t]) => n + (PERSONAL_THREAT_STEPS - (t.step || 0)), 0);

/**
 * The clocks, stated. A personal Threat that only exists as a counter is a Threat the
 * player forgets is coming, which is the one thing it must not be.
 */
function personalThreatSummary() {
  const entries = Object.entries(personalThreats());
  if (!entries.length) return null;
  const cast = listCharacters();
  const box = el("div", { style: "margin-top:8px" });
  for (const [id, t] of entries) {
    const who = cast.find((c) => c.id === id);
    const step = t.step || 0;
    box.append(el("div", { class: "card-row", style: "padding:4px 0" },
      el("span", {}, el("strong", {}, who?.name || "The party"),
        t.text ? el("div", { class: "faint" }, t.text) : null),
      el("span", { class: "mono faint" },
        step >= PERSONAL_THREAT_STEPS ? "caught up" : `${step}/${PERSONAL_THREAT_STEPS}`)));
  }
  return box;
}

/** The phase-5 button says whose Threat is next, because it is no longer the party's. */
function nextThreatLabel() {
  const armed = armedThreats();
  if (!armed.length) return "Personal Threat step (none running)";
  if (armed.length > 1) return `Personal Threat step (${armed.length} running)`;
  const who = listCharacters().find((c) => c.id === armed[0][0]);
  return `Personal Threat step — ${who?.name || "the party"}`;
}

/**
 * A Stop is a spotlight, so generating one hands it to whoever has led fewest — which is
 * how the book's "rotate so each Traveler leads at least one" actually gets honoured.
 * Ties break in creation order; the hand-over button still overrides it.
 */
export function passTheSpotlight(cast = listCharacters()) {
  if (cast.length < 2) return null;
  const led = state().ledStops || {};
  const fewest = Math.min(...cast.map((c) => led[c.id] || 0));
  const nextUp = cast.find((c) => (led[c.id] || 0) === fewest);
  write({ leadId: nextUp.id, ledStops: { ...led, [nextUp.id]: (led[nextUp.id] || 0) + 1 } });
  return nextUp;
}

function build(rerender) {
  const s = state();
  const wrap = el("div", {}, el("h1", {}, "Solo"));
  wrap.append(explain("Playing without a GM. The deck answers the questions a GM would: face cards fire events by suit, Tilts say whether something helps or hurts and how much, and five cards build an NPC. Do not reshuffle until the deck is spent — running it down is the pacing."));

  const phase = (title, blurb, ...kids) =>
    el("div", { class: "card" }, el("h3", {}, title), blurb ? el("p", { class: "faint" }, blurb) : null, ...kids);
  // Prep happens once; it should not sit above the controls you use every scene.
  const foldedPhase = (title, blurb, ...kids) =>
    el("details", { class: "card phase-fold" }, el("summary", {}, title),
      blurb ? el("p", { class: "faint" }, blurb) : null, ...kids);
  const row = (...kids) => el("div", { class: "btn-row" }, ...kids.filter(Boolean));
  const act = (label, fn, primary = false) =>
    el("button", { class: "btn" + (primary ? " btn-primary" : ""), onclick: fn }, label);

  // Solo runs two to four Travelers with one in the spotlight per Stop, rotated so
  // everyone leads at least one.
  const cast = listCharacters();
  if (cast.length > 1) {
    const leadId = s.leadId && cast.some((c) => c.id === s.leadId) ? s.leadId : cast[0].id;
    const led = s.ledStops || {};
    const lead = cast.find((c) => c.id === leadId);
    const next = cast[(cast.findIndex((c) => c.id === leadId) + 1) % cast.length];
    wrap.append(phase("Whose Stop is this?",
      "One Traveler leads each Stop and the others follow. Rotate, so each of them gets a Stop of their own.",
      el("div", { class: "card-row" },
        el("strong", {}, lead?.name || "Unnamed"),
        el("span", { class: "faint" }, `${led[leadId] || 0} led so far`)),
      el("div", { class: "faint" },
        cast.filter((c) => !led[c.id]).length
          ? `Still waiting for a Stop of their own: ${cast.filter((c) => !led[c.id]).map((c) => c.name).join(", ")}.`
          : "Everyone has led at least one Stop."),
      el("div", { class: "faint" }, "Generating a Stop hands this on by itself, to whoever has led fewest."),
      row(
        act("Hand it to " + (next?.name || "the next one"), () => {
          write({ leadId: next.id, ledStops: { ...led, [next.id]: (led[next.id] || 0) + 1 } });
          rerender();
        }),
        el("a", { class: "btn", href: `#/sheet/${leadId}` }, "Their sheet"))));
    if (!s.leadId) write({ leadId, ledStops: { ...led, [leadId]: led[leadId] || 1 } });
  }

  // ---------------------------------------------------------------- 1 prepare
  wrap.append(foldedPhase("1 · Before you set out",
    "Start, destination, route and vehicle. Leave the Stops unplanned — you generate each one as you arrive.",
    row(
      el("a", { class: "btn", href: "#/journey" }, "The Journey"),
      el("a", { class: "btn", href: "#/home" }, "Travelers"),
      act("Destination (book D6)", async () => {
        const d = DESTINATIONS[d6() - 1];
        logEvent("Destination", d); rerender();
        await modal({ title: "Destination", body: el("p", {}, d), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
      }),
      act("Personal Threat", async () => {
        const cast = listCharacters();
        const target = cast.length > 1 ? await pickTraveler("Whose personal Threat?", cast) : cast[0] || null;
        if (cast.length > 1 && !target) return;
        const t = SOLO_PERSONAL_THREATS[d6() - 1];
        setPersonalThreat(target?.id || "party", t);
        logEvent("Personal Threat", target ? `${target.name}: ${t}` : t);
        rerender();
        const chose = await modal({
          title: `Personal Threat${target ? ` — ${target.name || "Unnamed"}` : ""}`,
          body: el("div", {}, el("p", {}, t),
            el("p", { class: "faint" }, "Three steps from here: you hear about it, it makes contact, it attacks."),
            target
              ? el("p", { class: "faint" }, "This is the clock — how close it has got. The Threat on their sheet is the description of it, and starts out whatever you wrote at creation.")
              : null),
          actions: [
            target ? { label: "Write it onto their sheet", value: "sheet", class: "btn-primary" } : null,
            { label: "Good", value: true }
          ].filter(Boolean)
        });
        if (chose === "sheet" && target) {
          saveCharacter({ ...target, threat: t });
          showToast(`${target.name || "Their"} Threat updated.`);
          rerender();
        }
      }),
      act("Goal and Threat for your archetype", async () => {
        const chars = listCharacters();
        const body = el("div", {});
        // The book prints a ready-made Goal and Threat per archetype (p.207-208). These
        // fill the same two fields creation asked for, so they are offered, not just shown.
        for (const c of chars) {
          const hook = SOLO_ARCHETYPE_HOOKS[c.archetype];
          if (!hook) continue;
          body.append(el("div", { style: "padding:8px 0;border-top:1px solid var(--line-soft)" },
            el("h3", { style: "margin-top:0" }, c.name || "Unnamed"),
            el("p", {}, `Goal: ${hook.goal}`),
            el("p", { class: "faint" }, `Threat: ${hook.threat}`),
            el("div", { class: "btn-row" },
              el("button", {
                class: "btn", onclick: (e) => {
                  saveCharacter({ ...c, goal: hook.goal, threat: hook.threat });
                  e.target.replaceWith(el("span", { class: "faint" }, "Written to their sheet."));
                  showToast(`${c.name || "Their"} Goal and Threat set.`);
                }
              }, "Use both"),
              el("button", {
                class: "btn", onclick: (e) => {
                  saveCharacter({ ...c, goal: hook.goal });
                  e.target.replaceWith(el("span", { class: "faint" }, "Goal written."));
                }
              }, "Goal only"))));
        }
        if (!chars.some((c) => SOLO_ARCHETYPE_HOOKS[c.archetype])) {
          body.append(el("p", { class: "faint" }, "No Traveler with a suggested hook yet — create one first, or roll your own Goal words on the Journey screen."));
        }
        await modal({ title: "The book's suggestions", body, actions: [{ label: "Done", value: true, class: "btn-primary" }] });
        rerender();
      }),
      act("Vehicle", async () => {
        const v = NINETIES_VEHICLES[d6() - 1];
        logEvent("Vehicle", v); rerender();
        await modal({ title: "Vehicle", body: el("p", {}, v), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
      })),
    personalThreatSummary(),
    el("details", { class: "explain" }, el("summary", {}, "The prep checklist"),
      el("ol", {}, ...SOLO_PREP_STEPS.map((x) => el("li", { class: "faint" }, x))))));

  // ------------------------------------------------------------- 2 on the road
  // Between Stops, not during one: folded like prep, so the Stop you are in stays on top.
  wrap.append(foldedPhase("2 · On the road",
    "Between Stops. Encounters can be driven past — they are mood, not obligation.",
    row(
      act("Minor encounter", () => encounter(rerender)),
      act("Arrive at what time?", async () => {
        const { card, deck } = drawFrom(state().deck);
        if (!card) { showToast("The deck is spent — reshuffle."); return; }
        const shift = START_SHIFT_BY_SUIT[card.suit];
        write({ deck });
        logEvent("Arrival", `${shift}`, card); rerender();
        await modal({ title: `Arrive in the ${shift}`, body: el("p", {}, `${card.rank}${SUIT_GLYPH[card.suit]} — you reach the Stop in the ${shift.toLowerCase()}.`), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
      }))));

  // ---------------------------------------------------------------- 3 the Stop
  wrap.append(phase("3 · Arriving at a Stop",
    "Roll the setting, the Blocker and the conflict, then the Threat behind it.",
    row(
      act("Generate a Stop", () => {
        const stop = makeStop();
        saveStop(stop, { makeActive: true });
        const lead = passTheSpotlight();
        logEvent("New Stop", `${stop.setting.terrain} · ${stop.blocker}`);
        rerender();
        if (lead) showToast(`${lead.name || "They"} lead this one.`);
      }, true),
      act("Generate a Threat", () => {
        const current = activeStop();
        if (!current) { showToast("Generate a Stop first."); return; }
        const threat = generateThreat();
        attachThreat(current.id, threat);
        logEvent("New Threat", threat.sub ? `${threat.type} — ${threat.sub}` : threat.type);
        rerender();
      }),
      act("Another location", async () => {
        const place = d66Pick(LOCATIONS);
        logEvent("Location", place); rerender();
        await modal({ title: "Location", body: el("p", {}, place), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
      }))));

  const current = activeStop();
  if (current) {
    wrap.append(sharedStopCard(current, {
      onCountdown: (stop) => fireCountdown(stop, rerender),
      onResolve: (stop) => { resolveStop(stop.id); logEvent("Stop resolved", stop.name || stop.blocker); rerender(); }
    }));
  }

  // ------------------------------------------------------------------- 4 play
  wrap.append(phase("4 · Playing the Stop",
    `Draw when you need input. Face cards fire events by suit. ${s.deck.length} cards left — do not reshuffle until it is spent.`,
    row(
      act("Draw a card", () => draw(rerender)),
      act("Tilt", () => tilt(rerender)),
      act("Generate an NPC", () => npc(rerender)),
      act("Conversation", async () => {
        const subject = CONVERSATION_SUBJECTS[d6() - 1];
        const { card, deck } = drawFrom(state().deck);
        if (!card) { showToast("The deck is spent — reshuffle."); return; }
        const read = readTilt(card);
        write({ deck });
        logEvent("Conversation", `${subject} — ${read.label}`, card); rerender();
        const go = await modal({
          title: "Conversation",
          body: el("div", {}, el("p", {}, `Subject: ${subject}`),
            el("p", { class: "faint" }, `How it goes: ${read.label}`),
            listCharacters().length > 1
              ? el("p", { class: "faint" }, read.good
                  ? "A good one between Travelers lowers the Tension between them."
                  : "A bad one between Travelers raises the Tension between them.")
              : null),
          actions: [
            listCharacters().length > 1 ? { label: "Adjust Tension", value: "tension" } : null,
            { label: "Good", value: true, class: "btn-primary" }
          ].filter(Boolean)
        });
        if (go === "tension") location.hash = "#/tension";
      }),
      act("Traveler event", async () => {
        const ev = TRAVELER_EVENTS[d6() - 1];
        logEvent("Traveler event", ev.event); rerender();
        await modal({ title: "Traveler event", body: el("p", {}, ev.event), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
      })),
    // When a Stop turns violent, the tracker is where it goes.
    row(
      el("a", { class: "btn", href: "#/combat" }, "It turns to a fight"),
      el("a", { class: "btn", href: "#/dice" }, "Roll for it"))));

  // -------------------------------------------------------------- 5 escalate
  wrap.append(phase("5 · Turning the screw",
    "When the players stall, or a face card tells you to, move a Countdown forward.",
    row(
      act("Stop Countdown", async () => {
        const fired = await nextStopCountdown();
        logEvent("Stop Countdown", fired.text);
        rerender();
        await modal({ title: fired.title, body: el("p", {}, fired.text), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
      }, true),
      act(nextThreatLabel(), async () => {
        const armed = armedThreats();
        if (!armed.length) {
          showToast("No personal Threat is running. Roll one in Before you set out.");
          return;
        }
        // More than one armed and the app must not choose for you — it is someone's turn
        // to be caught up with.
        let whose = armed[0][0];
        if (armed.length > 1) {
          const cast = listCharacters().filter((c) => armed.some(([id]) => id === c.id));
          const chosen = await pickTraveler("Whose Threat closes in?", cast);
          if (!chosen) return;
          whose = chosen.id;
        }
        const step = advancePersonalThreat(whose);
        if (!step) { showToast("That Threat has played out — it has caught up with them."); return; }
        logEvent("Personal Threat Countdown", `${step.name} — step ${step.index}: ${step.event}`);
        rerender();
        await modal({
          title: `${step.name} — Threat step ${step.index} of ${step.of}`,
          body: el("div", {}, el("p", {}, step.event),
            step.text ? el("p", { class: "faint" }, step.text) : null),
          actions: [{ label: "Good", value: true, class: "btn-primary" }]
        });
      }))));

  // ------------------------------------------------------------ 6 the session
  wrap.append(foldedPhase("6 · Ending the Stop",
    "Time passes on the Time screen — Shifts, Days and the session debrief run the same as at a table.",
    row(
      el("a", { class: "btn", href: "#/time" }, "Time"),
      act(`Reshuffle (${s.deck.length} left)`, () => { write({ deck: freshDeck() }); showToast("Deck reshuffled."); rerender(); }))));

  // ------------------------------------------------------------------- record
  if ((s.events || []).length) {
    // A record, not a control: it belongs below the phases and out of the way.
    const log = el("details", { class: "card phase-fold" },
      el("summary", {}, `What has happened (${s.events.length})`),
      el("div", { class: "btn-row", style: "margin-bottom:8px" },
        el("button", { class: "btn", onclick: () => { write({ events: [] }); rerender(); } }, "Clear")));
    for (const e of s.events.slice(0, 14)) {
      log.append(el("div", { style: "padding:8px 0;border-top:1px solid var(--line-soft)" },
        el("div", { class: "card-row" },
          el("strong", {}, e.kind),
          e.card ? el("span", { class: "mono faint" }, `${e.card.rank}${SUIT_GLYPH[e.card.suit]}`) : null),
        el("div", { class: "faint" }, e.text)));
    }
    wrap.append(log);
  }

  wrap.append(el("details", { class: "explain" }, el("summary", {}, "How to play this way"),
    el("ul", { class: "list" }, ...SOLO_PRINCIPLES.map((x) => el("li", {}, el("div", { style: "padding:6px 4px" }, x)))),
    el("p", { class: "faint" }, "Map a Stop as a mind map rather than a floor plan: circle where you are, draw lines to places as you find them, and dot the lines to somewhere you have only heard about. Three or four places visible from the Blocker is enough to open."),
    INTERNAL_THREATS_ALLOWED
      ? el("p", { class: "faint" }, "Playing alone also opens up Threats the group rules avoid — addiction, grief, the demons that are already inside. Nobody loses agency to them but you.")
      : null));
  wrap.append(el("details", { class: "explain" }, el("summary", {}, "When you are stuck"),
    el("ul", { class: "list" }, ...SOLO_UNSTICK.map((x) => el("li", {}, el("div", { style: "padding:6px 4px" }, x))))));

  // The deck is the whole loop, and drawing from it sat six cards of prep down the page.
  // It is pinned now, with what is left of the deck beside it — that count is the pacing.
  wrap.append(...actionBar({
    lead: el("span", { class: "pool" }, String(s.deck.length), el("small", {}, "cards left")),
    children: [
      el("button", { class: "btn btn-primary", onclick: () => draw(rerender) }, "Draw a card"),
      el("button", { class: "btn", onclick: () => tilt(rerender) }, "Tilt")
    ]
  }));
  return wrap;
}

async function fireCountdown(stop, rerender) {
  const fired = advanceCountdown(stop.id);
  if (!fired) { showToast("That Countdown is spent — the Stop has played out."); return; }
  logEvent("Stop Countdown", `Step ${fired.index} of ${fired.of}: ${fired.step}`);
  rerender();
  await modal({
    title: `Countdown ${fired.index} of ${fired.of}`,
    body: el("p", {}, fired.step),
    actions: [{ label: "Good", value: true, class: "btn-primary" }]
  });
}

async function encounter(rerender) {
  const { card, deck } = drawFrom(state().deck);
  if (!card) { showToast("The deck is spent — reshuffle."); return; }
  const text = MINOR_ENCOUNTERS[card.rank];
  write({ deck });
  logEvent("Minor encounter", text, card);
  rerender();
  await modal({
    title: `${card.rank}${SUIT_GLYPH[card.suit]} — encounter`,
    body: el("div", {}, el("p", {}, text), el("p", { class: "faint" }, "Unlike a Stop, you can drive past this one.")),
    actions: [{ label: "Good", value: true, class: "btn-primary" }]
  });
}

async function draw(rerender) {
  const s = state();
  const { card, deck, exhausted } = drawFrom(s.deck);
  if (!card) { showToast("The deck is spent — reshuffle."); return; }

  const event = eventFor(card);
  const tiltRead = readTilt(card);
  let note = event ? event.label : tiltRead.label;
  let extra = null;

  if (event?.id === "conversation") extra = `Subject: ${CONVERSATION_SUBJECTS[d6() - 1]}`;
  if (event?.id === "travelerEvent") extra = TRAVELER_EVENTS[d6() - 1].event;
  // Both routes into a Countdown share one counter, so a card and a button cannot desync it.
  if (event?.id === "stopCountdown") extra = (await nextStopCountdown()).text;
  if (event?.id === "personalThreat") {
    const step = advancePersonalThreat();
    extra = step ? `Step ${step.index} of ${step.of}: ${step.event}` : "It has already caught up with you — that Threat has played out.";
  }

  write({ deck, history: [{ suit: card.suit, rank: card.rank, note }, ...s.history].slice(0, 40) });
  if (event) logEvent(event.label, extra || note, card);

  await modal({
    title: `${card.rank}${SUIT_GLYPH[card.suit]}`,
    body: el("div", {},
      el("p", {}, note),
      extra ? el("p", { class: "faint" }, extra) : null,
      !event ? el("p", { class: "faint" }, "No event — read it as a Tilt if you need one.") : null,
      exhausted ? el("p", { class: "faint" }, "That was the last card. Reshuffle before the next draw.") : null),
    actions: [{ label: "Good", value: true, class: "btn-primary" }]
  });
  rerender();
}

async function tilt(rerender) {
  const s = state();
  const { card, deck } = drawFrom(s.deck);
  if (!card) { showToast("The deck is spent — reshuffle."); return; }
  const read = readTilt(card);
  write({ deck, history: [{ suit: card.suit, rank: card.rank, note: `Tilt: ${read.label}` }, ...s.history].slice(0, 40) });
  logEvent("Tilt", read.label, card);
  await modal({
    title: `Tilt — ${card.rank}${SUIT_GLYPH[card.suit]}`,
    body: el("p", {}, read.label),
    actions: [{ label: "Good", value: true, class: "btn-primary" }]
  });
  rerender();
}

async function npc(rerender) {
  let s = state();
  const cards = [];
  let deck = s.deck;
  for (let i = 0; i < 5; i++) {
    const drawn = drawFrom(deck);
    if (!drawn.card) { showToast("Not enough cards left — reshuffle."); return; }
    cards.push(drawn.card);
    deck = drawn.deck;
  }
  const person = generateNPC(cards);
  write({ deck, history: [{ suit: cards[0].suit, rank: cards[0].rank, note: `NPC: ${person.personality}, ${person.emotion}` }, ...s.history].slice(0, 40) });
  logEvent("NPC", `${person.personality}, ${person.emotion.toLowerCase()} · wants ${person.motive.toLowerCase()} · by ${person.method.toLowerCase()} · ${person.quirk} · ${person.predisposition.label}`, cards[0]);

  await modal({
    title: "An NPC",
    body: el("div", {},
      el("p", {}, el("strong", {}, `${person.personality}, currently ${person.emotion.toLowerCase()}`)),
      el("p", { class: "faint" }, `Wants: ${person.motive.toLowerCase()} · Method: ${person.method.toLowerCase()}`),
      el("p", { class: "faint" }, `Quirk: ${person.quirk.toLowerCase()}`),
      el("p", { class: "faint" }, `Toward the Travelers: ${person.predisposition.label}`)),
    actions: [{ label: "Good", value: true, class: "btn-primary" }]
  });
  rerender();
}
