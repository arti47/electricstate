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
