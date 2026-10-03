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
- Theme: **dusk roadside** (since the twelfth pass) — slate sky over a sodium-amber horizon,
  dark-first, colour reserved for meaning (amber = the thing you press and Hope, rust =
  damage/loss, teal = anything touching the network). Light is a designed "overcast day".
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
- UI conventions added: `.subnav` (section row, scrolls inside itself so the page never scrolls
  sideways — since the twelfth pass it is also the screen's title), `.actionbar` (fixed above the tab bar, needs an `.actionbar-spacer` at the end of
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
- **The app assumes the player has read nothing.** A 52-word **glossary** in `data-library.js`
  renders as the first group on the Rules screen and is searchable with the rules; every word
  the app puts on screen before a player could have learned it is in there, pinned by a unit
  test. Every screen introduces itself with `explain()`, every empty state carries the action
  that fills it, every roll result says what happened in a sentence, and abbreviations are
  spelled out where they appear. Solo mode and the GM screen are advertised on the home screen
  by what they are, switchable in one tap, rather than named in a line of small print.
- `tests/probe-onboarding.mjs` is the guard: every route in the empty state must introduce
  itself and offer something to press, every book word must be defined, and the first five
  minutes — cold start to tutorial, to a ready-made Traveler, to a first roll — must still work.
  `npm run probe:onboarding` runs it alone.
- **Two committed specs that fail on opposite mistakes.** `npm run coverage` walks *source
  document → code*: `docs/coverage.json` maps 136 requirements read out of the transcript
  (chapters 3, 4, 5, 6, 8, the sheet and the pregens) to the code artefact that implements
  each, and the spec fails if a marker vanishes, a citation is missing, or a `partial` /
  `deliberately-omitted` / `unknown` entry has no note. `npm run reachability` walks *code →
  user*: orphan functions, orphan tables, unrevealed markup, inert controls, broken `#/route`
  targets, dangling rule references, files the service worker ships but does not have, and
  dialogs closed by hand. Both run inside `npm test`.
- **The coverage list must never be derived from the code.** A checklist built by scanning
  `src/` maps onto `src/` by construction and passes forever while proving nothing. Every
  entry cites a transcript line so a reader can go and check it. Anything unchecked is
  `unknown`, never `partial`.
- A green coverage run proves a *mapping* exists, not that the implementation is right — a
  constant can exist and hold the wrong number. Behavioural correctness is `tests/run.js` and
  the passes in `docs/app/AUDIT.md`.
- **False-positive traps the reachability spec has already hit**, kept so nobody re-derives
  them: a table composed into another table *in the same file* looks orphaned unless you
  count mentions beyond the declaration and the `export default` list; and an "is it ever
  revealed" check written as a bare `/hidden = false/` over the whole corpus matches some
  other element's reveal and can therefore never fire — tie it to the id.
- **`src/play.js` answers "what do we do now", all session long.** Every other screen says what
  a control does; this says what happens at the table. `whatNow(state)` is a pure function over
  the saved game returning one of nine steps across six phases — setup → open → play → crisis →
  close → done — and the home screen renders it as the only accent-edged card there. The old
  `nextStepFor` named the next *setup* step and returned null the moment setup finished, which
  is precisely when a table needs telling what to do; that silence was the gap.
- `#/play` is the procedure itself, in three folds that open on the act you are in: getting
  started, keeping it going, stopping well — plus the five ways a session stalls and what to do
  about each. It is not a feature tour; `#/tutorial` is the feature tour.
- **Ending is a first-class act.** A session ends with the debrief (that is where advancement
  happens at all), a Stop ends resolved *or* driven out of, and the Journey ends with an
  epilogue that closes the campaign as a record. All three were implemented and folded away
  under "Bigger boundaries" on the Time screen, which is why nobody found them.
- **`src/session.js` is the front door: the app runs the session.** `#/session` shows one beat —
  what is happening, one line on what to do about it, two to four big buttons — and pressing one
  produces the next beat. It composes the book's own generators into sentences rather than
  handing over a table. **It is not a second game**: arriving creates a real Stop, the Countdown
  it fires is the same one the GM screen fires, and what it narrates goes into the same session
  log the debrief reads back, so you can drop out to the manual screens mid-session and the game
  is where you left it.
- Narration must never inline a table entry into a sentence — entries are fragments with no
  consistent part of speech, which is how "a greenhouses" and "he wants trauma and will get it
  power" happen. Use labels and colons; they survive any row of any table.
- The three layers, and which question each answers: `#/session` runs it, `#/play` explains the
  procedure, `#/tutorial` tours the app. The home screen leads with the first.
- Phase 5 multiplayer remains the only unbuilt phase, gated behind the local-first decision.
- **Twelfth pass — dusk roadside overhaul (UI only, no copy changed).** Audit and decisions in
  `docs/app/UX-OVERHAUL.md`.
  - **Four tabs: Play · Traveler · Dice · Reference.** Solo and GM are modes inside Play's section
    nav (shown when switched on), not tabs. Settings is a header icon. The Traveler tab opens the
    last sheet viewed (`electricState.v1.lastSheet`), or creation when nobody exists.
  - **The section nav is the title.** The current item is set large; the H1 under it gets
    `.sr-only` (it stays in the DOM — tests and probes read `#screen h1`). Applied by a
    `MutationObserver` in `router.js` because screens re-render themselves in place.
  - **`explain()` is an ⓘ on the title line** (`.explain.is-lead`), opening as a bottom sheet.
    On a screen's first visit it opens in place once (`.is-intro`, `electricState.v1.seenIntro`).
    Only the first explain on a screen is the lead; the rest stay inline folds.
  - **Dice tray** (`#tray`, header dice icon, the sheet's Roll button via `rollFor(id)`): the
    dice screen rendered as a bottom sheet over any screen, docked as a right pane at ≥1100px.
    Navigating away closes it. It borrows the vitals bar and gives it back on close.
  - **Combat strip** (`#strip`): round and who is up, on every screen but the tracker, from
    `turnOrder()` in `combat.js`.
  - **Vitals are gauges**: pips for Health/Hope, a Bliss bar on the Hope scale with a hatched
    Permanent floor and a tick at current Hope. Tiles for the three tracks are buttons that
    open a quick stepper (`vitalSteppers()` is shared with the sheet). Drops flash the tile and
    vibrate; the bar pulses when Health or Hope is 0 or Bliss has caught Hope.
  - **Dice are faces** (`ui.dieFace` / `ui.diceRow`): bone base dice, amber-rimmed gear dice,
    sixes lit, ones rusted, a tumble on roll, and on a push the kept 1s and 6s stay put. The
    roll log uses mini faces. `ui.haptic()` for ticks, rolls and losses.
  - **Destructive actions sit behind ⋯** (`ui.moreMenu`): Delete Traveler, Clear log, End
    combat. Where a store snapshot exists the action runs at once and the toast carries Undo
    (`showToast(msg, kind, { label, run })`); End combat keeps its confirm (no snapshot).
  - Every checkbox renders as a switch (still a real checkbox). Every dialog is a bottom sheet
    at ≤640px, drag-down to dismiss. `label.card-row` needs no inline style any more.
  - Fonts are self-hosted WOFF2 in `fonts/` (Barlow Condensed, IBM Plex Mono, OFL licences
    alongside) and listed in the service-worker shell. Icons are one inline-SVG set,
    `src/icons.js`; `index.html` names them with `data-icon` and `main.js` draws them.
  - Never animate `transform` on `#screen` or an ancestor of `.actionbar`: it turns the fixed
    bar into one positioned against the screen for the length of the animation, and the
    above-the-fold tests catch it as a 400px drop.
  - Tablet: the sheet flows into two columns (`.sheet-cols`), GM keeps the party in a side
    column (`.gm-layout`). Every text token clears AA 4.5:1 in both themes.
- **Thirteenth pass — graphics and layout (no copy changed).** See `docs/app/UX-OVERHAUL.md`.
  - `src/scene.js`: the silhouette landscape behind every screen (`.sky`), a sky per Shift via
    `html[data-shift]` from `syncSky(journey.shift)` (no Journey = evening), fog drift, parallax
    and night lights (all off under reduced motion), `sceneBand(kind)` for the session beat and
    empty states, and the once-per-launch `splash()` (pointer-events none, so tests are unaffected).
  - `src/graphics.js`: `ringDial`, `shiftDial`, `tensionGraph`, `routeStrip`, `fuelDial`,
    `playingCard`, `deckStack`, `archetypeGlyph`, `helmetGraphic`, `vehicleArt`, `dieIcon`,
    `successSeal`, `failureStatic`. Pure SVG strings coloured by tokens; no text beyond numbers.
  - `src/sound.js`: WebAudio-synthesised sounds behind `Settings.sound()` (off by default);
    `ui.haptic(kind)` also plays the matching sound, so callers need one call.
  - Router decorate pass also prepends die icons to buttons reading `D6`/`D66`/`D100`/`Roll D66`
    and a scene band to every `.empty`. Both are marked so the observer never loops.
  - Section rows with more than 6 items fold into **More** (`PRIORITY` in `router.js` decides
    what stays: Play, Time, Solo, GM first — the flow probe taps Time and Solo from home).
  - `.manual` on Rules, the tutorial and `#/play` puts their cards on paper by redefining the
    tokens inside — any component reads correctly there without its own paper variant.
  - Secondary buttons are sentence-case ghosts; only `.btn-primary` is condensed uppercase.
  - Conditions now store `healTotal` beside `heal` so the healing ring can show progress.
  - Phone art must not push primaries below the fold: the scene band is 96px under 640px and
    the zone map renders below the card of whoever is up. `probe-layout` caught both.
- **Fourteenth pass — the world reacts (no copy changed).** See `docs/app/UX-OVERHAUL.md`.
  - `scene.syncScene({journey, stop, combat, chars, route})` (called by the router as
    `sceneNow`) sets `html[data-shift|weather|crisis|vehicle|neuro]`; CSS does the rest.
    `syncVignette(kind)` from `renderVitals` sets `html[data-state]` for the Traveler in view.
  - Narrative text uses `--serif` (self-hosted Source Serif 4): `.beat-now`, `.narr`,
    `.rule-entry p`, `.def-value`, `.countdown-steps`, explain bodies. Controls never use it.
  - Desktop (≥1100px): `.tabbar` becomes a left rail; `buildRail()` adds `.rail-sub` links per
    tab from `SUBNAV`. The section row hides and the H1 shows again at that width.
  - Tab changes use `document.startViewTransition` (directional via `html[data-dir]`), never a
    transform on the live screen. Skipped when `navigator.webdriver` is true — a transition
    swallows the next click, and every test clicks straight after navigating.
  - The dice action bar carries `poolPreview()`; its spacer grows only via
    `.actionbar-spacer:has(+ .actionbar .pool-strip)`.
  - A selected picker tile is `disabled` rather than a button that does nothing, which the
    click audit would rightly flag as a no-op.
  - Every new token scope (dossier, paper) was checked to AA: re-check when touching them.
- **Fifteenth pass — faces and one thing at a time (no copy changed).** See `docs/app/UX-OVERHAUL.md`.
  - `graphics.portrait(ch, {size, frame})` and `portraitMarkup(ch)` draw a seeded bust from
    the Traveler's id (a stable hash, not dice — `Math.random` is still banned). Gender picks
    the hair styles, archetype adds gear, `state.wearingCaster` adds the helmet.
  - The router's decorate pass now also: wraps every `<select>` with `ui.enhanceSelect` (a
    face button over a `pointer-events: none` select; the select stays visible, so
    Playwright's `selectOption` still works) and every number input with `ui.enhanceNumber`
    (its buttons set the `value` attribute too, so the click audit sees the change), and
    prepends `CARD_ICON` marks to card headings.
  - Section chrome is `.section-head` = `.section-title` (visual, aria-hidden) + `.subnav`
    pills with icons. The H1 stays `.sr-only` beneath; tests still find `.subnav-item`.
  - Solo phases carry `data-phase`; the build removes all but one and puts `.proc-rail` above
    it. Tests reach phase 5 with `.proc-step[aria-label^="5"]`.
  - Driving and Hazards share the picker pattern: tiles, the open one `disabled`, one card.
  - `html[data-route]` is set on every render; the Neuroscape skin keys off it.
  - Text nodes between a number and its `<small>` label need a real space (`" "`): tests and
    screen readers read `textContent`, where `52` + `cards left` ran together as `52cards left`.
- **Play is in step with the rest of the game.** The session director kept a private `beat`
  and only moved when its own buttons were pressed, so a Stop built on the GM screen or in
  solo, a Countdown fired there, or a Blocker resolved there left Play saying "Ready when
  you are". `session.reconcile()` runs before every render: it arrives at a Stop it did not
  open, says a Countdown step fired elsewhere (`director.firedSeen`), and wraps a Stop
  resolved elsewhere. `beatFor()` also runs the same setup ladder as the home card
  (`play.currentStep()`), so Play, Home and Running a session always agree on what is
  missing. Two unit tests pin both directions.
- The bottom **Play** tab opens `#/session` once a Traveler exists (`syncTabs`), and `#/home`
  before that so creation is the first thing seen. The app still launches on `#/home`.
- **Links between the parts stay whole (see `docs/app/LINKS.md`).** The rule: a screen never
  keeps its own copy of game state — it derives from the store each render; anything it must
  remember registers `core.onReset`; any saved id or copied name that points at another
  record is listed in `src/integrity.js` with its repair. Three guards hold it:
  - `tests/links.mjs` (in `npm test`, also `npm run links`): fails on a state field that is
    read and never written, and on a module `let` that neither resets nor is listed view-only.
    A key that only forwards the same field (`gearRef: pending.gearRef`) is not a write.
  - `store.persist()` runs `repairLinks()` on every campaign: deleted Travelers leave no
    Tension, fighter or solo lead; renames reach the fight; removed Stops are not active; Hull
    belongs to the current vehicle. Test fixtures must therefore be valid data — a traveler
    combatant needs a real Traveler.
  - Runtime tests for each repair, Play's sync, and a browser push that must Bust the Handgun.
  - Fixed with it: push gear damage reaches the item (it never did), Network weapons roll the
    Network rating, neurocasting can push and wear the caster, ending the Journey sets
    `ended`, solo arrival sets the Shift.
- **Round 1 of six (links between tabs).** `ui.related(links)` puts chips under a card for the
  screens it affects (vehicle → Driving/Time, neurocaster → Neuroscape, healing → Time, Talk
  it through ↔ Tension, Driving → Journey, Busted caster → sheet). Any `a[href="#/dice"]`
  outside the Dice tab, tab bar and section rows opens the tray over the current screen;
  combat's Attack opens the tray instead of leaving the fight. GM party rows open sheets. The
  session shows the party (portraits + mini vitals) and the route, each linking out.
- **Round 2 (audit cycle).** Wizard: rolled attributes render as dice, assigned ones dimmed
  (`.is-spent`); each attribute shows its die beside the picker (dashed `.die-slot` when empty);
  point-buy uses `.stepper`; Total/Health/Hope as ring dials. Suggested talents are
  `.talent-tile`s carrying the D6 pair that picks them (1–2, 3–4, 5–6), neutral dice — a key,
  not a result. Roll log rows link to the roller's sheet with a portrait; Settings backup
  actions are a `.btn-grid`.

- **Round 3.** GM party rows carry portraits; sheet Tension rows link to the other Traveler's
  sheet with a portrait and a 0–2 meter per side. Buttons inside a `.card-row` never wrap their
  own label (`Roll 3` broke onto two lines on the Journey vehicle card).
- **Round 4.** Each rules group whose subject has a screen ends with a `related()` chip to it
  (`GROUP_ROUTE` in `screens.js`); the Rules search carries a search glyph. The Hazards
  cold/hunger card links to Time with a chip instead of a bare button.
- **Round 5.** Tension screen cards open with the Traveler's portrait, linking to the sheet
  (`.face-head` — kept outside `h3:first-child` so the card-icon pass leaves it alone).
  `gearIcon()` moved to `icons.js` (a sheet ↔ wizard import would be circular); the Journey's
  shared items wear the same icons as the sheet's inventory.
- **Round 6.** Combat cards lead with a face: the Traveler's portrait, or a rust-ringed mark for
  a Threat (person, animal, or bolt for machines). Every sentence that sends the player to
  another screen ("on the sheet", "on the Time screen") now carries a `related()` chip to it —
  Neuroscape → sheet, solo procedure → Journey and Time. Not inside modals: a link under an
  open dialog navigates behind it.
- **Novice pass (six rounds) — round 1.** Empty home asks **How will you play?** (on my own /
  I am the GM / someone else is the GM); each tile switches on the right mode and opens
  creation. `whatNow` gains `solo-party`: solo with one Traveler and no destination is told to
  make a second (skippable via "Carry on with one"). Solo shows the setup step card while
  setup is incomplete. Dice shows the chosen attribute's blurb under the four tiles.
- **Stop hook.** `.claude/settings.json` runs `.claude/hooks/verify-on-stop.sh`: a session
  cannot end its turn while `npm run verify` fails (exit 2 feeds failures back). It skips when
  HEAD + working tree are unchanged since the last clean run (`.claude/.verified`, ignored).
- **Round 2 — the lit-button walk.** `tests/probe-novice.mjs` (in `npm run probe`, alone as
  `npm run probe:novice`): cold start, presses only the lit button, must reach Travelers →
  destination → Tension → a scene → the Countdown → a fight → a hit applied, with no screen
  lacking a lit button. Its first run found seven dead ends, all fixed: the empty home's lit
  button skipped the mode question (the tiles now lead); a greyed wizard Next gave no reason
  (the bar now names what is missing) and the ready-made Traveler sat under the archetypes;
  the pregen picker let you tap a taken archetype; Journey's only lit button was Done (now
  **Roll the rest**); Tension had nothing to press (**Roll starting Tension**, the book's rule);
  a session scene offered the same Roll forever (after a roll the next beat is lit, and every
  third scene lights **Time passes**); the tray reopened on a stale result (`clearResult()`)
  and closed only by an ✕ (now **Done**); a fight could start with nobody on the other side,
  and the up card's lit button was Turn spent. Now: **Add who you are fighting**, a Traveler's
  lit button is **Attack <nearest Threat>** (`attackWith`), a Threat's is **Roll its attack**
  (best of Strength/Agility, never pushes, `takeHit` → damage dialog), an aimed roll marks the
  attacker acted (`markActed`), **Apply damage** is lit on a hit and cannot apply twice
  (`result.applied`), **End the fight** lights when the other side is down and returns to Play.
- **Round 3 — to the end of the session.** The lit-button probe now continues through the
  debrief to the next session's first beat. Three more dead ends closed: after a fight the
  crisis kept lighting **It comes to a fight** (combat writes `journey.fightEndedAt`; Play
  lights **We solved it** once a fight has ended since the beat); an injury rolled mid-fight
  left you on the sheet whose lit button was Roll dice (the injury returns to `#/combat`, and
  the sheet lights **Back to the fight** while one runs); **End the session** opened Time,
  whose debrief sat folded away (it now goes to `#/time/debrief`, which runs the debrief at
  once, then resets the director and returns to Play).
- **Round 4 — one lit button per screen.** `tests/probe-lit.mjs` (in `npm run probe`,
  alone as `npm run probe:lit`): across fresh / mid / stress, every working route has at
  least one and at most two enabled `.btn-primary`. Excused by name: the empty home (mode
  tiles lead), creation (Next names what it waits for), a full log (a record). Fixed with it:
  GM had nothing lit (**Roll up a Stop** pinned while no Stop is in play), solo lit Draw a card
  with nobody to draw for, the dice screen lit the chosen attribute as well as Roll (it is now
  `.is-picked`), a missing Traveler's Back was unlit, and solo's lead toast read
  "<name> lead this one" with a "They" fallback.
- **Round 5 — the other two ways to play.** `Settings.playMode()` (`solo` / `gm` / `player`)
  is set by the empty-home tiles and switchable in Settings ("How you play"). **Player** (someone
  else is the GM): home lights **Open <Traveler>**, `whatNow` returns `player-ready` ("Your GM runs
  the story" → sheet, dice) instead of the Journey ladder, and Play shows the same. **GM**: the
  tile goes straight to `#/gm`, where **Roll up a Stop** is lit. The novice probe also checks both
  tiles land somewhere with a lit button that does that job.
- **Round 6 — the deck answers in words.** A Tilt (and a number card drawn with no event)
  now says what it means — "goes your way / against you — a little / clearly / a lot /
  completely" — beside an eight-step meter (`tiltMeaning()` in `solo.js`), instead of only
  "Medium — bad for the Travelers".
- **Six novice rounds closed.** The guards that keep it closed: `probe-novice` (the lit-button
  walk from cold start to the next session, plus the GM and player tiles), `probe-lit` (one or
  two lit buttons on every working screen), and the Stop hook that will not let a session end
  its turn on a red `npm run verify`.
- **Solo pass 2, round 1 — one deck for both solo screens.** Play in solo mode used to never
  touch the deck: you could play the whole session without a card, and the Solo screen's
  deck sat untouched. Every "what happens next" in Play now turns a card through
  `solo.drawForStory({ autoShuffle: true })` — the same function as the Solo screen's Draw
  button, writing the same deck, history, events and Countdown. A face card fires its suit's
  event; a number card is a Tilt on the scene ("This scene goes your way — a lot."). The card
  sits face up on the beat with the count left, and a spent deck reshuffles in Play (the
  Solo button still refuses, as the book's pacing wants). Not in `player` mode.
- **Round 2 — the Solo screen on its own.** A lit-only walk of `#/solo` fired the whole
  Countdown before a scene (Fire the next step was lit; it is pressure, not a next step, so
  it is plain now), then drew forever after the Blocker was resolved (Solo now shows the
  shared step card for `setup` / `close` / `done` and unlights Draw while it does — so a
  resolved Stop lights **End the session**; `whatNowCard(step, { here })` drops links to the
  screen you are on). A Spades face card with no personal Threat set said one "has already
  caught up with you"; it now says nobody has one running. **Blocker resolved** lights once
  the Countdown is spent. `probe-novice` gained this walk: seeded mid-session, `#/solo`,
  lit-only, must reach the debrief within 260 presses.
- **Round 3 — physical dice for people who have never typed "3 6 1".** Manual entry was a
  text box per pool and a wrong count threw the whole entry away with a toast. `dicePad()`
  in `roller.js` shows a face per die as you go, six tappable die faces and ⌫, the text box
  kept underneath for typists; a short or long entry keeps the dialog open and says how many
  more it needs. Death rolls and pushes use the same pad. The browser smoke taps a pool in,
  short first. Its gear test once read the pool size off `.pool` — the lead number and the
  small label concatenate in `textContent` ("31 base"), so read `.pool small`.
- **Round 4 — lit-only walks of every other screen.** GM: **Roll up a Stop** did nothing with
  the name left blank (now named after its Blocker), and with a Stop in play nothing was lit
  (the GM's Countdown is lit via `stopCard({ litCountdown })` — the GM is the deck at a
  table; solo keeps it plain), and a resolved Stop left nothing lit and a new one inactive.
  Neuroscape lit Roll on a finished task (now **New task**). Time pre-ticks **Slept** on the
  Night Shift, so pressing Shift all day no longer sleep-deprives everyone. Hazards no longer
  offers a dodge to someone already down.
  `tests/probe-screens.mjs` (in `npm run probe`, alone as `npm run probe:screens`) keeps
  them closed: fourteen screens, a dozen lit-only presses each, from mid-session.
- **Round 5 — the Journey can end without anyone finding a fold.** `whatNow` returns
  `journey-end` ("The road has run out") between Stops once as many are resolved as the
  Journey's length planned (its minimum), never mid-fight; Home, Play (as a beat from idle or
  wrap, with Keep driving → road) and Solo all show it. **End the Journey** opens
  `#/time/epilogue`, which runs the epilogue at once. **Roll the rest** sets a missing length
  to `short` (two to four Stops), so a rolled Journey has an end to reach.
- **Round 6 — the whole campaign, lit-only.** `probe-novice` now walks from a cold start to the
  Journey's epilogue (`journey.ended`) — Travelers, Journey, Tension, scenes, Countdown, a
  fight, the debrief, the next session, the second Stop, **End the Journey** — budget 800,
  observed 190–290 presses.
- **Solo pass 2 closed (six rounds).** Guards: `probe-novice` (cold start → epilogue, GM and
  player tiles, the Solo screen alone to the debrief), `probe-lit`, `probe-screens`, and the
  Stop hook on `npm run verify`.
- `tests/audit.js` counts toasts **shown** (a MutationObserver tally), not toasts on screen: an
  old toast expiring while a new one appeared left the count flat and once flagged Journey's
  working **Add** as a no-op.
- **Rules-fidelity check after the UX/novice passes** (table in `docs/app/AUDIT.md`). One
  deviation, fixed: a Threat's **Roll its attack** now follows `03-combat-hazards.md` — Strength
  at Engaged, Agility beyond, weapon gear dice and range penalty (`rules.rangePenalty`), weapon
  Damage + extra 6s, and the target's take-it / fight back / dodge opposed reaction that
  forfeits the next turn. Everything else added since the twelfth pass checked faithful or
  rules-neutral.
- **One front door.** Three screens used to answer "what now" (Travelers' card and Play
  button, Play, Solo's step card and numbered phases), plus Reference's procedure page. Now:
  **Play** (`#/session`) is the only place that says what to do next — first in the section
  row, and where the app opens once a Traveler exists. **Travelers** is the roster with one lit
  **Continue in Play**. **Solo tools** / **GM tools** (renamed in the section row, listed last)
  are toolboxes: Solo's groups are named (Setting out, On the road, Stops, Scenes, Pressure,
  Wrapping up — keys stay "1"–"6" internally), no numbered procedure, and a single
  **Continue in Play** that lights when Play holds the next step. Play links back with
  **Do it by hand: Solo/GM tools**. Reference's *Running a session* names the act you are in
  ("Right now: …", `.whatnow-ref`) and hands you to Play. `whatNowCard` is gone; `whatNow`
  still feeds Play's setup beats.
  With it: Play picks up a Stop resolved in the tools ("That is the Stop" → **End the session**),
  and a finished debrief clears a resolved active Stop so the next session starts on the road
  instead of offering the same debrief again (the walk found that loop). `describeTalent`
  tolerates an unknown id — the debrief's picker could hand it `undefined`.
- **Rolled Journey details are used, not just shown.** The route's **Roll 3** results
  (`journey.routeFeatures`) are what Play's road beats pass, in order (`director.routeSeen`,
  kept across sessions by `resetDirector`, reset when the route is re-rolled), before the table
  supplies more; **Route notes** and a rolled vehicle detail (`journey.vehicleDetails`) go into
  each session's opening line. Both rolls list their results in a `.rolled-list` on the Journey
  screen saying where they are used, and the button becomes **Roll again**.
- Death frees the archetype: `takenArchetypes()` counts only living Travelers, and **Killed
  outright** now sets `state.dead` like three failed death rolls did. The walk found it — after a
  few deaths every ready-made Traveler read "Already in the group" and creation dead-ended.
