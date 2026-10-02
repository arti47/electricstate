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
import { listCharacters, getJourney, saveJourney, noteEvent, getRollLog } from "./store.js";
import { makeStop, saveStop, activeStop, setActiveStop, advanceCountdown, resolveStop, listStops } from "./stops.js";
import { currentStep } from "./play.js";
import { getCombat } from "./combat.js";
import { rollGender, splitPairedName, subj, obj, poss, Subj } from "./pronouns.js";
import { showToast, explain, modal } from "./ui.js";
import { sceneBand } from "./scene.js";
import { portrait } from "./graphics.js";
import { miniVitals } from "./sheet.js";
import { routeCard } from "./wizard.js";

/** Which picture each beat gets: the road at first light, a stop, trouble, nightfall. */
const SCENE_FOR = { idle: "open", opening: "open", road: "road", arrived: "stop", scene: "stop",
  pressure: "crisis", crisis: "crisis", fighting: "crisis", wrap: "close", "no-one": "open",
  "no-destination": "open", "no-vehicle": "open", "no-tension": "open", "journey-over": "close" };

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
  // `at` marks when this beat was told, so a roll made after it can move the story on.
  write({ log: [{ id: `${Date.now()}-${d.log.length}`, text, kind }, ...d.log].slice(0, 40), at: Date.now() });
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
  // The Journey's own Shift, so the narration and the clock never disagree.
  const shift = j.shift || SHIFT_NAMES[0];
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

  // The Journey has to exist before a session can run on it. The same ladder the home card
  // and Running a session use, so all three always agree on what is missing.
  const ladder = currentStep();
  if (ladder.phase === "setup" || ladder.phase === "done" || ladder.id === "player-ready") {
    return { id: ladder.id, heading: ladder.title, now: ladder.blurb, you: ladder.aside || null,
      choices: ladder.actions };
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
      // Every third scene at a Stop, the clock is the next thing to press: someone who only
      // ever presses the lit button must still reach the Countdown and the crisis.
      return { id: "scene", heading: `Scene ${state.scenes}`, now: state.now,
        after: stop && state.scenes % 3 === 0 ? "pressure" : "scene",
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
        choices: [{ label: "End the session", href: "#/time/debrief", primary: true },
                  { label: "Keep driving", act: "road" }] };

    default:
      return beatFor({ ...state, beat: "idle" });
  }
}

// ------------------------------------------------------------------ keeping in step
const STOP_BEATS = ["arrived", "scene", "pressure", "crisis"];
const RESOLVED_LINE = "It is dealt with. Not tidily, probably, but the road ahead is open again.";

/**
 * The director keeps its own place in the story, but the story also moves on the other
 * screens: a Stop built on the GM screen or generated in solo, a Countdown fired there, a
 * Blocker resolved there. Before showing a beat, catch up with the real game — otherwise
 * Play says "ready when you are" while the GM screen is three Countdown steps into a Stop.
 */
export function reconcile() {
  const state = director();
  const stop = activeStop();

  // A Stop is in play that this screen did not open: arrive at it.
  if (stop && !stop.resolved && state.stopId !== stop.id) {
    const now = arrivalLine(stop);
    say(now, "arrive");
    write({ beat: "arrived", now, stopId: stop.id, scenes: 0, firedSeen: stop.countdownProgress || 0 });
    return;
  }
  if (!state.stopId || !STOP_BEATS.includes(state.beat)) return;

  const mine = listStops().find((x) => x.id === state.stopId);
  if (!mine) { write({ beat: "idle", stopId: null, now: null }); return; }

  // Resolved somewhere else: the Stop is over here too.
  if (mine.resolved) {
    say(RESOLVED_LINE, "wrap");
    write({ beat: "wrap", now: RESOLVED_LINE });
    return;
  }

  // Its Countdown ran on somewhere else: say the newest step, as if it had fired here.
  const fired = mine.countdownProgress || 0;
  if (fired > (state.firedSeen ?? 0) && mine.countdown?.[fired - 1]) {
    const now = `${mine.countdown[fired - 1]} (${fired} of ${mine.countdown.length})`;
    say(now, "pressure");
    write({ beat: fired >= mine.countdown.length ? "crisis" : "pressure", now, firedSeen: fired });
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
    write({ beat: "arrived", now, stopId: fresh.id, scenes: 0, firedSeen: 0 });
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
    write({ beat: fired.index >= fired.of ? "crisis" : "pressure", now, firedSeen: fired.index });
    return;
  }

  if (act === "resolve") {
    if (stop) resolveStop(stop.id);
    const now = RESOLVED_LINE;
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
  reconcile();
  const state = director();
  const beat = beatFor(state);
  const wrap = el("div", {}, el("h1", {}, "Play"));
  wrap.append(explain("The app runs the session. Each screen is one thing happening and two or three things you can do about it. Press one and the next thing happens. Everything it does is written into the same Journey the other screens use, so you can take over by hand whenever you want."));

  wrap.append(el("div", { class: "beat has-scene" },
    sceneBand(SCENE_FOR[beat.id] || "road"),
    el("div", { class: "beat-heading" }, beat.heading),
    el("p", { class: "beat-now" }, beat.now || "—"),
    beat.you ? el("p", { class: "faint" }, beat.you) : null));

  // Back from the dice with a result: the roll was the thing to do, so the next press is
  // whatever happens because of it — not the same Roll button again.
  const lastRoll = getRollLog()[0];
  const rolled = lastRoll && state.at && lastRoll.ts > state.at;
  let choices = beat.choices;
  // Back from the fight the crisis sent you to: settling it is the next thing, not another fight.
  const fought = state.at && (getJourney()?.fightEndedAt || 0) > state.at;
  if (beat.id === "crisis" && fought) {
    choices = choices.map((c) => ({ ...c, primary: c.act === "resolve" }));
  }
  if (!fought && rolled && choices.some((c) => c.primary && c.href === "#/dice") && choices.some((c) => c.act)) {
    const next = choices.find((c) => c.act === beat.after)
      || choices.find((c) => c.act && c.act !== "resolve" && c.act !== "leave") || choices.find((c) => c.act);
    choices = choices.map((c) => ({ ...c, primary: c === next }));
    wrap.append(el("div", { class: "card roll-echo" },
      el("strong", {}, lastRoll.label || "Roll"), " ",
      el("span", { class: "faint" }, lastRoll.outcome || ""),
      el("p", { class: "faint" }, "Say what that means for the scene, then press on.")));
  }
  const actions = el("div", { class: "btn-grid" });
  for (const c of choices) {
    actions.append(c.href
      ? el("a", { class: "btn" + (c.primary ? " btn-primary" : ""), href: c.href }, c.label)
      : el("button", {
          class: "btn" + (c.primary ? " btn-primary" : ""),
          onclick: () => { advance(c.act); rerender(); }
        }, c.label));
  }
  wrap.append(actions);

  // Who is in the car and where the road has got to: the session sits on both, so both are
  // here, and each opens its own screen.
  const cast = listCharacters();
  if (cast.length && getJourney()) {
    wrap.append(el("div", { class: "card party-bar" },
      el("div", { class: "party-faces" }, ...cast.map((c) => el("a", { href: `#/sheet/${c.id}`, class: "party-face", title: c.name || "Unnamed", "aria-label": c.name || "Unnamed" },
        portrait(c, { size: 44, frame: false }), miniVitals(c)))),
      el("a", { class: "route-link", href: "#/journey", "aria-label": "The Journey" }, routeCard(getJourney()))));
  }

  if (state.log.length) {
    const log = el("details", { class: "card phase-fold" },
      el("summary", {}, `The session so far (${state.log.length})`));
    for (const entry of state.log.slice(0, 15)) {
      log.append(el("div", { class: "faint narr", style: "padding:6px 0;border-top:1px solid var(--line-soft)" }, entry.text));
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
