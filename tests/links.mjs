// Link spec: every field the app reads off its state must be written somewhere.
//
// The bug this exists for: the dice screen read `pending.gearRef` to know which item a
// pushed gear die should damage, and nothing ever set it — so for fifteen passes a push
// with gear never damaged any gear, while the coverage spec reported "implemented" because
// the function that would have done it existed. A field that is read and never written is
// a link with nothing on the other end. This walks src/ and finds every one.
//
//   node tests/links.mjs
import { readFileSync, readdirSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const files = [
  ...readdirSync(ROOT + "src").filter((f) => f.endsWith(".js")).map((f) => "src/" + f),
  ...readdirSync(ROOT).filter((f) => /^data.*\.js$/.test(f))
];
const strip = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

// The names the app keeps its state under. Module state (the roll on the table, the
// neurocasting session, the half-built Traveler) and persisted state (the Journey, a
// character's state, the solo record, a Stop, a fight, the session director).
const ROOTS = ["pending", "session", "draft", "j", "journey", "s", "stop", "combat", "c", "state",
  "ch\\.state", "c\\.state", "next\\.state", "current\\.state", "director\\(\\)", "state\\(\\)", "getJourney\\(\\)\\??"];

const reads = new Map();
const written = new Set();
for (const f of files) {
  const src = strip(readFileSync(ROOT + f, "utf8"));
  // writes: `key:` in an object literal, `.key =` / `.key +=`, shorthand `{ a, b }`, ["key"]
  // A key that only forwards the same field (`gearRef: pending.gearRef || null`) moves a
  // value along; it does not create one. That exact pattern hid the gear-damage bug.
  for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*:(?!:)([^,}\n]*)/g)) {
    if (new RegExp(`^\\s*[\\w$.()?\\[\\]]*\\.${m[1]}\\s*(?:\\|\\||\\?\\?|$)`).test(m[2])) continue;
    written.add(m[1]);
  }
  for (const m of src.matchAll(/\.([A-Za-z_$][\w$]*)\s*(?:=(?!=)|\+=|-=|\+\+|--|\|\|=|\?\?=)/g)) written.add(m[1]);
  for (const m of src.matchAll(/\{([\w\s,$.]+)\}/g)) for (const k of m[1].split(",")) {
    const name = k.trim().replace(/^\.\.\./, "");
    if (/^[A-Za-z_$][\w$]*$/.test(name)) written.add(name);
  }
  // shorthand properties inside mixed literals: `{ active: true, combatants }`
  for (const m of src.matchAll(/[{,]\s*([A-Za-z_$][\w$]*)\s*(?=[,}])/g)) written.add(m[1]);
  for (const m of src.matchAll(/["'`]([A-Za-z_$][\w$]*)["'`]/g)) written.add(m[1]);
  // reads off a state root
  const re = new RegExp(`(?<![\\w$./"'])(?:${ROOTS.join("|")})\\??\\.([A-Za-z_$][\\w$]*)(?![\\w$])(?!\\s*(?:=(?!=)|\\+=|-=|\\+\\+|--))`, "g");
  for (const m of src.matchAll(re)) {
    const k = m[1];
    if (!reads.has(k)) reads.set(k, new Set());
    reads.get(k).add(f);
  }
}

// Built-ins and methods are not state.
const NATIVE = new Set(["length", "map", "filter", "find", "some", "every", "forEach", "includes", "join", "slice",
  "push", "concat", "indexOf", "reduce", "keys", "values", "entries", "toString", "toLowerCase", "replace", "split",
  "trim", "sort", "at", "flat", "findIndex", "has", "get", "set", "delete", "add", "size", "then", "catch",
  "charAt", "charCodeAt", "className", "classList", "setAttribute", "innerHTML", "remove", "js"]);

const orphans = [...reads].filter(([k]) => !written.has(k) && !NATIVE.has(k));
for (const [k, fs] of orphans) console.log(`READ, NEVER WRITTEN  ${k.padEnd(22)} ${[...fs].join(", ")}`);

// ------------------------------------------------------------- module state
// A module variable is a second copy of something. Game state in one must be forgotten when
// the campaign changes — registered with core.onReset in the same file — or it leaks into
// the next game. The only others allowed are view-only, listed here with the reason.
const VIEW_ONLY = {
  "src/router.js": ["observer", "trayOpen", "trayHash", "enterTimer", "lastTab"],   // chrome, not game
  "src/scene.js": ["mounted"],                                                     // the background is built once
  "src/settings.js": ["cache", "wakeLock"],                                        // device settings, not campaign
  "src/sheet.js": ["lastShown", "lastOpts"],                                       // what the bar last showed, by id
  "src/sound.js": ["ctx"],
  "src/store.js": ["db", "undoState"],                                             // the store itself
  "src/ui.js": ["openModals"]
};
const leaks = [];
for (const f of files.filter((x) => x.startsWith("src/"))) {
  const src = strip(readFileSync(ROOT + f, "utf8"));
  const resets = [...src.matchAll(/onReset\(\s*\(\)\s*=>\s*\{([^}]*)\}/g)].map((m) => m[1]).join(" ");
  for (const m of src.matchAll(/^let\s+([A-Za-z_$][\w$]*)/gm)) {
    const name = m[1];
    if ((VIEW_ONLY[f] || []).includes(name)) continue;
    if (!new RegExp(`\\b${name}\\s*=`).test(resets)) leaks.push(`${f}: ${name}`);
  }
}
for (const l of leaks) console.log(`MODULE STATE NOT RESET  ${l}  (register it with onReset, or list it as view-only)`);

if (!orphans.length && !leaks.length) {
  console.log(`link spec: every state field read (${reads.size}) is written somewhere, and all module state resets with the campaign`);
  process.exit(0);
}
console.log(`\n${orphans.length + leaks.length} broken link(s).`);
process.exit(1);
