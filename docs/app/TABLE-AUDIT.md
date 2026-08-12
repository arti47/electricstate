# House table audit — against Mythic's custom Elements Meaning Tables

Source of the method: *Mythic Magazine Volume 38*, supplied as `Custom_Elements.md`.
Its central claim is that a **single word per entry** beats a phrase, because one word floats
free and attaches to the first logical concept, while a phrase arrives pre-interpreted and
collapses the combinatorial space. It also prescribes ten **Anything Words** as universal
state-shift modifiers, and reads doubles as amplification rather than a mis-roll.

## The distinction that decides each verdict

Not every d100 table is a meaning table, and the article's advice only binds one of the two kinds.

- **Meaning tables** feed interpretation. You roll several, hold them together, and *write*
  something out of them. These must be single words — the article is right, and the tables here
  were wrong.
- **Content tables** hand you a finished thing. A name, a song, a place, a detail on a dashboard.
  There is nothing to interpret; a single word would be *worse* ("Motel" tells you less than
  "a motel strip on a dead highway"). Mythic's own tables include this kind.

## Verdicts

| Table | Kind | Verdict |
|---|---|---|
| `FIRST_NAMES`, `SURNAMES` | Content | **Unchanged.** Proper nouns. Single-word rule does not apply. |
| `SONGS` | Content | **Unchanged.** A song title is the deliverable. |
| `GOAL_SEEDS` | **Meaning** | **Rewritten.** Was phrases (`before the drought`, `a body has to be taken from there`). Now 100 single words plus all ten Anything Words. |
| `THREAT_SEEDS` | **Meaning** | **Rewritten.** Was phrases (`wants nothing you can give`). Now 100 single words plus all ten Anything Words. |
| `DESC_BUILD` / `DESC_WEAR` / `DESC_MANNER` | Hybrid, leaning content | **Kept.** These are already rolled one-per-category, which is the article's own structural fix — three tables beat three rolls on one. Their entries are concrete descriptions rather than concepts to interpret. Converting `port scar at the temple` to `Scar` would lose the thing that makes it usable. |
| `JOURNEY_PLACES`, `JOURNEY_PURPOSE` | Content | **Kept.** A destination is a deliverable, not a prompt. `a missile silo with a family living in it` is the result; `Silo` would need re-inventing every roll. |
| `ROUTE_FEATURES`, `VEHICLE_DETAILS` | Content | **Kept.** Same reasoning — these answer the book's own vehicle questions directly. |

## What changed

1. **Goal and Threat seeds are single words.** `Deliver / Grave / Winter` gives three hooks to
   wire together; `before the drought` gives one finished clause and nothing to combine.
2. **All ten Anything Words seated in both meaning tables** — Change, Continue, Decrease,
   Increase, Mundane, Mysterious, Start, Stop, Strange, Extra. They convert a static noun into a
   change of state: `Stop / Signal` and `Increase / Signal` are different Threats entirely.
3. **Doubles are kept and marked, not re-rolled.** Meaning rolls now return
   `{ words, amplified }` and render as `Decrease ×2 · Signal`. Per the article, a doubled word
   is an extreme of that concept. Content tables still roll distinct — a repeated place name is
   just noise.

## What deliberately did not change

- Content tables keep their phrases. The article's rule is about interpretation, and there is
  nothing to interpret in a surname.
- The three descriptor tables stay split by category rather than merged into one meaning table.
  Rolling one from each already guarantees the rounded result the single-word rule is reaching
  for by other means.
- The book's own tables — every D6 and D66 extracted from the rulebook — are untouched. They are
  source data, not house content, and the audit has no authority over them.

## Applied but not yet exploited

- **Synonym weighting.** The article suggests repeating a concept under several synonyms to make
  it land more often. The Threat table leans this way already (`Grief`, `Guilt`, `Shame`,
  `Flashback`, `Paranoia` all pull toward internal threats, which suits a game whose whole
  advancement loop runs on Flaws), but no table has been deliberately weighted yet.
- **Neutral-word ratio.** The article recommends 30–50 targeted words and the balance neutral.
  Both meaning tables currently run heavier on targeted words than that. Worth revisiting if
  rolls start feeling repetitive in play.
