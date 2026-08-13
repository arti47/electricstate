// Local persistence + JSON export/import. Cloud sync arrives in Phase 5 behind the same API.
import { STORAGE_KEY, uid } from "./core.js";
import { normalize } from "./derived.js";

const SCHEMA_VERSION = 2;
let db = null;

/** One campaign: its Travelers, its Journey, its rolls and its session record. */
function blankCampaign(name = "First Journey") {
  return { id: uid(), name, createdAt: Date.now(), characters: {}, journey: null, rollLog: [], sessionLog: [] };
}

function blank() {
  const first = blankCampaign();
  return { schema: SCHEMA_VERSION, activeCampaignId: first.id, campaigns: { [first.id]: first } };
}

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
  let d = { ...data };

  // Schema 1 kept one game per device at the top level. Fold it into a campaign so a
  // second game no longer means wiping the first.
  if (!d.campaigns) {
    const only = blankCampaign();
    only.characters = d.characters || {};
    only.journey = d.journey || null;
    only.rollLog = Array.isArray(d.rollLog) ? d.rollLog : [];
    d = { schema: SCHEMA_VERSION, activeCampaignId: only.id, campaigns: { [only.id]: only } };
  }

  d.schema = SCHEMA_VERSION;
  for (const [cid, raw] of Object.entries(d.campaigns)) {
    const c = { ...blankCampaign(), ...raw, id: cid };
    for (const [id, ch] of Object.entries(c.characters || {})) c.characters[id] = normalize({ id, ...ch });
    if (!Array.isArray(c.rollLog)) c.rollLog = [];
    if (!Array.isArray(c.sessionLog)) c.sessionLog = [];
    c.journey = migrateJourney(c.journey);
    d.campaigns[cid] = c;
  }
  if (!d.campaigns[d.activeCampaignId]) d.activeCampaignId = Object.keys(d.campaigns)[0];
  return d;
}

/** Everything below operates on the campaign in play. */
function current() {
  const d = load();
  return d.campaigns[d.activeCampaignId];
}

export const listCampaigns = () => Object.values(load().campaigns)
  .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
export const activeCampaign = () => current();
export const activeCampaignId = () => load().activeCampaignId;

export function createCampaign(name) {
  load();
  const c = blankCampaign(name || "New Journey");
  db.campaigns[c.id] = c;
  db.activeCampaignId = c.id;
  persist();
  return c;
}

export function switchCampaign(id) {
  load();
  if (!db.campaigns[id]) return null;
  db.activeCampaignId = id;
  persist();
  return db.campaigns[id];
}

export function renameCampaign(id, name) {
  load();
  if (!db.campaigns[id]) return null;
  db.campaigns[id] = { ...db.campaigns[id], name: name || db.campaigns[id].name };
  persist();
  return db.campaigns[id];
}

/** Deleting the last campaign leaves a fresh empty one rather than nothing at all. */
export function deleteCampaign(id) {
  load();
  snapshot(`delete ${db.campaigns[id]?.name || "campaign"}`);
  delete db.campaigns[id];
  if (!Object.keys(db.campaigns).length) {
    const fresh = blankCampaign();
    db.campaigns[fresh.id] = fresh;
    db.activeCampaignId = fresh.id;
  } else if (id === db.activeCampaignId) {
    db.activeCampaignId = Object.keys(db.campaigns)[0];
  }
  persist();
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

export const listCharacters = () => Object.values(current().characters);
export const getCharacter = (id) => current().characters[id] || null;

export function saveCharacter(ch) {
  const c = current();
  const id = ch.id || uid();
  c.characters[id] = normalize({ ...ch, id, updatedAt: Date.now() });
  persist();
  return c.characters[id];
}

export function deleteCharacter(id) {
  const c = current();
  snapshot(`delete ${c.characters[id]?.name || "Traveler"}`);
  delete c.characters[id];
  persist();
}

export const getJourney = () => current().journey;
export function saveJourney(j) { current().journey = j; persist(); return j; }

// ------------------------------------------------------------------ undo
// One snapshot, taken before anything destructive. Lifecycle boundaries used to be the
// only reversible actions in the app, which made ending a fight riskier than ending a day.
let undoState = null;

export function snapshot(label = "") {
  undoState = { data: JSON.stringify(load()), label };
}
export const canUndo = () => !!undoState;
export const undoLabel = () => undoState?.label || "";
export function undoLast() {
  if (!undoState) return false;
  db = migrate(JSON.parse(undoState.data));
  undoState = null;
  persist();
  return true;
}

// ------------------------------------------------------------ session record
/**
 * What happened, in order. The roll log answers "what did I roll"; the debrief asks what
 * the session was about, and nothing could answer that.
 */
const SESSION_LOG_CAP = 200;
export function noteEvent(kind, text) {
  const c = current();
  c.sessionLog = [{ id: uid(), ts: Date.now(), kind, text }, ...(c.sessionLog || [])].slice(0, SESSION_LOG_CAP);
  persist();
}
export const getSessionLog = () => current().sessionLog || [];
export function clearSessionLog() { current().sessionLog = []; persist(); }

// ------------------------------------------------------------------ roll log
const ROLL_LOG_CAP = 100;
export function logRoll(entry) {
  const c = current();
  const record = { id: uid(), ts: Date.now(), ...entry };
  // Callers pass a display name; resolve it to an id once, at write time, so the
  // log can still be filtered by Traveler after a rename or a duplicate name.
  if (record.by && !record.byId) {
    const match = Object.values(c.characters).find((x) => x.name === record.by);
    if (match) record.byId = match.id;
  }
  c.rollLog.unshift(record);
  if (c.rollLog.length > ROLL_LOG_CAP) c.rollLog.length = ROLL_LOG_CAP;
  persist();
}

/** Group key for one entry: a Traveler id, a bare name, or the table itself. */
export const rollLogKey = (entry) =>
  entry.byId || (entry.by ? `name:${entry.by}` : "table");

export function filterRollLog(key) {
  const log = getRollLog();
  return !key || key === "all" ? log : log.filter((r) => rollLogKey(r) === key);
}
export const getRollLog = () => current().rollLog;
export function clearRollLog() { snapshot("clear the roll log"); current().rollLog = []; persist(); }

// ------------------------------------------------------------ export/import
export function exportJSON() {
  return JSON.stringify({ ...load(), exportedAt: new Date().toISOString() }, null, 2);
}
export function importJSON(text) {
  const parsed = JSON.parse(text);
  const looksRight = parsed && typeof parsed === "object" && ("characters" in parsed || "campaigns" in parsed);
  if (!looksRight) throw new Error("That file does not look like an Electric State backup.");
  db = migrate(parsed);
  persist();
  return Object.keys(current().characters).length;
}

/**
 * Run the migration over what is stored and report what it changed. Migrations run
 * silently at load, so when one is wrong the player sees odd numbers and no explanation.
 */
export function checkData() {
  const before = localStorage.getItem(STORAGE_KEY) || "";
  db = null;
  const after = JSON.stringify(load());
  const campaigns = Object.values(db.campaigns);
  persist();
  return {
    repaired: before !== after,
    campaigns: campaigns.length,
    characters: campaigns.reduce((n, c) => n + Object.keys(c.characters).length, 0),
    rolls: campaigns.reduce((n, c) => n + c.rollLog.length, 0)
  };
}
/** Wiping everything is the most destructive thing here, so it is the first thing undo covers. */
export function resetAll() { snapshot("erase everything"); db = blank(); persist(); }
