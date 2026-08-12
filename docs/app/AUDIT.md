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
