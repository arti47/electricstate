// Foundational constants, DOM helpers and raw dice. No imports.

export const CACHE_VERSION = "es-v3";
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

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const ceilHalf = (n) => Math.ceil(n / 2);
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2));

// ---------------------------------------------------------------- raw dice
export const d6 = () => 1 + Math.floor(Math.random() * 6);
export const rollDice = (n) => Array.from({ length: Math.max(0, n) }, d6);
export const countSixes = (dice) => dice.filter((d) => d === 6).length;
export const countOnes = (dice) => dice.filter((d) => d === 1).length;

/** D66: first die is tens, second is ones. Returns e.g. 41. */
export const d66 = () => d6() * 10 + d6();
/** Index of a D66 result within a 36-entry table stored in D66_ORDER sequence. */
export const d66Index = (roll) => (Math.floor(roll / 10) - 1) * 6 + ((roll % 10) - 1);
export const roll2d6 = () => d6() + d6();

/** "2d6", "d6", "3d6" → number. */
export function rollNotation(notation) {
  if (typeof notation === "number") return notation;
  const m = /^(\d*)d(\d+)$/i.exec(String(notation).trim());
  if (!m) return 0;
  const n = m[1] ? parseInt(m[1], 10) : 1;
  const faces = parseInt(m[2], 10);
  let total = 0;
  for (let i = 0; i < n; i++) total += 1 + Math.floor(Math.random() * faces);
  return total;
}

/** Pick from a table whose entries carry either `roll` or `range: [lo, hi]`. */
export function fromRangeTable(table, roll) {
  return table.find((e) => (e.range ? roll >= e.range[0] && roll <= e.range[1] : e.roll === roll)) || null;
}
