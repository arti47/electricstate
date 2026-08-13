// Foundational constants, DOM helpers and raw dice. No imports.

export const CACHE_VERSION = "es-v40";
export const STORAGE_KEY = "electricState.v1";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/**
 * Append children, skipping the empty ones. `el()` already drops nullish children, but a
 * bare `node.append(x)` stringifies null into the page — which is how a literal "null"
 * once rendered above the home screen's New Traveler button.
 */
export function add(parent, ...children) {
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    parent.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return parent;
}

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const ceilHalf = (n) => Math.ceil(n / 2);
export const uid = () => crypto.randomUUID();

// ------------------------------------------------------------- randomness
/**
 * Every random number in the app comes from here.
 *
 * `Math.random()` is unseeded, unspecified across engines, and — the part that matters at a
 * table — indefensible when a player asks whether the dice are fair. `crypto.getRandomValues`
 * is older than both ES modules and service workers, so anything that can run this app has it.
 *
 * Uniform integer in [0, max). Rejection sampling, because `value % max` is biased whenever
 * max does not divide 2^32: the low values would come up fractionally more often, which is
 * exactly the accusation a dice roller has to be able to answer.
 */
export function randomInt(max) {
  if (max <= 0) return 0;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let value;
  do { crypto.getRandomValues(buf); value = buf[0]; } while (value >= limit);
  return value % max;
}

/** Uniform choice from an array. */
export const pick = (list) => list[randomInt(list.length)];

/** Fisher–Yates, on a copy. */
export function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------- raw dice
export const die = (faces) => 1 + randomInt(faces);
export const d6 = () => die(6);
export const rollDice = (n) => Array.from({ length: Math.max(0, n) }, d6);
export const countSixes = (dice) => dice.filter((d) => d === 6).length;
export const countOnes = (dice) => dice.filter((d) => d === 1).length;

/** D66: first die is tens, second is ones. Returns e.g. 41. */
export const d66 = () => d6() * 10 + d6();
/** Index of a D66 result within a 36-entry table stored in D66_ORDER sequence. */
export const d66Index = (roll) => (Math.floor(roll / 10) - 1) * 6 + ((roll % 10) - 1);
export const roll2d6 = () => d6() + d6();
/** d100, returned 1-100. Tables are stored as 100-entry arrays indexed by roll - 1. */
export const d100 = () => die(100);
export const fromD100 = (table) => table[d100() - 1];

/** "2d6", "d6", "3d6" → number. */
export function rollNotation(notation) {
  if (typeof notation === "number") return notation;
  const m = /^(\d*)d(\d+)$/i.exec(String(notation).trim());
  if (!m) return 0;
  const n = m[1] ? parseInt(m[1], 10) : 1;
  const faces = parseInt(m[2], 10);
  let total = 0;
  for (let i = 0; i < n; i++) total += die(faces);
  return total;
}

/** Pick from a table whose entries carry either `roll` or `range: [lo, hi]`. */
export function fromRangeTable(table, roll) {
  return table.find((e) => (e.range ? roll >= e.range[0] && roll <= e.range[1] : e.roll === roll)) || null;
}
