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
import { el, d6, pick, randomInt, d66Pick } from "./core.js";
import { SETTING, LOCATIONS, NPC_QUIRKS, NPC_REACTIONS } from "../data-gm.js";
import { MINOR_ENCOUNTERS, TRAVELER_EVENTS, CONVERSATION_SUBJECTS, NPC_PERSONALITY, NPC_EMOTION,
         NPC_MOTIVE, NPC_METHOD } from "../data-solo.js";
import { ROUTE_FEATURES } from "../data-journey.js";
import { FIRST_NAMES, SURNAMES } from "../data-names.js";
import { SHIFT_NAMES, FUEL } from "../data.js";
import { listCharacters, getJourney, saveJourney, noteEvent, getRollLog } from "./store.js";
import { makeStop, saveStop, activeStop, setActiveStop, advanceCountdown, resolveStop, listStops } from "./stops.js";
import { currentStep } from "./play.js";
import { Settings } from "./settings.js";
import { getCombat } from "./combat.js";
import { rollGender, splitPairedName, subj, Subj } from "./pronouns.js";
import { showToast, explain, modal, diceRow, haptic } from "./ui.js";
import { sceneBand } from "./scene.js";
import { portrait, playingCard, gauge, windshieldFrame, fuelDial } from "./graphics.js";
import { maxHealth, maxHope, tracksBliss, isDronePilot } from "./derived.js";
import { icon } from "./icons.js";

/** Which picture each beat gets: the road at first light, a stop, trouble, nightfall. */
const SCENE_FOR = { idle: "open", opening: "open", road: "road", arrived: "stop", scene: "stop",
  pressure: "crisis", crisis: "crisis", fighting: "crisis", wrap: "close", "no-one": "open",
  "no-destination": "open", "no-vehicle": "open", "no-tension": "open", "journey-over": "close" };

const someone = () => {
  const gender = rollGender(randomInt);
  return { gender, name: `${splitPairedName(pick(FIRST_NAMES), gender)} ${pick(SURNAMES)}` };
};

// ------------------------------------------------------------------ the state
const blank = () => ({ beat: "idle", log: [], scenes: 0, stopId: null });
// Always whole: any screen that writes one field of the director (the Journey screen resets
// `routeSeen`) must not leave Play reading a record with no log.
export const director = () => ({ ...blank(), ...(getJourney()?.director || {}) });
const write = (patch) => {
  const j = getJourney() || {};
  saveJourney({ ...j, director: { ...director(), ...patch } });
};

/** One line of what happened, newest first. This is the session as the table saw it. */
function say(text, kind = "") {
  const d = director();
  // `at` marks when this beat was told, so a roll made after it can move the story on.
  write({ log: [{ id: `${Date.now()}-${d.log.length}`, text, kind }, ...d.log].slice(0, 40), at: Date.now(), card: null });
  noteEvent("scene", text);
}

// A new session is a new evening, not a new road: how far along the rolled route the group
// has got carries over.
export function resetDirector() { write({ ...blank(), routeSeen: director().routeSeen || 0 }); }

// -------------------------------------------------------------- the narration
// Concrete sentences built from the book's own tables, so a beat is something that has
// happened rather than a category of thing that could.

/**
 * Whoever has their hands on the wheel: the Journey's `driverId` while that Traveler is
 * alive, else the first living one. The Driving screen, the dashboard and the narration all
 * read this, so they never disagree about who is driving.
 */
export function atTheWheel(j = getJourney(), cast = listCharacters()) {
  const living = cast.filter((c) => !c.state?.dead);
  return living.find((c) => c.id === j?.driverId) || living[0] || null;
}

/** Hand the wheel on: +1 to the next living Traveler, -1 to the one before. */
export function passTheWheel(step = 1) {
  const j = getJourney() || {};
  const living = listCharacters().filter((c) => !c.state?.dead);
  if (living.length < 2) return null;
  const now = atTheWheel(j, living);
  const next = living[(living.findIndex((c) => c.id === now?.id) + step + living.length) % living.length];
  saveJourney({ ...j, driverId: next.id });
  return next;
}

function openingLine() {
  const j = getJourney() || {};
  const cast = listCharacters();
  const driver = atTheWheel(j, cast);
  // The Journey's own Shift, so the narration and the clock never disagree.
  const shift = j.shift || SHIFT_NAMES[0];
  const weather = pick(SETTING.weather).toLowerCase();
  const where = j.start ? `out past ${j.start}` : "somewhere between two places with no names";
  const dest = j.destination ? ` You are still heading for ${j.destination}.` : "";
  // What the group rolled and wrote on the Journey screen is the road this scene is on.
  const route = j.route ? ` Route: ${j.route}.` : "";
  const car = (j.vehicleDetails || []).length ? ` The ${j.vehicle?.label || j.vehicle?.name || "car"}: ${pick(j.vehicleDetails)}.` : "";
  return driver
    ? `${shift}. ${weather.charAt(0).toUpperCase()}${weather.slice(1)}. ${driver.name} is driving, ${where}.${dest}${route}${car}`
    : `${shift}. ${weather}. The road runs ${where}.${dest}${route}${car}`;
}

function roadLine() {
  if (d6() > 3) {
    // The route features rolled for this Journey come first, in order, so the road you
    // rolled is the road you drive; once they are all passed, the table supplies more.
    const j = getJourney() || {};
    const rolled = j.routeFeatures || [];
    const seen = director().routeSeen || 0;
    if (seen < rolled.length) {
      write({ routeSeen: seen + 1 });
      return { text: `Ahead of you: ${rolled[seen]}.`, stop: false };
    }
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

  // A Stop resolved somewhere else (the Solo or GM tools) while Play sat idle: Play picks
  // the story up at its end, not at "Ready when you are".
  if (ladder.id === "stop-resolved" && state.beat === "idle") {
    return { id: "wrap", heading: "That is the Stop", now: RESOLVED_LINE,
      you: "Good place to stop for the night. The debrief is where Travelers improve, and it wants the memory fresh.",
      choices: [{ label: "End the session", href: "#/time/debrief", primary: true },
                { label: "Keep driving", act: "road" }] };
  }

  // The planned Stops are all played: between Stops, say so instead of driving on blind.
  if (ladder.id === "journey-end" && ["idle", "wrap"].includes(state.beat)) {
    return { id: ladder.id, heading: ladder.title, now: ladder.blurb, you: null,
      choices: [ladder.actions[0], { label: "Keep driving", act: "road" }] };
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

/**
 * Solo is played with a deck: every "what happens next" turns a card. A face card fires its
 * suit's event (the same one the Solo screen would), a number card is a Tilt on the scene.
 * The card goes on the beat, and anything it fired — a Countdown step above all — is the
 * same record the Solo and GM screens read.
 */
async function soloCard() {
  if (!Settings.solo() || Settings.playMode() === "player") return;
  const { drawForStory, tiltSentence } = await import("./solo.js");
  const drawn = await drawForStory({ autoShuffle: true });
  if (!drawn) return;
  const line = drawn.event
    ? `${drawn.note}${drawn.extra ? ` — ${drawn.extra}` : ""}`
    : tiltSentence(drawn.tilt, "This scene");
  say(`Card: ${drawn.card.rank}${{ spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" }[drawn.card.suit]}. ${line}`, "card");
  write({ card: { suit: drawn.card.suit, rank: drawn.card.rank, line, left: drawn.left, shuffled: drawn.shuffled } });
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
  const j = getJourney();
  const wrap = el("div", { class: "dash" }, el("h1", {}, "Play"));
  wrap.append(explain("You are in the driver's seat. The road ahead tells you what is happening; press the lit button to see what happens next. Tap a gauge to open that Traveler. The lights on the dash open the tools for a fight, a hazard, the network or the wheel — a light glows when you need that tool."));

  // ------------------------------------------------------------- windshield
  const lastRoll = getRollLog()[0];
  const showCard = state.card && beat.id === "scene";
  // Anyone with the helmet on and the glass goes over to the network.
  const jacked = listCharacters().some((c) => c.state?.wearingCaster);
  wrap.append(el("section", { class: `windshield shield-${SCENE_FOR[beat.id] || "road"}${jacked ? " is-neuro" : ""}`, "aria-label": "The road ahead" },
    sceneBand(SCENE_FOR[beat.id] || "road"),
    windshieldFrame(),
    // The rear-view mirror shows the last roll; tapping it opens the whole log.
    el("a", { class: "mirror", href: "#/log", "aria-label": "Roll log" },
      lastRoll?.dice?.some((v) => v <= 6) ? diceRow({ base: lastRoll.dice.filter((v) => v <= 6).slice(0, 5) }, { mini: true }) : icon("book", { size: 16 })),
    showCard ? el("div", { class: "shield-card", title: `${state.card.left} cards left` }, playingCard(state.card, { flip: false })) : null,
    el("div", { class: "beat glass" },
      el("div", { class: "beat-heading" }, beat.heading),
      el("p", { class: "beat-now" }, beat.now || "—"),
      showCard ? el("p", { class: "beat-card-line" }, state.card.line) : null)));

  // ------------------------------------------------------------- the dash
  // Back from the dice with a result: the roll was the thing to do, so the next press is
  // whatever happens because of it — not the same Roll button again.
  const rolled = lastRoll && state.at && lastRoll.ts > state.at;
  let choices = beat.choices;
  // Back from the fight the crisis sent you to: settling it is the next thing, not another fight.
  const fought = state.at && (j?.fightEndedAt || 0) > state.at;
  if (beat.id === "crisis" && fought) {
    choices = choices.map((c) => ({ ...c, primary: c.act === "resolve" }));
  }
  let echo = null;
  if (!fought && rolled && choices.some((c) => c.primary && c.href === "#/dice") && choices.some((c) => c.act)) {
    const next = choices.find((c) => c.act === beat.after)
      || choices.find((c) => c.act && c.act !== "resolve" && c.act !== "leave") || choices.find((c) => c.act);
    choices = choices.map((c) => ({ ...c, primary: c === next }));
    echo = el("p", { class: "roll-echo" }, el("strong", {}, lastRoll.label || "Roll"), " ", lastRoll.outcome || "", " — say what it means, then press on.");
  }
  const actions = el("div", { class: "btn-grid dash-choices" });
  for (const c of choices) {
    actions.append(c.href
      ? el("a", { class: "btn" + (c.primary ? " btn-primary" : ""), href: c.href }, c.label)
      : el("button", {
          class: "btn" + (c.primary ? " btn-primary" : ""),
          onclick: async () => { advance(c.act); if (c.act === "scene") await soloCard(); rerender(); }
        }, c.label));
  }
  const dash = el("section", { class: "dashboard", "aria-label": "Dashboard" },
    beat.you ? el("p", { class: "beat-you" }, beat.you) : null, echo, actions);

  // Instruments: one gauge per Traveler, then the fuel. Tapping a gauge opens the sheet.
  const cast = listCharacters();
  if (cast.length) {
    const cluster = el("div", { class: "cluster" });
    const driver = j?.vehicle ? atTheWheel(j, cast) : null;
    for (const c of cast) {
      const hMax = maxHealth(c), pMax = maxHope(c);
      const health = c.state?.health ?? hMax, hope = c.state?.hope ?? pMax;
      cluster.append(el("a", { class: "instrument" + (c.state?.dead ? " is-dead" : "") + (driver?.id === c.id ? " is-driver" : ""), href: `#/sheet/${c.id}`,
        "aria-label": `${c.name || "Unnamed"}: ${isDronePilot(c) ? "Hull" : "Health"} ${health} of ${hMax}, Hope ${hope} of ${pMax}${tracksBliss(c) ? `, Bliss ${c.state?.bliss ?? 0}` : ""}` },
        el("span", { class: "instrument-face" },
          gauge({ health, hMax, hope, pMax, bliss: tracksBliss(c) ? (c.state?.bliss ?? 0) : null }),
          portrait(c, { size: 40, frame: false }),
          driver?.id === c.id ? el("span", { class: "wheel-badge", title: "At the wheel" }, icon("wheel", { size: 14 })) : null),
        el("span", { class: "instrument-name" }, (c.name || "Unnamed").split(" ")[0])));
    }
    if (j?.vehicle) {
      cluster.append(el("a", { class: "instrument is-fuel", href: "#/journey", "aria-label": `Fuel ${j.fuel ?? 0} gallons` },
        el("span", { class: "instrument-face" }, fuelDial(j.fuel ?? 0, FUEL.tankGallons)),
        el("span", { class: "instrument-name" }, "Fuel")));
    }
    dash.append(cluster);
    // Swipe the windshield, or tap this, to hand the wheel to someone else.
    if (driver && cast.filter((c) => !c.state?.dead).length > 1) {
      dash.append(el("button", { class: "driver-swap", type: "button",
        "aria-label": `${driver.name || "Unnamed"} is at the wheel — hand it on`,
        onclick: () => { const n = passTheWheel(1); if (n) showToast(`${n.name || "Unnamed"} takes the wheel.`); rerender(); } },
        icon("wheel", { size: 16 }), el("span", {}, `${(driver.name || "Unnamed").split(" ")[0]} at the wheel`), el("span", { class: "driver-swap-hint" }, "⇄")));
    }
  }

  // Warning lights: always there, lit only when the situation calls for that tool.
  const combat = getCombat();
  const crisis = ["pressure", "crisis", "fighting"].includes(beat.id);
  const helmetOn = cast.some((c) => c.state?.wearingCaster);
  const hurtCar = j?.vehicle && ((j.hull ?? j.vehicle.hull) < j.vehicle.hull || j.chase || (j.maneuverability != null && j.maneuverability < j.vehicle.maneuverability));
  const lamp = (href, mark, label, lit, badge = null) => el("a", {
    class: "lamp" + (lit ? " is-lit" : ""), href, "aria-label": label + (lit ? " — needed now" : "")
  }, icon(mark, { size: 20 }), el("span", {}, label), badge ? el("span", { class: "lamp-badge" }, badge) : null);
  dash.append(el("div", { class: "lamps", role: "group", "aria-label": "Tools" },
    lamp("#/combat", "fight", "Fight", !!combat?.active || crisis, combat?.active ? `R${combat.round}` : null),
    lamp("#/hazards", "hazard", "Hazard", crisis && !combat?.active),
    lamp("#/neuro", "helmet", "Network", helmetOn),
    lamp("#/driving", "car", "Wheel", !!hurtCar)));

  // The rest of the dash: the controls you reach for between scenes.
  const radio = Settings.playMode() === "gm" && Settings.gmScreen() ? ["#/gm", "mask", "GM tools"]
    : Settings.solo() ? ["#/solo", "radio", "Solo deck"]
    : Settings.gmScreen() ? ["#/gm", "mask", "GM tools"] : null;
  const knob = (href, mark, label) => el("a", { class: "knob", href }, icon(mark, { size: 22 }), el("span", {}, label));
  const knobs = el("div", { class: "knobs" },
    knob("#/journey", "road", "Map"),
    knob("#/time", "clock", "Time"),
    cast.length > 1 ? knob("#/tension", "link", "Tension") : knob("#/home", "traveler", "Party"),
    radio ? knob(...radio) : knob("#/home", "traveler", "Party"));
  // The story so far is the trip log in the glovebox: there when you want it, not in the way.
  if (state.log.length) {
    knobs.append(el("button", { class: "knob", type: "button", onclick: () => storySoFar(state, rerender) },
      icon("book", { size: 22 }), el("span", {}, "Story")));
  }
  dash.append(knobs);
  wrap.append(dash);

  // A sideways swipe across the glass hands the wheel on, left or right.
  const shield = wrap.querySelector(".windshield");
  let x0 = null, y0 = null;
  shield.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; });
  shield.addEventListener("pointerup", (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) || !j?.vehicle) return;
    const n = passTheWheel(dx < 0 ? 1 : -1);
    if (n) { haptic(); showToast(`${n.name || "Unnamed"} takes the wheel.`); rerender(); }
  });
  return wrap;
}

/** The session's narration, newest first, with the way to start the evening over. */
async function storySoFar(state, rerender) {
  const body = el("div", { class: "story-log" },
    ...state.log.slice(0, 30).map((entry) => el("p", { class: "narr" }, entry.text)));
  const go = await modal({
    title: "The story so far", body,
    actions: [{ label: "Close", value: false, class: "btn-primary" }, { label: "Start a fresh session", value: "fresh" }]
  });
  if (go !== "fresh") return;
  const ok = await modal({
    title: "Start a fresh session?",
    body: el("p", { class: "faint" }, "Clears what the road remembers of tonight. Your Travelers, the Journey and the Stop all stay exactly as before."),
    actions: [{ label: "Start fresh", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  if (ok) { resetDirector(); showToast("Ready when you are."); rerender(); }
}
