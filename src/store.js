// Local persistence + JSON export/import. Cloud sync arrives in Phase 5 behind the same API.
import { STORAGE_KEY, uid } from "./core.js";
import { normalize } from "./derived.js";

const SCHEMA_VERSION = 1;
let db = null;

function blank() { return { schema: SCHEMA_VERSION, characters: {}, journey: null, rollLog: [] }; }

function load() {
  if (db) return db;
  try {
    db = JSON.parse(localStorage.getItem(STORAGE_KEY)) || blank();
  } catch { db = blank(); }
  db = migrate(db);
  return db;
}

/** Never crash on old data: back-fill anything a newer schema expects. */
function migrate(data) {
  const d = { ...blank(), ...data };
  d.schema = SCHEMA_VERSION;
  for (const [id, ch] of Object.entries(d.characters || {})) d.characters[id] = normalize({ id, ...ch });
  if (!Array.isArray(d.rollLog)) d.rollLog = [];
  d.journey = migrateJourney(d.journey);
  return d;
}

/**
 * Stops were once two different shapes: a GM record with a name and a countdown, and a
 * flat solo object with the setting spread across the top level. Both become one record.
 */
function migrateJourney(journey) {
  if (!journey) return journey;
  const j = { ...journey };
  const asRecord = (stop, name = "") => {
    if (!stop) return null;
    if (stop.setting && Array.isArray(stop.countdown)) {
      return { countdownProgress: 0, threat: null, resolved: false, name, ...stop };
    }
    // legacy solo shape: setting fields at the top level, no countdown
    const { terrain, population, communications, size, prosperity, weather, ...rest } = stop;
    return {
      id: rest.id || `stop-${Date.now()}`, name, createdAt: Date.now(),
      setting: { terrain, population, communications, size, prosperity, weather },
      blocker: rest.blocker || "", need: rest.need || "",
      conflict: rest.conflict || { a: "", b: "", over: "" },
      locations: rest.locations || [], mood: rest.mood || [],
      countdown: rest.countdown || [], countdownProgress: 0,
      threat: rest.threat || null, resolved: false
    };
  };

  j.stops = (j.stops || []).map((stop) => asRecord(stop, stop.name || ""));

  const legacySolo = j.solo?.stop;
  if (legacySolo) {
    const record = asRecord(legacySolo, "Solo Stop");
    if (record) {
      j.stops = [...j.stops, record];
      if (!j.activeStopId) j.activeStopId = record.id;
    }
    j.solo = { ...j.solo, stop: null, threat: null };
  }
  return j;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("storechange"));
}

export const listCharacters = () => Object.values(load().characters);
export const getCharacter = (id) => load().characters[id] || null;

export function saveCharacter(ch) {
  load();
  const id = ch.id || uid();
  db.characters[id] = normalize({ ...ch, id, updatedAt: Date.now() });
  persist();
  return db.characters[id];
}

export function deleteCharacter(id) {
  load();
  delete db.characters[id];
  persist();
}

export const getJourney = () => load().journey;
export function saveJourney(j) { load(); db.journey = j; persist(); return j; }

// ------------------------------------------------------------------ roll log
const ROLL_LOG_CAP = 100;
export function logRoll(entry) {
  load();
  const record = { id: uid(), ts: Date.now(), ...entry };
  // Callers pass a display name; resolve it to an id once, at write time, so the
  // log can still be filtered by Traveler after a rename or a duplicate name.
  if (record.by && !record.byId) {
    const match = Object.values(db.characters).find((c) => c.name === record.by);
    if (match) record.byId = match.id;
  }
  db.rollLog.unshift(record);
  if (db.rollLog.length > ROLL_LOG_CAP) db.rollLog.length = ROLL_LOG_CAP;
  persist();
}

/** Group key for one entry: a Traveler id, a bare name, or the table itself. */
export const rollLogKey = (entry) =>
  entry.byId || (entry.by ? `name:${entry.by}` : "table");

export function filterRollLog(key) {
  const log = getRollLog();
  return !key || key === "all" ? log : log.filter((r) => rollLogKey(r) === key);
}
export const getRollLog = () => load().rollLog;
export function clearRollLog() { load(); db.rollLog = []; persist(); }

// ------------------------------------------------------------ export/import
export function exportJSON() {
  return JSON.stringify({ ...load(), exportedAt: new Date().toISOString() }, null, 2);
}
export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || !("characters" in parsed)) {
    throw new Error("That file does not look like an Electric State backup.");
  }
  db = migrate(parsed);
  persist();
  return Object.keys(db.characters).length;
}
export function resetAll() { db = blank(); persist(); }
