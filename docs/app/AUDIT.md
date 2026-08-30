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

---

# Twelfth pass — the things a table does that the app did not

This one did not start from a rules reading or a screen walk. It started from the question the
last eleven passes never asked: what does a group actually do with this app across a campaign,
rather than within one screen?

## Findings

| # | Finding | Fix |
|---|---|---|
| 80 | **One game per device.** A second Journey meant erasing the first. The store had exactly one bag of characters, and nothing above it. | Schema 2: campaigns. Characters, Journey, roll log and session record live inside a campaign; `activeCampaignId` says which is in play. A schema 1 save migrates into one campaign with everything intact, and the last campaign can never be deleted out from under the player. |
| 81 | **Deleting was final.** Delete a Traveler, clear the log, erase everything — no way back, on a device with no server behind it. | `snapshot(label)` before every destructive action, one step of undo, and Settings names what it would take back. Erasing everything is covered too. |
| 82 | **The debrief asked what the session was about and had nothing to answer with.** The roll log says what you rolled; nothing said what happened. | `noteEvent` records what each Shift, Day and Session boundary actually changed. The debrief shows the session's record before rolling advancement, then clears it. |
| 83 | **Solo runs two to four Travelers and every screen had its own select.** The persistent header — the one thing always on screen — did not even say whose numbers it was showing. | The header names the Traveler. With two or more it is a switcher: on the dice screen it changes who the pool belongs to in place, elsewhere it opens their sheet. |
| 84 | **Threats arrive as "Law Enforcement 1, 2, 3"** and get real names at the table within thirty seconds. | Rename, on the combatant. |
| 85 | **`Settings.hideGmContent` existed and nothing consumed it** — the defect class this project keeps finding, this time in a setting rather than a data table. | `ui.spoiler()`. Prepared Stops and unfired Countdown steps arrive blurred and unblur on a tap, so one phone can go round a table. |
| 86 | **Steppers stayed pressable at their limits.** A "−" at zero looks like a control and behaves like a broken one. | Disabled at floor and ceiling, in all three stepper helpers. Bliss's floor is Permanent Bliss, by rule. |
| 87 | **Pinch-zoom is switched off** so a stray gesture cannot derail a roll — which takes it away from anyone who needs it. | A text-size setting inside the app, plus a screen wake lock and a plain-text export of a sheet. |

## Measurement, made permanent

The tenth and eleventh passes each built a throwaway probe and then threw it away, which is why
the same defect classes kept coming back. Both are committed now, and a third with them:

- **`probe-layout`** — where each route's primary action sits and how big every target is,
  across fresh, mid-session and stress states. It found five buried primary actions on its
  first run: the Journey screen had no single action at all and marked two buried buttons
  primary; solo marked two.
- **`probe-flow`** — the taps each session journey costs from a cold start, with a budget per
  journey and an assertion that it still arrives.
- **`probe-pwa`** — forces a genuinely new registration, proves the previous build's cache is
  deleted on activate, and boots the app with the network switched off.

`tests/fixtures.js` now owns the static server, the browser-side store helper and the three
seed states. No test reaches into the raw store shape any more — when the store grew a campaign
container, every test that did broke at once, which is the argument for the seam.

A unit test asserts the service-worker shell lists every file in `src/` and every `data*.js`,
and that the app and worker agree on `CACHE_VERSION`. A bumped app with a stale worker leaves
players on the old build, silently.

## Result

90 invariants, browser smoke clean at 360 and 390px, layout and flow probes clean across three
seed states, PWA probe clean, button audit clean across all 18 routes.

---

# Thirteenth pass — three things called Goal and Threat

Raised from play rather than from a harness: solo's "Before you set out" offers *Personal Threat*
and *Goal and Threat for your archetype*, and neither is obviously different from the Goal and
Threat filled in at creation. Reading the code, they were three different things sharing two words.

| # | Finding | Fix |
|---|---|---|
| 88 | **The archetype hooks were a dead end.** The book's printed per-archetype Goal and Threat (p.207–208) were shown in a modal and nothing else — you retyped them onto the sheet yourself. They fill exactly the two fields creation asked for. | Each Traveler's hook now carries **Use both** and **Goal only**, writing `ch.goal` / `ch.threat`. |
| 89 | **The personal Threat countdown was one counter for the whole party**, while `threat` is per-Traveler and the book's prep steps 5 and 6 are *each* Traveler's Goal and Threat. Two to four Travelers, one clock, and nothing saying whose. | `solo.personalThreats[charId] = { text, step }`. Rolling one asks whose; the phase-5 button names whose is next and asks when more than one is running; a face card falls on whoever holds the spotlight, since the card does not say. A one-counter save migrates onto the lead with its progress intact. |
| 90 | **The clocks were invisible until they fired.** A personal Threat that exists only as a counter is one the player forgets is coming, which is the one thing it must not be. | Phase 1 lists every armed Threat with its text and step. |

The rolled Threat also offers to write itself onto the sheet, and says plainly that it is the
clock while the sheet field is the description — the distinction that prompted the pass.

## Guards

Four unit tests: a Threat belongs to one Traveler and stops after three steps, one Traveler's
Threat does not advance another's, a face card advances the spotlight rather than the first
entry, and a legacy one-counter save migrates onto its lead and carries on from where it was.

## Result

92 invariants, browser smoke clean, three probes clean, button audit clean.

---

# Fourteenth pass — the app stopped scrolling

Reported from play: at some point in a session the page simply will not scroll any more.

| # | Finding | Fix |
|---|---|---|
| 91 | **Four dialogs closed themselves by removing `.modal-backdrop` by hand.** The modal's own bookkeeping never ran, so `openModals` drifted upward. The symptom is delayed and looks unrelated: the hand-closed dialog does clear `overflow`, but the *next* dialog to close normally decrements the count to one, the `if (!openModals)` guard fails, and `overflow: hidden` stays on the body for the rest of the session. | `ui.dismissModal(value)` closes the dialog on top through its real `close`, resolving its promise. Every hand-rolled removal now goes through it, and the decrement is clamped at zero. |
| 92 | Nothing anywhere could recover a stuck lock. | `ui.releaseScrollLock()`, called on every route render: no backdrop on screen means nothing may be holding the page still. |

## Guard

The browser smoke opens and closes the injury picker three times, then opens a dialog that
closes properly — because that second dialog is where the defect surfaces — and asserts the
body is not locked. It also stamps a lock on by hand and asserts navigating clears it. Both
checks were verified to fail with the defect reintroduced.

## Result

92 invariants, browser smoke clean, three probes clean, button audit clean.

---

# Fifteenth pass — the app talked about people in the plural

Raised from play: the app said "they lose their next turn" about one specific person at the
table. A Traveler is somebody, not an abstraction, and the singular they read as the app not
knowing who it meant.

| # | Finding | Fix |
|---|---|---|
| 93 | **No character had a gender**, so every sentence about one reached for a plural. | `gender` on the character, chosen in creation above the name and editable on the sheet, normalized onto every existing save. `src/pronouns.js` is the single source: `subj/obj/poss/refl`, capitalised variants, and `refer(who, fallback)` for a sentence whose subject may not be picked yet. |
| 94 | **The name roller produced "Cade/Courtney Draper".** The house table is written in the book's paired convention and the app handed the slash straight to the player. | The roll takes the half matching the gender. The four printed pregens name both halves explicitly in `data-pregens.js` — the book's pairs are not consistently male-first (Nancy/Pascal, Wilhemina/William), so the data says which is which, and the pregen picker offers both. |
| 95 | **Threats and NPCs had no pronoun either.** A robot is an "it"; a patrolman is not. | Combatants carry a gender: rolled for people, `neuter` for anything with a Hull. A generated solo NPC now gets a name and a gender as well as a personality — that is the handle the table needs to talk about one. |
| 96 | **224 plural pronouns in user-facing strings.** | All of them rewritten. Where a specific person is in scope the text asks `pronouns.js`; where none is, it names the thing ("the target", "the other driver", "the pursuer"). The Kicker and destination tables in `data-journey.js` moved to second person, which is the register the rest of the app already used — the Kicker is yours. |
| 97 | **The gender control was inside the Dream/Flaw fold**, collapsed by default — filed under a heading nobody would open looking for it. Reported as "nowhere to edit gender in the character sheet", which is exactly right. | A two-option switch on the identity line directly under the name, always visible, with the pronouns it produces stated beside it. |

## Guard

`tests/pronoun-scan.mjs` reads every string and template literal in `src/` and `data*.js` and
fails on a plural pronoun, ignoring comments and `${expression}` interpolations. It runs inside
`npm test` and standalone as `npm run pronouns`. One allowlisted string: a 1992 Pete Rock record
whose title the app does not get to rewrite.

The browser smoke asserts the switch is on the sheet, **not inside a collapsed panel**, above
the fold and finger-sized; then switches the Traveler to Woman and asserts the choice persists,
the switch shows which option is set, and the status notes read "Someone rallies her" with no
plural pronoun anywhere on the rendered sheet.

## Result

100 invariants, browser smoke clean, three probes clean, button audit clean.

---

# Sixteenth pass — the controls did not look like controls

Reported as "the button layout is all messed up", and it was: the gender switch had landed in
a header that had no room for it, and looking properly showed the same three defects repeated
across the app.

| # | Finding | Fix |
|---|---|---|
| 98 | **A wrapped `.btn-row` leaves an orphan.** Three actions of equal standing came out two-then-one, and the orphan sat in half a row wrapping its own label onto two lines — the sheet's play actions, the fight-level actions, the per-combatant actions. | `.btn-grid`: equal cells, `auto-fit minmax(132px, 1fr)`, and an odd last child spanning the row. |
| 99 | **Steppers were three separate boxes with gaps** — a big square minus, a floating number, a big square plus, none of them aligned to each other down the card. | `.stepper`: one bordered group, fixed 46px buttons either side of a fixed-width value. Zone in the combat tracker uses the same shape. |
| 100 | **Two exclusive options rendered as two full-width buttons.** In a combatant card at 360px the realm choice stacked vertically and collided with its own label. | `.seg`, the same switch the gender control uses. Quiet, not accent-filled: the accent belongs to the action you press, not to a setting. |
| 101 | The vitals header left a blank slab whenever the tile count did not divide the column count — five tiles in a six-column auto-fit grid. | Flex, with each tile `flex: 1 1 60px`. |
| 102 | The section nav scrolls inside itself, so the pill at the right edge was hard-clipped and read as broken. | A mask fades the last 24px, which is what "there is more this way" looks like. |
| 103 | "He has acted" as a button label is a sentence about someone, where a button wants an instruction. | "Turn spent". |
| 104 | **The gender switch shared a line with the archetype and the favourite song**, so it sat in a different place on every sheet and dropped onto a line of its own whenever the song title was long — reported as "it shifts to a new line for some character sheets". A control whose position depends on someone else's data has no position. | Its own row, left-aligned at the content edge with the pronouns beside it. The browser guard renders the same sheet with an empty song and with the longest title in the book and asserts the switch has not moved. |

## Result

100 invariants, browser smoke clean, three probes clean, button audit clean.

---

# Seventeenth pass — the player who has read nothing

The question this time was not whether a control works but whether someone who has never
read the rulebook, and has never played a solo RPG, can use it. A fourth probe was written
to ask that mechanically, and it found more than reading did.

## The probe

`tests/probe-onboarding.mjs` walks every route **in the empty state** and asks three things:
does the screen introduce itself, is there anything at all to press, and does the app ever
put a word from the book on screen that it never explains anywhere. Then it plays the first
five minutes: cold start to the tutorial, cold start to a playable Traveler, first roll.

Its first run reported twelve gaps. Four were the probe measuring badly — a closed accordion's
own summary is the way into it, a search box is a control even with no label, and the tutorial
does not owe a "what this does" note because it is one. Eight were real.

## Findings

| # | Finding | Fix |
|---|---|---|
| 105 | **The app used forty-odd words from the book and defined about half of them.** Tilt, Kicker, Neurine, base dice, spotlight and the deck appeared on screen and were explained nowhere — and the rules library is grouped by subject, which only helps someone who already knows what the subject is called. | A **glossary**: 52 words, one plain sentence each, rendered as the first group on the Rules screen and searchable with everything else. Each entry links on to the fuller rule where there is one. A unit test pins that every word a player meets before reading anything is in it. |
| 106 | **Four screens were dead ends when empty.** The roll log, Tension, the Neuroscape and Hazards each said "No Travelers yet" and offered nothing to press. A first-time player lands there and stops. | Every empty state says what the screen is for once it has something, and carries the action that gets it there. |
| 107 | **Combat let you start a fight with nobody in it** and then reported that everyone had gone. | With no Travelers it explains what the tracker is and points at creation. |
| 108 | **The creation wizard had no explainer at all** — seven screens of unfamiliar choices with nothing saying what the whole thing was, or that every field can be rolled rather than invented. | An explain note on every step, and the pregen route promoted from a small button to a card that says what it is for: "In a hurry, or new to this? The book prints four finished Travelers." |
| 109 | **Solo mode is off by default and the home screen mentioned it in six words.** For someone whose entire reason for opening the app is playing alone, that was the whole discovery path. | A card that says what solo mode actually is, switches it on in one tap, and links to the walkthrough. Same for the GM screen. |
| 110 | **The solo screen listed six numbered phases and never said what the loop was.** Structure is not instruction for someone who has never played without a GM. | A first-run card: ask a question, draw a card, read the answer into the fiction — four steps, and it disappears once the first event is logged. |
| 111 | **A roll result was a pile of numbers and the word Failure.** Nothing said why, or that failing costs nothing until you push. | One line under every result: "A 6 is a success, and you rolled one. It works — say how." / "No 6, so it did not work. Nothing is spent unless you push." |
| 112 | **"base + gear", "P2 N2 G2", "11–36"** — three abbreviations doing real work with no expansion anywhere. | Spelled out where they appear, and D66 and D100 added to the glossary. |

## Result

104 invariants, browser smoke clean, four probes clean, button audit clean.

---

# Eighteenth pass — does the app implement the book, and can you reach what it does?

Two specs, committed, failing on opposite mistakes. Everything before this pass walked the
code. Neither of these does only that.

## Coverage — source document → code

`docs/coverage.json` maps **136 requirements read out of the transcript** — chapters 3, 4, 5,
6 and 8, the character sheet and the pregens — to the artefact that implements each, with a
line citation so a reader can go and check. `tests/coverage.mjs` fails if a marker vanishes,
if an entry has no citation, or if anything not `implemented` has no note.

The list was **not** derived from the code, and that is the whole point: a checklist built by
scanning `src/` maps onto `src/` perfectly and passes forever while telling you nothing.

Its first run failed on four of my own entries — three markers pointing at a rules file whose
name I had misremembered, and one at a function that does not exist. That is the spec doing
its job on the day it was written.

| status | count |
|---|---|
| implemented | 118 |
| partial | 9 |
| deliberately-omitted | 9 |
| unknown | 0 |

Three markers had to be repointed once the reachability spec ran, because they named a
**provenance constant rather than the implementation** — `FIREARM_RULES`, `VEHICLE_DAMAGE`
and a `generateStop` alias. Coverage alone would have stayed green on all three: the constant
existed, so the mapping held, while nothing read it. That is precisely the gap the second
spec closes.

## Reachability — code → user

`tests/reachability.mjs`, eight classes. Its first run found eighteen, of which these were real:

| # | Finding | Fix |
|---|---|---|
| 113 | **`useHopeItem` was implemented, unit-tested, and reachable from nowhere.** Worse, the data it needs was thrown away: adding gear to a pack dropped the item's `hope` block, so even a caller would have had nothing to read. A Walkman, a bottle, a dog — the whole "a moment with this returns a point of Hope" rule was inert. | The gear list carries `hope` and `alcohol` through, and an item that has them offers "Take a moment with it", speaking the refusal out loud when the once-per-Shift cap or hunger blocks it. |
| 114 | **`resetRoller`, `resetNeuro` and `resetWizard` existed and nothing called them.** Three screens keep working state in a module variable, so switching campaign, importing a save or erasing everything left the previous game's half-built Traveler and pending roll sitting there. | `clearTransientScreens()` on campaign switch, campaign creation, import and erase. |
| 115 | **`inventoryCard` and `neurocasterCard` referenced `rerender` without taking it** — a ReferenceError waiting behind a busted item or a busted neurocaster, both of which need a pushed roll to reach. Found while wiring 113. | Both take the callback. |
| 116 | `generateStop`, `rollDescriptors` and `validAttributes` were duplicates of `makeStop`, `pickDistinct` and the wizard's own validation. | Deleted; the tests and the coverage marker point at the survivor. |
| 117 | `TRAUMA_RESIST` and `FIREARM_RULES` recorded rules the engine re-implemented as magic numbers beside them — `-3` for an ambush, a hardcoded `"strength"`. Two sources for one rule. | The engine reads the constants. |

The rest were provenance constants that exist to record where a number came from and are meant
to be read by a person. Each is exempt **with its reason** written next to it, because a
detector reporting three known warnings is a detector everyone learns to ignore.

## Proving both specs fail

Coverage: renamed `isLost`; the spec named `bliss-lose-condition` and exited 1. Restored, green.

Reachability: injected one synthetic defect per class — an unreferenced function, an unsurfaced
table, a hidden div, a wired-to-nothing button, a `#/nowhere` link, a glossary entry pointing at
a rule that is not there, a service-worker entry with no file, a hand-removed modal backdrop.
All eight were named and the runner exited 1.

**Two traps found in my own detectors while doing that**, both of the kind that make a check
pass forever:
- a table composed into another table in the same file reads as orphaned unless you count
  mentions beyond the declaration and the `export default` list;
- "is it ever revealed?" written as a bare `/hidden = false/` over the whole corpus matches
  some *other* element's reveal, so it can never fire. It must be tied to the id.

## Result

104 invariants, coverage clean, reachability clean, browser smoke clean, four probes clean,
button audit clean.

---

# Nineteenth pass — how do you actually play?

Reported plainly: "I still don't know how to start playing the game, and sustaining play and
ending the game well." Every audit before this one made the app more correct, more reachable
and better explained, and none of them touched the thing being asked for.

The pieces were all there. Nothing joined them.

| # | Finding | Fix |
|---|---|---|
| 118 | **The app went silent exactly when play started.** `nextStepFor` named the next setup step — make a Traveler, set a destination, pick a vehicle, set Tension — and returned `null` the moment setup was done. That is the moment a table sits down and asks what happens now. | `whatNow(state)` in `src/play.js`: a pure function over the saved game returning one of nine steps across six phases, from an empty roster all the way to a finished Journey. The home screen renders it and it changes every time the state does. |
| 119 | **No procedure anywhere.** `#/tutorial` is a feature tour — "tap Travelers, then New Traveler". Nothing said how to open a session, what a scene is, when to roll, when to fire a Countdown, or when to stop. | `#/play`, "Running a session": three acts that open on the one you are in — getting started, keeping it going, stopping well — written as instructions to a person at a table. |
| 120 | **Nothing said what to do when a session goes badly**, which is the most common reason a new group stops playing. | Five failure modes and the move for each: nobody acting, a planning meeting, a silent player, no Hope left, nobody knowing what happens next. |
| 121 | **Ending was implemented and hidden.** The session debrief, the week interval and the end-of-Journey epilogue all lived inside a collapsed "Bigger boundaries" fold on the Time screen. The debrief is where advancement happens *at all*, and the epilogue is the only way a campaign finishes rather than being deleted. | The state machine routes to all three at the moment they are due, and the guide's third act says what each is for. |

## What the state machine says

| phase | when | what it tells you |
|---|---|---|
| setup | no Traveler, destination, vehicle or Tension | the next thing to fill in |
| open | on the road, or just arrived | start driving not arriving; open with the place, not the problem |
| play | Countdown running, or a fight | scene, roll, consequence, repeat — and fire the Countdown when it stalls |
| crisis | Countdown spent | everything is on the table; resolve it or drive out with it unresolved |
| close | Blocker dealt with | drive on, or end the session while the memory is fresh |
| done | Journey ended | keep it as a record; a new Journey starts clean |

## Guards

Three unit tests: the setup ladder still runs in the book's order; every phase after it returns
a step (the state the app used to have no answer for); and every one of the nine steps has a
title, a blurb and somewhere to go. The onboarding probe adds `#/play` to its route walk and
asserts the guide covers starting, sustaining, stopping, where-you-are and what-to-do-when-stuck.

The reachability spec immediately reported `nextStepFor` as an orphan once the home screen
stopped calling it — which is the pair of specs working as intended, one pass after they landed.

## Result

107 invariants, coverage clean (137 mapped), reachability clean, browser smoke clean, four
probes clean, button audit clean.
