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
  return d;
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
  db.rollLog.unshift({ id: uid(), ts: Date.now(), ...entry });
  if (db.rollLog.length > ROLL_LOG_CAP) db.rollLog.length = ROLL_LOG_CAP;
  persist();
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
