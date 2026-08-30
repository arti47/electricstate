// How to actually run a session — and where you are in one right now.
//
// Every other screen answers "what does this control do". Nothing answered "it is Tuesday
// evening, four people are sitting down, what happens first" — or the harder one, "we have
// been playing for an hour, what now". The app holds every piece of that state already:
// whether there is a Stop in play, how far its Countdown has run, whether a fight is
// running, how long since the last debrief. This turns that into an answer.
import { el } from "./core.js";
import { listCharacters, getJourney, getSessionLog } from "./store.js";
import { activeStop, listStops } from "./stops.js";
import { getCombat } from "./combat.js";
import { Settings } from "./settings.js";
import { explain } from "./ui.js";

/**
 * Where this group is in the loop, as a pure function of the saved game so it can be
 * tested without a browser. Phases run: setup → open → play → crisis → close → done.
 *
 * The first four checks are the same setup ladder the home screen always had. Everything
 * after `ready` is new: the app used to fall silent exactly when play began.
 */
export function whatNow({ chars = [], journey = null, stop = null, stops = [], combat = null, sessionLog = [] } = {}) {
  const step = (id, phase, title, blurb, actions, aside = null) =>
    ({ id, phase, title, blurb, actions, aside });

  // ---------------------------------------------------------------- setting up
  if (!chars.length) {
    return step("no-traveler", "setup", "Make somebody to be",
      "One Traveler each. Everything can be rolled if you would rather find out who this Traveler is than decide it.",
      [{ label: "Create a Traveler", href: "#/create", primary: true },
       { label: "How this game works", href: "#/tutorial" }]);
  }
  if (!journey?.destination) {
    return step("no-destination", "setup", "Where are you going?",
      "The Journey is the campaign. One destination for the whole group, and a reason to be heading there.",
      [{ label: "Set up the Journey", href: "#/journey", primary: true }]);
  }
  if (!journey?.vehicle) {
    return step("no-vehicle", "setup", "Nothing to drive",
      "Pick the vehicle and the three shared items in the back of it.",
      [{ label: "The Journey", href: "#/journey", primary: true }]);
  }
  if (chars.length > 1 && !chars.some((c) => Object.values(c.tension || {}).some((v) => v > 0))) {
    return step("no-tension", "setup", "Nobody feels anything about anybody",
      "Each Traveler starts at Tension 1 toward one or two of the others. It is the only reliable way Hope comes back, so a group with none of it slowly runs dry.",
      [{ label: "Set the Tension", href: "#/tension", primary: true }]);
  }
  if (journey.ended) {
    return step("journey-over", "done", "That Journey is finished",
      "Keep it as a record. A new Journey starts clean — new Travelers, new road, same app.",
      [{ label: "Start another Journey", href: "#/settings", primary: true },
       { label: "Read the roll log", href: "#/log" }]);
  }

  // ------------------------------------------------------------- mid-session
  if (combat?.active) {
    return step("in-combat", "play", `A fight is running — round ${combat.round}`,
      "Finish it before anything else. Zones, one move and one action each, and a reaction costs the next turn.",
      [{ label: "Back to combat", href: "#/combat", primary: true },
       { label: "Roll dice", href: "#/dice" }]);
  }

  if (!stop) {
    const first = !stops.length;
    return step("on-the-road", "open", first ? "Open the first scene" : "You are on the road",
      first
        ? "Start driving, not arriving. Say where you are, what the weather is doing, and who is at the wheel — then let the road produce the first problem."
        : "Between Stops. Burn a Shift of driving, take an encounter if you want one, and arrive somewhere when the table is ready for a problem.",
      [
        Settings.solo()
          ? { label: "Generate a Stop", href: "#/solo", primary: true }
          : { label: "Build a Stop", href: "#/gm", primary: true },
        { label: "Time passes", href: "#/time" }
      ],
      "A Stop is somewhere you cannot simply drive past. The Blocker is the reason why.");
  }

  const fired = stop.countdownProgress || 0;
  const total = stop.countdown?.length || 3;

  if (stop.resolved) {
    return step("stop-resolved", "close", "The Blocker is dealt with",
      "You can drive on. If the table is winding down, end the session here — the debrief is where Travelers improve, and it wants the memory fresh.",
      [{ label: "End the session", href: "#/time", primary: true },
       { label: "Back on the road", href: Settings.solo() ? "#/solo" : "#/gm" }],
      "A Stop is worth one to three sessions. Leaving usually ends the session.");
  }

  if (fired === 0) {
    return step("stop-opening", "open", `Arrived: ${stop.blocker || "something is in the way"}`,
      "Open with the place, not the problem. Let the players look around, meet somebody, ask a question — then let the Blocker land. Roll only when someone wants something and it could go badly.",
      [{ label: "Roll dice", href: "#/dice", primary: true },
       { label: "The Stop", href: Settings.solo() ? "#/solo" : "#/gm" }],
      "Nothing about the Countdown yet. It fires when the scene stalls or the group takes too long.");
  }

  if (fired < total) {
    return step("stop-running", "play", `The Stop is running — Countdown ${fired}/${total}`,
      "Scene, roll, consequence, repeat. When a scene stops producing anything, or the group spends a Shift on something else, fire the next Countdown step and let it change the situation.",
      [{ label: "Roll dice", href: "#/dice", primary: true },
       { label: "Fire the Countdown", href: Settings.solo() ? "#/solo" : "#/gm" },
       { label: "Time passes", href: "#/time" }],
      "Hope only comes back through other people. If someone is running low, that is the scene to frame next.");
  }

  return step("stop-crisis", "crisis", "The Countdown is spent — this is the crisis",
    "Everything the Stop had to throw is on the table. It ends one of two ways: the Travelers deal with the Blocker, or the group cuts its losses and drives out with it unresolved. Both are endings.",
    [{ label: "Resolve the Blocker", href: Settings.solo() ? "#/solo" : "#/gm", primary: true },
     { label: "Roll dice", href: "#/dice" },
     { label: "End the session", href: "#/time" }],
    "Leaving a Stop unresolved is a real choice, not a failure. It follows you.");
}

/** The live answer, read straight off the saved game. */
export const currentStep = () => whatNow({
  chars: listCharacters(),
  journey: getJourney(),
  stop: activeStop(),
  stops: listStops(),
  combat: getCombat(),
  sessionLog: getSessionLog()
});

/** The card the home screen shows: where you are, and the one thing to do next. */
export function whatNowCard(step = currentStep()) {
  if (!step) return null;
  const card = el("div", { class: "card whatnow" },
    el("div", { class: "whatnow-phase" }, PHASES[step.phase]?.label || step.phase),
    el("strong", {}, step.title),
    el("p", { class: "faint" }, step.blurb));
  if (step.aside) card.append(el("p", { class: "faint" }, step.aside));
  card.append(el("div", { class: "btn-grid" },
    ...step.actions.map((a) => el("a", { class: "btn" + (a.primary ? " btn-primary" : ""), href: a.href }, a.label))));
  return card;
}

const PHASES = {
  setup: { label: "Before you play", n: 0 },
  open:  { label: "Opening", n: 1 },
  play:  { label: "In the middle", n: 2 },
  crisis:{ label: "The crisis", n: 3 },
  close: { label: "Winding up", n: 4 },
  done:  { label: "Finished", n: 5 }
};

// ==================================================================== screen
export function playScreen() {
  const step = currentStep();
  const wrap = el("div", {}, el("h1", {}, "Running a session"));
  wrap.append(explain("Not what the buttons do — what happens at the table. Three acts: getting started, keeping it going, and stopping well. The card at the top always says which one you are in right now."));

  wrap.append(whatNowCard(step));

  wrap.append(act("Getting started", step.phase === "setup" || step.phase === "open", [
    ["Sit down and agree the shape of it",
     "Who is playing, how long you have, and what the game will not go near. The book asks for that conversation before the first scene, not after something lands badly. Settings has the list."],
    ["Everyone makes a Traveler",
     "Or takes a ready-made one. Half an hour for a group that has never done this; five minutes if you take the pregens."],
    ["Answer three questions together",
     "Where are you going, what are you driving, and why are you in the same car. That is the whole Journey setup and it takes ten minutes."],
    ["Open on the road, not at the Stop",
     "One scene of driving before the first problem. It establishes who these people are while nothing is at stake, which is the only time that is easy."]
  ], [{ label: "The safety tools", href: "#/settings" }, { label: "Set up the Journey", href: "#/journey" }]));

  wrap.append(act("Keeping it going", step.phase === "play" || step.phase === "crisis", [
    ["Frame a scene: where, who, and what is at stake",
     "Say the place and let someone speak first. If nothing is at stake, it is not a scene — cut to the next thing that matters."],
    ["Roll only when someone wants something and could fail",
     "No roll for walking across a room. One 6 succeeds. If the roll does not change what happens next, do not ask for it."],
    ["Spend the consequence out loud",
     "A failure is not nothing happening — it is something else happening. A push costs Hope or breaks gear, and the app charges it, so say what that looked like."],
    ["Let time pass on purpose",
     "A Shift is five to ten hours. Ending one heals, feeds, burns fuel and fades Bliss all at once, and it is how a session gets a shape instead of running on."],
    ["Fire the Countdown when the scene stalls",
     "Three steps per Stop, each worse. It is the pressure that stops a Stop becoming a conversation about what to do."],
    ["Watch Hope, and frame the scene that fixes it",
     "Hope comes back almost only from reducing Tension with another Traveler. When someone is running dry, that conversation is the next scene."]
  ], [{ label: "Roll dice", href: "#/dice" }, { label: "Time passes", href: "#/time" }, { label: "Tension", href: "#/tension" }]));

  wrap.append(act("Stopping well", step.phase === "close" || step.phase === "done", [
    ["End a scene one beat after the answer",
     "The moment the question is settled, cut. Do not play out the walk back to the car."],
    ["End a session on a change, not a cliffhanger",
     "Something is different from when you started — somewhere new, someone hurt, something known. Then run the debrief while it is fresh."],
    ["The debrief is the improvement",
     "Each Traveler says how that one followed the Dream or the Flaw. Roll a die against an attribute: higher raises it, equal or lower earns a talent. That is the whole advancement system and it only happens here."],
    ["A Stop ends when the Blocker does — or when you drive out anyway",
     "Both are endings. An unresolved Stop follows you, which is more interesting than a clean one."],
    ["End the Journey when arriving would mean something",
     "Reaching the destination is not the point and it is not required. When the road has done what it was going to do, close it: each Traveler gets an epilogue and the campaign is kept as a record rather than deleted."]
  ], [{ label: "End the session", href: "#/time" }, { label: "End the Journey", href: "#/time" }]));

  const STUCK = [
    "Nobody is doing anything — fire the Countdown. Pressure beats invitation.",
    "It has become a planning meeting — cut to the moment the plan starts, and roll.",
    "Someone has not spoken for twenty minutes — frame the next scene around what that Traveler wants.",
    "Everyone is out of Hope — the game is telling you to have the conversation, not to find more neurine.",
    "You do not know what happens next — that is what the solo tables are for, whether or not you have a GM."
  ];
  wrap.append(el("div", { class: "card" },
    el("h3", {}, "If a session is going badly"),
    el("ul", { class: "list" },
      ...STUCK.map((line) => el("li", {}, el("div", { style: "padding:6px 4px" }, line))))));

  wrap.append(el("div", { class: "btn-grid" },
    el("a", { class: "btn", href: "#/tutorial" }, "The app, screen by screen"),
    el("a", { class: "btn", href: "#/rules" }, "What the words mean")));
  return wrap;
}

/** One act of the three, opened when the group is actually in it. */
function act(title, here, steps, links) {
  const box = el("details", { class: "card phase-fold", open: here },
    el("summary", {}, title, here ? el("span", { class: "count" }, "you are here") : null));
  const list = el("ol", { class: "playsteps" });
  for (const [head, body] of steps) {
    list.append(el("li", {}, el("strong", {}, head), el("div", { class: "faint" }, body)));
  }
  box.append(list, el("div", { class: "btn-grid" },
    ...links.map((l) => el("a", { class: "btn", href: l.href }, l.label))));
  return box;
}
