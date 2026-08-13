// First-session tutorial. Written for someone who has never played this game and may not
// have read the book — each step says what to tap, and why the game asks for it.
import { el } from "./core.js";
import { Settings, set as setSetting } from "./settings.js";
import { listCharacters, getJourney } from "./store.js";

const step = (title, body, { done = false } = {}) =>
  el("details", { class: "rule-group step" },
    el("summary", {}, title, done ? el("span", { class: "count" }, "done") : null),
    el("div", { style: "padding:0 12px 12px" }, ...body));

const p = (...kids) => el("p", { class: "muted" }, ...kids);
const faint = (text) => el("p", { class: "faint" }, text);
const go = (href, label) => el("a", { class: "btn", href }, label);

export function tutorialScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(build(rerender));
  host.append(build(rerender));
  return host;
}

function build(rerender) {
  const chars = listCharacters();
  const journey = getJourney();
  const wrap = el("div", { class: "tutorial" }, el("h1", {}, "First session"));

  wrap.append(el("div", { class: "card" },
    p("The Electric State is a road story. You play Travelers crossing a collapsing America in 1997, and the game is about what the journey costs you rather than whether you arrive."),
    faint("Three numbers carry the whole game: Health is your body, Hope is your will, Bliss is how much the network has taken. Everything below is in the order you will need it.")));

  wrap.append(step("1 · Make a Traveler", [
    p("Tap Travelers, then New Traveler. Seven screens, and every field can be rolled if you would rather not decide."),
    faint("Archetype sets what you are good at. Attributes are rolled four dice at a time — the book's own method — and a low total earns a second talent to compensate. Dream and Flaw are not flavour: acting on either one is how you improve at the end of a session."),
    el("div", { class: "btn-row" }, go("#/create", "New Traveler"), go("#/home", "Travelers"))
  ], { done: chars.length > 0 }));

  wrap.append(step("2 · Set up the Journey", [
    p("One Journey is shared by the whole group: a destination, a vehicle, and three items in the back of it."),
    faint("The destination roll gives you a place and a reason together. Fuel starts at half a tank, because running dry is a legitimate way for a session to begin."),
    el("div", { class: "btn-row" }, go("#/journey", "The Journey"))
  ], { done: !!journey?.destination }));

  wrap.append(step("3 · Read your sheet", [
    p("Open a Traveler. The bar across the top follows you everywhere in the app: Health, Hope, Bliss, cash, fuel."),
    faint("Watch Bliss against Hope. If Bliss ever reaches your current Hope you cannot leave the network on your own — that is the game's real losing condition, and it is why the tile turns red rather than just counting up."),
    el("div", { class: "btn-row" }, ...chars.slice(0, 1).map((c) => go(`#/sheet/${c.id}`, "Open the sheet")))
  ], { done: chars.length > 0 }));

  wrap.append(step("4 · Roll some dice", [
    p("Pick an attribute, tap any talent that applies, tap Roll. You need one 6. That is the whole system."),
    faint("Failed and it matters? Push it. Pushing re-rolls everything that is not a 1 or a 6 — but every 1 left on the table afterwards costs you a point of Hope, and every 1 on a gear die breaks your gear a little. The app charges both automatically, which is the main reason to roll here rather than in your hand."),
    faint("Extra 6s are not wasted: each one past the first adds a point of damage in a fight, or something better elsewhere."),
    el("div", { class: "btn-row" }, go("#/dice", "Dice"))
  ]));

  wrap.append(step("5 · Get hurt", [
    p("On the sheet: Take damage. Armor and cover soak it, then Health comes off."),
    faint("At zero Health you are Incapacitated and start death rolls — four dice a turn, no pushing, three 6s total to stabilize against three failed rolls to die. Someone else can rally you with an Empathy roll, but only a Medic can stop the death rolls."),
    faint("A traumatic event works the other way round: it comes for your Hope, you resist with Empathy, and losing any Hope at all makes you freeze for a turn.")
  ]));

  wrap.append(step("6 · End the Shift", [
    p("Time is a screen, not bookkeeping. Tell it what happened — resting, ate, slept, travelled — and end a Stretch, a Shift, a Day or the session."),
    faint("Each boundary reports exactly what it changed and can be undone once. Health returns one point a Shift while resting. Bliss only fades on a day you stayed off the network, and each point you shed might stick permanently."),
    faint("Hope is the hard one: it comes back almost only by reducing Tension with another Traveler. That is deliberate — the game wants you to have the conversation."),
    el("div", { class: "btn-row" }, go("#/time", "Time"))
  ]));

  wrap.append(step("7 · Debrief and improve", [
    p("At the end of a session, End Session runs the debrief. Say how you followed your Dream or your Flaw, pick the attribute you learned something about, and roll."),
    faint("Higher than the attribute raises it. Equal or lower earns a talent instead — so weak attributes climb and strong ones broaden. Overcoming your Flaw gives three rolls at once and then permanently ends all improvement, so save it for near the end of the Journey.")
  ]));

  wrap.append(el("h2", {}, "Playing alone"));
  wrap.append(el("div", { class: "card" },
    p("The book has full solo rules and the app implements the lot. You run two to four Travelers and let cards answer the questions a GM would."),
    Settings.solo()
      ? el("div", { class: "btn-row" }, go("#/solo", "Solo"))
      : el("button", { class: "btn btn-primary", onclick: () => { setSetting("solo", true); rerender(); } }, "Turn on Solo mode")));

  wrap.append(step("S1 · Prepare less than you think", [
    p("Choose a starting point, a destination and roughly how many Stops. Do not plan the Stops — you generate each one as you arrive, so it can still surprise you."),
    faint("Each Traveler still needs a Goal and a Threat. Three or so Stops is a comfortable first Journey.")
  ]));

  wrap.append(step("S2 · Let the deck pace you", [
    p("Draw a card whenever you need input or want the story to move. Face cards fire events by suit: spades bring your personal Threat closer, clubs advance the Stop, hearts turn on the Travelers, diamonds start a conversation."),
    faint("Do not reshuffle until the deck is spent. The deck running down is the pacing — a Journey has a length whether or not you planned one.")
  ]));

  wrap.append(step("S3 · Ask the cards, not yourself", [
    p("Tilt answers 'is this good or bad, and how much' — suit gives the direction, rank gives the degree. NPCs come from five cards: personality, mood, motive, method, and a quirk."),
    faint("When a roll contradicts something you have already established, throw it out. The tables are passengers, not the driver.")
  ]));

  wrap.append(step("S4 · Play one Traveler at a time", [
    p("Pick one Traveler as the main character for each Stop and rotate. The others are run by Traveler events, which is also how Tension shifts across the group."),
    faint("Tension is what makes a solo group feel like people rather than a party. It is also the only reliable way a Traveler gets Hope back.")
  ]));

  wrap.append(el("div", { class: "card" },
    el("h3", {}, "If you remember nothing else"),
    el("ul", { class: "list" },
      el("li", {}, el("div", { style: "padding:6px 4px" }, "One 6 succeeds. Extra 6s make it better.")),
      el("li", {}, el("div", { style: "padding:6px 4px" }, "Pushing costs Hope and breaks gear. Push anyway when it matters.")),
      el("li", {}, el("div", { style: "padding:6px 4px" }, "Hope comes back through other people, not through rest.")),
      el("li", {}, el("div", { style: "padding:6px 4px" }, "Bliss reaching Hope is how you lose without dying.")),
      el("li", {}, el("div", { style: "padding:6px 4px" }, "Don't rush the destination. Reaching it is not the point.")))));

  wrap.append(el("div", { class: "btn-row" }, go("#/rules", "Rules library"), go("#/home", "Travelers")));
  return wrap;
}
