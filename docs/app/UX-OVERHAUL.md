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
