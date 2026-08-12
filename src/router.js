// Hash routing + conditional tab gating.
import { $, $$, el } from "./core.js";
import { Settings } from "./settings.js";
import { homeScreen, rulesScreen, soloScreen, gmScreen, settingsScreen, rollLogScreen } from "./screens.js";
import { diceScreen } from "./roller.js";
import { wizardScreen, journeyScreen, tensionScreen } from "./wizard.js";
import { sheetScreen, injuryScreen, clearVitals } from "./sheet.js";
import { lifecycleScreen } from "./lifecycle.js";
import { neuroScreen } from "./neurocasting.js";

const ROUTES = [
  { path: "home", tab: "home", render: homeScreen },
  { path: "dice", tab: "dice", render: diceScreen },
  { path: "rules", tab: "rules", render: rulesScreen },
  { path: "log", tab: "dice", render: rollLogScreen },
  { path: "time", tab: "home", render: lifecycleScreen },
  { path: "neuro", tab: "dice", render: neuroScreen },
  { path: "solo", tab: "solo", render: soloScreen, gate: () => Settings.solo() },
  { path: "gm", tab: "gm", render: gmScreen, gate: () => Settings.gmScreen() },
  { path: "settings", tab: "settings", render: settingsScreen },
  { path: "create", tab: "home", render: wizardScreen },
  { path: "journey", tab: "home", render: journeyScreen },
  { path: "tension", tab: "home", render: tensionScreen },
  { path: "sheet", tab: "home", render: (id) => (id ? sheetScreen(id) : notYet("Character sheet", "Phase 2")) },
  { path: "injury", tab: "home", render: (id) => (id ? injuryScreen(id) : notYet("Injuries", "Phase 2")) }
];

function notYet(what, phase) {
  return el("div", {}, el("h1", {}, what),
    el("div", { class: "empty card" }, el("p", {}, `${what} arrives in ${phase}.`),
      el("a", { class: "btn", href: "#/home" }, "Back")));
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

  if (route.gate && !route.gate()) { location.hash = "#/home"; return; }

  const screen = $("#screen");
  if (path !== "sheet" && path !== "injury") clearVitals();
  screen.replaceChildren(route.render(param));
  screen.focus({ preventScroll: true });
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
