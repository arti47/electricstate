// Top-level screen renderers. Phase 1-3 screens (wizard, sheet, roller) mount here later.
import { $, el } from "./core.js";
import { Settings, TOGGLES, set as setSetting, get as getSetting } from "./settings.js";
import { listCharacters, exportJSON, importJSON, getRollLog, resetAll } from "./store.js";
import { searchLibrary } from "./rules.js";
import { showToast, confirmModal } from "./ui.js";
import { ARCHETYPES } from "../data.js";

export function homeScreen() {
  const wrap = el("div");
  const chars = listCharacters();
  wrap.append(el("h1", {}, "Travelers"));

  if (!chars.length) {
    wrap.append(el("div", { class: "empty card" },
      el("p", {}, "No Travelers yet. The road is long and someone has to drive it."),
      el("a", { class: "btn btn-primary", href: "#/create" }, "Create a Traveler")));
  } else {
    const list = el("ul", { class: "list" });
    for (const c of chars) {
      list.append(el("li", {}, el("a", { href: `#/sheet/${c.id}` },
        el("div", { class: "card-row" },
          el("strong", {}, c.name || "Unnamed"),
          el("span", { class: "faint mono" }, `${c.state?.health ?? "–"}/${c.state?.hope ?? "–"}`)),
        el("div", { class: "faint" }, ARCHETYPES.find((a) => a.id === c.archetype)?.name || "—"))));
    }
    wrap.append(el("div", { class: "card" }, list));
    wrap.append(el("div", { class: "btn-row" },
      el("a", { class: "btn", href: "#/create" }, "New Traveler"),
      el("a", { class: "btn", href: "#/journey" }, "Journey"),
      el("a", { class: "btn", href: "#/time" }, "Time"),
      chars.length > 1 ? el("a", { class: "btn", href: "#/tension" }, "Tension") : null));
  }
  return wrap;
}

export function rulesScreen() {
  const wrap = el("div");
  wrap.append(el("h1", {}, "Rules"));
  const results = el("div");
  const input = el("input", {
    type: "search", placeholder: "Search rules…", "aria-label": "Search rules",
    oninput: (e) => render(e.target.value)
  });
  wrap.append(el("div", { class: "field" }, input), results);

  const focus = sessionStorage.getItem("ruleFocus");
  if (focus) sessionStorage.removeItem("ruleFocus");

  function render(q = "") {
    results.replaceChildren();
    const hits = searchLibrary(q);
    if (!hits.length) { results.append(el("p", { class: "empty" }, "Nothing matches that.")); return; }
    for (const entry of hits) {
      results.append(el("article", { class: "card", id: `rule-${entry.id}` },
        el("h3", {}, entry.title),
        el("p", { class: "muted" }, entry.text),
        el("div", {}, (entry.tags || []).map((t) => el("span", { class: "tag" + (t === "neuronics" ? " tag-neuro" : "") }, t)),
          entry.page ? el("span", { class: "faint" }, ` p.${entry.page}`) : null)));
    }
  }
  render();
  if (focus) {
    requestAnimationFrame(() => {
      const target = results.querySelector(`#rule-${focus}`);
      if (target) { target.scrollIntoView({ block: "center" }); target.style.borderColor = "var(--accent)"; }
    });
  }
  return wrap;
}

export function soloScreen() {
  return el("div", {}, el("h1", {}, "Solo"),
    el("div", { class: "empty card" }, el("p", {}, "The card oracle, tilts and NPC decks arrive in Phase 6.")));
}

export function gmScreen() {
  return el("div", {}, el("h1", {}, "GM"),
    el("div", { class: "empty card" }, el("p", {}, "The Stop builder and threat drop-in arrive in Phase 6.")));
}

export function rollLogScreen() {
  const log = getRollLog();
  const wrap = el("div", {}, el("h1", {}, "Roll log"));
  if (!log.length) { wrap.append(el("p", { class: "empty" }, "No rolls recorded yet.")); return wrap; }
  const list = el("ul", { class: "list" });
  for (const r of log) {
    list.append(el("li", {}, el("div", { class: "row", style: "padding:10px 4px" },
      el("div", { class: "card-row" }, el("strong", {}, r.label || "Roll"), el("span", { class: "mono faint" }, (r.dice || []).join(" "))),
      el("div", { class: "faint" }, r.outcome || ""))));
  }
  wrap.append(el("div", { class: "card" }, list));
  return wrap;
}

export function settingsScreen() {
  const wrap = el("div", {}, el("h1", {}, "Settings"));

  const theme = el("select", {
    "aria-label": "Theme",
    onchange: (e) => { setSetting("theme", e.target.value); applyTheme(); }
  },
    ...[["system", "Follow system"], ["dark", "Always dark"], ["light", "Always light"]]
      .map(([v, l]) => el("option", { value: v, selected: Settings.theme() === v }, l)));
  wrap.append(el("div", { class: "card" }, el("div", { class: "field" }, el("label", {}, "Theme"), theme)));

  const toggles = el("div", { class: "card" });
  for (const t of TOGGLES) {
    const current = t.flag === "mentalTrauma" ? Settings.mentalTrauma() : !!getSetting(t.flag);
    toggles.append(el("div", { class: "field" },
      el("div", { class: "card-row" },
        el("div", {}, el("strong", {}, t.label), el("div", { class: "faint" }, t.blurb)),
        el("input", {
          type: "checkbox", checked: current, "aria-label": t.label,
          style: "width:auto;min-height:auto",
          onchange: (e) => { setSetting(t.flag, e.target.checked); window.dispatchEvent(new CustomEvent("hashchange")); }
        }))));
  }
  wrap.append(el("h2", {}, "Features"), toggles);

  wrap.append(el("h2", {}, "Backup"),
    el("div", { class: "card" },
      el("p", { class: "faint" }, "Everything lives on this device until cloud sync arrives. Export regularly."),
      el("div", { class: "btn-row" },
        el("button", { class: "btn", onclick: doExport }, "Export JSON"),
        el("button", { class: "btn", onclick: doImport }, "Import JSON"),
        el("a", { class: "btn", href: "#/log" }, "Roll log"),
        el("button", { class: "btn btn-danger", onclick: doReset }, "Erase all"))));

  wrap.append(el("p", { class: "faint", style: "margin-top:24px" },
    "A personal play aid built from the owner's own copy of the rules. Not affiliated with the publisher."));
  return wrap;
}

function doExport() {
  const blob = new Blob([exportJSON()], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `electric-state-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  showToast("Backup exported.");
}

function doImport() {
  const input = el("input", { type: "file", accept: "application/json", style: "display:none" });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const count = importJSON(await file.text());
      showToast(`Imported ${count} Traveler${count === 1 ? "" : "s"}.`);
      location.hash = "#/home";
    } catch (err) {
      showToast(err.message || "Import failed.", "danger");
    } finally { input.remove(); }
  });
  document.body.append(input); input.click();
}

async function doReset() {
  if (await confirmModal("Erase everything?", "Every Traveler, the Journey and the roll log on this device will be deleted. Export first if you want a copy.", "Erase")) {
    resetAll(); showToast("All local data erased."); location.hash = "#/home";
  }
}

export function applyTheme() {
  const pref = Settings.theme();
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}
