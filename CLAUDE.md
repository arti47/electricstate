# CLAUDE.md

## What this repo is
Working repository for **Electric State Player** — an installable player-character PWA for
*The Electric State Roleplaying Game* (Free League / Fria Ligan AB, 2024; Simon Stålenhag;
Year Zero Engine variant) — plus the rulebook transcription it is built from.

Build is governed by `docs/app/RPG-APP-TEMPLATE.md` (v2 autonomous build instructions).
**Current stage: B — checkpoint and product Q&A. No application code yet.**
The checkpoint, System Profile, Data Extraction Ledger and phased roadmap live in
`docs/app/ROADMAP.md`; at Stage C start that file's content is promoted into this CLAUDE.md
as the project's canonical living spec.

## Layout
```
docs/source/core-rulebook-transcript.md   raw PDF transcription, 17.5k lines — PRIMARY source of truth
docs/source/secondary-summary.md          third-party digest of the same book — corroboration only, known errors
docs/rules/                               distilled reference, one file per subsystem (convenience index, not authority)
docs/TRANSCRIPT-ISSUES.md                 known extraction defects + chapter line offsets
docs/app/RPG-APP-TEMPLATE.md              build instructions template (v2) — LOCKED architecture
docs/app/ROADMAP.md                       Stage B checkpoint + ledger + phased roadmap
```

## System facts to keep straight
- d6 pool = attribute (2–6) + talent/gear/modifier dice; success = a 6; extra 6s add effect (+1 damage each).
- One push per roll: re-roll everything that isn't a 1 or a 6. Base-die 1s cost Hope; gear-die 1s degrade the gear (bonus 0 = Busted). NPCs never push.
- Attributes: Strength, Agility, Wits, Empathy. Health = (Str+Agi)/2 ↑, Hope = (Wit+Emp)/2 ↑.
- Three currencies to model separately: **Health** (damage), **Hope** (pushes and trauma), **Bliss** (neuronic addiction). Bliss ≥ current Hope = lost in the Electric State.
- **Tension** (0–2, asymmetric, per pair of PCs) is both a bonus-dice stat in PvP opposed rolls and the main Hope regeneration loop.
- Time units: Round (5–10 s) / Stretch (5–10 min) / Shift (5–10 h, 4 per day).
- Campaign = **Journey**; adventure = **Stop** (Setting, Blocker, Situation, Countdown, Locations, Threats).
- Advancement is per-session debrief: roll 1d6 against an attribute — higher raises it, equal-or-lower grants a talent.

## App-specific findings that shape the build
- **No skills, no encumbrance, no ammo tracking, no classic magic** — do not build those surfaces.
- **Tension is an asymmetric N×N matrix** between Travelers, not a character stat, and it is the Hope economy's only reliable valve.
- **Bliss ≥ current Hope** is the neuronic lose condition — a comparison of two tracked numbers, surfaced in the persistent header.
- **Neurocasting is the "powers" subsystem**: Difficulty 1–3 = N successful rolls, gear bonus drawn from the neurocaster attribute matching the task, Bliss on each pre-push failure.
- **Dual-realm turns**: a character acts either in the real world or the neuroscape each round and is inert in the other.
- **Drone Pilot takes damage as a drone**: Hull zero disconnects the operator and the drone needs
  repairing — no death rolls, no serious injuries, no healing by rest. Mental trauma still applies.
- Advancement is a **session-debrief** flow (1d6 vs attribute); overcoming the Flaw grants 3 rolls then permanently locks improvement.
- Blocked data: weapons, consumer drones and vehicle stat tables cannot be recovered from the transcript (see docs/TRANSCRIPT-ISSUES.md). No UI is built against them until the source pages arrive.

## House aids (not book content)
- `data-names.js` holds eight **d100 tables the book does not print**: paired first names, surnames,
  favourite '90s songs, three description tables (build / wear / manner), Goal seeds and Threat seeds. Flagged `HOUSE_AID = true`
  and labelled as such in the UI. Name pairs follow the book's own pregen convention
  (`Cade/Courtney`).
- Description rolls **one word from each of the three tables** rather than three from one, so a
  description always covers how they are built, what they wear and how they behave. The three
  tables are disjoint — a word appears in exactly one of them.
- Goal and Threat each roll three distinct words from their own table. All three sets are stored on
  the character as `descriptorWords` / `goalWords` / `threatWords` and shown on the sheet beside the
  field they seeded, so they stay useful in play rather than being consumed at creation.
- The Goal seeds also fill the hole left by ruling A17 — the book references a personal Goal table
  that was never printed.
- `data-journey.js` holds five more: places, purposes, route features, vehicle details and Kickers. The book
  gives Journey prep steps, the length table, a D6 destination table in Ch. 8, Kicker examples and
  the why-stick-together D6 — but nothing for the starting point, the route, or the vehicle
  questions it asks, and only four Kicker examples where a table would serve. Destination rolls a
  place **and** a purpose; the book's own D6 sits beside it. The Kicker is a content table — one
  roll returns a finished event, since the Goal seeds already supply the words to interpret.
- Place entries are described by what they are, never by named locations, so the house tables carry
  no setting text and stay inside the scope guard.
- **Two kinds of house table, and the distinction matters** (see `docs/app/TABLE-AUDIT.md`):
  *meaning tables* feed interpretation and must hold **single words** plus the ten Anything Words
  (Change, Continue, Decrease, Increase, Mundane, Mysterious, Start, Stop, Strange, Extra);
  *content tables* hand over a finished thing — a name, a place, a dashboard detail — and keep
  their phrases. `GOAL_SEEDS` and `THREAT_SEEDS` are meaning tables; everything else is content.
- Meaning rolls **keep doubles** and mark them amplified (`Decrease ×2`); content rolls draw
  distinct rows. Method comes from Mythic Magazine 38, kept at `docs/app/MYTHIC-CUSTOM-TABLES.md`.
- Any future invented content goes in its own file with the same flag — never mixed into the
  extracted data files.

## Conventions
- Cite the transcript by line number (`docs/source/core-rulebook-transcript.md:5150`), not by book page — book page numbers survive in the text but are unreliable anchors.
- When a rules file and the transcript disagree, the transcript wins; fix the rules file.
- **Source precedence**: page images (`docs/rules/09-stat-tables.md`) > transcript > secondary summary. The summary corroborates; it never decides. Where transcript and summary disagree, request the page image rather than picking one.
- Don't reconstruct the weapons, drone or vehicle stat tables from the transcript alone — the columns are de-interleaved and rows cannot be recovered reliably (see docs/TRANSCRIPT-ISSUES.md). Get those values from the PDF or the official character sheet.
- Rules files are terse reference, not prose retelling. Keep tables as tables.
- Content here is copyrighted material transcribed for personal use; keep it in this repo and don't publish it.

## Git
- Feature branch: `claude/document-study-review-cd12ud`, merged to `main` after each unit of work.
- Push with `git push -u origin <branch>`.

## Product decisions (Stage B)
- Usage mode: **local-first**, Firebase architected day one, built after First Session Playable.
- Dice input: **digital + manual entry** — every roll can be tapped or typed in from physical dice.
- Theme: follow system, in-app override. Layout: phone-first.
- Phase 6 order: solo tab before GM screen (default; reversible).

## Build status (Stage C)
- **Phase 0 — Foundations**, data layer first.
- Data files live at repo root per the LOCKED file structure: `data.js` (core), `data-tables.js`
  (injuries, traumas, shared items, gear, services), `data-gm.js` (Stop generators),
  `data-solo.js` (Chapter 8), `data-npcs.js` (Threats), `data-pregens.js`.
- Ledger: **51 of 51 extracted — data layer complete.** Files: data.js, data-tables.js, data-gm.js,
  data-solo.js, data-npcs.js, data-pregens.js, data-vehicles.js, data-library.js.
- Known book erratum: the Carbone pregen sheet prints Hope 4 where the formula gives 5. Rules
  outrank printed derived values; see `PREGEN_ERRATA` in data-pregens.js.
- **Phase 0 complete.** Shell built: index.html, styles.css, src/{core,ui,settings,store,rules,derived,router,screens,main}.js, PWA (manifest + service worker + icon), firebase-config placeholder, database.rules.json with player/GM roles.
- Theme: overcast slate and oxidised metal, dark-first, colour reserved for meaning (rust = damage/loss, teal = anything touching the network).
- Verification: `npm test` runs 14 data/rules invariants plus a headless browser smoke test
  (every route renders, zero console errors, zero horizontal overflow at 360 and 390px).
- **Phase 1 complete.** Creation wizard (7 grouped screens over the book's 17 steps), Journey/vehicle
  group entity, Tension matrix, pregen instantiation. Attribute generation defaults to rolling
  (4d6 re-rolling 1s, assign freely) with the book's 16-point distribution as the alternative.
- **Phase 2 complete.** Live sheet with steppers clamped to true maxima, persistent vitals header
  (Health/Hull · Hope · Bliss with Permanent inline · Cash · Fuel), status notes for
  Incapacitated / Breakdown / lost in the Electric State, injury and trauma pickers writing
  machine-readable conditions, neurocaster attribute degradation with Busted state, inventory
  with gear bonuses, Tension summary, notes, delete.
- Header design note: Permanent Bliss renders inside the Bliss tile (`4 ⌊2⌋`) because by rule it is
  the irreducible floor of Bliss, not a parallel track. Tension is deliberately off the header —
  it is pairwise and needs names to mean anything.
- **Phase 3 complete — First Session Playable.** Dice engine: pool builder (attribute + tap-to-use
  talents + gear + modifiers + auto-applied condition dice), push economy with base-vs-gear die
  semantics, trauma push legality (cannotPush / mustPush enforced), Tension dice auto-injected in
  PvP, damage applier with armor and cover soak, instant kill, guided death rolls, roll log.
- Manual dice entry is two-stage: enter the initial dice, then only the re-rolled ones, so Hope
  loss and gear degradation stay accurate instead of being trusted from a total.
- Verification: `npm test` = 21 data/rules/engine invariants + browser smoke (wizard walk, sheet
  clamping, injury apply, dice roll, log write).
- **Phase 4 (partial).** Lifecycle engine at `#/time`: Stretch / Shift / Day / Session boundaries
  fire bundles, each reporting exactly what changed with single-step undo. Shift heals (1, or 2
  under a Nurse), rotates the Shift name, burns fuel, tracks sleep. Day runs Bliss decay with the
  permanence roll, the hunger Strength roll, and injury healing clocks (surgery-flagged injuries
  do not tick). Tension reduction pays a Hope to both sides, blocked by Reclusive. Hope from items
  is capped at 1 per Shift and blocked by hunger or sleep deprivation.
- Advancement debrief enforces the post-Flaw lock: overcoming the Flaw gives 3 rolls, clears the
  Flaw, then permanently disables improvement.
- Neurocasting at `#/neuro`: Difficulty-N progress, Processor/Network/Graphics as gear dice by task,
  Bliss on every pre-push failure, Busted-caster gate, lost-in-the-Electric-State warning.
- Combat tracker at `#/combat`: side-based initiative (d6 + best Wits, re-rolled on ties), zone
  movement, per-round acted flags, threat drop-in from the bestiary, and the **dual-realm toggle** —
  a Traveler acting in the neuroscape is marked inert in the real world until their next turn.
- Generic progress tracker shared by countdowns, neurocasting difficulties, healing clocks and
  diseases: N successes, optional failure allowance.
- Verification: `npm test` = 30 invariants + browser smoke.
- **Phase 6 complete.** Solo tab (`#/solo`, toggle-gated): 52-card deck as pacing timer with no
  reshuffle until spent, face-card events routed by suit, Tilts, 5-card NPC generation, Stop and
  Threat generators, Countdown events with the 61-66 re-roll. GM screen (`#/gm`, toggle-gated):
  party panel with Bliss watch, Stop builder rolling setting/blocker/conflict/locations/countdown,
  threat reference, and thirteen rollable tables.
- Verification: `npm test` = 35 invariants + browser smoke (wizard walk, sheet clamping, injury,
  dice roll, log, solo draw, GM table roll).
- **Hardening complete.** Rules-accuracy audit closed six engine findings — all six were behaviour,
  not data: traumatic events with freeze, rally, Medic stabilize, body-armor Agility penalty,
  surgery (Surgeon roll or $1,000), and the three traumas that rewrite trauma handling. Findings,
  fixes and the verified-clean list are in `docs/app/AUDIT.md`; each one carries a regression test.
- **Rules page is an accordion** grouped by subject in session order, everything collapsed until
  opened; searching auto-opens matches. Every screen carries a collapsed `explain()` note
  ("What this does") from `ui.js` — first-time players can learn a surface without leaving it.
- **Tutorial at `#/tutorial`**: seven table steps plus four solo steps, each saying what to tap and
  why the game asks for it. Linked from the home screen when no Traveler exists, and from Settings.
- **Audit follow-ups.** Drone Pilot damage model (`hull`, no death rolls, no rest healing), combat
  tracker wired to the dice engine, one shared Stop record in `src/stops.js` used by both the GM
  screen and solo play, and a roll log that knows who rolled.
- **Roll log is attributed and filterable.** `logRoll` resolves the caller's display name to a
  Traveler id at write time, so a rename never orphans past rolls; `#/log` shows filter chips
  (All · each Traveler · Table for rolls that belong to nobody), stamps each row with who and when,
  and can be cleared. Rolls with no person behind them — initiative, vehicle accidents, chase
  obstacles — group under Table by design.
- **Seventh audit pass (22 findings, all closed).** Method: two scripts — exports nothing
  imports, imports nothing uses — then the distilled rules files read section by section against
  the engine. Recurring defect confirmed once more: data extracted, never called. Closed full
  auto, ambush suppressing reactions, the neurocaster's worn penalty, reactions costing a turn,
  the taser, freezing, driving, the Spin cascade, Lone wolf alone, two desynced solo Countdown
  counters, four inert rule-talents, the animal bestiary, avatar combat damaging the user,
  scripted-experience Bliss, neuroscape helpers, cold exposure, death rolls restarting, the
  Nurse's disease assist, firearms at Engaged, and the solo spotlight rotation. See
  `docs/app/AUDIT.md`.
- Corrected `docs/rules/07-solo-play.md`: Tilt degrees are 7–9 high and 10–Ace extreme (data and
  secondary summary agree; the transcript's table is de-interleaved and cannot settle it).
- `tests/audit.js` polls for up to 1.5s after each click instead of waiting a fixed 220ms — the
  fixed wait manufactured a no-op finding that reproduced nowhere.
- **Eighth pass (4 findings).** Vehicle repairs (Wits roll, tools and a Reliable trait as gear
  dice, spare part required once wrecked), the chase movement roll itself, the book's safety
  tools in Settings, and time-unit durations on the Time screen.
- **`npm test` parses every source file first.** A missing paren in a screen module reaches the
  browser as a hang, not an error — the unit harness now `node --check`s all of `src/` and
  `data*.js` and fails by filename.
- **Ninth pass — gameplay flow and interface (11 findings).** Two-level navigation: a section
  nav on every screen in a tab group, because twelve of eighteen routes had no visible way in.
  Roll pinned above the tab bar with the pool size; vitals on the dice screen; a way back into
  a running fight. Sheet play actions moved under the vitals, with rally and death roll on the
  status notes themselves. Combat sorts by who acts next and names them. Time separates nightly
  boundaries from once-a-campaign ones. Solo folds prep and wrap-up. Home names the next
  creation step until the group has a destination, a vehicle and Tension.
- UI conventions added: `.subnav` (pill row, scrolls inside itself so the page never scrolls
  sideways), `.actionbar` (fixed above the tab bar, needs an `.actionbar-spacer` at the end of
  the screen), `.phase-fold` (a card that collapses).
- **Tenth pass — measured layout (8 findings).** A probe seeded a mid-session state and recorded,
  per route, where the primary action sits and how big every tap target is. Time, Neuroscape and
  the creation wizard all buried their primary action below the fold; all three now use the
  pinned `actionBar()`. Driving reordered so in-scene rolls precede between-scene repairs.
  Checkboxes were 13px because an inline style beat the stylesheet; Settings toggles were not
  wrapped in labels. The sheet folds Dream/Flaw/Goal/Threat and Notes. The section nav carries a
  round badge while a fight is running.
- **Eleventh pass — under load (8 findings).** Stress state (4 Travelers, 5 conditions and 8 items
  each, 10 combatants, 100 log entries) at 320/390/768px. The log now pages at 25; combatants who
  have acted collapse to a line; the solo record folds; the sheet gets a jump row. Flow: a
  stabilized Traveler is offered the D66 injury the rules require, ending a fight confirms before
  discarding Threat health, the talent picker describes what it offers and puts the archetype's
  three first, and a Traveler can **invent a talent** as p.65 allows — stored on the character and
  resolved through `talent(id, ch)`.
- Verification: `npm test` = 90 invariants + browser smoke; `npm run probe` = layout, flow and
  PWA probes; `npm run audit` clicks every control on every screen and flags errors, unclickable
  controls and silent no-ops. `npm run verify` runs all four.
- **Dice are cryptographic.** All randomness routes through `core.randomInt`, which draws from
  `crypto.getRandomValues` with rejection sampling — `value % max` is biased whenever max does
  not divide 2^32, which is exactly the accusation a dice roller must be able to answer.
  `Math.random()` appears nowhere in `src/`, and a test asserts that. `pick`, `shuffle` and
  every die build on it.
- **The roll log is the fairness record.** A collapsed panel counts every d6 face the app has
  rolled, with percentages against the even 16.7%, once there are 20+ dice to talk about.
  Values above 6 (D66, D100) are excluded rather than folded into a d6 histogram.
- **Store schema 2 — campaigns.** `data.campaigns[id]` holds characters, journey, rollLog and
  sessionLog; `activeCampaignId` says which is in play. A schema 1 save migrates into a single
  campaign with everything intact. Settings offers Play / Rename / Delete and "Start another
  Journey"; the last campaign can never be deleted out from under the player.
- **One-step undo covers every destructive action.** `snapshot(label)` before deleting a
  Traveler, deleting a campaign, clearing the log, erasing everything or crossing a time
  boundary; `undoLast()` restores and clears. Settings shows the pending label.
- **The session record feeds the debrief.** `noteEvent(kind, text)` writes what each boundary
  actually changed; the debrief shows the session's record before rolling advancement and
  clears it afterwards. Cap 200 entries.
- **The vitals header names who it is about.** With two or more Travelers it is a switcher —
  solo play runs 2–4 and every screen had its own select. On the dice screen it changes who the
  pool belongs to in place; elsewhere it opens that Traveler's sheet.
- **Steppers disable at their limits** rather than sitting there unpressable-but-pressable.
  Bliss's floor is Permanent Bliss, by rule.
- Settings also carries text scale (pinch-zoom is off, so the app gives it back), a screen wake
  lock, a plain-text sheet export, a data check, and **Hide GM content** — prepared Stops and
  unfired Countdown steps arrive blurred and unblur on a tap, via `ui.spoiler()`.
- **Tests go through one seam.** `tests/fixtures.js` owns the static server, the browser-side
  `__game` store helper and three seed states (fresh / mid-session / stress). No test reaches
  into the raw store shape — the day the store grew a campaign container, every one that did
  broke at once.
- **Three probes, committed.** `probe-layout` measures where each route's primary action sits
  and how big every target is, across all three seeds (it found five buried primaries on its
  first run); `probe-flow` counts the taps each session journey costs and asserts it still
  arrives; `probe-pwa` forces a real reinstall, proves the old build's cache is deleted, and
  boots the app with the network off.
- A unit test asserts the service-worker shell lists every file in `src/` and every `data*.js`,
  and that `core.CACHE_VERSION` matches the worker's — a bumped app with a stale worker leaves
  players on the old build.
- **Three things called Goal and Threat, kept distinct.** Creation writes `ch.goal` / `ch.threat`
  (free text, house-aid seed words alongside). Solo's archetype hooks are the book's printed
  p.207–208 suggestions for those same two fields, and now write to the sheet instead of only
  being displayed. Solo's **personal Threat is the clock**, not the description: a D6 kind plus a
  three-step countdown, stored **per Traveler** as `solo.personalThreats[charId] = {text, step}`.
  A one-counter save migrates onto the lead. A face card advances whoever holds the spotlight,
  because the card does not say whose; the button asks when more than one is running.
- **Never remove a `.modal-backdrop` by hand.** `ui.dismissModal(value)` closes the dialog on
  top through its real `close`, so the open-modal count stays honest. Four callers did it by
  hand and the count drifted, which left `overflow: hidden` on the body — the app stopped
  scrolling, and not until the *next* dialog closed. `ui.releaseScrollLock()` runs on every
  route render as the backstop.
- **Every person the app names has a gender, and no user-facing string uses a plural pronoun
  for one person.** `ch.gender` is `"male"` or `"female"`, chosen in creation above the name and
  switched on the sheet's identity line under the Traveler's name — never inside a fold; `normalize()` back-fills old saves. `src/pronouns.js` is the only source
  of the words — `subj/obj/poss/refl`, capitalised variants, `refer(who, fallback)` when the
  subject may not be picked yet, and `neuter` (it/its) for machines. Combatants carry a gender
  too: rolled for people, `neuter` for anything with a Hull. Generated solo NPCs get a name and
  a gender. The house first-name table is paired (`Cade/Courtney`) and the roller takes the
  matching half; pregens name both halves in `data-pregens.js` because the book's pairs are not
  consistently male-first.
- `tests/pronoun-scan.mjs` fails the build on `they/them/their` inside any string literal in
  `src/` or `data*.js` — comments and `${expressions}` excluded. `npm run pronouns` runs it
  alone. Where no specific person is in scope, name the thing ("the target", "the other
  driver"); the `data-journey.js` Kicker and destination tables are second person.
- **Three shared control shapes, and when to use which.** `.seg` — two or three exclusive
  options as one pill switch (gender, realm this round); deliberately quiet, because accent is
  reserved for the thing you press. `.stepper` — one bordered group of − value + (or ← zone →),
  never three loose boxes with gaps. `.btn-grid` — actions of equal standing in equal cells,
  with an odd last child spanning the row; a wrapped `.btn-row` leaves an orphan that wraps its
  own label. `.vitals` is flex, not grid: auto-fit left a blank slab whenever the tile count
  did not divide the column count. A control shares a line only with fixed-length content:
  the gender switch sat beside the archetype and the song and therefore moved sheet to sheet.
- Phase 5 multiplayer remains the only unbuilt phase, gated behind the local-first decision.
