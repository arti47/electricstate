// Solo play — official Chapter 8 tables only (T-33..T-36, T-48..T-50).
// The deck is the pacing timer: do not reshuffle until it is exhausted.

export const SOLO_PRINCIPLES = [
  "Draw a card whenever you need input or momentum.",
  "Use the tables to spur imagination, not constrain it.",
  "Find connections between generated elements.",
  "Play one Traveler at a time; the mechanics run the rest.",
  "When in doubt, go weird."
];

export const SUITS = ["spades", "hearts", "diamonds", "clubs"];
export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const FACE_RANKS = ["J", "Q", "K"];

// T-33 — face cards fire events; suit picks the type.
export const EVENT_TRIGGERS = {
  spades: { id: "personalThreat", label: "Personal Threat Countdown event" },
  clubs: { id: "stopCountdown", label: "Stop Countdown event" },
  hearts: { id: "travelerEvent", label: "Traveler event" },
  diamonds: { id: "conversation", label: "Conversation" }
};

// T-34 — valence by suit, degree by rank.
export const TILT = {
  bad: ["clubs", "spades"],
  good: ["hearts", "diamonds"],
  degrees: [
    { ranks: ["2", "3"], degree: "Low" },
    { ranks: ["4", "5", "6"], degree: "Medium" },
    { ranks: ["7", "8", "9"], degree: "High" },
    { ranks: ["10", "J", "Q", "K", "A"], degree: "Extreme" }
  ]
};

export const PERSONAL_THREAT_COUNTDOWN = [
  { step: 1, event: "The personal Threat appears." },
  { step: 2, event: "The conflict with the Threat escalates or is tilted somehow." },
  { step: 3, event: "The conflict reaches its climax and is resolved." }
];

// T-50 — note the printed ranges stop at 56; 61–66 are unassigned (ruling A13: re-roll).
export const STOP_THREAT_COUNTDOWN = [
  { range: [11, 12], event: "Tactics change." },
  { range: [13, 14], event: "Someone is captured." },
  { range: [15, 16], event: "Something is sabotaged." },
  { range: [21, 23], event: "Someone pleads for help." },
  { range: [24, 25], event: "An accusation is made." },
  { range: [26, 32], event: "Victims appear." },
  { range: [33, 34], event: "Travelers or NPCs are threatened." },
  { range: [35, 36], event: "The Threat shows itself." },
  { range: [41, 42], event: "The Threat attacks the Travelers or NPCs." },
  { range: [43, 46], event: "The Threat gathers forces." },
  { range: [51, 52], event: "A location is seized." },
  { range: [53, 54], event: "Lies are spread, by the Threat or about it." },
  { range: [55, 56], event: "A deal is offered." }
];
export const STOP_COUNTDOWN_UNASSIGNED = { from: 61, to: 66, houseRule: "reroll" };

// T-48 — threat generation
export const THREAT_TYPES = [
  { d6: 1, type: "Violent", aliases: ["Armed"] },
  { d6: 2, type: "Manipulative" },
  { d6: 3, type: "Technological" },
  { d6: 4, type: "Environmental" },
  { d6: 5, type: "Past Sins", note: "Re-roll at the first Stop." },
  { d6: 6, type: "Personal" }
];
export const THREAT_SUBTYPES = {
  Violent: [{ d6: [1, 2], sub: "Law enforcement" }, { d6: [3], sub: "Secret agents" }, { d6: [4, 5], sub: "Gang" }, { d6: [6], sub: "Crazed killer" }],
  Manipulative: [{ d6: [1, 2], sub: "Cultists" }, { d6: [3, 4], sub: "Local strongman" }, { d6: [5, 6], sub: "Business leader" }],
  Technological: [{ d6: [1, 2], sub: "Robots" }, { d6: [3, 4], sub: "Drone growth" }, { d6: [5, 6], sub: "System" }],
  Environmental: [{ d6: [1, 2], sub: "Extreme weather" }, { d6: [3, 4], sub: "Earthquakes" }, { d6: [5, 6], sub: "Diseases" }]
};

// T-49 — NPC generation decks
export const NPC_PERSONALITY = {
  "2": "Survivor", "3": "Visionary", "4": "Leader", "5": "Pragmatist", "6": "Reactionary",
  "7": "Observer", "8": "Schemer", "9": "Zealot", "10": "Recluse",
  "J": "Paranoid", "Q": "Addict", "K": "Megalomaniac", "A": "Sociopath"
};
export const NPC_EMOTION = {
  "2": "Angry", "3": "Obsessed", "4": "Cautious", "5": "Fearful", "6": "Placatory",
  "7": "Curious", "8": "Nostalgic", "9": "Excited", "10": "Anxious",
  "J": "Crazed", "Q": "Joyful", "K": "Confused", "A": "Craving"
};
export const NPC_MOTIVE = { clubs: "Narcissism", spades: "Trauma", hearts: "Community", diamonds: "Technology" };
export const NPC_METHOD = { clubs: "Power", spades: "Deceit", hearts: "Religion", diamonds: "Technology" };

// T-36 — conversations and Traveler events
export const CONVERSATION_SUBJECTS = [
  "Personal background", "Emotional state", "Religion", "Technology", "The war", "The Stop's background"
];
export const TRAVELER_EVENTS = [
  { d6: 1, event: "A Traveler confronts and tries to overcome their Flaw." },
  { d6: 2, event: "A Threat catches up to the Traveler, possibly pulling in the whole group." },
  { d6: 3, event: "A Traveler pursues an aspect of their Dream." },
  { d6: 4, event: "A conversation increases Tension between Travelers of your choice." },
  { d6: 5, event: "A conversation lowers Tension between Travelers of your choice." },
  { d6: 6, event: "A Traveler wanders off. Do the others search for them?" }
];

// Minor encounters — card-drawn, 2 through Ace (not D6, despite some secondary sources).
export const MINOR_ENCOUNTERS = {
  "2": "Hitchhiker. Give them a personality type and a quirk.",
  "3": "Roadwork.",
  "4": "Weather event — something harsh, a downpour or sandstorm.",
  "5": "Gas station. Is anyone there?",
  "6": "Roadside attraction — the kitschy, looming, sometimes bizarre kind.",
  "7": "Animal crossing your path. Can you avoid hitting it?",
  "8": "Abandoned car. Out of gas? Passengers dead in neurocasters? Tracks leading off?",
  "9": "Cult sacrifice left on the road.",
  "10": "Debris — car parts, something fallen off a drone. Not intact.",
  "J": "Drone growth, far off, silhouetted on the horizon. Best not to follow.",
  "Q": "Abandoned drone ship.",
  "K": "Civil war battle site — wrecks, skeletons, craters.",
  "A": "Drone. Not functioning. Huge."
};

export const START_SHIFT_BY_SUIT = { diamonds: "Morning", hearts: "Day", clubs: "Evening", spades: "Night" };

// T-36 — solo journey prep
export const DESTINATIONS = [
  "The former home of one of the Travelers",
  "The new home of one of the Travelers",
  "One of the remaining cities in Pacifica",
  "The site of a civil war battle",
  "A secret facility",
  "The site of a popular pilgrimage"
];
export const SOLO_PERSONAL_THREATS = [
  "An enemy from the Traveler's past.",
  "A personal demon, something that comes from within.",
  "The Traveler is a fugitive — from the law, a corporation, or a cult.",
  "The Traveler is sick, maybe dying.",
  "The Threat is a machine — a drone growth or something more enigmatic.",
  "One of the other Travelers is their secret nemesis."
];
export const NINETIES_VEHICLES = [
  "1990 Pontiac Grand Prix",
  "1996 Ford Explorer Eddie Bauer in Hunter Green",
  "1996 Chevy S10 Extreme minitruck",
  "1993 SL1 Saturn",
  "1995 Dodge Neon",
  "1992 Honda Accord"
];

// Per-archetype solo Goals and Threats (p.207–208).
// Journalist appears here but is not one of the ten creation archetypes (ruling A2).
export const SOLO_ARCHETYPE_HOOKS = {
  artist: { goal: "Shoot a video at an iconic civil war battle site.", threat: "Veterans who hated your last video are hunting you." },
  criminal: { goal: "Find the person you shot in a robbery and pay them back somehow.", threat: "Their sibling hired a bounty hunter." },
  devotee: { goal: "Find the godhead in a specific system, then plug in until it drains you.", threat: "You stole a prototype neurocaster; Sentre wants it back." },
  doctor: { goal: "Find a specific desert cactus that may hold the cure.", threat: "You're a neurine addict and nearly out." },
  dronePilot: { goal: "Break into the well-guarded corporate lab holding your body.", threat: "A virus in your drone body makes you paranoid, and it's worsening." },
  investigator: { goal: "Find a missing girl whose parents counted on you six years ago.", threat: "Guilt makes you drink; in a blackout you made an enemy you can't remember." },
  outsider: { goal: "Reach a major city where you can blend in and learn to act normal.", threat: "You're deeply depressed and fall into self-destructive bouts." },
  runawayKid: { goal: "You're pregnant. Find a safe place to have your baby.", threat: "The baby's father is an abuser and he's looking for you." },
  scientist: { goal: "Find a particular cult to study anthropologically.", threat: "The rival whose ideas you stole now works for Sentre." },
  veteran: { goal: "Make a pilgrimage to the Civil War Memorial.", threat: "A squadmate blames you for their injuries and wants revenge." },
  journalist: { goal: "Travel with strangers and learn to treat people as more than camera subjects.", threat: "You photographed a powerful politician compromised; you're wanted.", notAnArchetype: true }
};

export const SOLO_PREP_STEPS = [
  "Choose the Starting Point.",
  "Choose the Destination.",
  "Choose the route.",
  "Decide the number of Stops.",
  "Decide each Traveler's personal Goal.",
  "Decide each Traveler's personal Threat.",
  "Describe the vehicle.",
  "Generate Countdowns, Stops and Encounters during play, not before."
];

export const SOLO_UNSTICK = [
  "Draw a card.",
  "Activate a Stop Countdown event.",
  "Activate a personal Threat Countdown event.",
  "Let an NPC tell a rumor.",
  "Let an NPC ask for or offer help.",
  "Point out a need, usually tied to the Blocker.",
  "Cut in time to a new scene."
];

// Internal Threats — permitted in solo play only; the core rules avoid them (they cost agency).
export const INTERNAL_THREATS_ALLOWED = true;

export default {
  EVENT_TRIGGERS, TILT, STOP_THREAT_COUNTDOWN, THREAT_TYPES, THREAT_SUBTYPES,
  NPC_PERSONALITY, NPC_EMOTION, NPC_MOTIVE, NPC_METHOD, MINOR_ENCOUNTERS,
  TRAVELER_EVENTS, CONVERSATION_SUBJECTS, DESTINATIONS, SOLO_ARCHETYPE_HOOKS
};
