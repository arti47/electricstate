// Electric State Player — core rules library.
// Every value here is extracted from the supplied source material.
// Citations: p.NN = printed page; T-NN = Data Extraction Ledger item in docs/app/ROADMAP.md.
// Never hardcode a rules number in src/ — add it here instead.

export const META = {
  game: "The Electric State Roleplaying Game",
  publisher: "Free League / Fria Ligan AB",
  edition: "2024",
  note: "Personal play aid built from the owner's own book. Rules values only; no setting or scenario text."
};

// ---------------------------------------------------------------- T-05 time
export const TIME_UNITS = [
  { id: "round", label: "Round", duration: "5–10 seconds", use: "Combat" },
  { id: "stretch", label: "Stretch", duration: "5–10 minutes", use: "Neurocasting" },
  { id: "shift", label: "Shift", duration: "5–10 hours", use: "Travel and rest" }
];
export const SHIFTS_PER_DAY = 4;
export const SHIFT_NAMES = ["Morning", "Day", "Evening", "Night"];

// ------------------------------------------------------------- T-01 attributes
export const ATTRIBUTES = [
  { id: "strength", label: "Strength", blurb: "Toughness, close combat, endurance." },
  { id: "agility", label: "Agility", blurb: "Coordination, stealth, ranged combat, driving." },
  { id: "wits", label: "Wits", blurb: "Intellect, awareness, education, neurocasting." },
  { id: "empathy", label: "Empathy", blurb: "Reading people, persuasion, charm, rallying." }
];
export const ATTRIBUTE_MIN = 2;
export const ATTRIBUTE_MAX = 6;
export const POINT_BUY_TOTAL = 16;          // p.52 alternative method
export const BONUS_TALENT_THRESHOLD = 15;   // total <= 15 grants a second talent

// --------------------------------------------------------------- T-02 derived
// Health = ceil((Str + Agi) / 2); Hope = ceil((Wit + Emp) / 2). p.54–55
export const DERIVED = {
  health: { from: ["strength", "agility"], talentBonus: { tough: 2 } },
  hope: { from: ["wits", "empathy"], talentBonus: { dreamer: 2 } }
};

// ------------------------------------------------------------- T-06 push rules
export const PUSH = {
  rerollExcludes: [1, 6],
  baseOneCost: { resource: "hope", amount: 1 },
  gearOneCost: { resource: "gearBonus", amount: 1 },
  bustedAt: 0,
  npcsMayPush: false,
  unpushable: ["deathRoll", "initiative", "blastPower", "fireIntensity", "diseaseVirulence"]
};

// ------------------------------------------------------------ T-09 zones/range
export const RANGES = [
  { id: "engaged", label: "Engaged", band: 0, blurb: "In your face" },
  { id: "short", label: "Short", band: 1, blurb: "Same zone" },
  { id: "medium", label: "Medium", band: 2, blurb: "Adjacent zone" },
  { id: "long", label: "Long", band: 3, blurb: "Up to four zones away" },
  { id: "extreme", label: "Extreme", band: 4, blurb: "Further away" }
];
export const BELOW_MIN_RANGE_PENALTY = -2; // per band below a weapon's minimum

// --------------------------------------------------------------- T-03 talents
// effect.kind: "dice" (bonus dice in a situation) | "stat" (alters a derived max)
// | "rule" (changes engine behaviour — must be implemented, not just displayed)
export const TALENTS = [
  { id: "athlete", name: "Athlete", effect: { kind: "dice", bonus: 2, attr: "agility", when: "jumping, climbing, running" } },
  { id: "backstabber", name: "Backstabber", effect: { kind: "dice", bonus: 2, attr: "agility", when: "setting up an ambush" } },
  { id: "biker", name: "Biker", effect: { kind: "dice", bonus: 2, attr: "agility", when: "driving a two-wheeled vehicle" } },
  { id: "bladeFighter", name: "Blade fighter", aliases: ["Knifeman"], effect: { kind: "dice", bonus: 2, when: "close combat with a sharp melee weapon" } },
  { id: "boatman", name: "Boatman", effect: { kind: "dice", bonus: 2, attr: "agility", when: "maneuvering a boat" } },
  { id: "bomber", name: "Bomber", effect: { kind: "dice", bonus: 2, when: "using explosive weapons" } },
  { id: "bowman", name: "Bowman", effect: { kind: "dice", bonus: 2, when: "firing a bow or crossbow" } },
  { id: "charmer", name: "Charmer", effect: { kind: "dice", bonus: 2, attr: "empathy", when: "making an NPC like you" } },
  { id: "clubFighter", name: "Club fighter", effect: { kind: "dice", bonus: 2, when: "close combat with a blunt melee weapon" } },
  { id: "conArtist", name: "Con artist", effect: { kind: "dice", bonus: 2, attr: "empathy", when: "bluffing or lying to an NPC" } },
  { id: "dataMiner", name: "Data miner", effect: { kind: "dice", bonus: 2, when: "using a neurocaster to find information" } },
  { id: "dirtyFighter", name: "Dirty fighter", effect: { kind: "rule", rule: "unarmedDamage", value: 2 } },
  { id: "dramaQueen", name: "Drama queen", effect: { kind: "rule", rule: "tensionBonusMultiplier", value: 2 } },
  { id: "dreamer", name: "Dreamer", effect: { kind: "stat", stat: "hopeMax", value: 2 } },
  { id: "driver", name: "Driver", effect: { kind: "dice", bonus: 2, attr: "agility", when: "driving a car or truck" } },
  { id: "droneOperator", name: "Drone operator", effect: { kind: "dice", bonus: 2, when: "controlling a drone" } },
  { id: "electronics", name: "Electronics", effect: { kind: "dice", bonus: 2, attr: "wits", when: "manipulating or repairing electronics, including neurocasters" } },
  { id: "evasive", name: "Evasive", effect: { kind: "dice", bonus: 2, attr: "agility", when: "dodging ranged attacks" } },
  { id: "gamer", name: "Gamer", effect: { kind: "dice", bonus: 2, when: "interacting with avatars in a neuroscape" } },
  { id: "hacker", name: "Hacker", effect: { kind: "dice", bonus: 2, when: "hacking a system" } },
  { id: "hardened", name: "Hardened", effect: { kind: "dice", bonus: 2, when: "resisting traumatic events" } },
  { id: "intuition", name: "Intuition", effect: { kind: "rule", rule: "askGmOncePerSession" } },
  { id: "leader", name: "Leader", effect: { kind: "dice", bonus: 2, attr: "empathy", when: "rallying the Incapacitated or someone in Breakdown" } },
  { id: "loneWolf", name: "Lone wolf", effect: { kind: "rule", rule: "reduceTensionAlone" } },
  { id: "machinegunner", name: "Machinegunner", effect: { kind: "dice", bonus: 2, when: "using fully automatic fire" } },
  { id: "martialArtist", name: "Martial artist", effect: { kind: "dice", bonus: 2, when: "close combat unarmed" } },
  { id: "mechanic", name: "Mechanic", effect: { kind: "dice", bonus: 2, attr: "wits", when: "repairing vehicles and mechanical devices" } },
  { id: "medic", name: "Medic", effect: { kind: "rule", rule: "stabilize", attr: "wits" } },
  { id: "menacing", name: "Menacing", effect: { kind: "rule", rule: "substituteAttribute", from: "empathy", to: "strength", bonus: 2, when: "threatening someone" } },
  { id: "musician", name: "Musician", effect: { kind: "dice", bonus: 2, attr: "empathy", when: "playing an instrument for a Stretch, against that audience" } },
  { id: "neuroresistant", name: "Neuroresistant", effect: { kind: "rule", rule: "blissEscapeRoll", attr: "wits" } },
  { id: "nineLives", name: "Nine lives", effect: { kind: "rule", rule: "deathRollDice", value: 6 } },
  { id: "nurse", name: "Nurse", effect: { kind: "rule", rule: "healRate", value: 2, capacity: "wits" } },
  { id: "pilot", name: "Pilot", effect: { kind: "dice", bonus: 2, attr: "agility", when: "piloting an aircraft" } },
  { id: "pistoleer", name: "Pistoleer", effect: { kind: "dice", bonus: 2, when: "firing a pistol or revolver" } },
  { id: "resilient", name: "Resilient", effect: { kind: "dice", bonus: 2, attr: "strength", when: "resisting hunger and disease" } },
  { id: "rider", name: "Rider", effect: { kind: "dice", bonus: 2, attr: "agility", when: "riding an animal" } },
  { id: "scout", name: "Scout", effect: { kind: "dice", bonus: 2, attr: "wits", when: "spotting approaching threats" } },
  { id: "sleuth", name: "Sleuth", effect: { kind: "dice", bonus: 2, attr: "wits", when: "searching an area for clues" } },
  { id: "sniper", name: "Sniper", effect: { kind: "dice", bonus: 2, when: "firing a rifle at Long range or more, except full auto" } },
  { id: "speaker", name: "Speaker", effect: { kind: "dice", bonus: 2, attr: "empathy", when: "swaying a group of NPCs" } },
  { id: "stealthy", name: "Stealthy", effect: { kind: "dice", bonus: 2, attr: "agility", when: "staying hidden (not ambushes)" } },
  { id: "surgeon", name: "Surgeon", effect: { kind: "rule", rule: "surgery", attr: "wits" } },
  { id: "technoBabbler", name: "Techno babbler", effect: { kind: "rule", rule: "substituteAttribute", from: "empathy", to: "wits", when: "convincing someone of complex technical matters" } },
  { id: "thief", name: "Thief", effect: { kind: "dice", bonus: 2, when: "breaking locks or hotwiring cars" } },
  { id: "tough", name: "Tough", effect: { kind: "stat", stat: "healthMax", value: 2 } }
];

// ------------------------------------------------------------ T-04 archetypes
// Each D6 table is [1-2, 3-4, 5-6]. cash: {mult, dice} → mult × dice roll.
export const ARCHETYPES = [
  {
    id: "artist", name: "Artist", key: "empathy", cash: { mult: 100, dice: "d6" },
    talents: ["charmer", "dramaQueen", "musician"],
    dreams: ["Find someone as important to me as my art.", "Turn the trauma of America into something beautiful.", "Get the recognition and accolades I deserve."],
    flaws: ["You put on a show to hide your inner fears.", "You're bitter about not being more successful.", "You always want to be the center of attention."],
    neurocasters: ["stimulusGo", "johnnyJoltTheme", "juryRigged"],
    items: ["Musical instrument", "Dog (pet)", "Pack of cigarettes"]
  },
  {
    id: "criminal", name: "Criminal", key: "strength", cash: { mult: 10, dice: "2d6" },
    talents: ["bladeFighter", "menacing", "thief"],
    dreams: ["Make amends for what I've done.", "Get the respect I'm owed.", "Buy a new motorcycle and ride out."],
    flaws: ["You scare others away.", "You react to problems with violence.", "You steal everything valuable you see."],
    neurocasters: ["stimulusGo", "juryRigged", null],
    items: ["Pistol", "Knife", "Dog (guard)"]
  },
  {
    id: "devotee", name: "Devotee", key: "empathy", cash: { mult: 100, dice: "d6" },
    talents: ["dreamer", "leader", "speaker"],
    dreams: ["Make them see the light.", "Stop the pain.", "Drive out the demons."],
    flaws: ["You must convert everyone you meet.", "You expect obedience.", "You care for nothing but the message."],
    neurocasters: ["stimulusTleStandard", "stimulusGo", null],
    items: ["Shades", "Book (religious)", "Neurine (D6 doses)"]
  },
  {
    id: "doctor", name: "Doctor", key: "empathy", cash: { mult: 100, dice: "2d6" },
    talents: ["medic", "nurse", "surgeon"],
    dreams: ["Bring forth goodness in a rotten world.", "Heal others, and myself.", "Find a cure for neuro addiction."],
    flaws: ["You're haunted by the patients you lost.", "You diagnose everyone you meet.", "You have a neurine habit."],
    neurocasters: ["stimulusTleStandard", "stimulusTlePro", "stimulusGo"],
    items: ["First aid kit", "Pack of cigarettes", "Surgical instruments"]
  },
  {
    id: "dronePilot", name: "Drone Pilot", key: "wits", cash: null,
    talents: ["droneOperator", "gamer", "hacker"],
    dreams: ["Return to my body.", "Create a better world.", "Let go of my human body."],
    flaws: ["You don't value your drone body and take huge risks with it.", "You think you're better than flesh people.", "You feel safe in your drone body and never want to leave it."],
    neurocasters: ["stimulusTleStandard", "johnnyJoltTheme", "stimulusTlePro"],
    items: null,
    // A14 — this archetype rewrites four core economies. p.70
    special: {
      isDrone: true,
      damageModel: "hull",      // takes damage as a drone, not as a human
      noGear: true,
      noCash: true,
      needsFood: false,
      needsSleep: true,
      tracksBliss: false,
      neuroscapeAccess: "globalOnly"
    }
  },
  {
    id: "investigator", name: "Investigator", key: "wits", cash: { mult: 100, dice: "d6" },
    talents: ["dataMiner", "scout", "sleuth"],
    dreams: ["Find a stable place to stand.", "Be proven wrong about how foul people are.", "Solve the unsolvable one."],
    flaws: ["You see the worst in everyone.", "You have a drinking habit.", "Your guilt makes you take stupid risks."],
    neurocasters: ["stimulusTleStandard", "stimulusTlePro", "stimulusGo"],
    items: ["Binoculars", "Handgun", "Walkie-talkies"]
  },
  {
    id: "outsider", name: "Outsider", key: "agility", cash: { mult: 10, dice: "d6" },
    talents: ["loneWolf", "stealthy", "tough"],
    dreams: ["Find one true friend.", "Burn out the corruption.", "Get a normal life."],
    flaws: ["You don't trust anyone.", "You always keep moving.", "You always do the opposite of what's asked."],
    neurocasters: [null, null, null],
    items: ["Bottle of alcohol", "Knife", "Dog (pet)"]
  },
  {
    id: "runawayKid", name: "Runaway Kid", key: "agility", cash: { mult: 10, dice: "d6" },
    talents: ["dirtyFighter", "dreamer", "evasive"],
    dreams: ["Find a new home.", "Find out who I really am.", "Become the parent I never had."],
    flaws: ["You run when threatened.", "You can't trust adults.", "You keep looking for a new parent."],
    neurocasters: ["stimulusGo", "juryRigged", null],
    items: ["Knife", "Pack of chewing gum", "Walkman"]
  },
  {
    id: "scientist", name: "Scientist", key: "wits", cash: { mult: 100, dice: "2d6" },
    talents: ["electronics", "mechanic", "technoBabbler"],
    dreams: ["Cure what's wrong with the world.", "Get the recognition my work deserves.", "Understand human nature."],
    flaws: ["You're buried in books and can't connect with people.", "You study everything, including your friends.", "Your work is all that matters."],
    neurocasters: ["stimulusTleStandard", "stimulusTlePro", "stimulusGo"],
    items: ["Book (non-fiction)", "D6 cans of food", "Tools (general)"]
  },
  {
    id: "veteran", name: "Veteran", key: "strength", cash: { mult: 10, dice: "2d6" },
    talents: ["machinegunner", "pistoleer", "sniper"],
    dreams: ["Leave the war behind me.", "Start the kind of family I felt with fellow soldiers during the war.", "Turn my guilt into something positive."],
    flaws: ["You're haunted by flashbacks from the war.", "You always react with violence to threats.", "You have no hope for this world or the people in it."],
    neurocasters: ["stimulusTleStandard", "stimulusGo", null],
    items: ["Handgun", "Pack of cigarettes", "Sleeping bag"]
  }
];

// ------------------------------------------------------------- T-12 weapons p.81
// gearBonusSource: "fixed" | "neurocasterNetwork" (the neodymium cannon)
// special: "stun" (taser — no damage; Strength roll at -2 dice or lose next turn)
export const WEAPONS = [
  { id: "unarmed", name: "Unarmed", bonus: 0, damage: 1, min: "engaged", max: "engaged", price: null, unarmed: true },
  { id: "improvisedClub", name: "Improvised club", bonus: 1, damage: 1, min: "engaged", max: "engaged", price: null, melee: "blunt" },
  { id: "knife", name: "Knife", bonus: 1, damage: 2, min: "engaged", max: "engaged", price: 25, melee: "sharp" },
  { id: "baseballBat", name: "Baseball bat", bonus: 2, damage: 1, min: "engaged", max: "engaged", price: 50, melee: "blunt" },
  { id: "axe", name: "Axe", bonus: 2, damage: 2, min: "engaged", max: "engaged", price: 100, melee: "sharp" },
  { id: "chainsaw", name: "Chainsaw", bonus: 1, damage: 3, min: "engaged", max: "engaged", price: 250, melee: "sharp" },
  { id: "rock", name: "Rock", bonus: 0, damage: 1, min: "engaged", max: "medium", price: null },
  { id: "taser", name: "Taser", bonus: 3, damage: null, min: "engaged", max: "short", price: 500, special: "stun" },
  { id: "derringer", name: "Derringer", bonus: 2, damage: 2, min: "engaged", max: "short", price: 250, firearm: "pistol" },
  { id: "handgun", name: "Handgun", bonus: 2, damage: 2, min: "short", max: "medium", price: 300, firearm: "pistol" },
  { id: "magnumRevolver", name: "Magnum revolver", bonus: 2, damage: 3, min: "short", max: "medium", price: 400, firearm: "pistol" },
  { id: "crossbow", name: "Crossbow", bonus: 2, damage: 1, min: "medium", max: "long", price: 150, firearm: "bow", singleShot: true },
  { id: "huntingRifle", name: "Hunting rifle", bonus: 2, damage: 2, min: "medium", max: "long", price: 500, firearm: "rifle" },
  { id: "shotgun", name: "Shotgun", bonus: 3, damage: 2, min: "short", max: "medium", price: 350, firearm: "shotgun" },
  { id: "sniperRifle", name: "Sniper rifle", bonus: 2, damage: 2, min: "medium", max: "extreme", price: null, firearm: "rifle", notCommercial: true },
  { id: "submachinegun", name: "Submachinegun", bonus: 2, damage: 2, min: "short", max: "medium", price: null, fullAuto: true, notCommercial: true },
  { id: "assaultRifle", name: "Assault rifle", bonus: 3, damage: 2, min: "short", max: "long", price: null, fullAuto: true, notCommercial: true },
  { id: "heavyMachinegun", name: "Heavy machinegun", bonus: 3, damage: 3, min: "short", max: "long", price: null, fullAuto: true, notCommercial: true },
  { id: "neodymiumCannon", name: "Neodymium cannon", bonus: null, gearBonusSource: "neurocasterNetwork", damage: 4, min: "medium", max: "long", price: null, fullAuto: true, notCommercial: true },
  { id: "molotov", name: "Molotov cocktail", bonus: 0, blastPower: 6, min: "engaged", max: "medium", price: null, explosive: true },
  { id: "handGrenade", name: "Hand grenade", bonus: 0, blastPower: 8, min: "engaged", max: "medium", price: null, explosive: true },
  { id: "mortar", name: "Mortar", bonus: 2, blastPower: 12, min: "medium", max: "extreme", price: null, explosive: true, notCommercial: true }
];
export const TASER_RULE = { attr: "strength", modifier: -2, onFail: "loseNextTurn" };
export const FULL_AUTO_MAX_BURSTS = 3;

// -------------------------------------------------------- T-11 armor and cover
export const BODY_ARMOR = [
  { id: "softVest", name: "Soft vest", armor: 2, agility: -1, price: 150 },
  { id: "plateVest", name: "Plate vest", armor: 4, agility: -2, price: 300 },
  { id: "riotGear", name: "Riot gear", armor: 6, agility: -3, price: 500 }
];
export const COVER = [
  { id: "shrubbery", name: "Shrubbery", armor: 2 },
  { id: "furniture", name: "Furniture", armor: 3 },
  { id: "carDoor", name: "Car door", armor: 4 },
  { id: "brickWall", name: "Brick wall", armor: 6 },
  { id: "sandbag", name: "Sandbag", armor: 8 }
];

// ------------------------------------------------- T-14 damage, death, healing
export const DEATH = {
  rollDice: 4,
  successesToStabilize: 3,
  failuresToDie: 3,
  pushable: false,
  instantKillMultiplier: 2,     // damage >= 2x max Health in one hit
  selfRallyAfter: "stretch",
  selfRallyHealth: 1,
  neuroscape: { deathRolls: false, autoRallyAfter: "stretch", health: 1, rollsTraumaInstead: true }
};
export const RECOVERY = {
  healthPerShift: 1,
  healthPerShiftWithNurse: 2,
  blockedBy: ["disease", "hunger", "cold"],
  hopeFromGearPerShift: 1,      // global ceiling, on top of per-item cadence
  hopeBlockedBy: ["hunger", "sleepDeprived"],
  breakdownSelfRallyAfter: "shift",
  breakdownSelfRallyHope: 1,
  traumaRecoveryInterval: "week"
};

// ------------------------------------------------------ T-16 traumatic events
export const TRAUMATIC_EVENTS = [
  { event: "Watching a friend be Incapacitated or killed by physical damage", hope: 1 },
  { event: "Being attacked by something horrible", hope: 1 },
  { event: "Realizing you are contaminated by something terrible", hope: 2 },
  { event: "Seeing mutilated corpses", hope: 2 },
  { event: "Being cornered by your worst fear", hope: 3 },
  { event: "Being tortured", hope: 3 }
];
export const TRAUMA_RESIST = { attr: "empathy", eachSuccessReduces: 1, freezeOnLoss: true };

// -------------------------------------------------------------- T-18 hazards
export const EXPLOSIVES = [
  { name: "Molotov cocktail", blastPower: 6 },
  { name: "Hand grenade", blastPower: 8 },
  { name: "Rocket launcher", blastPower: 10 },
  { name: "Mortar", blastPower: 12 },
  { name: "Howitzer", blastPower: 14 }
];
export const FIRES = [
  { name: "Torch", intensity: 4 },
  { name: "Burning furniture", intensity: 6 },
  { name: "Burning room", intensity: 8 }
];
export const FIRE_SPREAD_PER_ROUND = 2;
export const DISEASES = [
  { name: "Flu", virulence: 4 },
  { name: "Pneumonia", virulence: 6 },
  { name: "Ebola", virulence: 10 }
];
export const HAZARD_RULES = {
  cold: { attr: "strength", interval: "shift", extremeInterval: "stretch", damage: 1, blocksHealing: true },
  hunger: { attr: "strength", interval: "day", damage: 1, blocksRecovery: ["health", "hope"] },
  sleep: { shiftsBeforeDeprived: 4, attr: "wits", interval: "shift", onFail: "sleepOneShift", blocksRecovery: ["hope"] },
  falling: { damagePerMetre: 0.5, round: "down", mitigate: { attr: "agility", eachSuccessReduces: 1 } },
  disease: { attr: "strength", opposed: true, interval: "day", blocksHealing: true }
};

// ------------------------------------------------------- T-19 neurocasters p.92
export const NEUROCASTERS = [
  { id: "stimulusTleStandard", name: "Stimulus TLE Standard", processor: 2, network: 2, graphics: 2, price: 700 },
  { id: "stimulusGo", name: "Stimulus GO", processor: 2, network: 2, graphics: 1, price: 600, realWorldPenalty: -1 },
  { id: "johnnyJoltTheme", name: "Johnny Jolt Theme", processor: 1, network: 2, graphics: 3, price: 500 },
  { id: "stimulusTlePro", name: "Stimulus TLE-PRO", processor: 3, network: 3, graphics: 3, price: 1300 },
  { id: "juryRigged", name: "Jury-Rigged", processor: 1, network: 1, graphics: 1, price: null }
];
export const NEUROCASTER_DEFAULT_PENALTY = -2;  // to real-world actions while worn
export const WIRED_BONUS = 2;

// --------------------------------------------------------- T-20 neurocasting
export const BLISS = {
  perFailedRoll: 1,               // assessed before pushing; not refunded by a successful push
  lostWhen: "bliss >= currentHope",
  forcedRemoval: { hopeToZero: true, rollsTrauma: true },
  decayPerDayOffcast: 1,
  permanenceRoll: { die: 6, permanentOn: [1] },
  resistExperience: { attr: "wits", eachSuccessReduces: 1 }
};
export const NEURO_TASKS = {
  findInformation: { attr: "wits", gear: "processor", talent: "dataMiner", perRoll: "stretch", failureEscalatesTo: "shift" },
  hackSystem: { attr: "wits", gear: "network", talent: "hacker", perRoll: "stretch", controlModifier: 1, extendToShiftModifier: 1 },
  avatarSocial: { attr: "empathy", gear: "graphics", talent: "gamer", opposedBy: { attr: "wits", gear: "network" } },
  avatarCombat: { attr: "wits", gear: "graphics", talent: "gamer", range: "engaged" },
  avatarManipulation: { attr: "empathy", successesRequired: [2, 4], perRoll: "shift" }
};
export const INFO_DIFFICULTY = [
  { what: "City maps or blueprints", difficulty: 1 },
  { what: "Common knowledge about a person or location", difficulty: 1 },
  { what: "Security information about a building", difficulty: 2 },
  { what: "Sensitive information about an individual", difficulty: 2 },
  { what: "Classified military information", difficulty: 3 },
  { what: "Who or what controls the neuroscape", difficulty: 3 }
];
export const HACK_DIFFICULTY = [
  { what: "Consumer security system", difficulty: 1 },
  { what: "Consumer drone or robot", difficulty: 1 },
  { what: "Advanced security system", difficulty: 2 },
  { what: "Police drone", difficulty: 2 },
  { what: "Local neuroscape", difficulty: 2 },
  { what: "Military-grade security system", difficulty: 3 },
  { what: "Military drone", difficulty: 3 },
  { what: "Global neuroscape", difficulty: 3 }
];

// ------------------------------------------------------------- T-21 drones p.99
export const DRONES = [
  { id: "kidKosmo", name: 'Kids Drone "Kid Kosmo"', strength: 3, agility: 5, hull: 8, armor: 2, damage: 1, min: "engaged", max: "engaged", price: 650 },
  { id: "wallyWayne", name: 'Classic Gaming Drone "Wally Wayne"', strength: 4, agility: 5, hull: 9, armor: 2, damage: 1, min: "short", max: "medium", price: 850 },
  { id: "civilianFlyer", name: "Civilian Flyer Drone", strength: 3, agility: 6, hull: 9, armor: 2, damage: 1, min: "short", max: "medium", price: 1200, flight: true },
  { id: "johnnyJolt", name: 'Battle Gaming Drone "Johnny Jolt"', strength: 5, agility: 4, hull: 9, armor: 3, damage: 2, min: "short", max: "medium", price: 950 },
  { id: "eliteTrooper", name: "Elite Trooper Gaming Drone", strength: 5, agility: 6, hull: 11, armor: 4, damage: 2, min: "short", max: "long", price: 1150 },
  { id: "droneJuryRigged", name: "Jury-Rigged", strength: 3, agility: 3, hull: 6, armor: 1, damage: 1, min: "engaged", max: "short", price: null }
];

// ----------------------------------------------------------- T-22 vehicles p.101
export const VEHICLES = [
  { id: "horse", name: "Horse", passengers: 1, maneuverability: null, speed: 2, hull: 3, armor: 0, price: 1000, note: "When riding, use the horse's Agility (typically 6) instead of your own." },
  { id: "wagon", name: "Wagon", passengers: 4, maneuverability: 1, speed: 2, hull: 6, armor: 2, price: 200 },
  { id: "bicycle", name: "Bicycle", passengers: 0, maneuverability: 1, speed: 2, hull: 3, armor: 0, price: 300 },
  { id: "motorcycle", name: "Motorcycle", passengers: 1, maneuverability: 2, speed: 3, hull: 4, armor: 2, price: 5000 },
  { id: "dirtBike", name: "Dirt bike", passengers: 0, maneuverability: 3, speed: 2, hull: 3, armor: 0, price: 3000 },
  { id: "car2wd", name: "2WD Car", passengers: 4, maneuverability: 2, speed: 3, hull: 6, armor: 4, price: 10000 },
  { id: "car4wd", name: "4WD Car", passengers: 4, maneuverability: 3, speed: 2, hull: 6, armor: 4, price: 15000 },
  { id: "pickup", name: "Pickup Truck", passengers: 5, maneuverability: 2, speed: 2, hull: 8, armor: 4, price: 20000 },
  { id: "van", name: "Van", passengers: 7, maneuverability: 2, speed: 2, hull: 8, armor: 4, price: 25000 },
  { id: "lightTruck", name: "Light Truck", passengers: 14, maneuverability: 1, speed: 2, hull: 12, armor: 4, price: 30000 },
  { id: "heavyTruck", name: "Heavy Truck", passengers: 16, maneuverability: 1, speed: 2, hull: 14, armor: 4, price: 50000 },
  { id: "bus", name: "Bus", passengers: 50, maneuverability: 1, speed: 2, hull: 12, armor: 4, price: 40000 },
  { id: "rowboat", name: "Rowboat", passengers: 4, maneuverability: 1, speed: 1, hull: 5, armor: 2, price: 500 },
  { id: "sailingBoat", name: "Small Sailing Boat", passengers: 7, maneuverability: 1, speed: 2, hull: 6, armor: 2, price: 5000 },
  { id: "motorboat", name: "Small Motorboat", passengers: 7, maneuverability: 2, speed: 3, hull: 5, armor: 2, price: 12000 },
  { id: "helicopter", name: "Helicopter", passengers: 4, maneuverability: 3, speed: 4, hull: 6, armor: 3, price: 200000, rarity: "veryRare" },
  { id: "lightAirplane", name: "Light airplane", passengers: 3, maneuverability: 2, speed: 4, hull: 5, armor: 3, price: 100000, rarity: "veryRare" },
  { id: "commercialDroneShip", name: "Small commercial drone ship", passengers: 10, maneuverability: 2, speed: 4, hull: 9, armor: 3, price: 200000, rarity: "veryRare" },
  { id: "militaryDroneShip", name: "Military drone ship", passengers: null, maneuverability: 3, speed: 5, hull: 12, armor: 8, price: null, rarity: "notCommercial" }
];
export const VEHICLE_TRAITS = [
  { range: [11, 13], id: "fast", name: "Fast", effect: { speed: 1 } },
  { range: [14, 16], id: "roomy", name: "Roomy", effect: { passengers: 2 } },
  { range: [21, 23], id: "reliable", name: "Reliable", effect: { repairDice: 2 } },
  { range: [24, 26], id: "slow", name: "Slow", effect: { speed: -1 }, rerollIf: "speed==1" },
  { range: [31, 33], id: "heavy", name: "Heavy", effect: { hull: 1 } },
  { range: [34, 36], id: "powerful", name: "Powerful", effect: { maneuverability: 1 } },
  { range: [41, 43], id: "luxury", name: "Luxury model", effect: { cost: 1 } },
  { range: [44, 46], id: "boneshaker", name: "Boneshaker", effect: { cost: -1, maneuverability: -1 } },
  { range: [51, 53], id: "lightFrame", name: "Light frame", effect: { armor: -1 } },
  { range: [54, 56], id: "cheapModel", name: "Cheap model", effect: { hull: -1 } },
  { range: [61, 63], id: "loud", name: "Loud", effect: { note: "Attracts attention" } },
  { range: [64, 66], id: "customPaint", name: "Custom paintjob", effect: { note: "Stands out" } }
];
export const FUEL = { tankGallons: 20, milesPerGallon: 20, startingFraction: 0.5 };

export default {
  META, TIME_UNITS, ATTRIBUTES, TALENTS, ARCHETYPES, WEAPONS, BODY_ARMOR, COVER,
  DEATH, RECOVERY, NEUROCASTERS, BLISS, NEURO_TASKS, DRONES, VEHICLES, FUEL
};
