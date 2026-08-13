// Top-level screen renderers. Phase 1-3 screens (wizard, sheet, roller) mount here later.
import { $, el } from "./core.js";
import { Settings, TOGGLES, set as setSetting, get as getSetting } from "./settings.js";
import { listCharacters, exportJSON, importJSON, getRollLog, rollLogKey, filterRollLog,
         clearRollLog, resetAll } from "./store.js";
import { searchLibrary } from "./rules.js";
import { showToast, confirmModal, explain } from "./ui.js";
import { ARCHETYPES } from "../data.js";
import { TRAUMA_CONSENT_NOTE } from "../data-tables.js";

export function homeScreen() {
  const wrap = el("div");
  const chars = listCharacters();
  wrap.append(el("h1", {}, "Travelers"));
  wrap.append(explain("Everyone you are playing lives here. Tap a Traveler to open their sheet — vitals, talents, gear and conditions. The Journey is shared by the whole group: one destination, one vehicle, three items between you."));
  if (!chars.length) wrap.append(el("a", { class: "btn btn-block", href: "#/tutorial", style: "margin-bottom:12px" }, "First time? Start here"));

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
    // Journey, Time and Tension are one tap away in the section nav above.
    wrap.append(el("div", { class: "btn-row" },
      el("a", { class: "btn", href: "#/create" }, "New Traveler")));
  }
  const hidden = [
    !Settings.solo() && ["Solo mode", "#/solo"],
    !Settings.gmScreen() && ["GM screen", "#/gm"]
  ].filter(Boolean);
  if (hidden.length) {
    wrap.append(el("p", { class: "faint", style: "margin-top:20px" },
      "Switched off: ",
      ...hidden.flatMap(([label, href], i) => [
        i ? " · " : "",
        el("a", { href }, label)
      ]),
      ". Turn them on in Settings."));
  }

  return wrap;
}

export function rulesScreen() {
  const wrap = el("div");
  wrap.append(el("h1", {}, "Rules"));
  wrap.append(explain("Every rule the app automates, in the app's own words, grouped by subject. Panels stay closed until you open one. Searching opens whatever matches, so you can type \"push\" or \"bliss\" instead of hunting."));

  const results = el("div");
  const input = el("input", {
    type: "search", placeholder: "Search rules…", "aria-label": "Search rules",
    oninput: (e) => render(e.target.value)
  });
  wrap.append(el("div", { class: "field" }, input), results);

  const focus = sessionStorage.getItem("ruleFocus");
  if (focus) sessionStorage.removeItem("ruleFocus");

  // Subject order runs roughly in the order a session needs them.
  const GROUPS = [
    ["core", "Rolling dice"],
    ["vitals", "Health, Hope and Bliss"],
    ["combat", "Combat"],
    ["hazards", "Hazards"],
    ["neuronics", "Neurocasting"],
    ["vehicles", "Vehicles"],
    ["gear", "Gear"],
    ["social", "Tension"],
    ["lifecycle", "Time"],
    ["advancement", "Advancement"],
    ["journey", "The Journey"]
  ];

  function render(q = "") {
    results.replaceChildren();
    const hits = searchLibrary(q);
    if (!hits.length) { results.append(el("p", { class: "empty" }, "Nothing matches that.")); return; }
    const searching = q.trim().length > 0;

    const placed = new Set();
    for (const [tag, title] of GROUPS) {
      const entries = hits.filter((e) => (e.tags || []).includes(tag) && !placed.has(e.id));
      if (!entries.length) continue;
      entries.forEach((e) => placed.add(e.id));
      results.append(ruleGroup(title, entries, searching, focus));
    }
    const rest = hits.filter((e) => !placed.has(e.id));
    if (rest.length) results.append(ruleGroup("Everything else", rest, searching, focus));
  }

  render();
  if (focus) {
    requestAnimationFrame(() => {
      const target = results.querySelector(`#rule-${focus}`);
      if (target) { target.open = true; target.closest("details.rule-group").open = true; target.scrollIntoView({ block: "center" }); }
    });
  }
  return wrap;
}

function ruleGroup(title, entries, searching, focus) {
  const group = el("details", { class: "rule-group", open: searching || entries.some((e) => e.id === focus) },
    el("summary", {}, title, el("span", { class: "count" }, `${entries.length}`)));
  for (const entry of entries) {
    group.append(el("details", { class: "rule-entry", id: `rule-${entry.id}`, open: searching },
      el("summary", {}, entry.title),
      el("p", {}, entry.text),
      entry.page ? el("p", { class: "faint" }, `Book page ${entry.page}`) : null));
  }
  return group;
}

const clockTime = (ts) => ts
  ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  : "";

export function rollLogScreen() {
  const host = el("div");
  let filter = "all";

  const render = () => {
    const log = getRollLog();
    const wrap = el("div", {}, el("h1", {}, "Roll log"));
    wrap.append(explain("Every roll the app has made, newest first, and only the last hundred are kept. With more than one Traveler in play, filter by who rolled — rolls that belong to the table rather than a person sit under Table."));

    if (!log.length) {
      wrap.append(el("p", { class: "empty" }, "No rolls recorded yet."));
      host.replaceChildren(wrap);
      return;
    }

    const chars = listCharacters();
    const nameFor = (key) => {
      if (key === "table") return "Table";
      if (key.startsWith("name:")) return key.slice(5);
      return chars.find((c) => c.id === key)?.name || "Unnamed";
    };

    const counts = new Map();
    for (const r of log) counts.set(rollLogKey(r), (counts.get(rollLogKey(r)) || 0) + 1);
    if (filter !== "all" && !counts.has(filter)) filter = "all";

    if (counts.size > 1) {
      const chips = el("div", { class: "chip-row" });
      const chip = (key, label, count) => el("button", {
        class: "chip", type: "button", "aria-pressed": String(filter === key),
        onclick: () => { filter = key; render(); }
      }, label, el("span", { class: "count" }, String(count)));

      chips.append(chip("all", "All", log.length));
      // Travelers in creation order first, then anyone the log knows only by name,
      // then the table's own rolls.
      const ordered = [
        ...chars.map((c) => c.id).filter((id) => counts.has(id)),
        ...[...counts.keys()].filter((k) => k.startsWith("name:")),
        ...(counts.has("table") ? ["table"] : [])
      ];
      for (const key of ordered) chips.append(chip(key, nameFor(key), counts.get(key)));
      wrap.append(chips);
    }

    const shown = filterRollLog(filter);
    const list = el("ul", { class: "list" });
    for (const r of shown) {
      list.append(el("li", {}, el("div", { class: "row", style: "padding:10px 4px" },
        el("div", { class: "card-row" },
          el("strong", {}, r.label || "Roll"),
          el("span", { class: "mono faint" }, (r.dice || []).join(" "))),
        el("div", { class: "card-row" },
          el("span", { class: "faint" }, r.outcome || ""),
          el("span", { class: "faint" }, [r.by || "Table", clockTime(r.ts)].filter(Boolean).join(" · "))))));
    }
    wrap.append(el("div", { class: "card" }, list));

    wrap.append(el("div", { class: "btn-row" },
      el("button", {
        class: "btn btn-danger",
        onclick: async () => {
          if (!(await confirmModal("Clear the roll log?", "Every recorded roll is discarded. Nothing else changes.", "Clear"))) return;
          clearRollLog();
          filter = "all";
          render();
          showToast("Roll log cleared");
        }
      }, "Clear log")));

    host.replaceChildren(wrap);
  };

  render();
  return host;
}

export function settingsScreen() {
  const wrap = el("div", {}, el("h1", {}, "Settings"));
  wrap.append(explain("Optional surfaces are switched off until you want them, so the app stays small for a player at a table. Everything is stored on this device only — export a backup before clearing your browser data."));
  wrap.append(el("a", { class: "btn btn-block", href: "#/tutorial", style: "margin-bottom:12px" }, "Tutorial"));

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

  // The book asks for these before play, not after something has already landed badly.
  wrap.append(el("div", { class: "card" },
    el("h3", {}, "Before you play"),
    el("p", { class: "faint" }, TRAUMA_CONSENT_NOTE),
    el("details", { class: "explain" }, el("summary", {}, "Safety tools the book recommends"),
      el("ul", { class: "list" },
        el("li", {}, el("div", { style: "padding:6px 4px" }, el("strong", {}, "Lines and veils"),
          el("div", { class: "faint" }, "Agree up front what the game will not go near, and what happens off-screen."))),
        el("li", {}, el("div", { style: "padding:6px 4px" }, el("strong", {}, "A card anyone can play"),
          el("div", { class: "faint" }, "Any player can stop or rewind a scene without explaining why."))),
        el("li", {}, el("div", { style: "padding:6px 4px" }, el("strong", {}, "Debrief"),
          el("div", { class: "faint" }, "Afterwards, check in — this game is built to go to dark places.")))))));

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
