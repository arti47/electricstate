// Published pre-made Travelers (T-32).
// Each sheet is verified against the derived formulas: Health = ceil((Str+Agi)/2),
// Hope = ceil((Wit+Emp)/2). Three of the four self-check; the fourth does not — see
// PREGEN_BLOCKED below.

export const PREGENS = [
  {
    id: "draper", name: "Cade/Courtney Draper", archetype: "artist",
    favoriteSong: "Life on Mars, David Bowie",
    strength: 3, agility: 3, wits: 4, empathy: 6,
    health: 3, hope: 5,
    talents: ["musician"],
    dream: "Take the role of rock star that is rightfully yours.",
    flaw: "You believe you're the center of the universe, even the small, shabby one you now inhabit.",
    neurocaster: "johnnyJoltTheme",
    gear: ["Gibson Les Paul guitar (musical instrument)", "Three doses of neurine"],
    blurb: "Original lead vocalist of the band Bliss, cut loose before they made it big. A neurine addict and a footnote on MTV."
  },
  {
    id: "alvarez", name: "Nancy/Pascal Alvarez", archetype: "outsider",
    favoriteSong: "Fall With Your Knife, Peter Murphy",
    strength: 2, agility: 4, wits: 6, empathy: 2,
    health: 3, hope: 4,
    talents: ["loneWolf"],
    dream: "Write \"the great American novel\".",
    flaw: "Any time someone tells you what to do, you rebel and do the opposite.",
    neurocaster: null,
    gear: ["Pack of Morley's cigarettes", "Zippo lighter from the Vietnam War", "Too many books", "Walkman"],
    blurb: "Never fit in — goth records while everyone else went to hip hop and pop. Indentured to Sentre, over the fence in a week."
  },
  {
    id: "harker", name: "Francis/Billy-Lee Harker", archetype: "veteran",
    favoriteSong: "We Gotta Get Outta This Place, The Animals",
    strength: 4, agility: 6, wits: 3, empathy: 3,
    health: 5, hope: 3,
    talents: ["hardened"],
    dream: "Lose the memories of the war.",
    flaw: "When faced with a threat, you meet it with force.",   // sheet text truncated in source
    neurocaster: "stimulusGo",
    gear: ["Combat knife"],
    blurb: "Joined the Marines at 18, fought the worst battles of the civil war. On the run from himself.",
    partial: ["flaw"]
  },
  {
    id: "carbone", name: 'Wilhemina/William "Willy" Carbone', archetype: "runawayKid",
    favoriteSong: null,
    strength: null, agility: null, wits: null, empathy: null,
    health: 4, hope: 4,
    talents: ["conArtist"],
    dream: "To belong.",
    flaw: "You're overeager. The child in you often annoys the cynical people of the world.",
    neurocaster: "juryRigged",
    gear: ["Knife", "Copy of \"If You Lived Here, You'd Be Home by Now\" by Chuck Palahniuk"],
    blurb: "Parents lost to neuro addiction; escaped the Pacifica Orphanage System at 12, on the road since. Sixteen now.",
    blocked: true
  }
];

// The Carbone sheet's attribute row extracts as 2/6/4/6, which yields Hope 5 — but the
// printed sheet shows Hope 4, so at least one value is wrong. Two-column sheet corruption,
// same class of defect as the stat tables. Needs the pregen sheet page image.
export const PREGEN_BLOCKED = {
  id: "carbone",
  reason: "Attribute row fails the Hope formula check (extracted 2/6/4/6 → Hope 5, sheet prints 4).",
  needs: "Pre-made character sheet page for Willy Carbone."
};

export default { PREGENS, PREGEN_BLOCKED };
