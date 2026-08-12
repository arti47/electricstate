// Hash routing + conditional tab gating.
import { $, $$, el } from "./core.js";
import { Settings } from "./settings.js";
import { homeScreen, rulesScreen, diceScreen, soloScreen, gmScreen, settingsScreen, rollLogScreen } from "./screens.js";

const ROUTES = [
  { path: "home", tab: "home", render: homeScreen },
  { path: "dice", tab: "dice", render: diceScreen },
  { path: "rules", tab: "rules", render: rulesScreen },
  { path: "log", tab: "dice", render: rollLogScreen },
  { path: "solo", tab: "solo", render: soloScreen, gate: () => Settings.solo() },
  { path: "gm", tab: "gm", render: gmScreen, gate: () => Settings.gmScreen() },
  { path: "settings", tab: "settings", render: settingsScreen },
  { path: "create", tab: "home", render: () => notYet("Creation wizard", "Phase 1") },
  { path: "sheet", tab: "home", render: () => notYet("Character sheet", "Phase 2") }
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
  const [path] = raw.split("/");
  const route = ROUTES.find((r) => r.path === path) || ROUTES[0];

  if (route.gate && !route.gate()) { location.hash = "#/home"; return; }

  const screen = $("#screen");
  screen.replaceChildren(route.render());
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
