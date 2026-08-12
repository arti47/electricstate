// One Stop record, shared by the GM screen and solo play.
// A Stop is the game's adventure: a Setting, a Blocker that holds the Travelers there,
// a Situation, a Countdown that escalates while they stay, Locations and Threats.
import { el, uid, d6, d66 } from "./core.js";
import { SETTING, BLOCKERS, NEEDS, CONFLICT_PARTIES, CONFLICT_SUBJECTS, LOCATIONS,
         ELECTRIC_STATE_ELEMENTS, NINETIES_NOSTALGIA, COUNTDOWN_ELEMENTS, D66_ORDER } from "../data-gm.js";
import { getJourney, saveJourney } from "./store.js";

const d66Pick = (table) => table[D66_ORDER.indexOf(d66())];
const d6Pick = (table) => table[d6() - 1];

export const COUNTDOWN_STEPS = 3;

/** The canonical Stop shape. Both producers build this, so both can read each other's. */
export function makeStop(name = "") {
  const pool = [...COUNTDOWN_ELEMENTS];
  const countdown = Array.from({ length: COUNTDOWN_STEPS }, () =>
    pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);

  return {
    id: uid(),
    name: name || "",
    createdAt: Date.now(),
    setting: {
      terrain: d6Pick(SETTING.terrain),
      population: d6Pick(SETTING.population),
      communications: d6Pick(SETTING.communications),
      size: d6Pick(SETTING.size),
      prosperity: d6Pick(SETTING.prosperity),
      weather: d6Pick(SETTING.weather)
    },
    blocker: d66Pick(BLOCKERS),
    need: d6Pick(NEEDS),
    conflict: { a: d66Pick(CONFLICT_PARTIES), b: d66Pick(CONFLICT_PARTIES), over: d66Pick(CONFLICT_SUBJECTS) },
    locations: [d66Pick(LOCATIONS), d66Pick(LOCATIONS), d66Pick(LOCATIONS)],
    mood: [d66Pick(ELECTRIC_STATE_ELEMENTS), d66Pick(NINETIES_NOSTALGIA)],
    countdown,
    countdownProgress: 0,
    threat: null,
    resolved: false
  };
}

export const listStops = () => getJourney()?.stops || [];
export const activeStopId = () => getJourney()?.activeStopId || null;
export const activeStop = () => listStops().find((s) => s.id === activeStopId()) || null;

export function saveStop(stop, { makeActive = false } = {}) {
  const j = getJourney() || {};
  const stops = (j.stops || []).filter((s) => s.id !== stop.id);
  saveJourney({
    ...j,
    stops: [...stops, stop],
    activeStopId: makeActive || j.activeStopId === stop.id ? stop.id : j.activeStopId
  });
  return stop;
}

export function setActiveStop(id) {
  const j = getJourney() || {};
  saveJourney({ ...j, activeStopId: id });
}

export function removeStop(id) {
  const j = getJourney() || {};
  saveJourney({
    ...j,
    stops: (j.stops || []).filter((s) => s.id !== id),
    activeStopId: j.activeStopId === id ? null : j.activeStopId
  });
}

/** Advance the Countdown one step and return the step's text, or null when it is spent. */
export function advanceCountdown(id) {
  const stop = listStops().find((s) => s.id === id);
  if (!stop) return null;
  if (stop.countdownProgress >= stop.countdown.length) return null;
  const step = stop.countdown[stop.countdownProgress];
  saveStop({ ...stop, countdownProgress: stop.countdownProgress + 1 });
  return { step, index: stop.countdownProgress + 1, of: stop.countdown.length };
}

export function attachThreat(id, threat) {
  const stop = listStops().find((s) => s.id === id);
  if (!stop) return null;
  return saveStop({ ...stop, threat });
}

export function resolveStop(id) {
  const stop = listStops().find((s) => s.id === id);
  if (!stop) return null;
  return saveStop({ ...stop, resolved: true });
}

/** Shared renderer, so a Stop looks the same whoever rolled it. */
export function stopCard(stop, { onCountdown, onResolve, compact = false } = {}) {
  if (!stop) return null;
  const row = (k, v) => el("div", { class: "card-row", style: "padding:3px 0" },
    el("span", { class: "faint" }, k), el("span", { style: "text-align:right" }, v));

  const card = el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("h3", { style: "margin:0" }, stop.name || "The Stop"),
      stop.resolved ? el("span", { class: "faint" }, "resolved") : null));

  if (!compact) {
    card.append(
      row("Terrain", stop.setting.terrain), row("Population", stop.setting.population),
      row("Communications", stop.setting.communications), row("Size", stop.setting.size),
      row("Prosperity", stop.setting.prosperity), row("Weather", stop.setting.weather));
  }

  card.append(
    el("h3", {}, "Blocker"), el("p", {}, stop.blocker),
    el("p", { class: "faint" }, `They also need: ${String(stop.need).toLowerCase()}`),
    el("h3", {}, "Conflict"),
    el("p", {}, `${stop.conflict.a} against ${stop.conflict.b}, over ${String(stop.conflict.over).toLowerCase()}`),
    el("h3", {}, "Locations"), el("p", {}, stop.locations.join(" · ")),
    el("h3", {}, "In the air"), el("p", { class: "faint" }, stop.mood.join(" · ")));

  if (stop.threat) {
    card.append(el("h3", {}, "Threat"),
      el("p", {}, stop.threat.sub ? `${stop.threat.type} — ${stop.threat.sub}` : stop.threat.type));
  }

  const done = stop.countdownProgress || 0;
  card.append(el("h3", {}, `Countdown ${done}/${stop.countdown.length}`));
  const list = el("ol", {});
  stop.countdown.forEach((step, i) => {
    list.append(el("li", { class: i < done ? "" : "faint", style: i < done ? "color:var(--danger)" : "" },
      i < done ? `${step} — fired` : step));
  });
  card.append(list);

  const actions = el("div", { class: "btn-row" });
  if (onCountdown && done < stop.countdown.length) {
    actions.append(el("button", { class: "btn btn-primary", onclick: () => onCountdown(stop) }, "Fire the next step"));
  }
  if (onResolve && !stop.resolved) {
    actions.append(el("button", { class: "btn", onclick: () => onResolve(stop) }, "Blocker resolved"));
  }
  if (actions.children.length) card.append(actions);

  return card;
}
