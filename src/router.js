// Hash routing + conditional tab gating.
import { $, $$, el } from "./core.js";
import { Settings, set as setSetting } from "./settings.js";
import { listCharacters } from "./store.js";
import { getCombat, turnOrder } from "./combat.js";
import { releaseScrollLock } from "./ui.js";
import { icon } from "./icons.js";
import { STORAGE_KEY } from "./core.js";
import { homeScreen, rulesScreen, settingsScreen, rollLogScreen } from "./screens.js";
import { soloScreen } from "./solo.js";
import { gmScreen } from "./gm.js";
import { diceScreen } from "./roller.js";
import { wizardScreen, journeyScreen, tensionScreen } from "./wizard.js";
import { sheetScreen, injuryScreen, clearVitals } from "./sheet.js";
import { lifecycleScreen } from "./lifecycle.js";
import { neuroScreen } from "./neurocasting.js";
import { combatScreen } from "./combat.js";
import { tutorialScreen } from "./tutorial.js";
import { playScreen } from "./play.js";
import { sessionScreen } from "./session.js";
import { hazardScreen, vehicleScreen } from "./hazards.js";

// Four tabs. Play holds the session and everything around it (Solo and the GM screen are
// ways of playing, not places of their own); Traveler is the sheet; Dice is every roll;
// Reference is everything you read. Settings lives in the header — it is visited twice.
const ROUTES = [
  { path: "home", tab: "home", render: homeScreen },
  { path: "dice", tab: "dice", render: diceScreen },
  { path: "rules", tab: "rules", render: rulesScreen },
  { path: "tutorial", tab: "rules", render: tutorialScreen },
  { path: "play", tab: "rules", render: playScreen },
  { path: "session", tab: "home", render: sessionScreen },
  { path: "log", tab: "dice", render: rollLogScreen },
  { path: "time", tab: "home", render: lifecycleScreen },
  { path: "neuro", tab: "dice", render: neuroScreen },
  { path: "combat", tab: "dice", render: combatScreen },
  { path: "hazards", tab: "dice", render: hazardScreen },
  { path: "driving", tab: "dice", render: vehicleScreen },
  { path: "solo", tab: "home", gated: "solo", render: soloScreen, gate: () => Settings.solo() },
  { path: "gm", tab: "home", gated: "gm", render: gmScreen, gate: () => Settings.gmScreen() },
  { path: "settings", tab: null, render: settingsScreen },
  { path: "create", tab: "traveler", render: wizardScreen },
  { path: "journey", tab: "home", render: journeyScreen },
  { path: "tension", tab: "home", render: tensionScreen },
  { path: "sheet", tab: "traveler", render: (id) => (id ? sheetScreen(id) : notYet("Character sheet", "Phase 2")) },
  { path: "injury", tab: "traveler", render: (id) => (id ? injuryScreen(id) : notYet("Injuries", "Phase 2")) }
];

/**
 * Second level of navigation. Twelve of the eighteen routes hang off two tabs, and were
 * reachable only from a button row at the foot of one screen — which in a fight means
 * scrolling past the whole dice builder to find Combat. These are the siblings of
 * wherever you are, at the top, always.
 */
const SUBNAV = {
  home: [
    ["#/home", "Travelers"],
    ["#/session", "Play"],
    ["#/solo", "Solo", () => Settings.solo()],
    ["#/gm", "GM", () => Settings.gmScreen()],
    ["#/journey", "Journey"],
    ["#/time", "Time"],
    ["#/tension", "Tension", () => listCharacters().length > 1]
  ],
  dice: [
    ["#/dice", "Dice"],
    // A running fight is state you need from anywhere, so the nav carries it.
    ["#/combat", "Combat", null, () => (getCombat()?.active ? `R${getCombat().round}` : null)],
    ["#/neuro", "Neuroscape"],
    ["#/hazards", "Hazards"],
    ["#/driving", "Driving"],
    ["#/log", "Log"]
  ],
  rules: [["#/play", "Running a session"], ["#/rules", "Rules"], ["#/tutorial", "The app"]]
};

function subnav(route) {
  const items = (SUBNAV[route.tab] || []).filter(([, , when]) => !when || when());
  if (items.length < 2) return null;
  const here = `#/${route.path}`;
  const nav = el("nav", { class: "subnav", "aria-label": "Section" });
  for (const [href, label, , badge] of items) {
    const mark = badge ? badge() : null;
    nav.append(el("a", {
      href, class: "subnav-item" + (href === here ? " is-here" : "") + (mark ? " is-live" : ""),
      ...(href === here ? { "aria-current": "page" } : {})
    }, label, mark ? el("span", { class: "subnav-badge" }, mark) : null));
  }
  return nav;
}

function notYet(what, phase) {
  return el("div", {}, el("h1", {}, what),
    el("div", { class: "empty card" }, el("p", {}, `${what} arrives in ${phase}.`),
      el("a", { class: "btn", href: "#/home" }, "Back")));
}

/** A gated surface reached while switched off: explain it and offer to turn it on. */
function gatedOff(route) {
  const copy = {
    solo: ["Solo mode", "Card-driven play without a GM: the deck as a pacing timer, Tilts, NPC generation and Stop building, all from the book's Chapter 8."],
    gm: ["The GM screen", "A party panel that watches Bliss against Hope, a Stop builder, threat stat blocks and every rollable table in the book."]
  }[route.gated] || ["This screen", "Switched off in Settings."];

  return el("div", {},
    el("h1", {}, copy[0]),
    el("div", { class: "card" },
      el("p", { class: "muted" }, copy[1]),
      el("p", { class: "faint" }, "It is switched off, so it is hidden from the Play section."),
      el("div", { class: "btn-row" },
        el("button", {
          class: "btn btn-primary",
          onclick: () => { setSetting(route.gated === "gm" ? "gmScreen" : "solo", true); location.hash = `#/${route.path}`; }
        }, "Turn it on"),
        el("a", { class: "btn", href: "#/settings" }, "Settings"))));
}

const LAST_SHEET = STORAGE_KEY + ".lastSheet";

/** The Traveler tab opens whoever you last looked at, or the first, or creation. */
function travelerHref() {
  const chars = listCharacters();
  if (!chars.length) return "#/create";
  let last = null;
  try { last = localStorage.getItem(LAST_SHEET); } catch { /* private mode */ }
  const ch = chars.find((c) => c.id === last) || chars[0];
  return `#/sheet/${ch.id}`;
}

export function syncTabs() {
  const t = document.querySelector('[data-tab="traveler"]');
  if (t) t.setAttribute("href", travelerHref());
}

/**
 * A running fight follows you: one line under the header on every screen but the
 * tracker, naming the round and whoever is up. Tapping it goes back to the fight.
 */
function syncStrip(path) {
  const strip = $("#strip");
  if (!strip) return;
  const c = getCombat();
  if (!c?.active || path === "combat") { strip.hidden = true; strip.replaceChildren(); return; }
  const { upNext } = turnOrder(c);
  strip.replaceChildren(
    el("span", { class: "strip-round" }, `R${c.round}`),
    el("span", { class: "strip-who" }, upNext ? `${upNext.name} is up` : "Everyone has gone"),
    icon("chevron", { size: 18 }));
  strip.setAttribute("aria-label", `Combat, round ${c.round}${upNext ? ` — ${upNext.name} is up` : ""}`);
  strip.hidden = false;
}

// ---------------------------------------------------------------- title line
/**
 * Every screen leads with a title, and its own "what this does" note sits at the right
 * end of that line as an ⓘ. Where a section nav exists it *is* the title: the screen you
 * are on is set large, its siblings small beside it, and the H1 underneath — which only
 * repeated the same word — is kept for screen readers.
 *
 * Screens re-render themselves in place (the dice builder after every tap), so this is
 * applied by an observer rather than once after the route renders.
 */
const SEEN = STORAGE_KEY + ".seenIntro";
function seenIntros() { try { return JSON.parse(localStorage.getItem(SEEN) || "[]"); } catch { return []; } }

function decorate(screenEl, path) {
  const nav = screenEl.querySelector(":scope > .subnav .subnav-item.is-here");
  const h1 = screenEl.querySelector("h1");
  if (h1) h1.classList.toggle("sr-only", !!nav);
  const lead = screenEl.querySelector("details.explain");
  if (lead && !lead.classList.contains("is-lead")) {
    screenEl.querySelectorAll("details.explain.is-lead").forEach((d) => { if (d !== lead) d.classList.remove("is-lead"); });
    lead.classList.add("is-lead");
    // The first time a screen is seen its note opens in place, once; after that it waits
    // behind the ⓘ.
    const seen = seenIntros();
    if (!seen.includes(path)) {
      lead.open = true;
      lead.classList.add("is-intro");
      try { localStorage.setItem(SEEN, JSON.stringify([...seen, path])); } catch { /* private mode */ }
    }
  }
}

let observer = null;
function watchScreen(screenEl, path) {
  observer?.disconnect();
  observer = new MutationObserver(() => decorate(screenEl, path));
  observer.observe(screenEl, { childList: true, subtree: true });
  decorate(screenEl, path);
}

// ------------------------------------------------------------------ dice tray
let trayOpen = false;
let trayHash = "";
export function openTray() {
  const tray = $("#tray");
  if (!tray || trayOpen) return;
  trayOpen = true;
  trayHash = location.hash;
  const close = () => closeTray();
  const scrim = el("div", { class: "tray-scrim", onclick: close });
  scrim.id = "trayScrim";
  document.body.append(scrim);
  tray.replaceChildren(
    el("div", { class: "tray-head" },
      el("span", { class: "tray-title" }, "Dice"),
      el("div", { class: "btn-row" },
        el("a", { class: "icon-btn", href: "#/log", title: "Roll log", "aria-label": "Roll log", onclick: close }, icon("book")),
        el("button", { class: "icon-btn", "aria-label": "Close the dice tray", onclick: close }, icon("close")))),
    el("div", { class: "tray-body" }, diceScreen()));
  tray.hidden = false;
  document.body.classList.add("tray-open");
  $("#trayBtn")?.classList.add("is-on");
  tray.querySelector("button")?.focus({ preventScroll: true });
}
export function closeTray({ rerender = true } = {}) {
  const tray = $("#tray");
  if (!tray || !trayOpen) return;
  trayOpen = false;
  tray.hidden = true;
  tray.replaceChildren();
  $("#trayScrim")?.remove();
  document.body.classList.remove("tray-open");
  $("#trayBtn")?.classList.remove("is-on");
  if (rerender) render();   // the tray borrowed the vitals bar; give it back to the screen
}

export function render() {
  const raw = (location.hash || "#/home").replace(/^#\/?/, "");
  const [path, param] = raw.split("/");
  const route = ROUTES.find((r) => r.path === path) || ROUTES[0];

  // Nothing open must ever leave the page frozen. Belt and braces on top of the modal's
  // own bookkeeping: a leaked scroll lock is indistinguishable from a broken app.
  releaseScrollLock();
  // Going somewhere else puts the tray away; the screen being re-drawn under it does not.
  if (trayOpen && location.hash !== trayHash) closeTray({ rerender: false });

  const screenEl = $("#screen");
  markTabs(route);
  syncTabs();
  syncStrip(route.path);
  const trayBtn = $("#trayBtn");
  if (trayBtn) trayBtn.hidden = route.path === "dice";
  $("#settingsBtn")?.toggleAttribute("aria-current", route.path === "settings");

  if (route.gate && !route.gate()) {
    screenEl.replaceChildren(...[subnav(route), gatedOff(route)].filter(Boolean));
    watchScreen(screenEl, route.path);
    return;
  }

  if (path === "sheet" && param) { try { localStorage.setItem(LAST_SHEET, param); } catch { /* private mode */ } }
  if (path !== "sheet" && path !== "injury") clearVitals();
  // The wizard and the sheet are places you go into, not siblings to flick between.
  const chrome = ["create", "sheet", "injury"].includes(path) ? null : subnav(route);
  screenEl.replaceChildren(...[chrome, route.render(param)].filter(Boolean));
  watchScreen(screenEl, route.path);
  // The section you are in may be scrolled out of its own nav; bring it into view.
  screenEl.querySelector(".subnav-item.is-here")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  screenEl.classList.remove("is-entering");
  void screenEl.offsetWidth;
  screenEl.classList.add("is-entering");
  screenEl.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  syncStrip(route.path);
}

function markTabs(route) {
  $$("[data-tab]").forEach((a) => {
    if (a.dataset.tab === route.tab) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

export function startRouter() {
  window.addEventListener("hashchange", render);
  window.addEventListener("settingschange", () => { syncTabs(); render(); });
  window.addEventListener("storechange", () => {
    const path = (location.hash || "").replace(/^#\/?/, "").split("/")[0];
    syncStrip(path);
    syncTabs();
    if (trayOpen) return;
    if (path === "home" || path === "log" || path === "") render();
  });
  $("#trayBtn")?.addEventListener("click", () => (trayOpen ? closeTray() : openTray()));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && trayOpen && !document.querySelector(".modal-backdrop")) closeTray(); });
  if (!location.hash) location.hash = "#/home";
  render();
}
