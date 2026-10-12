// Play, in solo mode, as a journal you play in.
//
// From the top: a short strip of windshield (the road, the mirror with the last roll, and the
// controls you reach for between scenes), then this session's journal — what the game told
// you, what you chose, what you rolled and what it looked like, what you wrote — then the
// beat happening now with its choices, the three ways of adding to it (choose, answer a
// question, write freely) and the three helpers for when you are stuck. A slim dash pinned
// above the tabs keeps the gauges and the warning lamps in sight the whole time.
import { el, onReset } from "./core.js";
import { getJournal, addJournal, updateJournal, removeJournal, sessionNo, getMemory, keepMemory, forgetMemory,
         listCharacters, getRollLog, getJourney } from "./store.js";
import { write as jwrite, chapters, bookMarkdown, questionFor, meaningWords, readings, chooseReading, candidates,
         syncChapters, syncMilestones, syncConsequences } from "./journal.js";
import { advance, soloCard, settleChoices, SCENE_FOR, atTheWheel, passTheWheel } from "./session.js";
import { activeStop } from "./stops.js";
import { Settings } from "./settings.js";
import { maxHealth, maxHope, tracksBliss, isDronePilot } from "./derived.js";
import { showToast, explain, modal, diceRow, haptic, dismissModal } from "./ui.js";
import { sceneBand } from "./scene.js";
import { portrait, playingCard, gauge, windshieldFrame, ringDial } from "./graphics.js";
import { icon } from "./icons.js";
import { getCombat } from "./combat.js";

// Which question the beat is asking, and whether you would rather write freely. View state:
// it resets with the campaign, and nothing else reads it.
let questionTurn = 0;
let freeWrite = false;
let nudge = null;
onReset(() => { questionTurn = 0; freeWrite = false; clearTimeout(nudge); nudge = null; });

/** Table entries that end in their own ? or ! leave "?." behind in a sentence; read it clean. */
export const tidy = (text) => String(text ?? "").replace(/([?!])\.(?=\s|$)/g, "$1");

const KEEP_KINDS = [["people", "Person"], ["places", "Place"], ["threads", "Thread"]];

export function buildJournal(rerender, state, beat, j) {
  // What happened since Play last looked: chapters begun and ended, firsts, and every
  // gauge that moved, wherever it moved.
  syncChapters();
  const moved = syncConsequences();
  const won = syncMilestones();
  // Several firsts can land at once; one toast says them all rather than a stack of four.
  if (won.length) { haptic("success"); showToast(`★ ${won.join(" · ")}`); }

  const cast = listCharacters();
  const lastRoll = getRollLog()[0];
  const wrap = el("div", { class: "jplay" }, el("h1", {}, "Play"));
  wrap.append(explain("Your Journey as a journal. The game writes what happens; you choose, answer its question, or write your own line — and every roll writes itself in and asks what it looked like. Tap Keep on anything you wrote to remember a person, a place or a thread, and the road brings it back later. Stuck? Ask the deck yes or no (the book's Tilt, read as a yes or no — a house aid), roll two meaning words, or take one of three readings from the book's tables."));

  // ------------------------------------------------------------- the strip
  const jacked = cast.some((c) => c.state?.wearingCaster);
  const knob = (href, mark, label) => el("a", { class: "knob", href, "aria-label": label }, icon(mark, { size: 18 }), el("span", {}, label));
  const radio = Settings.solo() ? ["#/solo", "radio", "Deck"] : null;
  const driver = j?.vehicle ? atTheWheel(j, cast) : null;
  const strip = el("section", { class: `windshield is-strip shield-${SCENE_FOR[beat.id] || "road"}${jacked ? " is-neuro" : ""}`, "aria-label": "The road" },
    sceneBand(SCENE_FOR[beat.id] || "road"), windshieldFrame(),
    el("a", { class: "mirror", href: "#/log", "aria-label": "Roll log" },
      lastRoll?.dice?.some((v) => v <= 6) ? diceRow({ base: lastRoll.dice.filter((v) => v <= 6).slice(0, 5) }, { mini: true }) : icon("book", { size: 16 })),
    el("nav", { class: "visor", "aria-label": "Between scenes" },
      knob("#/journey", "road", "Map"),
      knob("#/time", "clock", "Time"),
      cast.length > 1 ? knob("#/tension", "link", "Tension") : knob("#/home", "traveler", "Party"),
      radio ? knob(...radio) : null,
      knob("#/book", "book", "Book"),
      el("button", { class: "knob", type: "button", "aria-label": "Kept people, places and threads", onclick: () => keptDialog(rerender) },
        icon("star", { size: 18 }), el("span", {}, "Kept")),
      driver && cast.filter((c) => !c.state?.dead).length > 1
        ? el("button", { class: "knob driver-swap", type: "button", "aria-label": `${driver.name || "Unnamed"} is at the wheel — hand it on`,
            onclick: () => { const n = passTheWheel(1); if (n) showToast(`${n.name || "Unnamed"} takes the wheel.`); rerender(); } },
            icon("wheel", { size: 18 }), el("span", {}, (driver.name || "Driver").split(" ")[0]))
        : null));
  wrap.append(strip);

  // ------------------------------------------------------------- the journal
  const all = getJournal();
  const entries = all.filter((e) => e.session === sessionNo());
  // The beat happening now is shown below as the present, not twice.
  const nowIdx = beat.now ? entries.map((e) => e.kind === "beat" && e.text === beat.now).lastIndexOf(true) : -1;
  const list = el("ol", { class: "journal", "aria-label": "This session" });
  if (all.length > entries.length) {
    list.append(el("li", { class: "j-earlier" }, el("a", { href: "#/book" }, "Earlier sessions are in the book →")));
  }
  if (!entries.length) list.append(el("li", { class: "j-empty" }, "The page is blank. Press the lit button and the road begins."));
  entries.forEach((e, i) => { if (i !== nowIdx) list.append(entryView(e, rerender)); });
  wrap.append(list);

  // ------------------------------------------------------------- now
  const { choices, rolledNow } = settleChoices(state, beat, lastRoll, j);
  const showCard = state.card && beat.id === "scene";
  wrap.append(el("section", { class: "beat jnow" },
    el("div", { class: "beat-heading" }, beat.heading),
    showCard ? el("div", { class: "jnow-card" }, playingCard(state.card, { flip: false })) : null,
    el("p", { class: "beat-now" }, tidy(beat.now) || "—"),
    showCard ? el("p", { class: "beat-card-line" }, state.card.line) : null,
    rolledNow ? el("p", { class: "roll-echo" }, el("strong", {}, lastRoll.label || "Roll"), " ", lastRoll.outcome || "", " — say what it looked like, then press on.") : null,
    beat.you ? el("p", { class: "beat-you" }, beat.you) : null));

  const grid = el("div", { class: "btn-grid dash-choices" });
  for (const c of choices) {
    // Choosing is one of the three ways in: the choice itself goes on the page.
    const mark = () => addJournal({ kind: "choice", text: c.label });
    grid.append(c.href
      ? el("a", { class: "btn" + (c.primary ? " btn-primary" : ""), href: c.href, onclick: mark }, c.label)
      : el("button", {
          class: "btn" + (c.primary ? " btn-primary" : ""),
          onclick: async () => { mark(); haptic(); advance(c.act); if (c.act === "scene") await soloCard(); rerender(); }
        }, c.label));
  }
  wrap.append(grid);

  // ------------------------------------------------------------- your words
  wrap.append(composer(beat, rerender));
  wrap.append(el("div", { class: "jtools", role: "group", "aria-label": "When you are stuck" },
    el("button", { class: "btn", type: "button", onclick: () => askDialog(rerender) }, icon("radio", { size: 16 }), "Ask the deck"),
    el("button", { class: "btn", type: "button", onclick: () => { meaningWords(); haptic(); rerender(); } }, icon("dice", { size: 16 }), "Words"),
    el("button", { class: "btn", type: "button", onclick: () => readingsDialog(rerender) }, icon("book", { size: 16 }), "Readings")));

  // ------------------------------------------------------------- the slim dash
  wrap.append(el("div", { class: "slimdash-spacer" }), slimDash(cast, moved, beat));

  // Momentum: a page left alone for a while nudges the lit button.
  clearTimeout(nudge);
  nudge = setTimeout(() => wrap.querySelector(".dash-choices .btn-primary")?.classList.add("is-nudge"), 45000);
  // The present is at the foot of the page; arrive there.
  requestAnimationFrame(() => { if (wrap.isConnected) window.scrollTo(0, document.documentElement.scrollHeight); });
  return wrap;
}

// ---------------------------------------------------------------- an entry
function entryView(e, rerender, { readOnly = false } = {}) {
  const keep = (text) => readOnly ? null : el("button", { class: "j-keep", type: "button", "aria-label": "Keep a name from this", title: "Keep a person, place or thread",
    onclick: () => keepDialog(text, rerender) }, icon("star", { size: 14 }));
  const remove = readOnly ? null : el("button", { class: "j-x", type: "button", "aria-label": "Remove this line", onclick: () => { removeJournal(e.id); rerender(); } }, icon("close", { size: 12 }));
  switch (e.kind) {
    case "chapter":
      return el("li", { class: "j-chapter" }, el("span", {}, `Chapter ${e.n}`), el("strong", {}, e.text));
    case "chapter-end":
      return el("li", { class: "j-chapter-end" }, e.text);
    case "milestone":
      return el("li", { class: "j-milestone" }, icon("star", { size: 16 }), el("span", {}, e.text));
    case "choice":
      return el("li", { class: "j-choice" }, `→ ${e.text}`);
    case "consequence":
      return el("li", { class: "j-consequence" }, icon("heart", { size: 14 }), el("span", {}, e.text));
    case "mine":
      return el("li", { class: "j-mine" }, el("span", {}, e.text), keep(e.text), remove);
    case "answer":
      return el("li", { class: "j-mine" }, el("span", { class: "j-q" }, e.q), el("span", {}, e.text), keep(e.text), remove);
    case "oracle":
      return el("li", { class: "j-oracle" }, el("span", { class: "j-q" }, e.q),
        el("strong", {}, e.answer), e.card ? el("span", { class: "j-card" }, playingCard(e.card, { flip: false })) : null);
    case "meaning-words":
      return el("li", { class: "j-words" }, ...(e.words || [e.text]).map((w) => el("span", { class: "tag" }, w)));
    case "reading":
      return el("li", { class: "j-reading" }, e.text);
    case "session":
      return el("li", { class: "j-session" }, el("strong", {}, `End of session ${e.session}`), el("span", {}, e.text));
    case "roll": {
      const input = el("input", { type: "text", "aria-label": "What does that look like?", placeholder: "What does that look like?" });
      const save = () => { if (input.value.trim()) { updateJournal(e.id, { meaning: input.value.trim() }); rerender(); } };
      input.addEventListener("keydown", (k) => { if (k.key === "Enter") save(); });
      return el("li", { class: "j-roll" },
        el("div", { class: "j-roll-head" }, diceRow({ base: e.dice }, { mini: true }),
          el("span", {}, el("strong", {}, e.by), ` · ${e.label}`), el("span", { class: "j-out" }, e.outcome)),
        e.meaning
          ? el("div", { class: "j-meaning" }, el("span", {}, e.meaning), keep(e.meaning))
          : !readOnly && e.session === sessionNo() ? el("div", { class: "j-ask" }, input, el("button", { class: "btn", type: "button", onclick: save }, "Write")) : null);
    }
    default:
      return el("li", { class: `j-beat${e.beat === "card" ? " is-card" : ""}${e.beat === "callback" ? " is-callback" : ""}` }, tidy(e.text));
  }
}

// ---------------------------------------------------------------- your words
function composer(beat, rerender) {
  const q = questionFor(beat.id, questionTurn);
  const box = el("textarea", { rows: 2, "aria-label": freeWrite ? "Write what happens" : q, placeholder: freeWrite ? "Write what happens…" : q });
  const send = () => {
    if (!box.value.trim()) { box.focus(); return; }
    jwrite(box.value, freeWrite ? null : q);
    haptic();
    rerender();
  };
  return el("section", { class: "composer" },
    el("div", { class: "composer-head" },
      el("div", { class: "seg", role: "group", "aria-label": "How to write" },
        el("button", { type: "button", class: "seg-item" + (!freeWrite ? " is-on" : ""), "aria-pressed": String(!freeWrite), onclick: () => { freeWrite = false; rerender(); } }, "Answer"),
        el("button", { type: "button", class: "seg-item" + (freeWrite ? " is-on" : ""), "aria-pressed": String(freeWrite), onclick: () => { freeWrite = true; rerender(); } }, "Write freely")),
      !freeWrite ? el("button", { class: "icon-btn", type: "button", "aria-label": "Another question", title: "Another question",
        onclick: () => { questionTurn += 1; rerender(); } }, "↻") : null),
    !freeWrite ? el("p", { class: "composer-q" }, q) : null,
    box,
    el("button", { class: "btn btn-block", type: "button", onclick: send }, "Add to the journal"));
}

// ---------------------------------------------------------------- memory
async function keepDialog(text, rerender) {
  const name = el("input", { type: "text", "aria-label": "Name to keep", placeholder: "A name, a place, a thread…" });
  let kind = "people";
  const seg = el("div", { class: "seg", role: "group", "aria-label": "Kind" });
  const drawSeg = () => seg.replaceChildren(...KEEP_KINDS.map(([k, label]) => el("button", {
    type: "button", class: "seg-item" + (kind === k ? " is-on" : ""), "aria-pressed": String(kind === k),
    onclick: () => { kind = k; drawSeg(); }
  }, label)));
  drawSeg();
  const picks = candidates(text);
  const body = el("div", {},
    picks.length ? el("div", { class: "chip-set is-left" }, ...picks.map((p) => el("button", { type: "button", class: "chip-toggle", onclick: () => { name.value = p; } }, p))) : null,
    el("div", { class: "field" }, name),
    el("div", { class: "field" }, seg));
  const ok = await modal({ title: "Keep it", body, actions: [{ label: "Keep", value: true, class: "btn-primary" }, { label: "Cancel", value: false }] });
  if (!ok || !name.value.trim()) return;
  const kept = keepMemory(kind, name.value);
  showToast(kept ? `Kept: ${kept.name}. The road will bring it back.` : "Already kept.");
  rerender();
}

async function keptDialog(rerender) {
  const m = getMemory();
  const body = el("div", {});
  let any = false;
  for (const [k, label] of KEEP_KINDS) {
    if (!m[k].length) continue;
    any = true;
    body.append(el("h3", {}, `${label === "Person" ? "People" : `${label}s`}`),
      el("ul", { class: "list" }, ...m[k].map((x) => el("li", { class: "card-row" }, el("span", {}, x.name),
        el("button", { class: "btn", type: "button", onclick: () => { forgetMemory(k, x.id); dismissModal(false); keptDialog(rerender); } }, "Forget")))));
  }
  if (!any) body.append(el("p", { class: "faint" }, "Nothing kept yet. Tap the star beside a line you wrote to keep a person, a place or a thread from it."));
  await modal({ title: "Kept", body, actions: [{ label: "Close", value: false, class: "btn-primary" }] });
  rerender();
}

// ---------------------------------------------------------------- helpers
async function askDialog(rerender) {
  const q = el("input", { type: "text", "aria-label": "Your yes or no question", placeholder: "Is the farmer armed?" });
  const ok = await modal({
    title: "Ask the deck",
    body: el("div", {}, el("p", { class: "faint" }, "One card off the solo deck. Red is yes, black is no, and the rank says how firmly — the book's Tilt, read as a yes or no (a house aid)."), el("div", { class: "field" }, q)),
    actions: [{ label: "Turn a card", value: true, class: "btn-primary" }, { label: "Cancel", value: false }]
  });
  if (!ok) return;
  const question = q.value.trim() || "Does it go our way?";
  const { askTheDeck } = await import("./solo.js");
  const r = askTheDeck(question);
  addJournal({ kind: "oracle", q: question, answer: r.answer, card: { suit: r.card.suit, rank: r.card.rank } });
  haptic("roll");
  await modal({
    title: r.answer,
    body: el("div", {}, el("div", { class: "card-reveal" }, playingCard(r.card)), el("p", { class: "faint" }, `${question} · ${r.read.label}`)),
    actions: [{ label: "Good", value: true, class: "btn-primary" }]
  });
  rerender();
}

async function readingsDialog(rerender) {
  const options = readings();
  const choice = await modal({
    title: "Three readings",
    body: el("p", { class: "faint" }, "From the book's own tables for people and conversations. Take the one that fits."),
    actions: [...options.map((o) => ({ label: o, value: o })), { label: "Not these", value: false }]
  });
  if (!choice) return;
  chooseReading(choice);
  rerender();
}

// ---------------------------------------------------------------- the slim dash
function slimDash(cast, moved, beat) {
  const j = getJourney();
  const driver = j?.vehicle ? atTheWheel(j, cast) : null;
  const dash = el("nav", { class: "slimdash dashboard", "aria-label": "Dashboard" });
  const cluster = el("div", { class: "cluster" });
  for (const c of cast) {
    const hMax = maxHealth(c), pMax = maxHope(c);
    const health = c.state?.health ?? hMax, hope = c.state?.hope ?? pMax;
    cluster.append(el("a", {
      class: "instrument" + (c.state?.dead ? " is-dead" : "") + (driver?.id === c.id ? " is-driver" : "") + (moved[c.id] ? " is-moved" : ""),
      href: `#/sheet/${c.id}`,
      "aria-label": `${c.name || "Unnamed"}: ${isDronePilot(c) ? "Hull" : "Health"} ${health} of ${hMax}, Hope ${hope} of ${pMax}${tracksBliss(c) ? `, Bliss ${c.state?.bliss ?? 0}` : ""}`
    }, el("span", { class: "instrument-face" },
      gauge({ health, hMax, hope, pMax, bliss: tracksBliss(c) ? (c.state?.bliss ?? 0) : null }),
      portrait(c, { size: 26, frame: false }),
      driver?.id === c.id ? el("span", { class: "wheel-badge" }, icon("wheel", { size: 10 })) : null)));
  }
  // The Countdown, where it can be seen ticking.
  const stop = activeStop();
  if (stop?.countdown?.length) {
    cluster.append(el("a", { class: "instrument is-countdown" + (moved.countdown ? " is-moved" : ""), href: "#/solo", "aria-label": `Countdown ${stop.countdownProgress || 0} of ${stop.countdown.length}` },
      el("span", { class: "instrument-face" }, ringDial(stop.countdownProgress || 0, stop.countdown.length, { tone: "danger", size: 40 }))));
  }
  dash.append(cluster);

  const combat = getCombat();
  const crisis = ["pressure", "crisis", "fighting"].includes(beat.id);
  const helmetOn = cast.some((c) => c.state?.wearingCaster);
  const hurtCar = j?.vehicle && ((j.hull ?? j.vehicle.hull) < j.vehicle.hull || j.chase || (j.maneuverability != null && j.maneuverability < j.vehicle.maneuverability));
  const lamp = (href, mark, label, lit, badge = null) => el("a", {
    class: "lamp" + (lit ? " is-lit" : ""), href, "aria-label": label + (lit ? " — needed now" : ""), title: label
  }, icon(mark, { size: 18 }), badge ? el("span", { class: "lamp-badge" }, badge) : null);
  dash.append(el("div", { class: "lamps", role: "group", "aria-label": "Tools" },
    lamp("#/combat", "fight", "Fight", !!combat?.active || crisis, combat?.active ? `R${combat.round}` : null),
    lamp("#/hazards", "hazard", "Hazard", crisis && !combat?.active),
    lamp("#/neuro", "helmet", "Network", helmetOn),
    lamp("#/driving", "car", "Wheel", !!hurtCar)));
  return dash;
}


// ---------------------------------------------------------------- the book
/**
 * The journal read back as a book: a chapter per Stop, everything before the first Stop as
 * the road out, sessions marked where they ended. Read here, or keep it as a file.
 */
export function bookScreen() {
  const host = el("div");
  const rerender = () => host.replaceChildren(buildBook(rerender));
  host.append(buildBook(rerender));
  return host;
}

function buildBook(rerender) {
  const wrap = el("div", { class: "book manual" }, el("h1", {}, "The book"));
  wrap.append(explain("Everything this Journey has been, as it was played: what the game told you, what you chose and wrote, and what the dice said. A chapter for every Stop. Keep it as a file to read anywhere."));
  const name = getJourney()?.destination ? `The road to ${getJourney().destination}` : "The Journey";
  const parts = chapters();
  const empty = !getJournal().length;
  wrap.append(el("div", { class: "card book-cover" },
    el("p", { class: "book-title" }, name),
    el("p", { class: "faint" }, empty ? "Nothing written yet. Play a scene in solo mode and the book starts filling itself." : `${parts.filter((c) => c.n).length} chapter${parts.filter((c) => c.n).length === 1 ? "" : "s"} · ${getJournal().length} lines`),
    empty
      ? el("a", { class: "btn btn-primary", href: "#/session" }, "Start playing")
      : el("button", { class: "btn btn-primary", type: "button", onclick: () => downloadBook(name) }, "Save the book as a file")));
  for (const c of parts) {
    wrap.append(el("section", { class: "card book-chapter" },
      el("h2", {}, c.n ? `Chapter ${c.n}: ${c.title}` : c.title),
      el("ol", { class: "journal is-read" }, ...c.entries.map((e) => entryView(e, rerender, { readOnly: true })))));
  }
  return wrap;
}

function downloadBook(name) {
  const blob = new Blob([bookMarkdown(name)], { type: "text/markdown" });
  const a = el("a", { href: URL.createObjectURL(blob), download: "electric-state-journal.md" });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  showToast("The book is saved as a file.");
}
