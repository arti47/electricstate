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
- Advancement is a **session-debrief** flow (1d6 vs attribute); overcoming the Flaw grants 3 rolls then permanently locks improvement.
- Blocked data: weapons, consumer drones and vehicle stat tables cannot be recovered from the transcript (see docs/TRANSCRIPT-ISSUES.md). No UI is built against them until the source pages arrive.

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

## Build status (Stage C)
- **Phase 0 — Foundations**, data layer first.
- Data files live at repo root per the LOCKED file structure: `data.js` (core), `data-tables.js`
  (injuries, traumas, shared items, gear, services), `data-gm.js` (Stop generators),
  `data-solo.js` (Chapter 8), `data-npcs.js` (Threats), `data-pregens.js`.
- Ledger: 48 of 51 items extracted. Outstanding: T-27 rules-library entries, T-45 vehicle
  combat/chases, T-32 partial (one pregen blocked, ruling A18).
- Not built yet: `index.html`, `styles.css`, `src/*`, PWA shell. Nothing renders.
- Verification so far is structural only — module parse, D66 row counts (36), D6 counts (6),
  pregen sheets re-derived against the Health/Hope formulas. No browser verification yet;
  that starts when the shell exists.
