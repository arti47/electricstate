// Feature and content toggles. Off by default; explicit choice beats any default.
import { STORAGE_KEY } from "./core.js";

const KEY = STORAGE_KEY + ".settings";
let cache = null;

function all() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { cache = {}; }
  return cache;
}
export function get(flag) { return all()[flag]; }
export function set(flag, value) {
  const s = all(); s[flag] = value;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("settingschange", { detail: { flag, value } }));
}
export const isOn = (flag) => !!get(flag);

export const Settings = {
  solo: () => isOn("solo"),
  gmScreen: () => isOn("gmScreen"),
  mentalTrauma: () => get("mentalTrauma") !== false,   // on unless explicitly disabled
  manualDice: () => isOn("manualDice"),
  theme: () => get("theme") || "system"
};

export const TOGGLES = [
  { flag: "solo", label: "Solo mode", blurb: "Card-driven play without a GM, using the official Chapter 8 tables." },
  { flag: "gmScreen", label: "GM screen", blurb: "Stop builder, threat drop-in and every rollable GM table." },
  { flag: "manualDice", label: "Manual dice entry", blurb: "Type in results from physical dice instead of rolling on screen." },
  { flag: "mentalTrauma", label: "Mental trauma rules", blurb: "The book asks groups to agree before using these. Turn off to skip trauma entirely." }
];
