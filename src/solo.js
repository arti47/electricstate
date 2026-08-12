// Solo play (Phase 6). The deck is the pacing timer: no reshuffle until it runs out.
import { el, d6, d66, uid, fromRangeTable } from "./core.js";
import { SUITS, RANKS, FACE_RANKS, EVENT_TRIGGERS, TILT, NPC_PERSONALITY, NPC_EMOTION,
         NPC_MOTIVE, NPC_METHOD, MINOR_ENCOUNTERS, CONVERSATION_SUBJECTS, TRAVELER_EVENTS,
         THREAT_TYPES, THREAT_SUBTYPES, STOP_THREAT_COUNTDOWN, STOP_COUNTDOWN_UNASSIGNED,
         PERSONAL_THREAT_COUNTDOWN, START_SHIFT_BY_SUIT, DESTINATIONS, SOLO_PERSONAL_THREATS,
         NINETIES_VEHICLES, SOLO_UNSTICK } from "../data-solo.js";
import { SETTING, BLOCKERS, NEEDS, CONFLICT_PARTIES, CONFLICT_SUBJECTS, LOCATIONS,
         ELECTRIC_STATE_ELEMENTS, NINETIES_NOSTALGIA, NPC_QUIRKS, D66_ORDER } from "../data-gm.js";
import { getJourney, saveJourney, listCharacters } from "./store.js";
import { showToast, modal } from "./ui.js";

const SUIT_GLYPH = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };

// ---------------------------------------------------------------------- deck
export function freshDeck() {
  const cards = [];
  for (const suit of SUITS) for (const rank of RANKS) cards.push({ suit, rank });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
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

export function generateStop() {
  return {
    terrain: d6Pick(SETTING.terrain),
    population: d6Pick(SETTING.population),
    communications: d6Pick(SETTING.communications),
    size: d6Pick(SETTING.size),
    prosperity: d6Pick(SETTING.prosperity),
    weather: d6Pick(SETTING.weather),
    blocker: d66Pick(BLOCKERS),
    need: d6Pick(NEEDS),
    conflict: { a: d66Pick(CONFLICT_PARTIES), b: d66Pick(CONFLICT_PARTIES), over: d66Pick(CONFLICT_SUBJECTS) },
    locations: [d66Pick(LOCATIONS), d66Pick(LOCATIONS), d66Pick(LOCATIONS)],
    mood: [d66Pick(ELECTRIC_STATE_ELEMENTS), d66Pick(NINETIES_NOSTALGIA)]
  };
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
  return j.solo || { deck: freshDeck(), history: [], stop: null, threat: null };
};
const write = (patch) => {
  const j = getJourney() || {};
  saveJourney({ ...j, solo: { ...state(), ...patch } });
};

function build(rerender) {
  const s = state();
  const wrap = el("div", {}, el("h1", {}, "Solo"));

  wrap.append(el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("strong", {}, `${s.deck.length} cards left`),
      el("button", { class: "btn", onclick: () => { write({ deck: freshDeck() }); showToast("Deck reshuffled."); rerender(); } }, "Reshuffle")),
    el("p", { class: "faint" }, "Draw when you need input or momentum. Face cards fire events — the deck running down is the pacing.")));

  wrap.append(el("div", { class: "btn-row" },
    el("button", { class: "btn btn-primary", onclick: () => draw(rerender) }, "Draw a card"),
    el("button", { class: "btn", onclick: () => tilt(rerender) }, "Tilt"),
    el("button", { class: "btn", onclick: () => npc(rerender) }, "Generate an NPC")));

  wrap.append(el("div", { class: "btn-row", style: "margin-top:8px" },
    el("button", { class: "btn", onclick: () => { write({ stop: generateStop() }); rerender(); } }, "Generate a Stop"),
    el("button", { class: "btn", onclick: () => { write({ threat: generateThreat() }); rerender(); } }, "Generate a Threat"),
    el("button", {
      class: "btn", onclick: async () => {
        const r = rollStopCountdown();
        await modal({ title: "Stop Countdown", body: el("p", {}, r.event), actions: [{ label: "Good", value: true, class: "btn-primary" }] });
      }
    }, "Countdown event")));

  if (s.stop) wrap.append(stopCard(s.stop));
  if (s.threat) wrap.append(el("div", { class: "card" }, el("h3", {}, "Threat"),
    el("p", {}, s.threat.sub ? `${s.threat.type} — ${s.threat.sub}` : s.threat.type),
    s.threat.note ? el("p", { class: "faint" }, s.threat.note) : null));

  if (s.history.length) {
    const log = el("div", { class: "card" }, el("h3", {}, "Draws"));
    for (const h of s.history.slice(0, 12)) {
      log.append(el("div", { class: "card-row", style: "padding:4px 0" },
        el("span", { class: "mono" }, `${h.rank}${SUIT_GLYPH[h.suit]}`),
        el("span", { class: "faint" }, h.note)));
    }
    wrap.append(log);
  }

  wrap.append(el("div", { class: "card" }, el("h3", {}, "When you are stuck"),
    el("ul", { class: "list" }, ...SOLO_UNSTICK.map((x) => el("li", {}, el("div", { style: "padding:6px 4px" }, x))))));
  return wrap;
}

function stopCard(stop) {
  const row = (k, v) => el("div", { class: "card-row", style: "padding:3px 0" },
    el("span", { class: "faint" }, k), el("span", { style: "text-align:right" }, v));
  return el("div", { class: "card" }, el("h3", {}, "The Stop"),
    row("Terrain", stop.terrain), row("Population", stop.population),
    row("Communications", stop.communications), row("Size", stop.size),
    row("Prosperity", stop.prosperity), row("Weather", stop.weather),
    el("h3", {}, "Blocker"), el("p", {}, stop.blocker),
    el("p", { class: "faint" }, `They also need: ${stop.need.toLowerCase()}`),
    el("h3", {}, "Conflict"),
    el("p", {}, `${stop.conflict.a} against ${stop.conflict.b}, over ${stop.conflict.over.toLowerCase()}`),
    el("h3", {}, "Locations"), el("p", {}, stop.locations.join(" · ")),
    el("h3", {}, "In the air"), el("p", { class: "faint" }, stop.mood.join(" · ")));
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
  if (event?.id === "stopCountdown") extra = rollStopCountdown().event;
  if (event?.id === "personalThreat") {
    const step = PERSONAL_THREAT_COUNTDOWN[Math.min(2, (s.history.filter((h) => h.note.includes("Personal Threat")).length))];
    extra = step.event;
  }

  write({ deck, history: [{ suit: card.suit, rank: card.rank, note }, ...s.history].slice(0, 40) });

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
