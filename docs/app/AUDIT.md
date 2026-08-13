# Rules-accuracy audit (§11)

Method: pull each value or behaviour from the app, compare against the source, record the
result. Data values audited clean; every finding below was engine behaviour, which matches
what the template warns to expect.

## Findings and fixes

| # | Rule | Target | Fix | Why it mattered |
|---|---|---|---|---|
| 1 | Traumatic events: Empathy roll, each 6 cancels a point; any Hope actually lost also costs your next turn (p.85) | `roller.js` | Added `resolveTraumaticEvent` and its dialog, including the freeze | The whole traumatic-event path was missing — Hope could only be lost through pushes |
| 2 | Rally: Empathy roll restores Health equal to the 6s but does **not** stabilize; Breakdown rally restores Hope (p.82, 85) | `roller.js` | Added `rallyDialog` covering both, Leader talent, and the Depressed block | Death rolls have an escape hatch the app never offered |
| 3 | Stabilizing needs the Medic talent and a Wits roll (p.82) | `roller.js` | Folded into the rally dialog, gated on the talent | Players could otherwise only end death rolls by luck |
| 4 | Body armor gives a negative modifier to **all** Agility rolls (p.83) | `derived.js`, `sheet.js` | Armor is now equipped, not merely carried; `conditionModifiers` subtracts its penalty on Agility only | Armor was pure upside — the cost was documented but never charged |
| 5 | Surgery: a Shift, a Surgeon, a Wits roll; failure Incapacitates the patient (p.84). Paid surgery is $1,000 (services table) | `roller.js`, `sheet.js` | Added `surgeryDialog` with both routes and the surgical-instruments bonus | Four injuries could never heal, because nothing could clear their surgery flag |
| 6 | Flashbacks raise every potential Hope loss by 1; Violent attacks instead of freezing; Panic attacks force a Breakdown (p.87) | `roller.js` | Applied inside `resolveTraumaticEvent` | Three traumas were stored but inert |

## Verified clean — do not re-litigate

- Push: one per roll, re-rolls everything that is not a 1 or 6, kept dice still count afterwards.
- Base 1s cost Hope; gear 1s degrade gear; bonus 0 is Busted.
- Opposed rolls: more 6s wins, margin beyond the win adds damage, close-combat tie hurts no one,
  ranged tie misses, a defender winning close combat damages the attacker.
- Death rolls: four dice, never pushable, three cumulative 6s stabilize, three failed rolls kill,
  Nine lives rolls six.
- Instant kill at twice maximum Health.
- Armor and cover roll their level, each 6 cancelling one point.
- Health formula, Hope formula, the ≤15 bonus talent, one archetype per group.
- Hope from items capped at 1 per Shift, blocked by hunger and sleep deprivation.
- Tension reduction: both sides drop a step, both gain a Hope, Reclusive blocks the gain.
- Bliss: 1 per pre-push neuroscape failure, never refunded by a later success; decay of 1 per
  off-cast day with a 1-in-6 chance of becoming permanent; Bliss ≥ Hope is the lose condition.
- Drone Pilot: no Bliss, no cash, no gear, Hull instead of Health.
- Advancement: higher than the attribute raises it, equal or lower grants a talent; overcoming a
  Flaw grants three rolls then locks improvement permanently.
- Solo: face cards only fire events, an ace is not a face card, tilts read suit then rank, the
  Stop Countdown never returns the unassigned 61–66 band.
- Threats carry no Hope, never push, and make no death rolls.

## Accessibility pass

- Every route reachable by keyboard; skip link to the main region; `:focus-visible` outlines.
- Modals trap focus, close on Escape, restore focus to the invoking element, and set `aria-modal`.
- Roll results and the vitals header announce via `aria-live`; toasts use `role="status"`.
- Icon-only buttons carry `aria-label`; steppers name the value they change.
- Bottom nav marks the active tab with `aria-current="page"`.
- Colour never carries meaning alone — danger states also carry text.
- Reduced-motion honoured; layout verified at 360 and 390px with no horizontal overflow.

---

# Second audit — completeness and controls

Two questions this time: does every system in the book reach the player, and does every
control actually do something. Both were answered mechanically rather than by reading.

## Method

`tests/audit.js` seeds two Travelers and a Journey, visits all 18 routes, and clicks every
visible button in isolation — resetting storage and re-rendering between clicks — while
watching for page errors, console errors, and buttons that change nothing at all (no render,
no modal, no toast, no state write, no navigation). It is a separate harness from `npm test`
because it takes minutes rather than seconds.

## Findings

| # | Finding | Fix |
|---|---|---|
| 1 | **Add (shared items)** did nothing when no item was selected — a silent no-op. | Now says "Choose an item first." |
| 2 | **Hazards had no surface at all.** Explosions, fire, falling and disease were in the data layer and reachable only by hand. | New `#/hazards` screen: Blast Power, Intensity, falling by height, and the daily opposed disease roll, each applying damage and offering the Agility mitigation the rules allow. |
| 3 | **Vehicle handling had no surface.** Stunts, the three accident tables, ramming, component damage and chase obstacles were extracted but unreachable — in a game about a road trip. | New `#/driving` screen covering all five. |
| 4 | **Weapons were not selectable when rolling.** Range bands, minimum-range penalties, full auto and ambush existed as data only. | The dice screen now has a weapon picker that applies its gear dice, the −2 per band inside minimum range, out-of-range refusal, ambush at −3 into close combat, and the taser's stun rule. |
| 5 | **Helpers were not modelled.** The book allows up to three, each +1 die. | A Helpers control, capped at three, noting that helping costs the helper's turn in combat. |
| 6 | **Busted gear could never be repaired** — the rules for repair existed but nothing invoked them. | Repair buttons on Busted gear and on a Busted neurocaster: Wits roll, tool dice, each 6 restoring a point. |
| 7 | **Drone piloting was missing** from neurocasting, despite being how the Drone Pilot archetype exists. | Added as a task: drone Strength and Agility replace the operator's, Wits and Empathy stay theirs, Network supplies gear dice, and failures still accrue Bliss. |
| 8 | **Avatar manipulation** (2–4 successes, one per Shift) was in the data and not in the task list. | Added with its scope picker. |
| 9 | **The Journey had no ending.** The book closes with three dice per Traveler, each a life event. | End the Journey on the Time screen rolls and reads them. |

## Solo sequencing

The solo screen was a flat row of six buttons in no particular order. It now follows the
sequence of play, numbered, with each phase saying what it is for:

1. **Before you set out** — Journey, Travelers, the book's D6 destination, personal Threat, vehicle
2. **On the road** — minor encounter, and the card draw for what time you arrive
3. **Arriving at a Stop** — generate the Stop, then the Threat behind it, then more locations
4. **Playing the Stop** — draw a card, Tilt, NPC, conversation, Traveler event
5. **Turning the screw** — Stop Countdown, personal Threat step
6. **Ending the Stop** — Time, and the reshuffle

Three solo generators were also unreachable before this pass: **minor encounters**, the
**start-of-Stop Shift draw**, and direct **conversation** and **Traveler event** rolls, all of
which previously only fired if a face card happened to land on them.

## Result

Button audit: every control on all 18 routes responds. `npm test` at 53 invariants.

## Third pass — sequencing gaps closed

Re-reading the engine against the book after the completeness fixes turned up four more
procedures that existed as pure functions with nothing calling them:

| # | Finding | Fix |
|---|---|---|
| 10 | **The defender's reaction was never asked for.** `resolveOpposed` was tested but unreachable: every attack resolved as if the target stood still. | "They fight back" on a roll result: pick close or ranged, the defender's pool and the base damage, and it resolves the reaction — including a close-combat defender who wins turning the damage back on the attacker. |
| 11 | **Mental trauma could never be shaken.** The book allows one Wits or Empathy roll a week; nothing advanced a week. | "A week passes" on the Time screen rolls for each carried trauma. |
| 12 | **Nobody could be pulled out of the Electric State.** The lose condition was surfaced but had no resolution. | The status note now carries the action: Hope to zero, and it routes straight to the trauma roll. |
| 13 | Weapon damage did not reach the opposed maths. | The opposed dialog defaults its base damage from the selected weapon. |

Button audit after all three passes: every control on all 18 routes responds. 53 invariants.

## Fourth pass — the Drone Pilot's damage model

The archetype says plainly: *"your game stats are created normally, but you suffer damage
like a drone (page 98), not a human."* The app was relabelling the Health track "Hull" and
otherwise treating the Drone Pilot as flesh — death rolls at zero, serious injuries, healing
by resting.

| # | Finding | Fix |
|---|---|---|
| 14 | Hull zero started **death rolls**. Drone rules disconnect the operator instead; the pilot's body is elsewhere and never at risk. | Hull zero now disconnects and marks the drone unusable. Death rolls are unreachable for this archetype. |
| 15 | **Serious injuries** were offered to a machine — broken ribs, infected wounds, teeth knocked out. | The injury screen tells a Drone Pilot it has no flesh to break. Mental trauma still applies: the mind is still a mind. |
| 16 | **Resting healed the drone** at a point per Shift. | Rest does nothing; the Shift summary says so. A wrecked drone is repaired with a Wits roll and tools, each 6 restoring a point of Hull, which is what page 108 asks for. |
| 17 | `damageAs` and `damageModel` disagreed in the data layer ("drone" against "hull"). | Canonicalized to `hull`, with the page citation. |

That completes the archetype's four exception rules: no gear, no cash, no Bliss, no flesh.

## Fifth pass — the tracker and the roller were separate apps

Combat held initiative, zones and turn order; the roller made attacks. Neither knew the other
existed, so an attack meant reading a stat block off the combat card and typing the defender's
pool into the roller by hand, then applying the damage manually.

| # | Finding | Fix |
|---|---|---|
| 18 | The roller had **no notion of a target**. | When combat is running, the dice screen lists the combatants as targets, showing a Threat's remaining health. |
| 19 | The opposed dialog asked the attacker to **type the defender's dice**. | The pool now comes from the target: a Traveler defends on their own Strength or Agility, a Threat on its stat block, and switching between close and ranged re-reads the right attribute. |
| 20 | A hit **did not reduce anyone**. | Damage now lands wherever that combatant's health actually lives — the sheet for a Traveler, the combat card for a Threat — and reports what is left. |
| 21 | No route **from a combatant into an attack**. | Attack this on a combatant card selects it and opens the dice screen. |

Range also feeds the reaction: attacking at Engaged defaults the dialog to close combat, which
is what the target may fight back against, while anything further defaults to a dodge.

## Sixth pass — one Stop record

The GM screen and solo play were both generating Stops, in two different shapes. The GM
stored a named record with a three-step Countdown in `journey.stops`; solo kept a single
unnamed object in `journey.solo.stop` that the next roll overwrote. A GM-prepared Stop could
not be played through the solo screen, a solo Stop never reached the Journey's Stop log, and
only one of the two had a Countdown at all — which is the Stop's entire escalation engine.

| # | Finding | Fix |
|---|---|---|
| 22 | Two incompatible Stop shapes. | One record in `src/stops.js`, built by `makeStop()` and rendered by one shared card. Both screens now read and write the same list. |
| 23 | Solo Stops had **no Countdown**, so escalation fell back to the D66 table every time. | Every Stop carries three distinct Countdown steps. Solo's Stop Countdown button fires the live Stop's own next step and only falls back to the D66 table when there is no Stop in play. |
| 24 | Solo Stops were **overwritten** on each roll and never logged. | Stops accumulate in the Journey with an active one marked; the GM screen can hand play to any of them. |
| 25 | A Threat was attached to solo state rather than to the Stop. | Threats attach to the Stop record, so they travel with it. |
| 26 | Old saves held both shapes. | A migration folds legacy solo Stops into the shared list and clears the duplicate. |

Two harness bugs surfaced during this pass and were fixed rather than worked around: a
selector matching "Blocker resolved" when it meant the "Blocker" table button, and a modal
parser still expecting the old countdown title.

## Seventh pass — the rules the engine never read

Method changed this time. Rather than re-reading screens, two scripts walked the codebase:
one listing every export nothing else imports, one listing every named import a file never
uses. Both are proxies for the same defect the earlier passes kept finding — data extracted
faithfully, then never called. The scripts found it in a minute where reading had taken a
pass each.

Then the distilled rules files were read section by section against the engine, which caught
the rest.

| # | Finding | Fix |
|---|---|---|
| 27 | **Full auto was a decorative toggle.** `pending.fullAuto` was set and never read: no second or third burst. | A hit offers the next burst, up to three, each its own roll and logged as such. |
| 28 | **Ambush cost dice but changed nothing.** The target could still fight back, and it was offered against people already in active combat. | An ambushed target cannot react; the toggle is refused while the combat tracker is running, since everyone in it is already fighting. |
| 29 | **The neurocaster's real-world penalty was documented and never charged.** `NEUROCASTER_DEFAULT_PENALTY` was unimported; nothing tracked whether one was even on. | `state.wearingCaster`, toggled on the sheet and set when a neurocasting session starts, feeds −2 dice (−1 for a Stimulus GO) into the pool, defaulting to applied and unticked for anything needing neither eyes nor legs. |
| 30 | **A reaction was free.** Three places said it costs the defender their next turn; nothing marked it. | `forfeitNextTurn` on the combatant; `nextRound` starts them spent and says why. |
| 31 | **The taser had no mechanism** — only a sentence describing one. | Strength at −2, and a failure forfeits their next turn through the same flag. |
| 32 | **Freezing was recorded and never surfaced.** `state.frozen` was written in two places and read in none. | Freezing and diving clear of a blast both forfeit the next turn, and the sheet shows it with a control to clear it once sat out. |
| 33 | **Nothing charged the −2 for acting while driving.** | A Circumstances card on the dice screen, beside the neurocaster. |
| 34 | **A Spin never cascaded.** The accident table's second-worst result asks for a control roll and a re-roll at +2; `ACCIDENT_REROLL_MODIFIER` was unimported and the parameter unused. | The Spin asks for the roll and re-rolls at +2 on a failure. |
| 35 | **Lone wolf could not reduce Tension alone**, which is the whole talent. Also, `reduceTension` accepted the same Traveler twice. | `reduceTensionAlone`, gated on the talent; self-pairing refused. |
| 36 | **The solo personal Threat ran on two counters** — the button counted events, the card path counted history, and both lists are capped. | One counter on the Journey, shared by both routes, reporting when the Threat has played out. |
| 37 | **A card-fired Stop Countdown ignored the live Stop**, falling back to the D66 table the sixth pass had already superseded. | Both routes call `nextStopCountdown`. |
| 38 | **Four talents were inert**, all of them `effect.kind: "rule"`: Dirty fighter, Menacing, Techno babbler, Neuroresistant. | Unarmed damage flows through a shared `baseDamage`; the two substitution talents appear as attribute swaps on the dice screen; Neuroresistant gets its single Wits roll to leave, spent once and restored when Hope climbs clear of Bliss. |
| 39 | **Animals were unreachable.** `ANIMALS` never left the data file, so the guard dog could not be put on the table and would have defended on a guessed pool. | A shared bestiary lookup behind the GM reference, the combat drop-in and `defencePool`. |
| 40 | **Avatar combat did not cut anybody.** It was a Difficulty-1 progress task; the rules make it damage the *user's* Health with a distinct disconnect-and-trauma outcome. | Damage lands on Health; Incapacitation throws them out, comes round a Stretch later on 1 Health, and routes to the trauma roll with no death rolls in between. |
| 41 | **Scripted experiences** could not inflict Bliss, and `BLISS.resistExperience` was unused. | A control on the neuroscape screen, with the Wits roll that cancels a point per 6. |
| 42 | **Helpers inside a neuroscape** were not modelled, though the roller has had helpers since the second pass. | A stepper capped at three, feeding the roll. |
| 43 | **Cold was a dead flag.** `flags.cold` blocked healing, the hazards screen said it lived on the Time screen, and the Time screen never rolled it. | A Strength roll on the Shift boundary, or the Stretch boundary when it is extreme, setting and clearing the flag. |
| 44 | **Damage to someone already down resumed the old death-roll tally** instead of restarting it, and left a stabilization in place. | Both reset on any further damage. |
| 45 | **A Nurse could not help against disease**, though the rule adds their Wits successes to the patient's. | A nurse picker on the disease roll. |
| 46 | **A firearm at Engaged still rolled Agility.** The book switches it to Strength. | A hint with a one-tap switch, rather than silently overriding the player's choice. |
| 47 | **Solo had no spotlight rotation**, though Chapter 8 opens by asking for one. | A lead Traveler per Stop, with a hand-over control and a note of who has not led yet. |
| 48 | Guidance extracted and never shown: solo principles, the mind-map advice, internal Threats, the book's per-archetype Goal and Threat hooks, Threat anatomy, goal directions, special abilities, mechanical NPC quirks, sessions per Stop. | Surfaced on the solo and GM screens where each belongs. |

## A data error, found by testing the rules file against the data

`docs/rules/07-solo-play.md` had the Tilt degrees as 7–10 high and J–A extreme. The data file
says 7–9 high and 10–A extreme, and the secondary summary agrees with the data. The
transcript's own table is de-interleaved and cannot settle it either way, so the rules file was
the outlier and was corrected. A regression test now pins the split.

## Harness

The button audit reported one no-op that did not reproduce: a fixed 220 ms wait lost a race
with a handler that opens a modal. It now polls for up to 1.5 s, so a slow machine cannot
manufacture a finding. Three consecutive clean runs after the change.

## Eighth pass — three surfaces and a hole in the harness

Reading the distilled rules against the engine a second time turned up three subsystems that
had partial surfaces, and one harness gap that cost real time.

| # | Finding | Fix |
|---|---|---|
| 49 | **A damaged vehicle could never be repaired.** Hull dropped from rams, collisions, potholes and gunfire; gear, neurocasters and drones all had repair paths and the vehicle had none, only a note saying it needed one. | Damage goes in through the vehicle's armor; repairs run the book's Wits roll with vehicle tools and a Reliable trait as gear dice, gated on a spare part once it is wrecked. |
| 50 | **The chase had everything except the chase.** Obstacles and component damage were there; the opposed Agility roll that actually moves the range band was not, and `CHASE.movement` was unused. | A running chase with a range band, a roll per round, a band per extra success, an end past Extreme, and a note that Engaged is where ramming starts. |
| 51 | **The safety tools the book recommends were absent.** Only the mental-trauma toggle hinted at them. | Lines and veils, a card anyone can play, and the debrief, in Settings beside the consent note. |
| 52 | Time unit durations were extracted and never shown. | On the Time screen, where the boundaries are. |

### The harness hole

A missing closing paren in `screens.js` shipped past the unit harness, which imports data
modules but not screen modules. In the browser it read as a page that never rendered and a
run that hung — three separate 2–4 minute timeouts and a false trail through stale chromium
processes before `node --check` found it in a second. The unit harness now parses every file
under `src/` and every `data*.js` first, and fails by filename. A syntax error should cost one
line of output, not an hour.

## Result

73 invariants, browser smoke clean at 360 and 390px, button audit clean across all 18 routes.

# Ninth pass — gameplay flow and the interface

The first eight passes asked whether the rules were right and whether every control did
something. Both answers were yes by this point, and the app was still awkward to play from.
This pass asked a different question: from the seat of someone actually running a session,
how many taps and how much scrolling does the next thing cost?

## Navigation was the structural problem

Eighteen routes, six tabs, and twelve of those routes hanging off two of them with no visible
index. Combat, Neuroscape, Hazards, Driving and the Log were reachable only from a button row
at the *foot* of the dice screen — so reaching the combat tracker mid-fight meant scrolling
past the entire pool builder first. The same shape on the home tab, where Journey, Time and
Tension sat below the Traveler list.

| # | Finding | Fix |
|---|---|---|
| 53 | Twelve routes had no visible way in. | A section nav at the top of every screen in a tab group, listing its siblings and marking where you are. The wizard, the sheet and the injury picker are places you go *into*, so they keep the screen to themselves. |
| 54 | **Roll sat below seven cards of setup** — the single most-pressed control in the game. | A bar pinned above the tab bar, carrying the pool size and the manual-entry button with it. |
| 55 | The dice screen showed no vitals, so you could not see the Hope you were about to spend pushing. | It renders the sheet's own header for whoever is rolling. |
| 56 | **Attacking from the tracker was one-way.** "Attack this" jumped to the dice screen and left you to find your way back. | A round marker and a way back into the fight, shown only while one is running. |
| 57 | The sheet's play actions — roll, take damage, traumatic event, rally, death roll — were below eight cards of reference. | Directly under the vitals. The Incapacitated and Breakdown notes carry their own rally and death-roll buttons rather than pointing at a row far below. |
| 58 | **Combat did not say whose turn it was.** Order was implicit in a flag and an opacity change. | The list sorts by who actually acts next — acting side first, then whoever still has a turn — and the round card names them. |
| 59 | The Time screen put "End the Journey" beside "End Shift". | Three cadence buttons, then the once-a-campaign ones behind a fold. |
| 60 | Solo showed six phase cards at once, prep and wrap-up included. | Prep and end-of-Stop fold away; the four you use in a scene stay open. |
| 61 | **Nothing prompted the book's creation steps 13–16.** A party could look finished with no destination, no vehicle and no Tension — which is the Hope economy switched off. | The home screen names the next step until the group is ready to play. |
| 62 | Solo and the GM screen had no route into combat or the dice. | Both carry the links their own procedures imply. |
| 63 | Generating a solo Stop did not move the spotlight, so the rotation the book asks for depended on remembering to press a button. | A new Stop hands the lead to whoever has led fewest; the manual hand-over still overrides it. |

## Harness

The tab-bar clearance guard measured controls inside collapsed panels. Chromium keeps their
last layout position, so three buttons inside a closed fold read as buried under the nav while
being unreachable. The guard skips closed panels now and covers the dice and time screens,
where the new pinned bar makes clearance worth checking.

## Result

76 invariants, browser smoke clean at 360 and 390px including the new section nav and action
bar, button audit clean across all 18 routes.

# Tenth pass — measured, not read

Every previous interface pass was done by reading screens. This one measured them. A probe
seeded a realistic mid-session state — two Travelers, a Journey with a vehicle and fuel, a
fight running into its second round, an injury with a healing clock — then walked all sixteen
routes at 390px recording, per screen: document height in viewports, card and control counts,
the scroll offset of the first primary action, and the effective tap target of every control.

The table is what an audit by reading cannot produce. Four screens buried the one thing they
exist to do:

| Screen | Primary action | Sat at | Fold |
|---|---|---|---|
| Time | End Shift | 887px | 788px |
| Neuroscape | Roll | 804px | 788px |
| Create | Next | 826px | 788px |
| Driving | Roll stunt | 1031px | 788px |

| # | Finding | Fix |
|---|---|---|
| 64 | **Time buried End Shift behind seven option rows.** The screen exists to advance the clock. | The three cadence buttons pinned above the tab bar, carrying the current Shift and Day. |
| 65 | **Neuroscape buried Roll** behind the task card, the drone picker and the helpers stepper. | Pinned, carrying progress and which attribute pair is rolling. |
| 66 | **The wizard buried Next on every one of seven steps.** | Pinned, carrying the step number and name. |
| 67 | **Driving buried Roll stunt** behind the repair card added in the eighth pass. | Reordered: the rolls you make in a scene come before the repairs you make between them. |
| 68 | **Checkboxes rendered at 13px.** An inline `width:auto;min-height:auto` on every one of them overrode the stylesheet. | Removed the inline styles; 22px with `accent-color`. |
| 69 | **Settings toggles were not wrapped in labels**, so the target was the 22px box rather than the row — on the screen where Solo and the GM screen get switched on. | Wrapped like every other option row in the app: 22px to 77px. |
| 70 | The sheet ran 3.7 screens and 36 controls. | Dream/Flaw/Goal/Threat and Notes fold away — written at creation, read rarely, edited almost never. 3.2 screens, 30 controls. |
| 71 | **A running fight was invisible from everywhere except the dice screen.** | The section nav carries a round badge whenever combat is active. |

`actionBar()` in `ui.js` returns the spacer and the bar together, so a caller cannot forget the
spacer and have the bar cover its own last card.

## Guards

The browser smoke now asserts that the primary action on the dice, time, neuro and create
screens is above the fold without scrolling, that no Settings toggle has a target under 40px,
and that the combat badge appears with a fight running and not otherwise. These are the checks
that would have caught all of the above.

## Result

76 invariants, browser smoke clean at 360 and 390px, button audit clean across all 18 routes.

# Eleventh pass — under load, and the last flow gaps

Two questions this time. Does the interface hold up under a real session's accumulated state,
and are there sequences that still dead-end?

## Under load

The probe seeded what a table actually has by the third session: four Travelers carrying five
conditions and eight items each, ten combatants in round seven, six Stops, thirty solo events,
and a full hundred-entry roll log. Then it walked the screens at 320, 390 and 768px.

Nothing overflowed at any width. Three screens buckled under their own content instead.

| # | Finding | Fix |
|---|---|---|
| 72 | **The roll log rendered all hundred entries** — fifteen screens at 320px, with the filter chips and the clear button stranded at the far end. | Pages at 25, with the rest on request. Fifteen screens to 2.8. |
| 73 | **Ten combatants meant ten identical cards**, six screens of them, when the only ones that matter are those who have not gone. | Whoever has taken their turn collapses to a line — 90px against 203px. |
| 74 | Solo's event record sat open above the fold as a wall of history. | Folded. It is a record, not a control. |
| 75 | The sheet is long by nature and the thing you want is rarely at the top. | A jump row — the same pill nav as everywhere else — straight to Attributes, Talents, Conditions, Neurocaster, Gear or Tension. |

## Flow gaps

| # | Finding | Fix |
|---|---|---|
| 76 | **Surviving a death roll is what triggers the D66 serious injury**, and the Stabilized modal simply congratulated you. Dying offered nothing either. | Stabilized offers the injury roll; death offers the wizard. |
| 77 | **Ending a fight silently discarded every Threat's remaining health**, with no undo anywhere in combat. | It confirms, saying how many are already down and that the Incapacitated still owe an injury roll. |
| 78 | **The talent picker listed forty-six bare names.** Nothing said what any of them did, and the archetype's own three were buried in the alphabet. | The archetype's three come first and are labelled; the selected talent describes itself. |
| 79 | **You could not invent a talent**, though page 65 says "any talent listed on page 56 or even create a new one". | An invented talent is named, given the situation it applies to, and worth two dice unless you say otherwise. It lives on the character, resolves through `talent(id, ch)`, and is tappable on a roll like any other. |

## Guards

The browser smoke seeds a hundred log entries and a seven-strong fight, then checks the log
renders at most a page with a way to see more, and that the combatants who acted are the
compact ones. A unit test pins invented talents resolving from the character and reaching the
pool.

## Result

77 invariants, browser smoke clean at 360 and 390px, button audit clean across all 18 routes.
