// Shared test scaffolding: a static server, browser-side store helpers, and the three
// seed states every harness and probe measures against.
//
// The seeds exist because every measurement the audits produced was only as honest as the
// state it ran against. An empty app has no density problem and a fresh Traveler has no
// conditions; both of those hid findings for several passes. Anything that measures layout
// or flow runs against all three.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json"
};

export const CHROMIUM = "/opt/pw-browsers/chromium";
export const KEY = "electricState.v1";

/** A static file server rooted at the repo, on a free port. */
export async function serve() {
  const server = createServer(async (req, res) => {
    try {
      const p = normalize(decodeURIComponent(req.url.split("?")[0]));
      const f = join(ROOT, p === "/" ? "index.html" : p);
      if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
      res.end(await readFile(f));
    } catch { res.writeHead(404).end("not found"); }
  });
  await new Promise((r) => server.listen(0, r));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

/**
 * Installed on every page with addInitScript. Tests used to reach into the raw store
 * shape, so the day the store grew a campaign container every one of them broke at once.
 * This is the seam: it reads and writes the campaign in play, whatever the schema is.
 */
export const GAME_HELPERS = `
window.__game = {
  KEY: ${JSON.stringify(KEY)},
  // The app only writes on its first save, so a test that seeds before anything has been
  // created would otherwise write into nothing and silently do nothing at all.
  raw() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.KEY) || "null"); } catch (e) { d = null; }
    if (d) return d;
    d = { schema: 2, activeCampaignId: "c1", campaigns: { c1: { id: "c1", name: "Test Journey",
      createdAt: 0, characters: {}, journey: null, rollLog: [], sessionLog: [] } } };
    localStorage.setItem(this.KEY, JSON.stringify(d));
    return d;
  },
  read() {
    const d = this.raw();
    if (!d) return null;
    return d.campaigns ? d.campaigns[d.activeCampaignId] : d;
  },
  write(patch) {
    const d = this.raw();
    Object.assign(d.campaigns ? d.campaigns[d.activeCampaignId] : d, patch);
    localStorage.setItem(this.KEY, JSON.stringify(d));
  },
  /** Mutate the campaign in place; the callback receives it and the write follows. */
  edit(fn) {
    const d = this.raw();
    fn(d.campaigns ? d.campaigns[d.activeCampaignId] : d);
    localStorage.setItem(this.KEY, JSON.stringify(d));
  },
  characters() { return Object.values((this.read() || {}).characters || {}); },
  first() { return this.characters()[0] || null; },
  reset() { localStorage.removeItem(this.KEY); },
  seed(state, settings) {
    localStorage.setItem(this.KEY, JSON.stringify(state));
    if (settings) localStorage.setItem(this.KEY + ".settings", JSON.stringify(settings));
  }
};
`;

export const SETTINGS_ALL_ON = { solo: true, gmScreen: true, manualDice: false, theme: "dark" };

/** Wrap one campaign's contents in the schema the store writes. */
export function campaign(body = {}) {
  return {
    schema: 2,
    activeCampaignId: "c1",
    campaigns: {
      c1: {
        id: "c1", name: "Test Journey", createdAt: 0,
        characters: {}, journey: null, rollLog: [], sessionLog: [], ...body
      }
    }
  };
}

const traveler = (id, name, over = {}) => ({
  id, name, archetype: "veteran", gender: "male",
  attributes: { strength: 4, agility: 4, wits: 3, empathy: 3 },
  talents: ["hardened"], conditions: [], tension: {},
  inventory: { items: [], cash: 200 },
  neurocaster: "stimulusTleStandard", dream: "d", flaw: "f", goal: "g", threat: "t",
  state: { health: 4, hope: 3, bliss: 1, permanentBliss: 0 }, ...over
});

const VEHICLE = {
  id: "car2wd", name: "2WD Car", label: "2WD Car", passengers: 4,
  maneuverability: 2, speed: 3, hull: 6, armor: 4, traits: [{ id: "fast", name: "Fast" }]
};

/** Nothing has happened yet: no Traveler, no Journey. */
export const FRESH = campaign();

/** Session two: a pair of Travelers who have been hurt, a Journey underway. */
export const MID_SESSION = campaign({
  characters: {
    a1: traveler("a1", "Audit One", {
      talents: ["hardened", "medic"], tension: { a2: 1 },
      inventory: { items: [{ name: "Handgun", bonus: 2, maxBonus: 2 }], cash: 200 }
    }),
    a2: traveler("a2", "Audit Two", {
      archetype: "doctor", gender: "female", attributes: { strength: 3, agility: 3, wits: 4, empathy: 5 },
      talents: ["surgeon"], tension: { a1: 2 }, neurocaster: "stimulusGo",
      inventory: { items: [], cash: 50 },
      state: { health: 3, hope: 5, bliss: 0, permanentBliss: 0 }
    })
  },
  journey: {
    destination: "a drone boneyard — the parts are there", start: "a trailer park",
    vehicle: VEHICLE, fuel: 10, sharedItems: [{ roll: 15, name: "First aid kit" }],
    shift: "Morning", day: 1
  }
});

/**
 * Session three at its worst: four Travelers carrying five conditions and eight items
 * each, ten combatants in a running fight, and a hundred rolls behind them. This is the
 * state that found the log paging, the collapsed combatant cards and the sheet jump row.
 */
export const STRESS = (() => {
  const names = ["Audit One", "Audit Two", "Audit Three", "Audit Four"];
  const characters = {};
  names.forEach((name, i) => {
    const id = `s${i + 1}`;
    characters[id] = traveler(id, name, {
      gender: i % 2 ? "female" : "male",
      conditions: Array.from({ length: 5 }, (_, k) => ({
        id: `${id}c${k}`, kind: k % 2 ? "trauma" : "injury", name: `Condition ${k + 1}`,
        effects: [{ dice: -1, attr: "strength" }], heal: k % 2 ? null : 3, surgery: false
      })),
      inventory: {
        items: Array.from({ length: 8 }, (_, k) => ({
          name: `Item ${k + 1}`, bonus: (k % 3) + 1, maxBonus: (k % 3) + 1, uses: null
        })), cash: 120
      },
      tension: Object.fromEntries(names.map((_, k) => [`s${k + 1}`, k === i ? 0 : (k % 3)])),
      state: { health: 2, hope: 2, bliss: 2, permanentBliss: 1 }
    });
  });

  return campaign({
    characters,
    journey: {
      destination: "a drone boneyard — the parts are there", start: "a trailer park",
      vehicle: VEHICLE, fuel: 4, sharedItems: [{ roll: 15, name: "First aid kit" }],
      shift: "Night", day: 6,
      combat: {
        active: true, round: 4, startingSide: "travelers",
        combatants: [
          ...Object.keys(characters).map((id, i) => ({
            id, kind: "traveler", name: characters[id].name, side: "travelers",
            zone: 1, acted: i < 2, realm: "real"
          })),
          ...Array.from({ length: 6 }, (_, i) => ({
            id: `t${i}`, kind: "threat", name: `Law Enforcement ${i + 1}`, threatId: "lawEnforcement",
            side: "enemies", zone: 2, acted: i < 3, health: 4
          }))
        ]
      }
    },
    rollLog: Array.from({ length: 100 }, (_, i) => ({
      id: `r${i}`, ts: Date.now() - i * 60000, by: names[i % 4], charId: `s${(i % 4) + 1}`,
      label: "Strength", dice: [6, 2, 3], outcome: "1 success"
    }))
  });
})();

export const SEEDS = { fresh: FRESH, mid: MID_SESSION, stress: STRESS };

/** Load a seed and land on a route, with the gated tabs on. */
export async function seedPage(page, base, seed, route = "home", settings = SETTINGS_ALL_ON) {
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  await page.evaluate(([state, s]) => { window.__game.seed(state, s); }, [seed, settings]);
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate((r) => { location.hash = `#/${r}`; }, route);
  await page.waitForTimeout(140);
}
