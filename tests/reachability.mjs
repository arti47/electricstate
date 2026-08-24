// Reachability spec: shipped-but-unreachable surface.
//
// The inverse of the coverage spec. That one walks source document → code and finds a
// documented feature nobody built; this one walks code → user and finds code nobody can
// get to. A reachability defect is not a crash and not a wrong answer — it is a thing that
// exists and cannot be reached, which is why no amount of testing the happy path finds one.
//
// This project's recurring defect, across seventeen audit passes, is exactly class 2:
// data extracted faithfully, unit-tested, documented — and never called by anything.
//
//   node tests/reachability.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(ROOT + p, "utf8");

const SRC = readdirSync(ROOT + "src").filter((f) => f.endsWith(".js")).map((f) => `src/${f}`);
const DATA = readdirSync(ROOT).filter((f) => /^data.*\.js$/.test(f));
const ALL_JS = [...SRC, ...DATA];
const HTML = ["index.html"];

const text = Object.fromEntries([...ALL_JS, ...HTML].map((f) => [f, read(f)]));
const everyJs = ALL_JS.map((f) => text[f]).join("\n");
const everything = [...ALL_JS, ...HTML].map((f) => text[f]).join("\n");

/**
 * Deliberate exemptions. Each says why, so a later reader can tell an accepted exception
 * from a regression. An unexplained entry here is how a detector becomes noise everyone mutes.
 */
const EXEMPT = {
  exports: {
    // Re-exported for callers outside the module graph, or kept as the public surface of a
    // module whose consumers are tests.
    "core.js:CACHE_VERSION": "read by the service worker, which is not an ES module and cannot import it",
    "core.js:STORAGE_KEY": "the store's key, also used by tests through the raw localStorage seam",
    "pronouns.js:indep": "the independent possessive (his/hers). Complete pronoun sets are the point of the module; a partial one invites a wrong word later",
    "pronouns.js:pronouns": "the whole set, for a caller that needs more than one word",
    "pronouns.js:genderLabel": "used by solo NPC display; kept exported for any screen that names a gender",
    "data-library.js:GLOSSARY_BY_TERM": "the by-term index behind rules.glossary()",
    "data-library.js:BY_ID": "the by-id index behind rules.rule()"
  },
  data: {
    // Provenance and documentation constants: they exist to record where a number came
    // from, and are meant to be read by a person, not called by the engine.
    "HOUSE_AID": "a flag marking a file as invented rather than extracted",
    "META": "book metadata — title, publisher, edition",
    "D66_ORDER": "the canonical D66 sequence, used to index every 36-row table",
    "ANYTHING_WORDS": "the ten Mythic anything-words, appended to every meaning table",
    "SEED_ROLLS": "how many words a seed roll draws",
    "INTERNAL_THREATS_ALLOWED": "records that solo play permits internal Threats the group rules avoid",
    "PERSONAL_GOAL_TABLE": "deliberately null: ruling A17 records that the book references a personal Goal table it never prints. Deleting it would lose the finding",
    "DESCRIPTOR_ROLLS": "how many words a description draws — one from each of the three tables",
    "USE_ANYTHING_WORDS": "records that the meaning tables carry the ten Mythic anything-words",
    "KICKER_IS_CONTENT_TABLE": "records that the Kicker table hands over a finished event rather than words to interpret (see docs/app/TABLE-AUDIT.md)",
    "THREAT_RULES": "provenance for the three rules the engine implements by construction — Threats have no Hope, never push, make no death rolls. Pinned behaviourally in tests/run.js",
    "VEHICLE_DAMAGE": "provenance: its values are prose conditions (\"damage >= hull\"), not numbers an engine can read. The implemented half lives in src/hazards.js; the unimplemented half is recorded as partial in docs/coverage.json"
  }
};

const findings = { };
const record = (cls, items) => { findings[cls] = items; };

// ---------------------------------------------------------------- 1 orphan functions
// A declared function nothing calls, exports, or hands to a listener.
{
  const orphans = [];
  for (const file of ALL_JS) {
    const src = text[file];
    const declared = [...src.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
    for (const name of declared) {
      // Count every mention outside the declaration itself.
      const uses = (everything.match(new RegExp(`\\b${name}\\b`, "g")) || []).length;
      const declarations = (everyJs.match(new RegExp(`function\\s+${name}\\b`, "g")) || []).length;
      if (uses - declarations <= 0) orphans.push(`${file}:${name}`);
    }
  }
  record("orphan functions", orphans);
}

// ------------------------------------------------------------------ 2 orphan content
// The one that keeps happening here: a table extracted from the book and never surfaced.
{
  const orphans = [];
  for (const file of DATA) {
    const consts = [...text[file].matchAll(/^export const ([A-Z][A-Z0-9_]*)/gm)].map((m) => m[1]);
    for (const name of consts) {
      if (EXEMPT.data[name]) continue;
      const word = new RegExp(`\\b${name}\\b`, "g");
      const importedSomewhere = SRC.some((f) => word.test(text[f]) && (word.lastIndex = 0) === 0);
      const usedByAnotherTable = DATA.filter((f) => f !== file)
        .some((f) => word.test(text[f]) && (word.lastIndex = 0) === 0);
      // TRAP: a table composed into another table in the same file (DESC_BUILD feeding
      // DESCRIPTOR_TABLES) is used, not orphaned. Count mentions beyond the declaration
      // and the default-export list, both of which name it without using it.
      const mentions = (text[file].match(word) || []).length;
      const bookkeeping = 1 + (new RegExp(`export default[^;]*\\b${name}\\b`).test(text[file]) ? 1 : 0);
      const usedInOwnFile = mentions > bookkeeping;
      if (!importedSomewhere && !usedByAnotherTable && !usedInOwnFile) orphans.push(`${file}:${name}`);
    }
  }
  record("orphan content", orphans);
}

// ------------------------------------------------------------- 3 unrevealed elements
// Markup that ships hidden and that no code path ever shows. TRAP: ids assigned at runtime
// (el.id = "x") never appear as literals, so check the property the code actually sets.
{
  const html = text["index.html"];
  const hiddenIds = [...html.matchAll(/id="([\w-]+)"[^>]*\bhidden\b/g)].map((m) => m[1]);
  // TRAP: an "is it ever shown" test must be tied to the id. A bare /hidden = false/ over
  // the whole corpus matches some other element's reveal and marks everything as shown —
  // a detector that can never fire. Revealing an element means looking it up first, so the
  // honest question is whether any code mentions this id at all.
  const unrevealed = hiddenIds.filter((id) => !new RegExp(`["'#\`]${id}\\b`).test(everyJs));
  record("unrevealed elements", unrevealed);
}

// -------------------------------------------------------------------- 4 inert controls
// A control in the static markup with no handler and no id anything looks up.
{
  const html = text["index.html"];
  const inert = [];
  for (const m of html.matchAll(/<button\b[^>]*>/g)) {
    const tag = m[0];
    if (/\bonclick=/.test(tag)) continue;
    const id = /id="([\w-]+)"/.exec(tag)?.[1];
    if (!id) { inert.push(tag.slice(0, 60)); continue; }
    if (!new RegExp(`["'#]${id}["']`).test(everyJs)) inert.push(`#${id}`);
  }
  record("inert controls", inert);
}

// ------------------------------------------------------- 5 broken navigation targets
// Every "#/route" the app links to must be a route the router knows.
{
  const router = text["src/router.js"];
  const known = new Set([...router.matchAll(/path:\s*"([\w-]+)"/g)].map((m) => m[1]));
  const broken = new Set();
  for (const file of ALL_JS) {
    for (const m of text[file].matchAll(/["'`]#\/([\w-]+)/g)) {
      const route = m[1];
      if (route === "__reset") continue;            // the tests' deliberate no-such-route
      if (!known.has(route)) broken.add(`${file} → #/${route}`);
    }
  }
  record("broken navigation targets", [...broken]);
}

// ------------------------------------------------------------- 6 dead-end guards
// A rule library entry pointing at a rule id that does not exist, so "Rules: … →" goes nowhere.
{
  const library = text["data-library.js"];
  const ids = new Set([...library.matchAll(/\{\s*id:\s*"(\w+)"/g)].map((m) => m[1]));
  const broken = [];
  for (const m of library.matchAll(/see:\s*"(\w+)"/g)) {
    if (!ids.has(m[1])) broken.push(`glossary → ${m[1]}`);
  }
  // ruleLink(id) callers: the id must resolve or the link renders nothing.
  for (const file of SRC) {
    for (const m of text[file].matchAll(/ruleLink\("(\w+)"\)/g)) {
      if (!ids.has(m[1])) broken.push(`${file} ruleLink(${m[1]})`);
    }
  }
  record("dead-end guards", broken);
}

// ------------------------------------------------------------- 7 missing shipped files
{
  const sw = read("service-worker.js");
  const shell = [...sw.matchAll(/"\.\/([^"]+)"/g)].map((m) => m[1]).filter(Boolean);
  const missing = shell.filter((f) => !existsSync(ROOT + f));
  // And the reverse: a source file the worker never ships is a file an installed app cannot load.
  const unshipped = ALL_JS.filter((f) => !shell.includes(f));
  record("missing shipped files", [...missing.map((f) => `declared, absent: ${f}`),
                                   ...unshipped.map((f) => `on disk, never cached: ${f}`)]);
}

// ------------------------------------------------------- 8 unclosable/unopenable modals
// Every modal this app opens comes from ui.modal(), which always renders a way out; the
// defect to guard is a caller closing one by hand, which leaks the open-modal count and
// leaves the page unable to scroll. TRAP: match visible closers only — see AUDIT.md pass 14.
{
  const offenders = [];
  for (const file of SRC) {
    if (file === "src/ui.js") continue;
    if (/querySelector\(["']\.modal-backdrop["']\)\s*(\?\.)?remove/.test(text[file])) {
      offenders.push(`${file} removes a backdrop by hand instead of ui.dismissModal()`);
    }
  }
  const ui = text["src/ui.js"];
  if (!/actions\.length/.test(ui)) offenders.push("ui.modal no longer guards against a dialog with no actions");
  record("hand-closed modals", offenders);
}

// -------------------------------------------------------------------------- report
let total = 0;
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("class", 30) + "count  offenders");
for (const [cls, items] of Object.entries(findings)) {
  total += items.length;
  console.log(pad(cls, 30) + String(items.length).padStart(5) + "  " + (items.join(" · ").slice(0, 90) || "—"));
}

const exemptCount = Object.keys(EXEMPT.exports).length + Object.keys(EXEMPT.data).length;
console.log(`\n${exemptCount} documented exemptions (see EXEMPT in this file, each with its reason).`);

if (!total) { console.log("\nreachability spec: nothing ships that a user cannot reach"); process.exit(0); }
console.log("");
for (const [cls, items] of Object.entries(findings)) {
  for (const i of items) console.log(`FAIL  ${cls}: ${i}`);
}
console.log(`\n${total} reachability defect(s)`);
process.exit(1);
