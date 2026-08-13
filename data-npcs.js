// Threats and NPCs (T-28, T-29, T-31).
// Threats have no Hope, never push, and take no death rolls — the GM decides if an
// Incapacitated Threat dies. Minor NPCs default to 3 in every attribute.

export const THREAT_RULES = {
  hasHope: false, mayPush: false, deathRolls: false,
  incapacitatedOutcome: "gmDecides"
};

// T-29 — every Threat is built from these four slots.
export const THREAT_ANATOMY = ["location", "goal", "reaction", "characteristics"];
export const THREAT_GOAL_KINDS = [
  { id: "atStop", blurb: "Aimed at the Stop and its NPCs — proceeds with or without the Travelers." },
  { id: "atTravelers", blurb: "Aimed at the Travelers — more direct, less player freedom." }
];
export const SPECIAL_ABILITIES = [
  "It can fly.",
  "Hull (Health) rating higher than normal.",
  "Armored, with an Armor Level.",
  "One or more built-in weapons, with no gear bonus.",
  "Can enter neuroscapes without a neurocaster.",
  "Controls one or several avatars inside a neuroscape.",
  "Draws on collective network intelligence, knowing things it did not observe."
];

export const THREATS = [
  { id: "lawEnforcement", name: "Law Enforcement", category: "violent",
    strength: 4, agility: 4, wits: 3, empathy: 3, health: 4,
    talents: ["pistoleer"], gear: ["handgun or shotgun", "patrol car (4WD, Powerful, Heavy)", "$100"],
    countdown: ["The Travelers are accused of a crime.", "Officers question the Travelers roughly.",
                "The officers provoke the Travelers, trying to start a fight.", "The officers try to make an arrest."] },
  { id: "secretAgent", name: "Secret Agent", category: "violent",
    strength: 4, agility: 5, wits: 3, empathy: 2, health: 5,
    talents: ["stealthy"], gear: ["handgun or assault rifle", "black van (Powerful, Fast)", "$200"],
    countdown: ["Agents follow and surveil the Travelers.", "An agent makes contact, asking for something, possibly posing as a civilian.",
                "The agents arrest or kidnap an NPC.", "The agents attack the Travelers."] },
  { id: "gangMember", name: "Gang Member", category: "violent",
    strength: 3, agility: 4, wits: 3, empathy: 3, health: 4,
    talents: ["bladeFighter"], gear: ["knife, baseball bat or handgun", "a dose of neurine", "D6 × $10"] },
  { id: "crazedKiller", name: "Crazed Killer", category: "violent",
    strength: 5, agility: 5, wits: 3, empathy: 4, health: 5,
    talents: ["bladeFighter"], gear: ["knife", "shotgun", "2WD car", "$50"],
    countdown: ["The Travelers witness the killer's work or its aftermath.", "An NPC asks for help handling the killer.",
                "The NPC is killed or kidnapped.", "One of the Travelers is attacked."] },
  { id: "cultist", name: "Cultist", category: "manipulative",
    strength: 3, agility: 4, wits: 3, empathy: 5, health: 4,
    talents: ["charmer"], gear: ["holy symbol", "knife"] },
  { id: "localStrongman", name: "Local Strongman", category: "manipulative",
    strength: 4, agility: 3, wits: 4, empathy: 5, health: 4,
    talents: ["menacing"], gear: ["handgun"] },
  { id: "businessLeader", name: "Business Leader", category: "manipulative",
    strength: 3, agility: 3, wits: 5, empathy: 4, health: 3,
    talents: ["conArtist"], gear: ["handgun"] },
  { id: "robot", name: "Robot", category: "technological", isDrone: true,
    strength: 6, agility: 4, hull: 5, armor: 6,
    weapons: [{ name: "Vice grip", damage: 2, max: "engaged" }, { name: "Taser", weapon: "taser" }],
    note: "No Wits or Empathy; no talents. Handled as a drone.",
    countdown: ["A robot starts acting strangely, off protocol.", "More robots appear and act threateningly.",
                "The robots enforce a lockdown, attacking anyone leaving.", "An NPC is revealed to be controlling the robots and orders an attack."] },
  { id: "droneGrowth", name: "Drone Growth", category: "technological", isDrone: true,
    strength: 9, agility: 6, wits: 8, empathy: 3, hull: 10, armor: 6,
    armorInNeuroscape: 0, actsInBothRealms: true,
    weapons: [{ name: "Stomp", damage: 2, max: "engaged" },
              { name: "Electric blast", damage: 2, min: "short", max: "medium" },
              { name: "Ray gun (neuroscape)", damage: 2 }] },
  { id: "system", name: "System", category: "technological", neuroscapeOnly: true,
    note: "Exists inside a neuroscape; has Wits and Empathy. Hacked or fought avatar-style.",
    countdown: ["The system makes contact or reveals itself.", "The system traps or strands the Travelers at the Stop.",
                "The system forces or manipulates someone to do its bidding.", "The system seizes control of the Stop site."] },
  { id: "environmental", name: "Environmental Threat", category: "environmental", unstatted: true,
    note: "No stats of its own — applies the Chapter 4 hazards (fire, cold, disease, falling, hunger).",
    countdown: ["The wind picks up.", "An NPC is buried by debris and needs saving.",
                "The winds threaten the lives of Travelers and NPCs.", "The disaster tears the place apart."] }
];

export const ANIMALS = [
  { id: "guardDog", name: "Guard dog", strength: 5, agility: 4, health: 9, damage: 2 }
];

export const PERSONAL_THREAT_RULES = {
  countdownSteps: 3,
  independentOfStops: true,
  principle: "Each step closes distance: heard about → makes contact → attacks.",
  mayEnd: "Either the GM or the player may declare it played out; the player then invents a new one or continues without."
};

export default { THREATS, THREAT_RULES, ANIMALS, SPECIAL_ABILITIES, PERSONAL_THREAT_RULES };
