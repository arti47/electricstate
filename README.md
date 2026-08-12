# Electric State Player

A player-character companion for *The Electric State Roleplaying Game* (Free League, 2024) —
character creation, an in-play tracker, a native dice engine, and the game's own generator
tables. Installable, offline-capable, and local-first.

## Running it

No build step. Serve the folder and open it:

```bash
npm run serve      # or any static server
# → http://localhost:8080
```

Opening `index.html` from the filesystem mostly works, but service-worker install and PWA
install need a real origin (`http://` or `https://`).

## Storage

Everything lives in `localStorage` by default — no account, no network. Use
**Settings → Export JSON** for backups; there is no cloud copy until sync ships.

### Optional cloud sync

Cloud sync is off until you supply your own Firebase project. Put its values in
`firebase-config.js` and set `FIREBASE_ENABLED = true`. `database.rules.json` holds the
matching security rules (players read and write their own sheet plus shared combat; the GM
reads and writes everything). Never commit real keys.

## Tests

```bash
npm install        # dev-only: playwright-core
npm test           # data invariants + headless browser smoke test
```

The harness asserts the rules invariants that matter: D66 tables are complete, pregens
re-derive against the Health and Hope formulas, archetypes reference real talents, weapons
declare damage or an explicit exception, the solo decks are 13 cards, and every screen renders
at 360px with no console errors and no horizontal overflow.

## Scope and licensing

Built as a personal play aid from the owner's own copy of the rules. It carries game
mechanics — numbers, formulas and tables — with all descriptive text rewritten; it contains no
setting material, no scenario content, and no artwork. If you publish or distribute a copy,
the licensing is your responsibility; openly licensed material is the safe basis for anything
public. Not affiliated with or endorsed by Free League Publishing or Skybound Entertainment.
