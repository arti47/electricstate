# Electric State Player — Build Roadmap (Stage B deliverable)

Built per *RPG Player-Character App — Autonomous Build Instructions (v2)*.
Stage A (ingest/extract) done from `docs/source/core-rulebook-transcript.md`; distilled
reference in `docs/rules/`. This file is the **checkpoint + roadmap**. It becomes the
project `CLAUDE.md` (repo root) at Stage C start.

Status: **awaiting Stage B sign-off.** No application code yet.

**Sources.** Primary: `docs/source/core-rulebook-transcript.md` (direct PDF text). Secondary:
`docs/source/secondary-summary.md` (a third-party digest of the same book) and the page images
re-extracted into `docs/rules/09-stat-tables.md`. The summary is **corroboration only, never
authority** — it is already known to be wrong in at least one place (it prices the hand grenade
as non-commercial; the source page shows no price) and mislabels the solo encounter table as D6
when it is card-drawn. Extraction rule: take the value from the transcript, cross-check the
summary, and request a page image only where the two disagree or both are unreadable.

---

## 1. Checkpoint — System Profile digest

Slot-by-slot, sieved to what *The Electric State* actually has. Slots the game lacks are
marked **ABSENT** and their template features are dropped, not invented.

| § | Slot | Finding |
|---|---|---|
| 3.1 | Resolution | d6 pool = attribute (2–6) + talent dice + gear dice + situational mods, min 1 die. Success = any **6**; extra 6s scale effect (+1 damage each). No crit/fumble table on ordinary rolls. **Push**: once per roll, re-roll everything not showing 1 or 6; each base-die **1** after the push costs 1 Hope, each gear-die **1** degrades that gear's bonus by 1 (bonus 0 → Busted). NPCs never push. Advantage = flat +dice (talents +2, helpers +1 each up to 3, wired terminal +2). |
| 3.2 | Opposed tests | Active party rolls; needs **more 6s** than the opponent. Only the active party may push. Combat variant: defender declares *take the hit / stand tall* (no roll) or *fight back / dodge* (opposed) **before dice**; a reaction forfeits the defender's next turn but covers unlimited attacks until then. Ties: close combat tie = no one is hurt; ranged tie = attack misses; open opposed roll tie = compromise, or re-roll after pushing if none possible. Traveler-vs-Traveler adds **Tension** dice to both sides. Margin banking: damage = base + 1 per 6 **beyond what was needed to win**. |
| 3.3 | Meta-currencies | **Hope** (personal; max = ⌈(Wits+Empathy)/2⌉, +2 Dreamer; spent involuntarily by pushes and trauma; 0 = Breakdown). **Bliss** (personal, inverse currency; +1 per failed neuroscape roll pre-push; Bliss ≥ current Hope = lost in the Electric State; −1/day off-cast with a 1-in-6 chance per point of becoming **Permanent Bliss**). **Tension** (0–2, **pairwise and asymmetric** between Travelers — bonus dice in PvP opposed rolls, and the main Hope regeneration valve). No group pool, no GM mirror economy. |
| 3.4 | Attributes | Strength, Agility, Wits, Empathy; range 2–6. Generation: roll 4d6 re-rolling 1s and assign, **or** distribute 16 points. Total ≤ 15 grants a second starting talent. |
| 3.5 | Derived | Only two: **Health** = ⌈(Str+Agi)/2⌉ (+2 Tough), **Hope** = ⌈(Wit+Emp)/2⌉ (+2 Dreamer). No defense, initiative, carry or speed derivations. Near-empty slot is the real finding. |
| 3.6 | Skills | **ABSENT.** No skill list. Talents (~50, learn-once, mostly +2 dice in a narrow case) occupy this slot; several have non-dice mechanics (Medic, Surgeon, Nurse, Neuroresistant, Lone wolf, Intuition, Drama queen, Menacing, Techno babbler, Nine lives, Dirty fighter). Custom talents allowed with GM approval. |
| 3.7 | Creation | 17-step order: archetype (10) → attributes → Health/Hope → talent(s) → Dream → Flaw → '90s song → description → name → neurocaster → personal item → cash → Journey briefing → Destination/Goal/Threat → vehicle + 3 shared items → introductions → Tension. Each archetype supplies key attribute, cash formula, and D6 tables for talent/Dream/Flaw/neurocaster/personal item. One archetype per group. |
| 3.8 | Group entity | **PRESENT** — the **Journey + vehicle**. Campaign-level shared state: Destination, route, Stop count, Stop log, plus the vehicle (Passengers, Maneuverability, Speed, Hull, Armor, fuel — starts half a tank, 20 gal ≈ 400 mi — and 1–2 D66 traits) and **3 shared items**. Gets its own mini-wizard (§ vehicle questions: type, brand/model, traits, look, smell, driver). |
| 3.9 | Conditions | No single condition list. Real statuses with teeth: **Incapacitated**, **Breakdown**, **Serious Injury** (D66, 18 entries, dice penalties + healing times + surgery flags), **Mental Trauma** (D66, 18 entries, several rewrite roll rules — e.g. Apathetic cannot push, Obsessive must push), **hungry/thirsty**, **sleep deprived**, **diseased** (Virulence), **cold**, **Busted gear**, **lost in the Electric State**. All auto-apply. |
| 3.10 | Health & death | Health track; 0 = Incapacitated (crawl only, no rolls/talents). **Death roll**: 4d6/turn, un-pushable, cumulative 6s to 3 = stabilized, 3 failed rolls = dead; Nine lives = 6d6. Instant kill at ≥ 2× max Health in one hit. Escape hatches: rally (Empathy, heals 6s rolled, does not stabilize), Medic stabilize (Wits + first-aid gear), self-rally after a Stretch for 1 Health. Additional damage restarts death rolls. Survivors roll Serious Injury. **Neuroscape death is different**: no death rolls, auto-rally after a Stretch, roll Mental Trauma instead. Needs the guided death UI. |
| 3.11 | Rest & recovery | Health +1/Shift resting (+2 with a Nurse; capacity = Nurse's Wits), blocked by disease/hunger/cold. Hope: **only** via Tension reduction (1 pt, ≥ 1 Stretch, max 2 Travelers per scene, requires Tension ≥ 1) and Hope gear (**hard cap 1/Shift**); blocked entirely while hungry or sleep deprived. Bliss −1/day off-cast with permanence roll. Mental trauma: 1 Wits-or-Empathy roll per week. Sleep: 1 Shift/day or sleep-deprived after 4 Shifts awake. |
| 3.12 | Lifecycle | Round (5–10 s) → Stretch (5–10 min) → Shift (5–10 h, ×4 = a day) → Stop → session → Journey. Boundary bundles the app must own: **Stretch** (neurocast rolls, Tension talk, self-rally Health), **Shift** (healing tick, hunger/thirst roll, cold roll, sleep check, Hope-gear cap reset, Breakdown self-rally, fuel/travel), **Day** (Bliss decay + permanence rolls, disease roll, painkiller/liquor use limits), **Session** (debrief → improvement roll, Tension re-negotiation), **Stop** (Blocker resolved, past-sins note), **Journey end** (3d6 epilogue). |
| 3.13 | Progress tasks | One generic tracker serves: **neurocasting Difficulty 1–3** (= N successful Wits rolls, one per Stretch; a failure pushes retries to a Shift for info tasks), **avatar manipulation** (2–4 successful Empathy rolls, 1/Shift), **death rolls** (3 successes vs 3 failures), **disease** (daily opposed until won), **Stop and personal-Threat Countdowns** (3–4 steps), healing timers (D6/2D6/3D6 days). |
| 3.14 | Powers | **ABSENT as classic magic** — the equivalent subsystem is **neurocasting**, and it is a true subsystem, so `power-automation.js` is retained and renamed `neurocasting.js`: tap-to-act for find-information / hack-system / avatar-social / avatar-combat, each auto-applying the right attribute, the right neurocaster gear attribute (Processor / Network / Graphics), talent dice, Bliss accrual on failure, and the Difficulty-N progress loop. Drone operation piggybacks the same engine (drone Str/Agi, operator Wits/Emp, +Network). |
| 3.15 | Advancement | Session debrief: narrate acting on Dream and/or Flaw → table agrees → pick an attribute → roll 1d6: **> current score** = +1 attribute (and derived max, with equal current gain); **≤ score** = new talent, justified. **Overcoming the Flaw**: once per Journey, 3 improvement rolls immediately, Flaw removed, **and all further improvement locked** — a one-advance-per-X gate the app must enforce and warn about. |
| 3.16 | Inventory & wealth | **No encumbrance system** (GM may call a Strength roll) — do not build slots/weight. Cash in **US dollars**, rolled per archetype. Gear model = gear-dice bonus + Busted state + repair (Wits + matching tool set). Consumables with hard limits: liquor (3 uses, +1 Hope/−1 Health, 1/Shift), painkillers (10 uses, 1 Health/day), canned food (2D6 cans, 1 person-day each), jerrycan (5 gal), Vanadium Redox batteries. Vehicle fuel tracked in gallons/miles. Ammunition explicitly **not** tracked. |
| 3.17 | Combat | Zone-based (indoors = room, outdoors ≈ 100 ft); ranges Engaged/Short/Medium/Long/Extreme; below a weapon's minimum range = −2 dice per band, above maximum = illegal. **Side-based initiative**: the side that starts acts first in any order; unclear → each side rolls D6 + best Wits, re-roll ties. Turn = 1 move + 1 action, or 2 moves; move must precede action. Reactions cost the next turn. Cover (Armor Level 2–8) and body armor (2/4/6 with −1/−2/−3 Agility) roll dice, each 6 cancels 1 damage. Full auto = up to 3 burst rolls, empties magazine. **Dual play scale**: real world and neuroscape run simultaneously — one turn, one realm, inert in the other. Second scale: drone-piloted combat. |
| 3.18 | Bestiary | Threat stat blocks (Law Enforcement, Secret Agent, Gang Member, Crazed Killer, cultists, strongmen, business leaders, Robot, drone growth, Intercerebral Intelligence, guard dog), plus consumer/military drone tables and the vehicle table. Threats have no Hope, never push, and take no death rolls (GM decides). Environmental Threats are deliberately unstatted — they apply Ch. 4 hazards. |
| 3.19 | Pregens | **PRESENT** — 4 published pre-made Travelers (transcript 16677+), gender-variant names, PC rules economy. |
| 3.20 | Solo | **PRESENT and substantial** — Ch. 8: 52-card deck as oracle and pacing timer (face-card suits fire Personal Threat / Stop Countdown / Traveler event / Conversation), Tilt draws (suit = valence, rank = degree), NPC motive/method draws, conversation subjects, Traveler-event table, per-archetype solo Goals/Threats, internal-Threat option. Warrants a full solo tab with a persistent deck state. |
| 3.21 | GM tables | Blockers (D66), Locations (D66), Conflicts (D66 ×3 draws), Electric State mood (D66), '90s nostalgia (D66), Shared items (D66), Needs (D6), NPC reactions (2D6), Combat morale (2D6), Countdown elements, Setting generators (terrain/population/communications/size/prosperity/weather, D6 each), Neuroscape generator (type/theme/mood, D6 each), Serious Injuries (D66), Mental Traumas (D66), Vehicle traits (D66), Journey length, personal Goal and Kicker tables, "why stick together" (D6), Destinations (D6), 1990s vehicles (D6). |

---

## 2. Content inventory

| Category | Count | Source |
|---|---|---|
| Attributes | 4 | Ch. 3 |
| Archetypes | **10** (each: key attribute, cash formula, 3 talents, 3 Dreams, 3 Flaws, 3 neurocasters, 3 personal items) | Ch. 3, transcript 3838–4799 |
| Talents | ~50 | Ch. 3 |
| Neurocaster models | 5 | Ch. 4 |
| Shared items | 34 (D66) | Ch. 3 |
| Weapons | 22 | Ch. 4 p. 81 |
| Body armor / cover | 3 / 5 | Ch. 4 |
| Explosives, fires, diseases | 5 / 3 / 3 | Ch. 4 |
| Serious injuries | 18 | Ch. 4 |
| Mental traumas | 18 | Ch. 4 |
| Consumer drones | 6 | Ch. 4 p. 99 |
| Vehicles | 19 | Ch. 4 p. 101 |
| Vehicle traits | 12 | Ch. 4 |
| Neuroscape task difficulties | 6 info + 8 hacking | Ch. 4 |
| Threat stat blocks | ~10 | Ch. 6 |
| GM / generator tables | ~25 | Ch. 5, 6, 8 |
| Solo tables | ~8 + card oracles | Ch. 8 |
| Pregens | 4 | end matter |

**Excluded by §12 scope guard:** Ch. 2 setting, Ch. 7 *Into the Dust* scenario, all fiction
excerpts and art. Setting terms survive only where a mechanic names them (Sentre models,
neurine, Bliss).

---

## 3. Proposals

- **App name:** `Electric State Player`.
- **Visual theme:** dust-and-CRT. Base: bleached desert sand / faded asphalt greys; ink-black
  text; one signal accent of neurocaster amber-orange for Hope and interactive affordances,
  one cold cyan for neuronic/Bliss surfaces. Dark mode = night-highway: near-black ground,
  amber and cyan raised. Typography: a condensed grotesque for headers (road-sign register),
  system sans for body, monospace for dice and log rows. Subtle scanline/grain texture only
  on neuroscape screens, so the UI shifts register when you jack in. No Stålenhag art, no
  Free League or Sentre logos.
- **Rules/setting boundary:** include Ch. 1, 3, 4, 5 (GM tools), 6 (Threat stats), 8 (solo),
  end matter (pregens, sheet). Exclude Ch. 2 and Ch. 7.
- **Expansions:** none supplied — `data-<expansion>.js` omitted.
- **Solo mode:** present (Ch. 8) — full tab.
- **Group entity:** present (Journey + vehicle + shared items).
- **Distinctive build implications** (things this game needs that a generic sheet app does not):
  1. **Tension matrix**, not a stat — an N×N asymmetric grid across party members, feeding
     PvP opposed rolls and the Hope economy.
  2. **Bliss vs Hope comparator** on the persistent header — the lose condition is a
     relationship between two numbers, not a bar hitting zero.
  3. **Dual-realm turn state** — one turn spent in the real world or the neuroscape, inert
     in the other; the combat tracker must model both simultaneously.
  4. **Dream/Flaw debrief flow** as a first-class end-of-session screen, since it *is* the
     advancement system, with the post-Flaw improvement lock enforced.
  5. **No skills, no encumbrance, no ammo** — deliberately absent surfaces.

---

## 4. Ambiguity list — proposed rulings

| # | Issue | Proposed ruling |
|---|---|---|
| A1 | ~~**Weapon / drone / vehicle stat tables unrecoverable** from the transcript~~ — **RESOLVED**: source pages 81/99/101 supplied as images and re-extracted to `docs/rules/09-stat-tables.md`. | T-12, T-21, T-22 unblocked; that file is canonical for those values. |
| A2 | Ch. 3 defines **10 archetypes**; Ch. 8's solo Goal list includes an 11th, **Journalist**, absent from Ch. 3. | Treat 10 as canonical for creation; expose the Journalist Goal/Threat text only inside the solo generator, flagged as a Ch. 8 extra. |
| A3 | Talent names differ between chapters — Ch. 6 Threat blocks cite **"Knifeman"**, Ch. 3 lists **"Blade fighter"**. | Same talent; canonicalize to *Blade fighter* and alias Knifeman in the data layer. |
| A4 | Hope recovery via gear is capped at 1/Shift, but several items say "once per day". | Enforce both: per-item daily limit **and** the global 1/Shift ceiling; the stricter binds. |
| A5 | **Death roll wording** — "mark the number of 6s you roll; once you have rolled a total of three 6s you're stabilized" vs "fail three death rolls". | Cumulative across rolls: successes accumulate to 3 (stabilized); rolls yielding zero 6s accumulate to 3 (dead). Both counters persist across the whole Incapacitated episode. |
| A6 | Pushing a **death roll** is forbidden; unclear for **Blast Power, Fire Intensity, disease Virulence** rolls made *by the hazard*. | Hazard-side rolls are never pushable; the character's resisting roll follows normal push rules. |
| A7 | Bliss on failed neuroscape rolls counts "before pushing"; unclear whether a push that then succeeds removes the Bliss. | Bliss is assessed on the pre-push result and is **not** refunded by a successful push. |
| A8 | Whether **drone operation outside a neuroscape** accrues Bliss on every failed roll or only on neuroscape rolls. | Book states every failed roll while operating a drone gives Bliss; apply to all drone rolls. |
| A9 | Traveler-vs-Traveler opposed rolls add Tension dice "to both sides", while only the active party may push. | Both add their own Tension rating as bonus dice; push legality unchanged (active party only; open opposed rolls both). |
| A10 | Serious injury **healing times** start when? | Start at stabilization; injuries flagged *requires surgery* do not tick down until successful surgery. |
| A11 | Improvement after **overcoming the Flaw** is locked "you cannot improve your Traveler further" — does the session debrief still occur? | Debrief still runs for narrative and Tension purposes; the improvement roll is disabled with an explanatory note. |
| A12 | Whether the **GM screen** should expose Threat Hope. | Threats have no Hope by rule; GM screen omits the field entirely rather than showing a null. |
| A13 | **Solo Stop Threat Countdown (p. 213) is a D66 table whose ranges stop at 56** — results 61–66 are unassigned in the printed table. | Treat 61–66 as re-roll. Flag in the UI as a house aid, not a printed rule. |
| A14 | **Drone Pilot** breaks several core economies: no gear, no cash, damage resolved as a drone (Hull) rather than Health, no eating, **no Bliss tracking**, and global neuroscapes only. | Implement as a first-class archetype variant, not a cosmetic flag: the sheet swaps the Health track for a drone Hull track, hides gear/cash/hunger surfaces, disables Bliss accrual, and restricts neuroscape access. Highest-complexity item in Phase 1–2. |
| A15 | Book is internally inconsistent on **beer**: gear list says once per **Day**, liquor once per **Shift**, both against a global 1-Hope-per-Shift cap. | Per-item cadence and the global cap both enforced; the stricter binds (A4 generalized). |

---

## 5. Data Extraction Ledger

**How to continue (for any AI resuming this project):** work top to bottom within the
current phase. Source of record is `docs/source/core-rulebook-transcript.md`, cited by line
number; `docs/rules/*` is a convenience index, not an authority. Corroborate any surprising
value against the transcript before writing it. Paraphrase all prose. Tick the box **in the
same change** that writes the table, append a changelog row, and record real counts over
estimates. **An unticked box means the data does not exist yet — never build UI against it.**

### `data.js` — core rules library
- [ ] T-01 Attributes, ranges, both generation methods, the ≤15 bonus-talent rule
- [ ] T-02 Derived formulas (Health, Hope) incl. rounding and talent modifiers
- [ ] T-03 Talents (~50) with structured effect descriptors (`+2 dice when <condition>`, or a named mechanic hook)
- [ ] T-04 Archetypes ×10: key attribute, cash formula, talent/Dream/Flaw/neurocaster/personal-item D6 tables
- [ ] T-05 Time units and lifecycle boundary definitions
- [ ] T-06 Push economy rules (base vs gear dice, Busted threshold)
- [ ] T-07 Opposed-roll procedure incl. combat reactions, tie rules, margin banking
- [ ] T-08 Tension: scale, starting distribution, bonus-dice rule, reduction procedure and Hope payout
- [ ] T-09 Zones, range bands, minimum/maximum range penalties
- [ ] T-10 Initiative, action economy, reaction rules, free actions
- [ ] T-11 Cover Armor Levels; body armor (level, Agility modifier, price)
- [ ] T-12 **Weapons** (22) — name, gear bonus, base Damage, min/max range, price, flags (full auto, explosive, neurocaster-only, taser stun rule) — source: `docs/rules/09-stat-tables.md`
- [ ] T-13 Full-auto, single-shot, ambush, firearms-in-close-combat rules
- [ ] T-14 Damage, Incapacitation, death-roll, rally, stabilize, instant-kill rules
- [ ] T-15 Serious Injuries D66 (18) with effect descriptors, healing dice, surgery flags
- [ ] T-16 Hope loss, traumatic-event table, freeze rule, Breakdown, rally
- [ ] T-17 Mental Traumas D66 (18) with rule-rewriting effect descriptors
- [ ] T-18 Hazards: explosions/Blast Power, fire/Intensity, cold, disease/Virulence, falling, hunger/thirst, sleep deprivation
- [ ] T-19 Neurocaster models (5) — Processor/Network/Graphics/cost, GO exception — *partially recoverable; verify against source*
- [ ] T-20 Neurocasting: Bliss rules, wired/wireless, information Difficulty table, hacking Difficulty table, avatar social/combat/manipulation, dual-realm rule
- [ ] T-21 **Drones** — consumer models (6: Str, Agi, Hull, Armor, Damage, min/max range, cost), robots, drone growths — source: `docs/rules/09-stat-tables.md`
- [ ] T-22 **Vehicles** (19: passengers, maneuverability, speed, Hull, Armor, cost, rarity tier, horse riding exception) — source: `docs/rules/09-stat-tables.md`; plus vehicle traits D66 (12)
- [ ] T-23 Fuel/travel model (tank size, range, Shift-based travel)
- [ ] T-24 Gear catalog: shared items D66 (34) with mechanical effects and use limits; tool sets; repair rules
- [ ] T-25 Recovery: Health per Shift, Nurse rates, Hope sources and caps, Bliss decay + permanence roll, trauma recovery cadence
- [ ] T-26 Advancement: debrief procedure, improvement roll, Flaw-overcome bundle and lock
- [ ] T-27 Rules-library quick-reference entries (one per automated surface, for citation links)
- [ ] T-45 Vehicle combat: stunts, road/boat/air accident tables (D6 each), ramming formula, component damage (D6), chase procedure + obstacle D66 (transcript 7375–7700)
- [ ] T-46 Gear price list p. 109 (~35 items: bonus, cost, use limits, Hope cadence) — transcript 7878–8060, cross-checked against the secondary summary
- [ ] T-47 Drone Pilot archetype exception rules (no gear/cash, Hull damage model, no Bliss, global-only neuroscapes, sleep but no food)

### `data-monsters.js` / `data-npcs.js`
- [ ] T-28 Threat stat blocks from Ch. 6 with talents, gear, example Countdowns
- [ ] T-29 Threat anatomy metadata (location, goal, reaction, special-ability menu)
- [ ] T-30 Animals and minor-NPC quirk table
- [ ] T-31 NPC reaction (2D6) and combat morale (2D6) tables

### `data-pregens.js`
- [ ] T-32 The 4 published pre-made Travelers, fully statted

### `data-solo.js`
- [ ] T-33 Card oracle: suit→event mapping, deck-as-timer rule
- [ ] T-34 Tilt table (suit valence × rank degree)
- [ ] T-35 NPC motive/method draws; predisposition rule
- [ ] T-36 Conversation subjects; Traveler events; personal Threats; Destinations; 1990s vehicles; per-archetype solo Goals/Threats
- [ ] T-48 Solo Threat generation: type D6 + sub-type D6 tables
- [ ] T-49 Solo NPC personality types (13, card-indexed) and emotional states (13, card-indexed)
- [ ] T-50 Solo Stop Threat Countdown D66 (p. 213, see A13); start-of-Stop Shift draw (suit → Morning/Day/Evening/Night)

### `data-gm.js` (GM tables; folded into `data.js` if small)
- [ ] T-37 Stop setting generators (terrain, population, communications, size, prosperity, weather)
- [ ] T-38 Blockers D66; Needs D6
- [ ] T-39 Conflict generator (parties ×2, subject)
- [ ] T-40 Locations D66
- [ ] T-41 Electric State mood D66; '90s nostalgia D66
- [ ] T-42 Countdown element menu; Countdown design principles
- [ ] T-43 Neuroscape generator (type/theme/mood)
- [ ] T-44 Journey scaffolding: length table, Goal table, Kicker examples, "why stick together" D6

---

## 6. Phased roadmap

### Phase 0 — Foundations
- [ ] P0.1 Scaffold LOCKED file set: `index.html`, `styles.css`, `src/*` per §6.1, `manifest.json`, `service-worker.js`, `icon.svg`, `firebase-config.js` (placeholder + `FIREBASE_ENABLED=false`), `database.rules.json`, `tests/`, `package.json`, README
- [ ] P0.2 Theme tokens (light/dark, system-default + toggle), phone-first shell, bottom-nav router, `ui.js` modal/toast primitives
- [ ] P0.3 `store.js` localStorage persistence + normalization/migration path
- [ ] P0.4 **Data sub-phase A** — T-01…T-11, T-13…T-18 (core rules, no blocked tables)
- [ ] P0.5 **Data sub-phase B** — T-19…T-27 (neuronics, gear, recovery, advancement, rules library)
- [ ] P0.6 **Data sub-phase C** — T-28…T-44 (threats, pregens, solo, GM tables)
- [ ] P0.7 PWA install + `CACHE_VERSION` discipline + update toast

### Phase 1 — Creation wizards
- [ ] P1.1 Traveler wizard, all 17 steps, both attribute methods, legality gates (one archetype per party, ≤15 bonus talent, learn-once talents)
- [ ] P1.2 Derived-stat computation in `derived.js`; live preview
- [ ] P1.3 Dream/Flaw/song/personal-item/neurocaster/cash rollers with manual override
- [ ] P1.4 **Journey + vehicle wizard** (group entity): Destination, route notes, Stop count, vehicle stats + 1–2 traits, 3 shared items, fuel at half tank
- [ ] P1.5 Tension matrix setup (each Traveler: 1 toward one or two others, 0 elsewhere)
- [ ] P1.6 Pregen instantiation (4)

### Phase 2 — Core tracker
- [ ] P2.1 Sheet: identity, attributes, talents, Dream/Flaw, Goal/Threat, notes, portrait
- [ ] P2.2 **Persistent header on every in-play screen**: Health, Hope, **Bliss with the Bliss≥Hope alarm**, Permanent Bliss, cash, fuel
- [ ] P2.3 Vitals steppers clamped to true maxima; condition/injury/trauma chips with live effect application
- [ ] P2.4 Inventory: gear bonus + Busted state, use-limited consumables, shared-item panel, no encumbrance
- [ ] P2.5 Neurocaster panel: model, three attributes with degradation, Busted → forced-disconnect consequence
- [ ] P2.6 JSON export/import in Settings

### Phase 3 — Dice engine
- [ ] P3.1 Pool builder: attribute + talent + gear + situational, with push (base vs gear die semantics) and Busted resolution
- [ ] P3.2 Opposed sequence incl. combat reaction choice, tie rules, margin→damage
- [ ] P3.3 Tension dice auto-injected on Traveler-vs-Traveler rolls
- [ ] P3.4 Condition/injury/trauma modifiers auto-applied (incl. trauma rules that rewrite push legality)
- [ ] P3.5 Damage applier: armor/cover dice, Incapacitation, guided death rolls, instant kill
- [ ] P3.6 Hope loss flow: traumatic event resist roll, freeze, Breakdown, rally
- [ ] P3.7 Talent automation — every dice-effect talent is tap-to-use, never merely displayed
- [ ] P3.8 Roll log (capped ~100, `aria-live`, re-derivable inputs), local first
- [ ] P3.9 Rules-citation links from every automated surface into the rules library

### 🏁 Milestone — First Session Playable
Create Traveler → live sheet → roll tests and combat → track Health/Hope/Bliss/Tension end to end.

### Phase 4 — In-play systems
- [ ] P4.1 **Neurocasting module**: session state, wired/wireless, Difficulty-N progress loop, Bliss accrual, lost-in-the-Electric-State state, avatar combat with dual-realm turn switching, drone piloting
- [ ] P4.2 Generic progress tracker (Difficulty tasks, Countdowns, death rolls, disease, healing timers)
- [ ] P4.3 Lifecycle engine: Stretch / Shift / Day / Session / Stop / Journey-end bundles with confirmation summary + one-step undo
- [ ] P4.4 Rest & recovery with enforced caps (Hope 1/Shift, per-item daily limits, Nurse capacity, blocked-while-hungry)
- [ ] P4.5 Tension board: adjust, reduce-with-Hope-payout, triangle visualization
- [ ] P4.6 Debrief/advancement flow with the post-Flaw improvement lock
- [ ] P4.7 Local combat tracker: zones, side-based initiative, reactions, cover, full auto, Threat drop-in from the bestiary

### Phase 5 — Multiplayer & sync *(gated on the milestone unless promoted at Stage B)*
- [ ] P5.1 Firebase RTDB + anonymous auth + optional Google link; `database.rules.json` with player/GM roles and **group-entity (Journey/vehicle) write rules**
- [ ] P5.2 Campaigns with phrase join codes; party banner
- [ ] P5.3 Shared Journey/vehicle state; shared Tension matrix (each Traveler writes their own row)
- [ ] P5.4 Shared combat with two-way sync; shared tasks; synced roll log; broadcast feed
- [ ] P5.5 Portrait upload with client-side compression

### Phase 6 — Conditional surfaces
- [ ] P6.1 **Solo tab**: persistent 52-card deck state, draw/reshuffle timer, face-card event routing, Tilt draws, NPC motive/method, conversation and Traveler-event generators, solo Journey prep checklist
- [ ] P6.2 **GM screen**: party panel, peek sheets, Threat drop-in, hand out damage/conditions, Countdown manager, all Ch. 5/6 rollable tables, Stop builder (setting → Blocker → conflict → locations → Countdown)
- [ ] P6.3 Rules library: searchable, the citation target for every automated surface

### Hardening (continuous)
- [ ] H.1 Playwright regression harness (`npm test`): boot smoke with zero console errors; derived-stat invariants; push/gear-degradation invariants; opposed-sequence and tie cases; Hope/Bliss cap and decay schedules; every automated talent opens a non-empty resolution; lifecycle bundles fire and undo cleanly; zero horizontal overflow at 360/390 px; a11y basics
- [ ] H.2 Accessibility pass
- [ ] H.3 Full rules-accuracy audit (§11) — expect findings concentrated in engine behavior: push legality under traumas, Hope cap stacking, death-roll counters, dual-realm turn locking, Tension symmetry, improvement lock

---

## 7. Open Stage B questions

Answered one at a time before Stage C:
1. ~~Source for the blocked stat tables (A1)~~ — resolved.
2. Usage mode — full shared campaign / local-first with sync later (default) / single-device.
3. Seat at the table — GM / player / rotates.
4. Dice input — digital-only / digital + manual entry / manual-first.
5. Table device — phone / tablet / desktop / mixed.
6. Theme default — follow system (default) / always dark / always light.
