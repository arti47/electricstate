# Transcript quality notes

Source: `docs/source/core-rulebook-transcript.md` — 17,569 lines, text extracted from the PDF of
*The Electric State Roleplaying Game* (Free League, 2024). Defects that matter when reading
or re-deriving data from it:

1. **Multi-column tables are de-interleaved into flat runs.** The worst case is the weapons
   table (~lines 5150–5310): weapon names, gear bonuses, base Damage, min/max range and price
   arrive as five separate vertical lists, so a given row cannot be reassembled from the text
   alone without the original layout. Same problem, less severely, in the consumer-drone table
   (~line 6870), the vehicle table (~line 7000) and several D66 tables where the D66 index column
   and the entry column are separated.
   **Resolved for the three worst cases** — weapons (p. 81), consumer drones (p. 99) and
   vehicles (p. 101) were re-extracted from supplied page images into
   [`rules/09-stat-tables.md`](rules/09-stat-tables.md), which is canonical for those values.
   D66 tables remain to be checked row by row as they are extracted.
2. **Custom dice glyphs are dropped.** The success symbol (6) and the Hope/gear-damage symbol (1)
   were non-text glyphs, so sentences read "Once you have rolled a total of three ,". Substitute
   "6" and "1" from context.
3. **Running headers are glued to body text**, e.g.
   `CHAPTER FOUR /// COMBAT & NEURONICSDAMAGE` — chapter headers concatenate with the first words
   of the following page. Grep for `CHAPTER [A-Z]* ///` to locate page boundaries.
4. **Map labels are collapsed into one unspaced blob** (lines 1, 3, and repeated at ~1875) —
   every place name on the Pacifica map, e.g. `SAN FRANCISCO MEMORIAL CITYLOS ANGELES...`.
   Usable as a place-name list only after manual splitting.
5. **Line-broken hyphenation and doubled spaces** survive from PDF justification
   ("neuro caster", "count down", "neuro scape"), so exact-string searches should be loose.
6. Illustration captions, in-fiction journal excerpts and rules text are interleaved with no
   markup distinguishing them.

Chapter offsets in the transcript:

| Chapter | Start line |
|---|---|
| 1 Welcome to the Electric State | 254 |
| 2 The State of Pacifica | 919 |
| 3 Your Traveler | 2428 |
| 4 Combat & Neuronics | 4799 |
| 5 The Journey | 8146 |
| 6 Threats | 10357 |
| 7 Into the Dust | 11361 |
| 8 The Lone Traveler | 15027 |
| Character sheet | 16602 |
| Pre-made Travelers | 16677 |
