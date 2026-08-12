# CLAUDE.md

## What this repo is
Working repository for *The Electric State Roleplaying Game* (Free League / Fria Ligan AB,
2024; Simon Stålenhag; Year Zero Engine variant). It currently holds a PDF transcription of the
core rulebook plus a distilled rules reference. No code yet.

## Layout
```
docs/source/core-rulebook-transcript.md   raw PDF transcription, 17.5k lines — treat as read-only source of truth
docs/rules/                               distilled reference, one file per subsystem (see docs/rules/README.md)
docs/TRANSCRIPT-ISSUES.md                 known extraction defects + chapter line offsets
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

## Conventions
- Cite the transcript by line number (`docs/source/core-rulebook-transcript.md:5150`), not by book page — book page numbers survive in the text but are unreliable anchors.
- When a rules file and the transcript disagree, the transcript wins; fix the rules file.
- Don't reconstruct the weapons, drone or vehicle stat tables from the transcript alone — the columns are de-interleaved and rows cannot be recovered reliably (see docs/TRANSCRIPT-ISSUES.md). Get those values from the PDF or the official character sheet.
- Rules files are terse reference, not prose retelling. Keep tables as tables.
- Content here is copyrighted material transcribed for personal use; keep it in this repo and don't publish it.

## Git
- Feature branch: `claude/document-study-review-cd12ud`, merged to `main` after each unit of work.
- Push with `git push -u origin <branch>`.
