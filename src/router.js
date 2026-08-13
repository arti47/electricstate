// Hash routing + conditional tab gating.
import { $, $$, el } from "./core.js";
import { Settings, set as setSetting } from "./settings.js";
import { listCharacters } from "./store.js";
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
import { hazardScreen, vehicleScreen } from "./hazards.js";

const ROUTES = [
  { path: "home", tab: "home", render: homeScreen },
  { path: "dice", tab: "dice", render: diceScreen },
  { path: "rules", tab: "rules", render: rulesScreen },
  { path: "tutorial", tab: "rules", render: tutorialScreen },
  { path: "log", tab: "dice", render: rollLogScreen },
  { path: "time", tab: "home", render: lifecycleScreen },
  { path: "neuro", tab: "dice", render: neuroScreen },
  { path: "combat", tab: "dice", render: combatScreen },
  { path: "hazards", tab: "dice", render: hazardScreen },
  { path: "driving", tab: "dice", render: vehicleScreen },
  { path: "solo", tab: "solo", render: soloScreen, gate: () => Settings.solo() },
  { path: "gm", tab: "gm", render: gmScreen, gate: () => Settings.gmScreen() },
  { path: "settings", tab: "settings", render: settingsScreen },
  { path: "create", tab: "home", render: wizardScreen },
  { path: "journey", tab: "home", render: journeyScreen },
  { path: "tension", tab: "home", render: tensionScreen },
  { path: "sheet", tab: "home", render: (id) => (id ? sheetScreen(id) : notYet("Character sheet", "Phase 2")) },
  { path: "injury", tab: "home", render: (id) => (id ? injuryScreen(id) : notYet("Injuries", "Phase 2")) }
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
    ["#/journey", "Journey"],
    ["#/time", "Time"],
    ["#/tension", "Tension", () => listCharacters().length > 1]
  ],
  dice: [
    ["#/dice", "Dice"],
    ["#/combat", "Combat"],
    ["#/neuro", "Neuroscape"],
    ["#/hazards", "Hazards"],
    ["#/driving", "Driving"],
    ["#/log", "Log"]
  ],
  rules: [["#/rules", "Rules"], ["#/tutorial", "Tutorial"]]
};

function subnav(route) {
  const items = (SUBNAV[route.tab] || []).filter(([, , when]) => !when || when());
  if (items.length < 2) return null;
  const here = `#/${route.path}`;
  const nav = el("nav", { class: "subnav", "aria-label": "Section" });
  for (const [href, label] of items) {
    nav.append(el("a", {
      href, class: "subnav-item" + (href === here ? " is-here" : ""),
      ...(href === here ? { "aria-current": "page" } : {})
    }, label));
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
  }[route.tab] || ["This screen", "Switched off in Settings."];

  return el("div", {},
    el("h1", {}, copy[0]),
    el("div", { class: "card" },
      el("p", { class: "muted" }, copy[1]),
      el("p", { class: "faint" }, "It is switched off, so its tab is hidden."),
      el("div", { class: "btn-row" },
        el("button", {
          class: "btn btn-primary",
          onclick: () => { setSetting(route.tab === "gm" ? "gmScreen" : "solo", true); location.hash = `#/${route.path}`; }
        }, "Turn it on"),
        el("a", { class: "btn", href: "#/settings" }, "Settings"))));
}

export function syncTabs() {
  $$("[data-tab]").forEach((a) => {
    const route = ROUTES.find((r) => r.tab === a.dataset.tab && r.gate);
    if (route) a.hidden = !route.gate();
  });
}

export function render() {
  const raw = (location.hash || "#/home").replace(/^#\/?/, "");
  const [path, param] = raw.split("/");
  const route = ROUTES.find((r) => r.path === path) || ROUTES[0];

  const screenEl = $("#screen");
  if (route.gate && !route.gate()) {
    screenEl.replaceChildren(gatedOff(route));
    syncTabs();
    return;
  }

  if (path !== "sheet" && path !== "injury") clearVitals();
  // The wizard and the sheet are places you go into, not siblings to flick between.
  const chrome = ["create", "sheet", "injury"].includes(path) ? null : subnav(route);
  screenEl.replaceChildren(...[chrome, route.render(param)].filter(Boolean));
  screenEl.focus({ preventScroll: true });
  window.scrollTo(0, 0);

  $$("[data-tab]").forEach((a) => {
    if (a.dataset.tab === route.tab) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  syncTabs();
}

export function startRouter() {
  window.addEventListener("hashchange", render);
  window.addEventListener("settingschange", () => { syncTabs(); render(); });
  window.addEventListener("storechange", () => {
    const path = (location.hash || "").replace(/^#\/?/, "").split("/")[0];
    if (path === "home" || path === "log" || path === "") render();
  });
  if (!location.hash) location.hash = "#/home";
  render();
}
