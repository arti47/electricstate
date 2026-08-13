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
  keepAwake: () => isOn("keepAwake"),
  hideGmContent: () => isOn("hideGmContent"),
  theme: () => get("theme") || "system",
  textScale: () => Number(get("textScale")) || 1
};

export const TOGGLES = [
  { flag: "solo", label: "Solo mode", blurb: "Card-driven play without a GM, using the official Chapter 8 tables." },
  { flag: "gmScreen", label: "GM screen", blurb: "Stop builder, threat drop-in and every rollable GM table." },
  { flag: "manualDice", label: "Manual dice entry", blurb: "Type in results from physical dice instead of rolling on screen." },
  { flag: "mentalTrauma", label: "Mental trauma rules", blurb: "The book asks groups to agree before using these. Turn off to skip trauma entirely." },
  { flag: "keepAwake", label: "Keep the screen on", blurb: "Stops the phone sleeping mid-session. It is your battery." },
  { flag: "hideGmContent", label: "Hide GM content", blurb: "Blurs prepared Stops and unfired Countdown steps until tapped, for a device that gets passed around." }
];

export const TEXT_SCALES = [
  { value: 1, label: "Normal" },
  { value: 1.15, label: "Large" },
  { value: 1.3, label: "Larger" },
  { value: 1.5, label: "Largest" }
];

/**
 * Pinch-zoom is switched off so a stray gesture cannot derail a roll — which takes away
 * how low-vision users cope. This gives it back inside the app.
 */
export function applyTextScale() {
  document.documentElement.style.fontSize = `${Settings.textScale() * 100}%`;
}

/** Keep the screen awake while the app is in front, if the player asked for it. */
let wakeLock = null;
export async function applyWakeLock() {
  try {
    if (Settings.keepAwake() && !wakeLock && navigator.wakeLock && document.visibilityState === "visible") {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (!Settings.keepAwake() && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { wakeLock = null; }   // denied, unsupported, or the tab lost focus — not an error
}
