// Top-level screen renderers. Phase 1-3 screens (wizard, sheet, roller) mount here later.
import { $, el, add } from "./core.js";
import { Settings, TOGGLES, TEXT_SCALES, set as setSetting, get as getSetting,
         applyTextScale } from "./settings.js";
import { listCharacters, getJourney, exportJSON, importJSON, getRollLog, rollLogKey,
         filterRollLog, clearRollLog, resetAll, listCampaigns, activeCampaignId,
         createCampaign, switchCampaign, renameCampaign, deleteCampaign, checkData,
         canUndo, undoLast, undoLabel } from "./store.js";
import { searchLibrary, searchGlossary } from "./rules.js";
import { resetRoller } from "./roller.js";
import { resetNeuro } from "./neurocasting.js";
import { resetWizard } from "./wizard.js";
import { showToast, confirmModal, promptModal, explain } from "./ui.js";
import { ARCHETYPES } from "../data.js";

/**
 * Three screens keep their working state in a module variable — the roll on the dice
 * table, the neurocasting session, the half-built Traveler. None of it belongs to the
 * next campaign, so anything that swaps the game underneath them has to say so.
 */
function clearTransientScreens() { resetRoller(); resetNeuro(); resetWizard(); }
import { TRAUMA_CONSENT_NOTE } from "../data-tables.js";

export function homeScreen() {
  const wrap = el("div");
  const chars = listCharacters();
  wrap.append(el("h1", {}, "Travelers"));
  wrap.append(explain("Everyone you are playing lives here. Tap a Traveler to open that sheet — vitals, talents, gear and conditions. The Journey is shared by the whole group: one destination, one vehicle, three items between you."));
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
    add(wrap, nextStep(chars));
    // Journey, Time and Tension are one tap away in the section nav above.
    wrap.append(el("div", { class: "btn-row" },
      el("a", { class: "btn", href: "#/create" }, "New Traveler")));
  }
  // Naming a switched-off surface tells you it exists; it does not tell you what it is.
  // Solo mode in particular is somebody's whole reason for opening this app, and the only
  // route to it was a settings screen they had no reason to visit.
  const hidden = [
    !Settings.solo() && ["solo", "Playing on your own?",
      "There is a full solo mode: you run two to four Travelers and a deck of cards answers the questions a GM would. No group needed, no preparation.", "#/solo"],
    !Settings.gmScreen() && ["gmScreen", "Running this for other people?",
      "The GM screen builds a Stop, watches the party's Bliss and rolls every table in the book.", "#/gm"]
  ].filter(Boolean);
  for (const [flag, title, blurb, href] of hidden) {
    wrap.append(el("div", { class: "card", style: "margin-top:20px" },
      el("h3", { style: "margin-top:0" }, title),
      el("p", { class: "faint" }, blurb),
      el("div", { class: "btn-row" },
        el("button", {
          class: "btn", onclick: () => { setSetting(flag, true); location.hash = href; }
        }, "Switch it on"),
        el("a", { class: "btn", href: "#/tutorial" }, "How it works"))));
  }

  return wrap;
}

/**
 * Creation ends at step 12; the book's own steps 13-16 are the Journey, the vehicle, the
 * shared items and the Tension between everyone. Nothing prompted any of it, so a party
 * could sit here finished-looking with no destination and no Tension to spend.
 */
export function nextStepFor(chars, journey) {
  if (!chars.length) return null;
  if (!journey?.destination) {
    return { id: "journey", title: "Where are you going?", href: "#/journey", label: "Set up the Journey",
      blurb: "The Journey is the campaign: a destination, a vehicle and three items between you." };
  }
  if (!journey?.vehicle) {
    return { id: "vehicle", title: "Nothing to drive yet", href: "#/journey", label: "The Journey",
      blurb: "Pick the vehicle and the three shared items in the back." };
  }
  const anyTension = chars.some((c) => Object.values(c.tension || {}).some((v) => v > 0));
  if (chars.length > 1 && !anyTension) {
    return { id: "tension", title: "No Tension between anyone", href: "#/tension", label: "Set the Tension",
      blurb: "Each Traveler starts with Tension 1 toward one or two of the others. It is the only reliable way Hope comes back." };
  }
  return null;
}

function nextStep(chars) {
  const step = nextStepFor(chars, getJourney());
  if (!step) return null;
  return el("div", { class: "card", style: "border-left:3px solid var(--accent)" },
    el("strong", {}, step.title),
    el("p", { class: "faint" }, step.blurb),
    el("a", { class: "btn btn-primary", href: step.href }, step.label));
}

export function rulesScreen() {
  const wrap = el("div");
  wrap.append(el("h1", {}, "Rules"));
  wrap.append(explain("Every rule the app automates, in the app's own words, grouped by subject — and above the groups, one plain sentence for every word this game uses. Panels stay closed until you open one. Searching opens whatever matches, so you can type \"push\" or \"tilt\" instead of hunting."));

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
    const words = searchGlossary(q);
    const searching = q.trim().length > 0;

    // The rules are grouped by subject, which only helps if you already know what the
    // subject is called. This is the index for someone who does not: the word they read
    // on a screen, and a sentence saying what it means.
    if (words.length) results.append(glossaryGroup(words, searching));

    if (!hits.length) {
      if (!words.length) results.append(el("p", { class: "empty" }, "Nothing matches that."));
      return;
    }

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

function glossaryGroup(entries, searching) {
  const group = el("details", { class: "rule-group", open: searching },
    el("summary", {}, "Words this game uses", el("span", { class: "count" }, `${entries.length}`)));
  const list = el("div", { style: "padding:0 12px 10px" });
  for (const g of entries) {
    list.append(el("div", { class: "def" },
      el("span", { class: "def-key" }, g.term),
      el("span", { class: "def-value" }, g.text,
        g.see
          ? el("a", {
              class: "faint", style: "display:block;margin-top:2px", href: "#/rules",
              onclick: () => sessionStorage.setItem("ruleFocus", g.see)
            }, "The full rule →")
          : null)));
  }
  group.append(list);
  return group;
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

const PAGE = 25;

/**
 * Every d6 the app has rolled, counted by face. Digital dice are trusted only if they can
 * be checked, so the log carries its own evidence: a table can audit the app instead of
 * arguing about it. Values above 6 are other dice (D66, D100, a damage total) and are left
 * out rather than folded into a d6 histogram.
 */
export function faceDistribution(entries) {
  const counts = [0, 0, 0, 0, 0, 0];
  let total = 0;
  for (const entry of entries) {
    for (const value of entry.dice || []) {
      if (Number.isInteger(value) && value >= 1 && value <= 6) { counts[value - 1] += 1; total += 1; }
    }
  }
  return { counts, total, expected: total / 6 };
}

function distributionPanel(entries) {
  const { counts, total } = faceDistribution(entries);
  if (total < 20) return null;   // below this the spread says nothing and looks alarming

  const most = Math.max(...counts);
  const panel = el("details", { class: "explain" },
    el("summary", {}, `Are these dice fair? (${total} d6 rolled)`),
    el("p", { class: "faint" }, "Rolls come from the browser's cryptographic random source, not from Math.random. Over a campaign each face should approach one in six — but a hundred dice is a small sample, and a run of sixes is what dice do."));

  for (const [i, n] of counts.entries()) {
    const pct = ((n / total) * 100).toFixed(1);
    panel.append(el("div", { class: "card-row", style: "padding:2px 0" },
      el("span", { class: "mono" }, String(i + 1)),
      el("span", { class: "bar", style: `width:${most ? (n / most) * 60 : 0}%` }),
      el("span", { class: "mono faint" }, `${n} · ${pct}%`)));
  }
  panel.append(el("p", { class: "faint" }, "Even would be 16.7% each."));
  return panel;
}

export function rollLogScreen() {
  const host = el("div");
  let filter = "all";
  let visible = PAGE;

  const render = () => {
    const log = getRollLog();
    const wrap = el("div", {}, el("h1", {}, "Roll log"));
    wrap.append(explain("Every roll the app has made, newest first, and only the last hundred are kept. With more than one Traveler in play, filter by who rolled — rolls that belong to the table rather than a person sit under Table."));

    if (!log.length) {
      wrap.append(el("div", { class: "empty card" },
        el("p", {}, "No rolls yet. Everything the app rolls lands here, so you can look back at what actually happened."),
        el("a", { class: "btn btn-primary", href: "#/dice" }, "Roll some dice")));
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
        onclick: () => { filter = key; visible = PAGE; render(); }
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

    // A full log is a hundred rows — eight screens of scrolling to reach the buttons
    // underneath it. Show a session's worth and let the rest be asked for.
    const all = filterRollLog(filter);
    add(wrap, distributionPanel(all));
    const shown = all.slice(0, visible);
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
    if (all.length > shown.length) {
      wrap.append(el("button", {
        class: "btn btn-block", style: "margin-bottom:var(--gap)",
        onclick: () => { visible += PAGE; render(); }
      }, `Show older (${all.length - shown.length} more)`));
    }

    wrap.append(el("div", { class: "btn-row" },
      el("button", {
        class: "btn btn-danger",
        onclick: async () => {
          if (!(await confirmModal("Clear the roll log?", "Every recorded roll is discarded. Nothing else changes.", "Clear"))) return;
          clearRollLog();
          filter = "all";
          visible = PAGE;
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
  wrap.append(explain("Optional surfaces stay switched off until wanted, so the app stays small for a player at a table. Everything is stored on this device only — export a backup before clearing your browser data."));
  wrap.append(el("a", { class: "btn btn-block", href: "#/tutorial", style: "margin-bottom:12px" }, "Tutorial"));

  const theme = el("select", {
    "aria-label": "Theme",
    onchange: (e) => { setSetting("theme", e.target.value); applyTheme(); }
  },
    ...[["system", "Follow system"], ["dark", "Always dark"], ["light", "Always light"]]
      .map(([v, l]) => el("option", { value: v, selected: Settings.theme() === v }, l)));
  const scale = el("select", {
    "aria-label": "Text size",
    onchange: (e) => { setSetting("textScale", Number(e.target.value)); applyTextScale(); }
  }, ...TEXT_SCALES.map((t) => el("option", { value: t.value, selected: Settings.textScale() === t.value }, t.label)));

  wrap.append(el("div", { class: "card" },
    el("div", { class: "field" }, el("label", {}, "Theme"), theme),
    el("div", { class: "field" }, el("label", {}, "Text size"), scale,
      el("p", { class: "faint" }, "Pinch-zoom is off so a stray gesture cannot derail a roll. This is how you make the type bigger instead."))));

  wrap.append(campaignCard());

  const toggles = el("div", { class: "card" });
  for (const t of TOGGLES) {
    const current = t.flag === "mentalTrauma" ? Settings.mentalTrauma() : !!getSetting(t.flag);
    // A label, so the whole row is the target — everywhere else in the app already is one.
    toggles.append(el("label", { class: "card-row", style: "text-transform:none;letter-spacing:0;color:inherit;padding:10px 0" },
      el("span", {}, el("strong", {}, t.label), el("div", { class: "faint" }, t.blurb)),
      el("input", {
        type: "checkbox", checked: current, "aria-label": t.label,
        onchange: (e) => { setSetting(t.flag, e.target.checked); window.dispatchEvent(new CustomEvent("hashchange")); }
      })));
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
        el("button", { class: "btn", onclick: doExportReadable }, "Export as text"),
        el("a", { class: "btn", href: "#/log" }, "Roll log")),
      el("div", { class: "btn-row", style: "margin-top:8px" },
        el("button", { class: "btn", onclick: doCheckData }, "Check my data"),
        el("button", { class: "btn btn-danger", onclick: doReset }, "Erase all"))));

  wrap.append(el("p", { class: "faint", style: "margin-top:24px" },
    "A personal play aid built from the owner's own copy of the rules. Not affiliated with the publisher."));
  return wrap;
}

/** One game per device was the old assumption; a finished Journey is worth keeping. */
function campaignCard() {
  const list = listCampaigns();
  const activeId = activeCampaignId();
  const card = el("div", { class: "card" }, el("h3", {}, "Journeys"),
    el("p", { class: "faint" }, "Each one keeps its own Travelers, Journey, rolls and record. Switching does not touch the others."));

  for (const c of list) {
    const isActive = c.id === activeId;
    const chars = Object.keys(c.characters || {}).length;
    card.append(el("div", { style: "padding:8px 0;border-top:1px solid var(--line-soft)" },
      el("div", { class: "card-row" },
        el("span", {}, el("strong", {}, c.name), isActive ? el("span", { class: "faint" }, " · in play") : null,
          el("div", { class: "faint" }, `${chars} Traveler${chars === 1 ? "" : "s"}${c.journey?.destination ? ` · ${c.journey.destination}` : ""}`)),
        el("div", { class: "btn-row" },
          !isActive ? el("button", {
            class: "btn", onclick: () => {
              switchCampaign(c.id); clearTransientScreens();
              showToast(`Now playing ${c.name}.`); location.hash = "#/home";
            }
          }, "Play") : null,
          el("button", {
            class: "btn", onclick: async () => {
              const name = await promptModal("Rename", { label: "Name", value: c.name });
              if (name) { renameCampaign(c.id, name); window.dispatchEvent(new CustomEvent("hashchange")); }
            }
          }, "Rename"),
          list.length > 1 || chars ? el("button", {
            class: "btn btn-danger", onclick: async () => {
              const ok = await confirmModal(`Delete ${c.name}?`,
                `${chars} Traveler${chars === 1 ? "" : "s"}, the Journey and every roll in it go with it. You can undo this once, from here.`, "Delete");
              if (!ok) return;
              deleteCampaign(c.id);
              showToast(`${c.name} deleted — undo is on this screen.`);
              window.dispatchEvent(new CustomEvent("hashchange"));
            }
          }, "Delete") : null))));
  }

  card.append(el("button", {
    class: "btn btn-block", style: "margin-top:8px",
    onclick: async () => {
      const name = await promptModal("New Journey", { label: "Name it", value: "" });
      if (!name) return;
      createCampaign(name); clearTransientScreens();
      showToast(`${name} started.`);
      location.hash = "#/home";
    }
  }, "Start another Journey"));

  if (canUndo()) {
    card.append(el("button", {
      class: "btn btn-block", style: "margin-top:8px",
      onclick: () => { undoLast(); showToast("Reverted."); window.dispatchEvent(new CustomEvent("hashchange")); }
    }, `Undo${undoLabel() ? ` — ${undoLabel()}` : ""}`));
  }
  return card;
}

/**
 * A character you cannot hand to someone, print, or read without the app is a character
 * you only half own. Plain text, because it survives everything.
 */
export function readableExport() {
  const j = getJourney();
  const lines = [];
  const rule = (s) => lines.push("", s, "=".repeat(s.length));

  rule("THE JOURNEY");
  lines.push(`From: ${j?.start || "—"}`, `To: ${j?.destination || "—"}`,
    `Vehicle: ${j?.vehicle?.label || j?.vehicle?.name || "—"}`,
    `Fuel: ${j?.fuel ?? "—"} · Day ${j?.day ?? 1}, ${j?.shift || "Morning"}`);
  if (j?.sharedItems?.length) lines.push(`Shared: ${j.sharedItems.map((i) => i.name || i).join(", ")}`);

  for (const c of listCharacters()) {
    rule(String(c.name || "Unnamed").toUpperCase());
    const arch = ARCHETYPES.find((a) => a.id === c.archetype);
    lines.push(`${arch?.name || "—"}${c.song ? ` · ${c.song}` : ""}`);
    lines.push(`Strength ${c.attributes.strength}  Agility ${c.attributes.agility}  ` +
               `Wits ${c.attributes.wits}  Empathy ${c.attributes.empathy}`);
    lines.push(`Health ${c.state.health}  Hope ${c.state.hope}  Bliss ${c.state.bliss}` +
               (c.state.permanentBliss ? ` (${c.state.permanentBliss} permanent)` : ""));
    if (c.talents?.length) lines.push(`Talents: ${c.talents.join(", ")}`);
    if (c.dream) lines.push(`Dream: ${c.dream}`);
    if (c.flaw) lines.push(`Flaw: ${c.flaw}`);
    if (c.goal) lines.push(`Goal: ${c.goal}`);
    if (c.threat) lines.push(`Threat: ${c.threat}`);
    if (c.conditions?.length) lines.push(`Conditions: ${c.conditions.map((x) => x.name).join(", ")}`);
    const items = (c.inventory?.items || []).map((i) => i.name + (i.bonus ? ` (+${i.bonus})` : ""));
    if (items.length) lines.push(`Gear: ${items.join(", ")}`);
    lines.push(`Cash: $${c.inventory?.cash ?? 0}`);
    if (c.notes) lines.push("", c.notes);
  }
  return lines.join("\n").trim() + "\n";
}

function doExportReadable() {
  const blob = new Blob([readableExport()], { type: "text/plain" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `electric-state-${new Date().toISOString().slice(0, 10)}.txt` });
  document.body.append(a); a.click(); a.remove();
  showToast("Readable sheet exported.");
}

async function doCheckData() {
  const r = checkData();
  await confirmModal("Data checked",
    `${r.campaigns} Journey${r.campaigns === 1 ? "" : "s"}, ${r.characters} Traveler${r.characters === 1 ? "" : "s"}, ` +
    `${r.rolls} logged roll${r.rolls === 1 ? "" : "s"}. ` +
    (r.repaired ? "Some records needed repairing and were fixed." : "Nothing needed repairing."), "Good");
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
      clearTransientScreens();
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
    resetAll(); clearTransientScreens();
    showToast("All local data erased."); location.hash = "#/home";
  }
}

export function applyTheme() {
  const pref = Settings.theme();
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}
