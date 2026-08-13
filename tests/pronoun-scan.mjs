// Scans user-facing text for plural pronouns standing in for one person.
//
// The app narrates a specific person constantly — "he loses his next turn" — so every
// character, Threat and NPC carries a gender and every sentence asks `src/pronouns.js`
// for the word. A "they" that slips back in is a regression, and it is invisible in
// review because it reads like ordinary English.
//
// Only string literals count: comments are for whoever is reading the source.
//
//   node tests/pronoun-scan.mjs
import { readFileSync, readdirSync } from "node:fs";

export const BANNED = /\b(they|them|their|theirs|themselves|themself|they're|they'd|they've|they'll)\b/i;

/**
 * Pull every string and template literal out of a JS source, with its line number.
 * Comments, regexes and escapes are skipped rather than parsed — this only has to be
 * right about where quotes begin and end.
 */
export function stringLiterals(src) {
  const out = [];
  let i = 0, line = 1;
  const isRegexPosition = () => {
    for (let k = out.lastPrev ?? i - 1; k >= 0; k--) {
      const c = src[k];
      if (c === " " || c === "\t" || c === "\n") continue;
      return "(,=:[!&|?{};+-*%<>~^".includes(c);
    }
    return true;
  };

  while (i < src.length) {
    const c = src[i];
    if (c === "\n") { line++; i++; continue; }

    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; }
      i += 2; continue;
    }
    if (c === "/" && isRegexPosition()) {
      i++;
      while (i < src.length && src[i] !== "/" && src[i] !== "\n") { if (src[i] === "\\") i++; i++; }
      i++; continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      const quote = c, start = line;
      let text = "";
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") { i += 2; text += " "; continue; }
        if (src[i] === "\n") line++;
        text += src[i];
        i++;
      }
      i++;
      // `${expr}` inside a template is code, not prose — `r.theirs` is a property name.
      out.push({ line: start, text: quote === "`" ? stripInterpolations(text) : text });
      continue;
    }
    i++;
  }
  return out;
}

/** Blank out every ${...} in a template literal, keeping the prose around it. */
export function stripInterpolations(text) {
  let out = "", depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (!depth && text[i] === "$" && text[i + 1] === "{") { depth = 1; i++; continue; }
    if (depth) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      continue;
    }
    out += text[i];
  }
  return out;
}

/**
 * Proper nouns the world already named. A real 1992 record is not the app's prose.
 */
export const ALLOWED = [
  "They Reminisce Over You — Pete Rock & CL Smooth"
];

/** Every offending literal in a file, as { line, text }. */
export function offenders(src) {
  return stringLiterals(src)
    .filter((s) => BANNED.test(s.text))
    .filter((s) => !ALLOWED.includes(s.text.trim()));
}

const ROOT = new URL("..", import.meta.url).pathname;

export function filesToScan() {
  return [
    ...readdirSync(new URL("../src", import.meta.url)).filter((f) => f.endsWith(".js")).map((f) => `src/${f}`),
    ...readdirSync(new URL("..", import.meta.url)).filter((f) => /^data.*\.js$/.test(f))
  ];
}

export function scanAll() {
  const hits = [];
  for (const file of filesToScan()) {
    for (const hit of offenders(readFileSync(ROOT + file, "utf8"))) hits.push({ file, ...hit });
  }
  return hits;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const hits = scanAll();
  for (const h of hits) console.log(`${h.file}:${h.line}  ${h.text.trim().slice(0, 110)}`);
  console.log(hits.length ? `\n${hits.length} plural pronoun(s) in user-facing text` : "pronoun scan: clean");
  process.exit(hits.length ? 1 : 0);
}
