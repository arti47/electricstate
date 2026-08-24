// Coverage spec: does this app implement the document it is obliged to implement?
//
// The inverse of the reachability spec. That one walks code → user and finds shipped
// surface nobody can reach; this one walks source document → code and finds a documented
// feature that was never built. Neither substitutes for the other: a reachability suite
// stays green on an app missing half its rulebook, because an unimplemented feature leaves
// no artefact to detect.
//
// The map lives in docs/coverage.json and was built by reading the transcript, not by
// scanning the code — a list derived from the code maps onto the code by construction and
// proves nothing. This file only checks that the map has not gone stale.
//
// WHAT GREEN MEANS: every requirement claimed as implemented still has its code artefact,
// every entry cites where in the source it came from, and anything not implemented says why.
// WHAT GREEN DOES NOT MEAN: that any of it is correct. See the caveat in coverage.json.
//
//   node tests/coverage.mjs
import { readFileSync, existsSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const MAP = JSON.parse(readFileSync(ROOT + "docs/coverage.json", "utf8"));

const STATUSES = ["implemented", "partial", "deliberately-omitted", "unknown"];
const NEEDS_NOTE = ["partial", "deliberately-omitted", "unknown"];

const failures = [];
const fail = (id, msg) => failures.push(`${id}: ${msg}`);

/** Cache each file we look in, so 136 entries do not become 136 disk reads. */
const cache = new Map();
function fileText(path) {
  if (!cache.has(path)) {
    cache.set(path, existsSync(ROOT + path) ? readFileSync(ROOT + path, "utf8") : null);
  }
  return cache.get(path);
}

const seen = new Set();
for (const entry of MAP.entries) {
  const { id, source, summary, marker, status, note } = entry;

  if (!id) { fail("(no id)", "entry has no id"); continue; }
  if (seen.has(id)) fail(id, "duplicate id — ids are stable and never reused");
  seen.add(id);

  if (!STATUSES.includes(status)) fail(id, `status "${status}" is not one of ${STATUSES.join(" · ")}`);
  if (!summary) fail(id, "no summary");

  // A requirement with no citation cannot be checked against the book by a reader, which
  // makes it indistinguishable from something invented to match the code.
  if (!source || !/:\d+/.test(source)) fail(id, "no source citation with a line number");

  if (NEEDS_NOTE.includes(status) && !note) {
    fail(id, `status "${status}" with no note — say what is missing and why`);
  }
  if (status === "partial" && note && note.length < 40) {
    fail(id, "a partial note must say what is missing, not just that something is");
  }

  if (!marker || !marker.includes("#")) { fail(id, "no marker of the form file#symbol"); continue; }

  const [path, symbol] = marker.split("#");
  const text = fileText(path);
  if (text === null) { fail(id, `marker file ${path} does not exist`); continue; }

  // Only `implemented` promises a live artefact. The others point at where the feature
  // would live, or at the source itself, and are checked for the file only.
  if (status !== "implemented") continue;
  const found = new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`).test(text);
  if (!found) fail(id, `marked implemented, but ${path} no longer contains "${symbol}"`);
}

const counts = Object.fromEntries(STATUSES.map((s) => [s, MAP.entries.filter((e) => e.status === s).length]));
const total = MAP.entries.length;

console.log(`Coverage of ${MAP.sourceDocument.title} (${MAP.sourceDocument.edition})`);
console.log(`read from ${MAP.sourceDocument.readFrom}`);
console.log(`chapters read: ${MAP.sourceDocument.chaptersRead.join(", ")}`);
console.log(`chapters classified without a full read: ${MAP.sourceDocument.chaptersClassifiedWithoutFullRead.join(", ")}`);
console.log("");
for (const s of STATUSES) {
  const pct = ((counts[s] / total) * 100).toFixed(1).padStart(5);
  console.log(`${String(counts[s]).padStart(4)}  ${pct}%  ${s}`);
}
console.log(`${String(total).padStart(4)}          requirements mapped`);
console.log("\nA green run proves a mapping exists. It does not prove the implementation is correct.");

if (!failures.length) { console.log("\ncoverage spec: every mapping still holds"); process.exit(0); }
console.log("");
failures.forEach((f) => console.log("FAIL  " + f));
console.log(`\n${failures.length} coverage failure(s)`);
process.exit(1);
