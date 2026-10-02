# UX/UI audit and overhaul — twelfth pass

The audit covered 20 routes at 390px, in the fresh, mid-session and stress seeds. Every finding below is closed. No user-facing copy was changed.

## Defects found

| # | Finding | Fix |
|---|---|---|
| A1 | The heading font (`Oswald`) was named but never loaded. All display type fell back to the system bold. | Barlow Condensed and IBM Plex Mono are self-hosted in `fonts/` and cached by the service worker. |
| A2 | `--font-body` was undefined, so the action-bar subtitle rendered in oversized mono. | The token is defined, and the subtitle is set in the display face. |
| A3 | The dice screen's `numberRow` drew three loose boxes, with the value sitting off-centre. | It uses `.stepper`, and so do the Neuroscape helpers. |
| A4 | Contrast: `--ink-faint` was 2.6–2.8:1, primary-button text 3.8:1 and danger text 3.2:1. | All text tokens are now ≥4.5:1 on every surface, in both themes. |
| A5 | The vitals bar was pinned at a hard `top: 53px`. | The header, vitals and strip share one sticky `.topbar`, and `--topbar-h` is measured. |
| A6 | The `◐` theme glyph rendered as a sliver, and the Unicode tab glyphs varied by platform. | One inline-SVG set, `src/icons.js`. |
| A7 | Body text was set in `px`, so the Text size setting didn't scale it. | Body text uses `rem`. |
| A8 | The home list showed a bare `4/3`. | It now reads `Health 4 · Hope 3`. |
| A9 | Dice and Neuroscape each had a Traveler `<select>` duplicating the header switcher. | Removed; the header switcher drives both. |
| A10 | Every H1 repeated the active section pill. | The section nav is the title, and the H1 is screen-reader only. |
| A11 | Each combatant's card carried a primary "Turn spent" button, and End combat was a red block. | Only whoever is up gets the primary button and the amber edge; End combat moved behind ⋯. |
| A12 | The wizard's disabled primary button read as a brown smudge. | Disabled primaries are drawn dashed and unfilled. |
| A13 | The manifest had an SVG-only icon flagged `any maskable`. | Added 192/512 PNGs and a maskable 512. |

## Decisions (asked one at a time)

| Question | Choice |
|---|---|
| Aesthetic | Dusk roadside: slate sky, sodium-amber horizon, teal network glow, film grain |
| Navigation | Four tabs (Play · Traveler · Dice · Reference), a dice tray, a combat strip, Settings in the header |
| Vitals | Pip gauges, plus a Bliss bar with the Permanent floor and a Hope marker; tap a tile to step it |
| Dice | Animated faces and haptics; reduced-motion users get the result instantly |
| Fonts | Self-host two faces (about 120 KB) |
| Explain notes | An ⓘ on the title line that opens a bottom sheet; on first visit the note opens in place once |
| Light theme | A full "overcast day" variant |
| Destructive actions | A ⋯ menu plus an undo toast wherever a snapshot exists |
| Breakpoints | Two panes on tablet, and the tray docks as a pane at ≥1100px |

## Where it lives

- `styles.css`: tokens, atmosphere, every component.
- `src/icons.js`: the icon set.
- `src/ui.js`: `explain`, `moreMenu`, `showToast(…, action)`, `haptic`, `dieFace`, `diceRow`, and drag-to-dismiss.
- `src/router.js`: tabs, title line, combat strip, tray.
- `src/sheet.js`: gauges, quick stepper, `vitalSteppers`, scroll-spy section bar.
- `src/roller.js`: attribute picker, dice faces, tumble, kept dice on push, `rollFor`.

# Thirteenth pass: graphics and layout

A second audit (25 route/state combinations) found the interface structurally sound but without imagery: every screen was a column of identical cards. No user-facing copy was changed, apart from the Sound setting's label and the "More" pill, which are new controls.

## Findings

| # | Finding | Fix |
|---|---|---|
| F1 | There were no graphics anywhere. | `src/scene.js` draws a silhouette landscape (road, pylons, wires, a derelict giant, fog) and `src/graphics.js` the drawn objects, all inline SVG tinted by tokens. |
| F2 | The session screen left 60% of the viewport empty. | A scene band per phase: open, road, stop, crisis, close. |
| F3 | Play's 7-item section row clipped. | The current item plus the 4 most-used stay in the row; the rest sit under a **More** pill. |
| F5 | The Journey was a plain form. | Route strip (Stops played, current, still to come) with a vehicle marker, a fuel gauge, and the vehicle silhouette with a Hull bar. |
| F6 | Tension was two rows of buttons. | A directed graph; tap an arrow to step it. The rows became `.seg` switches. |
| F7 | The sky never changed. | The sky follows `journey.shift`: Morning, Day, Evening and Night each have their own gradient, glow, stars and blinking pylon lights. |
| F8 | Countdowns and clocks were "1/3" text. | Ring dials for the Countdown, healing clocks (`healTotal` now stored), neurocasting difficulty, and the Shift of day. |
| F9 | Combat had no spatial picture. | A zone map with tokens (amber allies, rust foes, teal machines); tap a token, then a zone. It sits under the card of whoever is up. |
| F10 | Solo cards were text. | Rendered playing cards that flip on a draw, a five-card fan for NPCs, and a deck stack that thins as it's drawn down. |
| F11 | Archetypes were plain text. | Ten line glyphs: creation tiles, the home roster, the sheet hero. |
| F12 | Table-roll buttons said D6/D66/D100 in text only. | A die icon, added by the router's decorate pass. |
| F13 | Every button had the same weight. | Amber condensed primaries; secondaries are sentence-case ghosts. |
| F14 | A roll result had no moment. | A success stamps an amber seal; a failure draws static. |
| F15 | The empty-state emblem was a bare circle. | A small scene band per surface. |
| F16 | No splash. | The helmet draws itself once per launch. Pointer-events are off, and it is skipped under reduced motion. |
| F17 | The rules list was uniform. | An icon badge per subject. Rules, the tutorial and the session guide are field-manual paper, with tokens redefined inside (AA ≥4.8:1). |
| F20 | The tab bar was static. | Dice glows rust during combat; Traveler shows a dot when someone is down, broken or lost. |
| — | The sheet's header was plain. | A hero band: name, archetype, a cassette label for the song, stamped description words, and a large glyph watermark. |
| — | There was no sound. | Synthesised WebAudio sounds (dice, card, static, tick, loss), off by default in Settings. |
| Bug | `tensionScreen` captured the Traveler list once, so a second change wrote stale Tension back and undid the first. | Reads fresh on every render. |
