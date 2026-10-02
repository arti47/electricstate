# Links between the parts of the app

Prompted by Play falling out of step with the Journey: its session director kept a private place in the story and never read back what the other screens changed. This audit asked the same question of every part of the app: what does it keep that something else also keeps, and what does it point at that can change underneath it?

## Found and fixed

| # | Link | What was broken | Fix |
|---|---|---|---|
| L1 | Play ↔ Stops, Countdown, Journey setup | The director only moved on its own buttons. | `session.reconcile()` before every render; the setup ladder is shared with the home card. |
| L2 | Dice screen → the item the gear dice came from | `pending.gearRef` was read and never written, so a push's gear-die 1s never damaged anything. The coverage spec said "implemented" because the function existed. | The gear source is resolved every render: the item picked under **Gear**, else the inventory item sharing the weapon's name, else the neurocaster. A degraded weapon now rolls its current bonus, not its printed one. The cost finds the item by name if the list shifted between roll and push. |
| L3 | Network-powered weapon → the neurocaster | It said its dice came from the Network and added none. | Gear dice are the current Network rating, and a push wears it down. |
| L4 | Neurocasting → the neurocaster | There was no push at all, so the neurocaster could never be worn down by use. | Push a failed roll once: base 1s cost Hope, gear 1s wear the rating the task used. |
| L5 | End the Journey → the campaign | Epilogues rolled, but `journey.ended` was never set. | Set, so every "what now" surface shows the Journey as finished. |
| L6 | Deleting a Traveler → everything pointing at them | Tension toward them, their place in a fight, the solo lead, their led count and their personal Threat were all left behind. | Repaired on every write (`src/integrity.js`). |
| L7 | Renaming a Traveler → the fight | The combatant kept the old name, and so did the combat strip. | The copy is refreshed on every write. |
| L8 | Removing a Stop → active Stop, director | Both could point at nothing. | Cleared on every write; the director restarts. |
| L9 | Swapping the vehicle → Hull and chase | The old vehicle's damage carried over and could exceed the new Hull. | Reset on choosing a vehicle; clamped on every write. |
| L10 | Dice screen → opponent, target | A stale opponent (or yourself, after the header switched Travelers) added phantom Tension dice. | Dropped when they no longer apply. |
| L11 | Solo "Arrive at what time?" → the clock | The card named a Shift that the sky, header and Time screen never heard about. | It sets the Journey's Shift. |
| L12 | Play's opening line → the clock | It used a random Shift when none was set. | It uses the Journey's own Shift. |
| L13 | Campaign switch → every screen's working state | Only three of six screens forgot theirs. | One `core.onReset` registry; every module variable either registers or is declared view-only. |

## What stops the next one

1. **Link spec (`tests/links.mjs`, in `npm test`).** It walks `src/` and fails on:
   - any state field that is read but never written anywhere;
   - any module-level `let` that neither resets with the campaign nor is listed as view-only, with a reason.
   
   It finds L2 and L5 on the code before this fix, and catches either regression when reintroduced.
2. **Integrity repair on every write.** `store.persist()` runs `repairLinks()` over every campaign, so no screen can leave a dangling id for another to misread. `checkLinks()` lists problems without fixing them, for tests.
3. **Runtime tests.**
   - `tests/run.js` covers delete, rename, Stop removal, vehicle swap, the reset registry, and Play's sync in both directions.
   - `tests/browser.js` drives a real push with manual dice and asserts the Handgun is Busted. With the link cut, it fails.

## The rule

A screen does not keep its own copy of game state.
- It derives what it shows from the store on every render.
- If it must remember something (the roll on the table, a picked tab), it registers a reset.
- If a saved record points at another (an id) or copies one (a name), that link goes in `src/integrity.js` with its repair.
