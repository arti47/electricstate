// Solo play (Phase 6). The deck is the pacing timer: no reshuffle until it runs out.
import { el, d6, d66, uid, shuffle, fromRangeTable, randomInt, fromD100, onReset, d66Pick } from "./core.js";
import { SUITS, RANKS, FACE_RANKS, EVENT_TRIGGERS, TILT, NPC_PERSONALITY, NPC_EMOTION, NPC_MOTIVE,
         NPC_METHOD, MINOR_ENCOUNTERS, CONVERSATION_SUBJECTS, TRAVELER_EVENTS, THREAT_TYPES,
         THREAT_SUBTYPES, STOP_THREAT_COUNTDOWN, PERSONAL_THREAT_COUNTDOWN, START_SHIFT_BY_SUIT,
         DESTINATIONS, SOLO_PERSONAL_THREATS, NINETIES_VEHICLES, SOLO_UNSTICK, SOLO_PREP_STEPS,
         SOLO_ARCHETYPE_HOOKS, SOLO_PRINCIPLES, INTERNAL_THREATS_ALLOWED, STOP_COUNTDOWN_UNASSIGNED } from "../data-solo.js";
import { LOCATIONS, NPC_QUIRKS } from "../data-gm.js";
import { FIRST_NAMES, SURNAMES } from "../data-names.js";
import { getJourney, saveJourney, listCharacters, saveCharacter } from "./store.js";
import { makeStop, saveStop, activeStop, advanceCountdown, attachThreat, resolveStop, stopCard as sharedStopCard } from "./stops.js";
import { showToast, modal, explain, actionBar, dismissModal } from "./ui.js";
import { currentStep } from "./play.js";
import { subj, poss, Poss, rollGender, splitPairedName, genderLabel } from "./pronouns.js";
import { playingCard, deckStack } from "./graphics.js";
import { sound } from "./sound.js";

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

/**
 * A Tilt in words a newcomer can act on, and as a meter: four steps of bad on the left,
 * four of good on the right, the card's step lit. "Medium — bad for the Travelers" is a
 * rule; "it goes against you, clearly" is an answer.
 */
const DEGREE_WORDS = { Low: "a little", Medium: "clearly", High: "a lot", Extreme: "completely" };
const DEGREE_STEP = { Low: 1, Medium: 2, High: 3, Extreme: 4 };
function tiltMeaning(read) {
  const step = DEGREE_STEP[read.degree] || 1;
  const meter = el("div", { class: "tilt-meter", role: "img", "aria-label": read.label },
    ...[-4, -3, -2, -1, 1, 2, 3, 4].map((n) => el("i", {
      class: [n < 0 ? "is-bad" : "is-good", (read.good ? n === step : n === -step) && "is-on"].filter(Boolean).join(" ")
    })));
  return el("div", {}, meter,
    el("p", {}, tiltSentence(read)));
}

export const eventFor = (card) => (isFace(card) ? EVENT_TRIGGERS[card.suit] : null);


/** The printed Stop Countdown table stops at 56; 61-66 re-roll (house aid). */
/** The table leaves 61–66 unassigned; the book's house rule is to re-roll them. */
export function rollStopCountdown() {
  const { from, to } = STOP_COUNTDOWN_UNASSIGNED;
  let roll;
  do { roll = d66(); } while (roll >= from && roll <= to);
  const hit = fromRangeTable(STOP_THREAT_COUNTDOWN, roll);
  return hit ? { roll, ...hit } : { roll: null, event: STOP_THREAT_COUNTDOWN[0].event };
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
  // A generated NPC is a person the table will talk about for the next ten minutes, so
  // give one a name and a gender rather than leaving a description with no handle on it.
  const gender = rollGender(randomInt);
  return {
    gender,
    name: `${splitPairedName(fromD100(FIRST_NAMES), gender)} ${fromD100(SURNAMES)}`,
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
      class: "row", onclick: () => { picked = c; dismissModal(false); }
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

let soloPhase = null;   // the phase the player opened; null follows the game
let lastAuto = null;
onReset(() => { soloPhase = null; lastAuto = null; });

function build(rerender) {
  const s = state();
  const wrap = el("div", {}, el("h1", {}, "Solo tools"));
  wrap.append(explain("The solo toolbox: the deck, Tilts, NPCs, the Stop and Threat generators and the Countdown, to use by hand. Play uses these same tools for you and tells you what to do next — come here when you want to do one step yourself. Do not reshuffle until the deck is spent; running it down is the pacing."));

  // A toolbox, not a second way to run the session. When the game is waiting on something
  // only Play walks you through — setting up, ending a Stop, ending the Journey — the way
  // back to it is the lit button; otherwise it is a quiet link.
  const setup = currentStep();
  const steering = ["setup", "close", "done"].includes(setup.phase);
  wrap.append(el("div", { class: "card toolbox-intro" },
    el("p", { class: "faint" }, steering
      ? `Play has the next step: ${setup.title}.`
      : "Draw a card when you need an answer; Tilt when you only need to know whether it helps or hurts. Play does both for you if you would rather be walked through."),
    el("a", { class: "btn" + (steering ? " btn-primary" : ""), href: "#/session" }, "Continue in Play")));

  // The deck on the table: how much is left, and the last card turned over with what it
  // said. Running the deck down is the pacing, so it leads the screen.
  const last = (s.history || [])[0];
  wrap.append(el("div", { class: "card deck-panel" },
    deckStack(s.deck.length),
    el("div", { class: "deck-count" }, el("span", { class: "mono" }, String(s.deck.length)), " ", el("small", {}, "cards left")),
    last ? el("div", { class: "deck-last" }, playingCard(last, { flip: false }), el("span", { class: "faint" }, last.note)) : null));


  // Each tool group carries a key, so the tool row can show one group at a time.
  const KEYS = { "Setting out": "1", "On the road": "2", "Stops": "3", "Scenes": "4", "Pressure": "5", "Wrapping up": "6" };
  const num = (title) => KEYS[title] || null;
  const phase = (title, blurb, ...kids) =>
    el("div", { class: "card", "data-phase": num(title) }, el("h3", {}, title), blurb ? el("p", { class: "faint" }, blurb) : null, ...kids);
  // Prep happens once; it should not sit above the controls you use every scene.
  const foldedPhase = (title, blurb, ...kids) =>
    el("details", { class: "card phase-fold", "data-phase": num(title) }, el("summary", {}, title),
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
      "One Traveler leads each Stop and the others follow. Rotate, so every Traveler gets a Stop to lead.",
      el("div", { class: "card-row" },
        el("strong", {}, lead?.name || "Unnamed"),
        el("span", { class: "faint" }, `${led[leadId] || 0} led so far`)),
      el("div", { class: "faint" },
        cast.filter((c) => !led[c.id]).length
          ? `Still waiting for a Stop to lead: ${cast.filter((c) => !led[c.id]).map((c) => c.name).join(", ")}.`
          : "Everyone has led at least one Stop."),
      el("div", { class: "faint" }, "Generating a Stop hands this on by itself, to whoever has led fewest."),
      row(
        act("Hand it to " + (next?.name || "the next one"), () => {
          write({ leadId: next.id, ledStops: { ...led, [next.id]: (led[next.id] || 0) + 1 } });
          rerender();
        }),
        el("a", { class: "btn", href: `#/sheet/${leadId}` }, `${Poss(lead)} sheet`))));
    if (!s.leadId) write({ leadId, ledStops: { ...led, [leadId]: led[leadId] || 1 } });
  }

  // ---------------------------------------------------------------- 1 prepare
  wrap.append(foldedPhase("Setting out",
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
              ? el("p", { class: "faint" }, `This is the clock — how close it has got. The Threat on ${poss(target)} sheet is the description of it, and starts out whatever you wrote at creation.`)
              : null),
          actions: [
            target ? { label: `Write it onto ${poss(target)} sheet`, value: "sheet", class: "btn-primary" } : null,
            { label: "Good", value: true }
          ].filter(Boolean)
        });
        if (chose === "sheet" && target) {
          saveCharacter({ ...target, threat: t });
          showToast(`${target.name || "The"} Threat updated.`);
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
                  e.target.replaceWith(el("span", { class: "faint" }, `Written to ${poss(c)} sheet.`));
                  showToast(`Goal and Threat set for ${c.name || "the Traveler"}.`);
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
  wrap.append(foldedPhase("On the road",
    "Between Stops. An encounter can be driven past — it is mood, not obligation.",
    row(
      act("Minor encounter", () => encounter(rerender)),
      act("Arrive at what time?", async () => {
        const { card, deck } = drawFrom(state().deck);
        if (!card) { showToast("The deck is spent — reshuffle."); return; }
        const shift = START_SHIFT_BY_SUIT[card.suit];
        write({ deck });
        // The card says when you arrive, so that is the Shift now — the sky, the header
        // clock and the Time screen all follow it, rather than disagreeing with the card.
        saveJourney({ ...(getJourney() || {}), shift });
        logEvent("Arrival", `${shift}`, card); rerender();
        await modal({ title: `Arrive in the ${shift}`, body: el("p", {}, `${card.rank}${SUIT_GLYPH[card.suit]} — you reach the Stop in the ${shift.toLowerCase()}.`), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
      }))));

  // ---------------------------------------------------------------- 3 the Stop
  wrap.append(phase("Stops",
    "Roll the setting, the Blocker and the conflict, then the Threat behind it.",
    row(
      act("Generate a Stop", () => {
        const stop = makeStop();
        saveStop(stop, { makeActive: true });
        const lead = passTheSpotlight();
        logEvent("New Stop", `${stop.setting.terrain} · ${stop.blocker}`);
        rerender();
        if (lead) showToast(`${lead.name || "Unnamed"} leads this one.`);
      }, !activeStop()),
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
  wrap.append(phase("Scenes",
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
          body: el("div", {}, el("div", { class: "card-reveal" }, playingCard(card)), el("p", {}, `Subject: ${subject}`),
            el("p", { class: "faint" }, `How it goes: ${read.label}`),
            listCharacters().length > 1
              ? el("p", { class: "faint" }, read.good
                  ? "A good one between two Travelers lowers the Tension on both sides."
                  : "A bad one between two Travelers raises the Tension on both sides.")
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
  wrap.append(phase("Pressure",
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
        if (!step) { showToast("That Threat has played out — it has already arrived."); return; }
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
  wrap.append(foldedPhase("Wrapping up",
    "Time passes on the Time screen — Shifts, Days and the session debrief run the same as at a table.",
    row(
      el("a", { class: "btn", href: "#/time" }, "Time"),
      act(`Reshuffle (${s.deck.length} left)`, () => { write({ deck: freshDeck() }); showToast("Deck reshuffled."); rerender(); }))));

  // ------------------------------------------------------------ procedure track
  // Six phases, one on screen: the one the game is in, unless the player picked another.
  // A rail of numbers across the top says where you are in the whole loop.
  const phases = [...wrap.querySelectorAll("[data-phase]")];
  const fired = current && current.countdown?.length && (current.countdownProgress || 0) >= current.countdown.length;
  const auto = !(getJourney()?.destination && getJourney()?.vehicle) ? "1"
    : !current || current.resolved ? "3" : fired ? "6" : "4";
  // When the game moves on (a Stop arrives, its Countdown runs out), follow it again.
  if (auto !== lastAuto) { soloPhase = null; lastAuto = auto; }
  const shown = soloPhase && phases.some((p) => p.dataset.phase === soloPhase) ? soloPhase : auto;
  // Tool groups by name, not numbered steps: numbers read as a procedure to follow, and
  // the procedure is Play's job.
  const rail = el("ol", { class: "proc-rail is-tools", "aria-label": "Solo tools" },
    ...phases.map((p) => {
      const n = p.dataset.phase;
      const title = p.querySelector("h3, summary")?.textContent || "";
      return el("li", {}, el("button", {
        class: "proc-step" + (n === shown ? " is-here" : "") + (n === auto ? " is-now" : ""),
        "aria-label": title, "aria-pressed": n === shown ? "true" : "false", disabled: n === shown,
        onclick: () => { soloPhase = n; rerender(); }
      }, el("span", { class: "proc-t" }, title)));
    }));
  phases[0]?.before(rail);
  for (const p of phases) {
    if (p.dataset.phase !== shown) p.remove();
    else if (p.tagName === "DETAILS") p.open = true;
  }

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
    el("p", { class: "faint" }, "Map a Stop as a mind map rather than a floor plan: circle where you are, draw a line to each place as you find it, and dot the line to somewhere you have only heard about. Three or four places visible from the Blocker is enough to open."),
    INTERNAL_THREATS_ALLOWED
      ? el("p", { class: "faint" }, "Playing alone also opens up Threats the group rules avoid — addiction, grief, the demons that are already inside. Nobody loses agency to that but you.")
      : null));
  wrap.append(el("details", { class: "explain" }, el("summary", {}, "When you are stuck"),
    el("ul", { class: "list" }, ...SOLO_UNSTICK.map((x) => el("li", {}, el("div", { style: "padding:6px 4px" }, x))))));

  // The deck is the whole loop, and drawing from it sat six cards of prep down the page.
  // It is pinned now, with what is left of the deck beside it — that count is the pacing.
  wrap.append(...actionBar({
    lead: el("span", { class: "pool" }, String(s.deck.length), " ", el("small", {}, "cards left")),
    children: [
      // Until there is a Journey to play on, the setup card above holds the lit button.
      el("button", { class: "btn" + (steering ? "" : " btn-primary"), onclick: () => draw(rerender) }, "Draw a card"),
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
  sound("card");
  const { card, deck } = drawFrom(state().deck);
  if (!card) { showToast("The deck is spent — reshuffle."); return; }
  const text = MINOR_ENCOUNTERS[card.rank];
  write({ deck });
  logEvent("Minor encounter", text, card);
  rerender();
  await modal({
    title: `${card.rank}${SUIT_GLYPH[card.suit]} — encounter`,
    body: el("div", {}, el("div", { class: "card-reveal" }, playingCard(card)), el("p", {}, text), el("p", { class: "faint" }, "Unlike a Stop, you can drive past this one.")),
    actions: [{ label: "Good", value: true, class: "btn-primary" }]
  });
}

/**
 * One card off the solo deck, resolved and recorded: a face card fires its suit's event,
 * a number card is a Tilt. Shared by the Draw button here and by Play in solo mode, so the
 * deck, its history and the Countdown it can fire are one record whichever screen drew.
 * `autoShuffle` starts a fresh deck when it is spent instead of refusing the draw.
 */
export async function drawForStory({ autoShuffle = false } = {}) {
  let s = state();
  let shuffled = false;
  if (!s.deck.length && autoShuffle) { write({ deck: freshDeck() }); s = state(); shuffled = true; }
  const { card, deck, exhausted } = drawFrom(s.deck);
  if (!card) return null;

  const event = eventFor(card);
  const tiltRead = readTilt(card);
  const note = event ? event.label : tiltRead.label;
  let extra = null;

  if (event?.id === "conversation") extra = `Subject: ${CONVERSATION_SUBJECTS[d6() - 1]}`;
  if (event?.id === "travelerEvent") extra = TRAVELER_EVENTS[d6() - 1].event;
  // Both routes into a Countdown share one counter, so a card and a button cannot desync it.
  if (event?.id === "stopCountdown") extra = (await nextStopCountdown()).text;
  if (event?.id === "personalThreat") {
    const step = advancePersonalThreat();
    extra = step ? `Step ${step.index} of ${step.of}: ${step.event}`
      // Nobody ever set one: saying it "caught up with you" would invent a Threat.
      : !Object.keys(personalThreats()).length
        ? "Nobody has a personal Threat running, so nothing comes for anyone yet. Set one under Before you set out."
        : "It has already caught up with you — that Threat has played out.";
  }

  write({ deck, history: [{ suit: card.suit, rank: card.rank, note }, ...state().history].slice(0, 40) });
  if (event) logEvent(event.label, extra || note, card);
  return { card, event, note, extra, tilt: event ? null : tiltRead, exhausted, shuffled, left: deck.length };
}

/** A Tilt as a sentence, for anything that reports a card in text rather than on screen. */
export function tiltSentence(read, subject = "Whatever you were wondering about") {
  return `${subject} goes ${read.good ? "your way" : "against you"} — ${DEGREE_WORDS[read.degree] || "a little"}.`;
}

async function draw(rerender) {
  sound("card");
  const drawn = await drawForStory();
  if (!drawn) { showToast("The deck is spent — reshuffle."); return; }
  const { card, event, note, extra, tilt: tiltRead, exhausted } = drawn;

  await modal({
    title: `${card.rank}${SUIT_GLYPH[card.suit]}`,
    body: el("div", {},
      el("div", { class: "card-reveal" }, playingCard(card)),
      el("p", {}, note),
      extra ? el("p", { class: "faint" }, extra) : null,
      !event ? el("p", { class: "faint" }, "No event — read it as a Tilt if you need one.") : null,
      !event ? tiltMeaning(tiltRead) : null,
      exhausted ? el("p", { class: "faint" }, "That was the last card. Reshuffle before the next draw.") : null),
    actions: [{ label: "Good", value: true, class: "btn-primary" }]
  });
  rerender();
}

async function tilt(rerender) {
  sound("card");
  const s = state();
  const { card, deck } = drawFrom(s.deck);
  if (!card) { showToast("The deck is spent — reshuffle."); return; }
  const read = readTilt(card);
  write({ deck, history: [{ suit: card.suit, rank: card.rank, note: `Tilt: ${read.label}` }, ...s.history].slice(0, 40) });
  logEvent("Tilt", read.label, card);
  await modal({
    title: `Tilt — ${card.rank}${SUIT_GLYPH[card.suit]}`,
    body: el("div", {}, el("div", { class: "card-reveal" }, playingCard(card)), el("p", {}, read.label), tiltMeaning(read)),
    actions: [{ label: "Good", value: true, class: "btn-primary" }]
  });
  rerender();
}

async function npc(rerender) {
  sound("card");
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
  write({ deck, history: [{ suit: cards[0].suit, rank: cards[0].rank, note: `NPC: ${person.name}` }, ...s.history].slice(0, 40) });
  logEvent("NPC", `${person.name} — ${person.personality}, ${person.emotion.toLowerCase()} · wants ${person.motive.toLowerCase()} · by ${person.method.toLowerCase()} · ${person.quirk} · ${person.predisposition.label}`, cards[0]);

  await modal({
    title: person.name,
    body: el("div", {},
      el("div", { class: "card-reveal card-fan" }, ...cards.map((c) => playingCard(c, { flip: false }))),
      el("p", { class: "faint" }, genderLabel(person)),
      el("p", {}, el("strong", {}, `${person.personality}, currently ${person.emotion.toLowerCase()}`)),
      el("p", { class: "faint" }, `Wants: ${person.motive.toLowerCase()} · Method: ${person.method.toLowerCase()}`),
      el("p", { class: "faint" }, `Quirk: ${person.quirk.toLowerCase()} — ${subj(person)} shows it before ${subj(person)} says anything.`),
      el("p", { class: "faint" }, `Toward the Travelers: ${person.predisposition.label}`)),
    actions: [{ label: "Good", value: true, class: "btn-primary" }]
  });
  rerender();
}
