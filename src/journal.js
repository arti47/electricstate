// The journal: the game and what you made of it, kept as one record.
//
// Play in solo mode is a diary. The game writes its beats into it, every roll a Traveler
// makes writes itself in and asks what it looked like, and you write lines of your own —
// freely, or as answers to a question the beat asks. Names you write can be kept as People,
// Places or Threads, and later beats bring them back. Firsts are celebrated once, each Stop
// is a chapter, each debrief closes a session, and the whole thing reads back as a book.
//
// Nothing here changes a rule. The deck question is the book's Tilt with a house yes/no
// reading on top; the meaning words are the house Goal/Threat seed tables; the readings are
// the book's own Chapter 8 NPC and conversation tables.
import { pick, d6, fromD100, shuffle } from "./core.js";
import { Settings } from "./settings.js";
import { getJournal, addJournal, onRoll, getMemory, touchMemory, getMilestones, markMilestone,
         getJourney, listCharacters, getSeen, setSeen } from "./store.js";
import { listStops, activeStop } from "./stops.js";
import { GOAL_SEEDS, THREAT_SEEDS } from "../data-names.js";
import { NPC_PERSONALITY, NPC_EMOTION, NPC_MOTIVE, NPC_METHOD, CONVERSATION_SUBJECTS } from "../data-solo.js";
import { maxHealth, maxHope, tracksBliss } from "./derived.js";

/** Solo play runs on the journal; a table with a GM keeps the dashboard for now. */
export const journalMode = () => {
  const m = Settings.playMode();
  return m === "solo" || (!m && Settings.solo());
};

// Every roll a Traveler makes writes itself in, waiting for you to say what it looked like.
onRoll((r) => {
  if (!journalMode() || !r.byId || !getJourney()) return;
  const dice = (r.dice || []).filter((v) => v >= 1 && v <= 6);
  if (!dice.length) return;
  addJournal({ kind: "roll", rollId: r.id, by: r.by, byId: r.byId, label: r.label || "Roll", dice, outcome: r.outcome || "" });
});

/** A line in your own words, free or as the answer to a question. */
export const write = (text, q = null) =>
  String(text || "").trim() ? addJournal({ kind: q ? "answer" : "mine", text: String(text).trim(), q }) : null;

// ---------------------------------------------------------------- questions
// What a beat asks you, if you would rather answer than write from nothing. Rotated with ↻.
const QUESTIONS = {
  opening: ["Who is awake, and who is pretending to sleep?", "What is on the radio?", "What did you leave behind this morning?"],
  road: ["What catches your eye out there?", "Who is talking, and about what?", "What does the car smell like today?"],
  arrived: ["Who sees you arrive?", "What is the first thing wrong here?", "What do you want from this place?"],
  scene: ["What do you do?", "Who speaks first?", "What does it cost you?"],
  pressure: ["What gives way?", "Who notices first?", "What do you protect?"],
  crisis: ["Who moves first?", "What is about to break?", "What do you risk?"],
  fighting: ["Who is hurt?", "What is the noise like?", "What do you grab?"],
  wrap: ["What do you take with you?", "What do you leave behind?", "Who will remember you here?"]
};
const ANYTIME = ["What happens next?", "What do you notice?", "What is going through your head?"];
export const questionFor = (beatId, n = 0) => {
  const list = QUESTIONS[beatId] || ANYTIME;
  return list[((n % list.length) + list.length) % list.length];
};

// ---------------------------------------------------------------- helpers
/** Two meaning words to read the moment by: one from each house seed table. */
export function meaningWords() {
  const words = [fromD100(GOAL_SEEDS), fromD100(THREAT_SEEDS)];
  return addJournal({ kind: "meaning-words", text: words.join(" · "), words });
}

/** Three ways to read what is happening, from the book's Chapter 8 tables. Labels, not prose. */
export function readings() {
  const options = [
    () => `Someone: ${pick(Object.values(NPC_PERSONALITY))}, ${pick(Object.values(NPC_EMOTION)).toLowerCase()}`,
    () => `What is wanted: ${pick(Object.values(NPC_MOTIVE))}`,
    () => `How it is done: ${pick(Object.values(NPC_METHOD))}`,
    () => `What it is really about: ${pick(CONVERSATION_SUBJECTS)}`
  ];
  return shuffle(options).slice(0, 3).map((f) => f());
}
export const chooseReading = (text) => addJournal({ kind: "reading", text });

/** A person, place or thread you kept, brought back now and then (one beat in three). */
export function callback() {
  const m = getMemory();
  const all = [
    ...m.people.map((x) => ["people", "Someone you met", x]),
    ...m.places.map((x) => ["places", "A place you know", x]),
    ...m.threads.map((x) => ["threads", "A loose thread", x])
  ];
  if (!all.length || d6() > 2) return null;
  // The least-revisited first, so the same name does not come back every time.
  const least = Math.min(...all.map(([, , x]) => x.seen || 0));
  const [kind, label, item] = pick(all.filter(([, , x]) => (x.seen || 0) === least));
  touchMemory(kind, item.id);
  return `${label}: ${item.name}.`;
}

/** Names worth keeping in a line you wrote: capitalised runs and anything in quotes. */
export function candidates(text) {
  const found = new Set();
  for (const m of String(text || "").matchAll(/["“']([^"”']{2,40})["”']/g)) found.add(m[1].trim());
  const small = /^(The|A|An|I|We|You|He|She|It|Then|And|But|So|When|What|Who|Where|There|This|That|My|Our|His|Her)$/;
  for (const m of String(text || "").matchAll(/\b([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)*)/g)) {
    // A sentence's first word is capitalised too: drop the small ones off the front.
    const words = m[1].split(/\s+/);
    while (words.length && small.test(words[0])) words.shift();
    if (words.length) found.add(words.join(" "));
  }
  return [...found].slice(0, 8);
}

// ---------------------------------------------------------------- chapters
/** Each Stop is a chapter: one heading when it begins, one line when it is behind you. */
export function syncChapters() {
  if (!journalMode()) return;
  const j = getJournal();
  const stop = activeStop();
  if (stop && !j.some((e) => e.kind === "chapter" && e.stopId === stop.id)) {
    const n = j.filter((e) => e.kind === "chapter").length + 1;
    addJournal({ kind: "chapter", stopId: stop.id, n, text: stop.name || `Stop ${n}` });
  }
  const stops = listStops();
  for (const ch of getJournal().filter((e) => e.kind === "chapter")) {
    const st = stops.find((x) => x.id === ch.stopId);
    if (st?.resolved && !getJournal().some((e) => e.kind === "chapter-end" && e.stopId === st.id)) {
      addJournal({ kind: "chapter-end", stopId: st.id, n: ch.n, text: `${st.name || "The Stop"} is behind you.` });
    }
  }
}

// ---------------------------------------------------------------- firsts
const FIRSTS = [
  ["first-words", "First words in the journal", (j) => j.some((e) => ["mine", "answer"].includes(e.kind) || (e.kind === "roll" && e.meaning))],
  ["first-roll", "First roll of the dice", (j) => j.some((e) => e.kind === "roll")],
  ["first-six", "First success", (j) => j.some((e) => e.kind === "roll" && e.dice.includes(6))],
  ["first-push", "Pushed your luck", (j) => j.some((e) => e.kind === "roll" && /pushed/i.test(e.label))],
  ["first-kept", "Something worth remembering", () => { const m = getMemory(); return m.people.length + m.places.length + m.threads.length > 0; }],
  ["first-stop", "The first Stop", (j) => j.some((e) => e.kind === "chapter")],
  ["first-fight", "Came through a fight", () => !!getJourney()?.fightEndedAt],
  ["first-stop-done", "A Stop behind you", (j) => j.some((e) => e.kind === "chapter-end")],
  ["first-session", "A whole session played", (j) => j.some((e) => e.kind === "session")]
];
/** Celebrate each first once: a line in the journal, and the titles back to the screen. */
export function syncMilestones() {
  if (!journalMode()) return [];
  const won = [];
  for (const [key, title, test] of FIRSTS) {
    if (getMilestones()[key] || !test(getJournal())) continue;
    if (markMilestone(key)) { addJournal({ kind: "milestone", key, text: title }); won.push(title); }
  }
  return won;
}

// ---------------------------------------------------------------- consequences
/**
 * What changed since Play last looked — Health, Hope, Bliss, the Countdown — written as one
 * line, so cause and effect sit together whichever screen the change happened on. Returns
 * which gauges moved, for the dash to animate. The first look only takes a baseline.
 */
export function syncConsequences() {
  if (!journalMode()) return {};
  const seen = getSeen();
  const next = { ...seen };
  const lines = [];
  const moved = {};
  for (const c of listCharacters()) {
    const now = { h: c.state?.health ?? maxHealth(c), p: c.state?.hope ?? maxHope(c), b: tracksBliss(c) ? (c.state?.bliss ?? 0) : 0 };
    const was = seen[c.id];
    if (was) {
      const parts = [];
      for (const [k, label] of [["h", "Health"], ["p", "Hope"], ["b", "Bliss"]]) {
        if (was[k] !== now[k]) { parts.push(`${label} ${was[k]} → ${now[k]}`); (moved[c.id] ||= []).push(k); }
      }
      if (parts.length) lines.push(`${(c.name || "Unnamed").split(" ")[0]}: ${parts.join(", ")}`);
    }
    next[c.id] = now;
  }
  const stop = activeStop();
  if (stop) {
    const key = `cd:${stop.id}`, now = stop.countdownProgress || 0;
    if (seen[key] != null && seen[key] !== now) { lines.push(`The Countdown moves: ${now} of ${stop.countdown?.length || "?"}`); moved.countdown = true; }
    next[key] = now;
  }
  if (JSON.stringify(next) !== JSON.stringify(seen)) setSeen(next);
  if (lines.length) addJournal({ kind: "consequence", text: lines.join(" · ") });
  return moved;
}

// ---------------------------------------------------------------- sessions
/** The debrief closes a session with a summary card of what it held. */
export function sessionSummary(session) {
  const j = getJournal().filter((e) => e.session === session);
  const rolls = j.filter((e) => e.kind === "roll");
  return {
    beats: j.filter((e) => e.kind === "beat").length,
    lines: j.filter((e) => ["mine", "answer"].includes(e.kind) || (e.kind === "roll" && e.meaning)).length,
    rolls: rolls.length,
    sixes: rolls.reduce((n, e) => n + e.dice.filter((v) => v === 6).length, 0),
    pushes: rolls.filter((e) => /pushed/i.test(e.label)).length,
    chapters: j.filter((e) => e.kind === "chapter").map((e) => e.text)
  };
}

// ---------------------------------------------------------------- the book
/** The journal as chapters: everything before the first Stop is the road out. */
export function chapters(entries = getJournal()) {
  const out = [{ title: "On the road", n: 0, entries: [] }];
  for (const e of entries) {
    if (e.kind === "chapter") out.push({ title: e.text, n: e.n, entries: [] });
    else out[out.length - 1].entries.push(e);
  }
  return out.filter((c) => c.entries.length || c.n);
}

/** The book as Markdown, for a file you can keep. */
export function bookMarkdown(title = "The Journey") {
  const line = (e) => {
    switch (e.kind) {
      case "beat": case "consequence": return `${String(e.text).replace(/([?!])\.(?=\s|$)/g, "$1")}\n`;
      case "choice": return `> ${e.text}\n`;
      case "mine": return `*${e.text}*\n`;
      case "answer": return `**${e.q}** *${e.text}*\n`;
      case "roll": return `🎲 ${e.by}: ${e.label} [${e.dice.join(" ")}] ${e.outcome}${e.meaning ? ` — *${e.meaning}*` : ""}\n`;
      case "oracle": return `**${e.q}** ${e.answer}\n`;
      case "meaning-words": return `Words: ${e.text}\n`;
      case "reading": return `Reading — ${e.text}\n`;
      case "milestone": return `★ ${e.text}\n`;
      case "chapter-end": return `\n_${e.text}_\n`;
      case "session": return `\n— End of session ${e.session} —\n`;
      default: return e.text ? `${e.text}\n` : "";
    }
  };
  return [`# ${title}\n`, ...chapters().map((c) => `\n## ${c.n ? `Chapter ${c.n}: ` : ""}${c.title}\n\n${c.entries.map(line).join("\n")}`)].join("");
}
