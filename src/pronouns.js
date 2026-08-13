// Who the app is talking about, and what to call them.
//
// A play aid narrates constantly — "he loses his next turn", "she stays on her feet" — and
// a Traveler at the table is a specific person, not an abstraction. So every character,
// pregen, NPC and Threat carries a gender, and every sentence that needs a pronoun asks
// here rather than reaching for a plural.
//
// Verb agreement travels with the pronoun: third-person singular. Write `${subj(ch)} rolls`,
// never `${subj(ch)} roll`.

export const GENDERS = [
  { id: "male", label: "Man" },
  { id: "female", label: "Woman" }
];

const SETS = {
  male: { subject: "he", object: "him", possessive: "his", independent: "his", reflexive: "himself" },
  female: { subject: "she", object: "her", possessive: "her", independent: "hers", reflexive: "herself" },
  // Not offered for a Traveler — a Drone Pilot is a person flying a machine. This is for
  // the machines themselves: robots, drone growths, a vehicle in a chase.
  neuter: { subject: "it", object: "it", possessive: "its", independent: "its", reflexive: "itself" }
};

export const DEFAULT_GENDER = "male";

/** Accepts a character, a combatant, an NPC, or a bare gender string. */
export function genderOf(who) {
  const raw = typeof who === "string" ? who : who?.gender;
  return SETS[raw] ? raw : DEFAULT_GENDER;
}

export const pronouns = (who) => SETS[genderOf(who)];

export const subj = (who) => pronouns(who).subject;         // he / she
export const obj = (who) => pronouns(who).object;           // him / her
export const poss = (who) => pronouns(who).possessive;      // his / her
export const indep = (who) => pronouns(who).independent;    // his / hers
export const refl = (who) => pronouns(who).reflexive;       // himself / herself

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const Subj = (who) => cap(subj(who));
export const Obj = (who) => cap(obj(who));
export const Poss = (who) => cap(poss(who));

/** The label for a gender, for a picker or a sheet line. */
export const genderLabel = (who) =>
  (GENDERS.find((g) => g.id === genderOf(who)) || { label: "Machine" }).label;

/**
 * Words for someone the app may not know yet — no combatant selected, no NPC generated.
 * Both branches are third-person singular, so the verb after them never has to change.
 *
 *   const t = refer(target, "the target");
 *   `${t.S} rolls Strength. No 6 and ${t.s} loses ${t.p} next turn.`
 */
export function refer(who, fallback = "the target") {
  if (!who) {
    return {
      s: fallback, o: fallback, p: `${fallback}'s`, r: fallback,
      S: cap(fallback), O: cap(fallback), P: cap(`${fallback}'s`)
    };
  }
  return {
    s: subj(who), o: obj(who), p: poss(who), r: refl(who),
    S: Subj(who), O: Obj(who), P: Poss(who)
  };
}

/** A rolled gender for someone the tables invent: an NPC, a Threat, a stranger. */
export function rollGender(randomInt) {
  return randomInt(2) === 0 ? "male" : "female";
}

/**
 * The house name tables are printed as "Cade/Courtney" — the book's own convention for a
 * pre-made character that either half of the table can play. Take the half that matches.
 */
export function splitPairedName(paired, who) {
  const halves = String(paired).split("/");
  if (halves.length < 2) return String(paired).trim();
  return (genderOf(who) === "female" ? halves[1] : halves[0]).trim();
}

/** The same, over a whole "Cade/Courtney Draper" — only the paired token is split. */
export function resolvePairedName(name, who) {
  return String(name)
    .split(" ")
    .map((token) => (token.includes("/") ? splitPairedName(token, who) : token))
    .join(" ")
    .trim();
}
