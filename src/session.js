// Play mode: the app runs the session, one beat at a time.
//
// Everything else in this app is a reference you have to know how to use. #/play tells you
// the procedure; this performs it. One screen, one thing happening, two or three big
// buttons — press one and the next thing happens. No rule has to be known in advance and
// nothing has to be read first.
//
// It is not a separate game. Every beat writes to the same Journey, the same Stop record
// and the same roll log the manual screens use, so you can drop out of it at any point and
// carry on by hand, or come back and it picks up where the game actually is.
import { el, d6, pick, randomInt } from "./core.js";
import { SETTING, BLOCKERS, LOCATIONS, NEEDS, CONFLICT_PARTIES, CONFLICT_SUBJECTS,
         NPC_QUIRKS, NPC_REACTIONS, D66_ORDER } from "../data-gm.js";
import { MINOR_ENCOUNTERS, TRAVELER_EVENTS, CONVERSATION_SUBJECTS, NPC_PERSONALITY,
         NPC_EMOTION, NPC_MOTIVE, NPC_METHOD } from "../data-solo.js";
import { ROUTE_FEATURES } from "../data-journey.js";
import { FIRST_NAMES, SURNAMES } from "../data-names.js";
import { SHIFT_NAMES } from "../data.js";
import { listCharacters, getJourney, saveJourney, noteEvent } from "./store.js";
import { makeStop, saveStop, activeStop, setActiveStop, advanceCountdown, resolveStop } from "./stops.js";
import { getCombat } from "./combat.js";
import { rollGender, splitPairedName, subj, obj, poss, Subj } from "./pronouns.js";
import { showToast, explain, modal } from "./ui.js";

const d66Pick = (table) => table[D66_ORDER.indexOf(d6() * 10 + d6())];
const someone = () => {
  const gender = rollGender(randomInt);
  return { gender, name: `${splitPairedName(pick(FIRST_NAMES), gender)} ${pick(SURNAMES)}` };
};

// ------------------------------------------------------------------ the state
const blank = () => ({ beat: "idle", log: [], scenes: 0, stopId: null });
export const director = () => getJourney()?.director || blank();
const write = (patch) => {
  const j = getJourney() || {};
  saveJourney({ ...j, director: { ...director(), ...patch } });
};

/** One line of what happened, newest first. This is the session as the table saw it. */
function say(text, kind = "") {
  const d = director();
  write({ log: [{ id: `${Date.now()}-${d.log.length}`, text, kind }, ...d.log].slice(0, 40) });
  noteEvent("scene", text);
}

export function resetDirector() { write(blank()); }

// -------------------------------------------------------------- the narration
// Concrete sentences built from the book's own tables, so a beat is something that has
// happened rather than a category of thing that could.

function openingLine() {
  const j = getJourney() || {};
  const cast = listCharacters();
  const driver = cast.length ? pick(cast) : null;
  const shift = j.shift || pick(SHIFT_NAMES);
  const weather = pick(SETTING.weather).toLowerCase();
  const where = j.start ? `out past ${j.start}` : "somewhere between two places with no names";
  const dest = j.destination ? ` You are still heading for ${j.destination}.` : "";
  return driver
    ? `${shift}. ${weather.charAt(0).toUpperCase()}${weather.slice(1)}. ${driver.name} is driving, ${where}.${dest}`
    : `${shift}. ${weather}. The road runs ${where}.${dest}`;
}

function roadLine() {
  if (d6() > 3) {
    return { text: `Ahead of you: ${pick(ROUTE_FEATURES)}.`, stop: false };
  }
  const encounter = MINOR_ENCOUNTERS[d6() + 1] || pick(Object.values(MINOR_ENCOUNTERS));
  const who = someone();
  return {
    text: `${encounter.replace(/\.$/, "")}. ${who.name} is there, and has already seen you.`,
    stop: false, who
  };
}

function arrivalLine(stop) {
  const place = pick(LOCATIONS).toLowerCase();
  const need = String(stop.need).toLowerCase();
  return `You reach somewhere with ${place} and not much else. In the way: ${stop.blocker.toLowerCase()} — you are not driving through that today. What this place needs: ${need}.`;
}

function sceneLine(stop) {
  const who = someone();
  const roll = 2 + randomInt(11);
  const reaction = (NPC_REACTIONS.find((r) => roll >= r.roll[0] && roll <= r.roll[1]) || NPC_REACTIONS[2]).reaction.toLowerCase();
  const options = [
    () => `${who.name} finds you first — ${reaction}. ${Subj(who)} wants to talk about one thing: ${pick(CONVERSATION_SUBJECTS).toLowerCase()}.`,
    () => `${who.name}. Personality: ${pick(NPC_PERSONALITY_LIST).toLowerCase()}. Right now: ${pick(NPC_EMOTION_LIST).toLowerCase()}. What ${subj(who)} wants: ${pick(NPC_MOTIVE_LIST).toLowerCase()}. How ${subj(who)} gets it: ${pick(NPC_METHOD_LIST).toLowerCase()}.`,
    () => `${stop.conflict.a} and ${stop.conflict.b} are arguing about ${String(stop.conflict.over).toLowerCase()}, loudly, and both sides look round at you.`,
    () => `Somebody points you toward the ${pick(stop.locations).toLowerCase()}. ${who.name} says to be careful there, and will not say why.`,
    () => `${who.name} — ${d66Pick(NPC_QUIRKS).toLowerCase()} — is the only one here who will answer a question.`
  ];
  return pick(options)();
}

const NPC_PERSONALITY_LIST = Object.values(NPC_PERSONALITY);
const NPC_EMOTION_LIST = Object.values(NPC_EMOTION);
const NPC_MOTIVE_LIST = Object.values(NPC_MOTIVE);
const NPC_METHOD_LIST = Object.values(NPC_METHOD);

function travelerEventLine() {
  const cast = listCharacters();
  if (!cast.length) return null;
  const ch = pick(cast);
  const event = TRAVELER_EVENTS[d6() - 1].event;
  return `This one is about ${ch.name}. ${event}`;
}

// ----------------------------------------------------------------- the script
/**
 * Each beat is what is happening now, what the table should do about it, and two to four
 * buttons. Every button either advances the story or opens the screen that resolves it —
 * none of them requires knowing a rule first.
 */
export function beatFor(state = director()) {
  const stop = activeStop();
  const combat = getCombat();
  const cast = listCharacters();

  if (!cast.length) {
    return { id: "no-one", heading: "Nobody to play yet",
      now: "You need at least one Traveler before anything can happen.",
      you: "Make one — it takes a minute, and every field can be rolled.",
      choices: [{ label: "Make a Traveler", href: "#/create", primary: true }] };
  }

  if (combat?.active) {
    return { id: "fighting", heading: `A fight — round ${combat.round}`,
      now: "Somebody swung first. Nothing else happens until this is over.",
      you: "Work through the tracker: everyone gets a move and an action. Come back here when it ends.",
      choices: [{ label: "Go to the fight", href: "#/combat", primary: true }] };
  }

  switch (state.beat) {
    case "idle":
      return { id: "idle", heading: "Ready when you are",
        now: "The car is packed and the road is out there.",
        you: "Press the button. The app will tell you what is happening and what to do about it, one thing at a time.",
        choices: [{ label: "Start playing", act: "open", primary: true }] };

    case "opening":
      return { id: "opening", heading: "The session opens",
        now: state.now,
        you: "Say it out loud, in character if you like. Then get moving.",
        choices: [{ label: "Drive on", act: "road", primary: true },
                  { label: "Something happens here", act: "scene" }] };

    case "road":
      return { id: "road", heading: "On the road",
        now: state.now,
        you: "You can stop for this or leave it in the mirror. Neither is wrong — an encounter is mood, not an obligation.",
        choices: [{ label: "Stop and deal with it", act: "arrive", primary: true },
                  { label: "Drive past", act: "road" },
                  { label: "Roll for it", href: "#/dice" }] };

    case "arrived":
      return { id: "arrived", heading: "You have arrived", now: state.now,
        you: "Look around and talk to somebody. Do not solve it yet — find out who is here first.",
        choices: [{ label: "Someone approaches", act: "scene", primary: true },
                  { label: "Look around", act: "scene" },
                  { label: "Roll for something", href: "#/dice" }] };

    case "scene":
      return { id: "scene", heading: `Scene ${state.scenes}`, now: state.now,
        you: "Say what you do. If it could go badly, roll — one 6 is a success. If it could not, it just works.",
        choices: [{ label: "Roll for it", href: "#/dice", primary: true },
                  { label: "Next thing that happens", act: "scene" },
                  { label: "Time passes", act: "pressure" },
                  ...(stop ? [{ label: "We have solved it", act: "resolve" }] : [])] };

    case "pressure":
      return { id: "pressure", heading: "It gets worse", now: state.now,
        you: "That is the Countdown. It fires when the scene stalls or time passes, and it does not go backwards.",
        choices: [{ label: "Deal with it", act: "scene", primary: true },
                  { label: "Roll for it", href: "#/dice" },
                  { label: "More time passes", act: "pressure" }] };

    case "crisis":
      return { id: "crisis", heading: "This is the crisis", now: state.now,
        you: "Everything this place had is on the table. Settle it, or cut your losses and drive.",
        choices: [{ label: "It comes to a fight", href: "#/combat", primary: true },
                  { label: "Talk it down", href: "#/dice" },
                  { label: "We solved it", act: "resolve" },
                  { label: "We drive out and leave it", act: "leave" }] };

    case "wrap":
      return { id: "wrap", heading: "That is the Stop", now: state.now,
        you: "Good place to stop for the night. The debrief is where Travelers improve, and it wants the memory fresh.",
        choices: [{ label: "End the session", href: "#/time", primary: true },
                  { label: "Keep driving", act: "road" }] };

    default:
      return beatFor({ ...state, beat: "idle" });
  }
}

// --------------------------------------------------------------- the machinery
export function advance(act) {
  const state = director();
  const stop = activeStop();

  if (act === "open") {
    const now = openingLine();
    say(now, "open");
    write({ beat: "opening", now, scenes: 0 });
    return;
  }

  if (act === "road") {
    const line = roadLine();
    say(line.text, "road");
    write({ beat: "road", now: line.text });
    return;
  }

  if (act === "arrive") {
    const fresh = saveStop(makeStop(""), { makeActive: true });
    setActiveStop(fresh.id);
    const now = arrivalLine(fresh);
    say(now, "arrive");
    write({ beat: "arrived", now, stopId: fresh.id, scenes: 0 });
    return;
  }

  if (act === "scene") {
    const scenes = (state.scenes || 0) + 1;
    // Every third scene turns on the Travelers themselves, which is what keeps a session
    // about these people rather than about the obstacle.
    const now = (scenes % 3 === 0 && travelerEventLine())
      || (stop ? sceneLine(stop) : openingLine());
    say(now, "scene");
    write({ beat: "scene", now, scenes });
    return;
  }

  if (act === "pressure") {
    if (!stop) { advance("scene"); return; }
    const fired = advanceCountdown(stop.id);
    if (!fired) {
      const now = "It has all happened. Whatever this place was going to do to you, it has done.";
      say(now, "crisis");
      write({ beat: "crisis", now });
      return;
    }
    const now = `${fired.step} (${fired.index} of ${fired.of})`;
    say(now, "pressure");
    write({ beat: fired.index >= fired.of ? "crisis" : "pressure", now });
    return;
  }

  if (act === "resolve") {
    if (stop) resolveStop(stop.id);
    const now = "It is dealt with. Not tidily, probably, but the road ahead is open again.";
    say(now, "wrap");
    write({ beat: "wrap", now });
    return;
  }

  if (act === "leave") {
    const now = "You get back in the car and leave it unresolved. It will still be true tomorrow.";
    say(now, "wrap");
    write({ beat: "wrap", now });
  }
}

// ==================================================================== screen
export function sessionScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

function build(rerender) {
  const state = director();
  const beat = beatFor(state);
  const wrap = el("div", {}, el("h1", {}, "Play"));
  wrap.append(explain("The app runs the session. Each screen is one thing happening and two or three things you can do about it. Press one and the next thing happens. Everything it does is written into the same Journey the other screens use, so you can take over by hand whenever you want."));

  wrap.append(el("div", { class: "beat" },
    el("div", { class: "beat-heading" }, beat.heading),
    el("p", { class: "beat-now" }, beat.now || "—"),
    el("p", { class: "faint" }, beat.you)));

  const actions = el("div", { class: "btn-grid" });
  for (const c of beat.choices) {
    actions.append(c.href
      ? el("a", { class: "btn" + (c.primary ? " btn-primary" : ""), href: c.href }, c.label)
      : el("button", {
          class: "btn" + (c.primary ? " btn-primary" : ""),
          onclick: () => { advance(c.act); rerender(); }
        }, c.label));
  }
  wrap.append(actions);

  if (state.log.length) {
    const log = el("details", { class: "card phase-fold" },
      el("summary", {}, `The session so far (${state.log.length})`));
    for (const entry of state.log.slice(0, 15)) {
      log.append(el("div", { class: "faint", style: "padding:6px 0;border-top:1px solid var(--line-soft)" }, entry.text));
    }
    log.append(el("button", {
      class: "btn", style: "margin-top:8px",
      onclick: async () => {
        const ok = await modal({
          title: "Start a fresh session?",
          body: el("p", { class: "faint" }, "Clears what this screen remembers. Your Travelers, the Journey and the Stop all stay exactly as before."),
          actions: [{ label: "Start fresh", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
        });
        if (ok) { resetDirector(); showToast("Ready when you are."); rerender(); }
      }
    }, "Start a fresh session"));
    wrap.append(log);
  }

  wrap.append(el("div", { class: "btn-grid" },
    el("a", { class: "btn", href: "#/play" }, "How a session works"),
    el("a", { class: "btn", href: "#/rules" }, "What the words mean")));
  return wrap;
}
