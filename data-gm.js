// Stop generators — shared by the GM screen and solo mode (T-30, T-37..T-44).
// D66 tables are stored as ordered 36-entry arrays indexed by d66Index() in rules.js.

export const D66_ORDER = [11,12,13,14,15,16,21,22,23,24,25,26,31,32,33,34,35,36,
                          41,42,43,44,45,46,51,52,53,54,55,56,61,62,63,64,65,66];

// ------------------------------------------------------------ T-37 stop setting
export const SETTING = {
  terrain: ["Desert", "Mountain", "Plains", "Coast or riverside", "Forest", "Town"],
  population: [
    "Desolate. Few if any people live here.",
    "Quiet. 10 to 50 people.",
    "Active. 50 to 100 people.",
    "Lively. 100 to 300 people.",
    "Crowded. 300 to 500 inhabitants.",
    "Densely populated. Hundreds or even thousands."
  ],
  communications: [
    "Dead end. No stationary neurocasters.",
    "Isolated. Small road passing by. One neurocaster terminal.",
    "Connected. Several small roads or paths. One or two terminals.",
    "Well-traveled. A main road and several small roads. Several terminals.",
    "Junction. Main road plus harbor, airport or station. Several terminals, possibly a radio or TV station.",
    "Main hub. Several main roads, a harbor, airport or train station, lots of terminals."
  ],
  size: [
    "Tiny. One house or part of a larger facility.",
    "Very small. A handful of houses.",
    "Small. Several houses and facilities within easy walking range.",
    "Medium. Buildings scattered over a large area.",
    "Large. Key locations connected by roads.",
    "Very large. Travel between locations needs a vehicle."
  ],
  prosperity: [
    "Impoverished. People are struggling to survive.",
    "Poor. The inhabitants live in hardship.",
    "Run-down. People work hard to get by.",
    "Thriving. Most have a decent standard of living.",
    "Prosperous. People live well, roads are cared for.",
    "Rich. Grand buildings and luxury items."
  ],
  weather: ["Storm", "Rain or snow", "Windy", "Clear blue sky", "Unusually hot or cold", "Mist and heavy cloud cover"]
};

// --------------------------------------------------------------- T-38 blockers
export const BLOCKERS = [
  "Military roadblock", "Earthquake", "Fire", "Vehicle malfunction", "Roadworks", "Medical quarantine",
  "Military operation", "Out of fuel", "Road covered by sand or fallen rocks", "A beautiful must-see sight", "Nightfall", "Bad weather",
  "Accident blocks the road", "A Traveler falls ill", "Out of food", "Lost, and the map doesn't help", "Threatening presence at the horizon", "Road has collapsed by mudslide",
  "Herd of animals", "Police roadblock", "Extreme heat or cold", "A Traveler grew up here", "The Travelers cause an accident", "Gunfire against the vehicle",
  "Home-made warning signs", "Highway robbers", "Huge sinkhole", "A heated argument between Travelers", "Someone on the roadside needing help", "Local roadblock demanding money for passage",
  "Something valuable that must be investigated", "A personal Goal leads a Traveler here", "Last shelter before a dangerous part of the journey", "A letter is expected to arrive at this place", "Sentre crew blocking the road", "A huge drone has crashed on the road"
];
export const NEEDS = ["Food or water", "Safety", "Vehicle repairs or spare parts", "Medicine or medical gear", "A place to sleep", "Information"];

// -------------------------------------------------------------- T-39 conflicts
export const CONFLICT_PARTIES = [
  "Farmer", "Cult members", "The Convergence", "Biker gang", "Scientist", "Young troublemaker",
  "Soldier(s)", "Robot designer", "Drone", "Intelligent robot", "Artist", "Mobster",
  "Family", "Rich investor", "Politician", "Landowner", "Bank robber", "Environmental activist",
  "Musician", "Political extremists", "Cult leader", "Scavengers", "Neurine addicts", "Army scientist",
  "Techno cult", "Detective", "Pacifica rioters", "Deserted soldiers", "Journalist", "Store owner",
  "Hotel owner", "Labor union", "Racecar driver", "Doctor", "Hunter", "Sheriff"
];
export const CONFLICT_SUBJECTS = [
  "Piece of land", "Religious differences", "Newborn baby", "Drug factory", "Stolen information", "Important life decision",
  "Racketeering", "Robot factory", "Drone ship", "Robot", "Piece of art", "Casino",
  "Love", "Natural resource", "Political power", "Forest or beach", "Money", "Pollution",
  "A gig", "Control over people's life", "Control over others", "Scrap site", "Neurine", "Drone growth experiment",
  "Neurograph tower", "A murder", "An election", "Bunker or weapons", "A hideous truth", "Store or restaurant",
  "Hotel", "Salaries", "Expensive car", "Corpse", "Sick animals", "Warrant"
];

// -------------------------------------------------------------- T-40 locations
export const LOCATIONS = [
  "Boat community", "Burnt forest", "Café or diner", "Casino", "Clinic", "Convention",
  "Crashed drone ships", "Cult headquarters", "Dead beach", "Garage", "Greenhouses", "Harbor",
  "Hospital", "Industrial area", "Isolated hotel", "Kennel", "Library", "Market",
  "Military base", "Militia base", "Mine", "Music festival", "Neurograph tower", "Park",
  "Place of worship", "Racetrack", "Residential area", "Restaurant", "Roadside zoo", "Shooting range",
  "Sinkhole", "Theme park", "Trailer park", "Truck stop", "Underground facility", "Wetland or river delta"
];

// ------------------------------------------------------------------- T-41 mood
export const ELECTRIC_STATE_ELEMENTS = [
  "Old assault ship", "Endless boneyard", "Jury-rigged robot", "Kids with parents lost in the neuroscapes", "Infected animals with rotten bodies", "Drone ship gutted by scavengers",
  "Broken drone animals", "Scavenger drones looking for loot", "Burnt-down houses", "Abandoned roadworks", "Skeletons attached to neurocasters", "Neurograph towers",
  "Black wires across the landscape", "Abandoned neurodrome arena", "Gigantic scrap-tower being built by robots", "People with neurocasters being eaten alive by vultures or rats", "Service robots hauling cable rollers", "Massive spherical buildings connected with black wires",
  "Horse or other animal without eyes", "Robot with long radio masts", "Half-finished mass grave for people who starved to death wearing neurocasters", "Abandoned commercial drones shaped like smiling children with big yellow heads", "Robot walking in circles", "Enormous drone or robot crashed into a bridge",
  "Sentre commercial billboards", "Hundreds of people with neurocasters walking by", "Drone ships passing by", "Memorial place for war heroes of the second civil war", "Commercial billboard for the Pacifica president", "Large batteries of magnetic neodymium cannons",
  "People with scars after anti-neuronic surgery", "Burnt corpses", "Anti-neuronic protesters", "Pleasure drones", "Robotic animals", "Voices coming from the mist"
];
export const NINETIES_NOSTALGIA = [
  "A vending machine with chewing gum", '"Smells Like Teen Spirit" played on repeat', "A brown Dodge Caravan", "Sony Walkman", "Shiny lip gloss", 'A mix tape starting with "In Your Eyes"',
  "Slinky toys", "Tamagotchi graveyard", "Video rental store", "Nokia cellphone antenna", "Plastic see-through raincoat", "Dancing the Macarena",
  'The TV series "Pacifica Friends"', "Flared jeans", "Sun-dried tomatoes and focaccia", '"Closer" by Nine Inch Nails', "Black trench coat", 'The TV series "Fresh Prince of Bel-Air"',
  "CDs", "Hoop earrings", "Bart Simpson t-shirts", "A Billabong shirt", '"It\'s Oh So Quiet" by Björk', "VHS tapes",
  "A Tickle Me Elmo", "Nintendo Game Boy", "Cameras with film that needs developing", "Smoking indoors", "News and entertainment in paper magazines", "Nothing but ordinary coffee and decaf",
  "Phone booths", "Handwritten letters", "A Rave", "Overhead projectors", "CD-ROMs", "Civilian HumVee"
];

// ------------------------------------------------------------------ T-30 quirks
export const NPC_QUIRKS = [
  "Bloodshot eyes", "Wears neurocaster", "Poor", "Rich", "Bitter", "Odd hairstyle",
  "Boastful", "Hungry", "Afraid", "Quiet", "Drunk", "Chain smoker",
  "Sick", "Flirtatious", "Violent", "Well-dressed", "Short", "Thoughtful",
  "Loud", "Shoeless", "Worried", "Dirty", "Shy", "Curious",
  "Babyface", "Old", "Angry", "Oddly shaped glasses", "Gambler", "Smelly",
  "Wise", "Armed", "Hyperactive", "Tired", "Grieving", "Neurine addict"
];
// Two quirks carry mechanics rather than colour.
export const MECHANICAL_QUIRKS = {
  "Wears neurocaster": { realWorldPenalty: -2 },
  "Neurine addict": { hopeOnlyFrom: "neurine" }
};

// --------------------------------------------------------------- T-42 countdown
export const COUNTDOWN_ELEMENTS = [
  "Presentation — the Threat shows itself or reveals its presence.",
  "Attack — the Threat attacks an NPC or the Travelers.",
  "Lies — spread by the Threat or about it.",
  "Forces gather — new followers, arms, power.",
  "Victims appear — seen, described, or displayed to frighten.",
  "Accusation — an NPC or the Travelers are blamed.",
  "Plead for help — the Threat or a victim asks the Travelers.",
  "Sabotage — infrastructure, an heirloom, something important.",
  "Someone is captured.",
  "A deal is offered — at a price.",
  "Missing item — who took it, and why?",
  "A location is seized.",
  "Tactics change — covert becomes open, or the reverse.",
  "Loyalties shift — an ally turns.",
  "An alliance is formed — for or against the Travelers."
];
export const COUNTDOWN_PRINCIPLE =
  "Closing distance and increasing harm: unknown NPCs → known NPCs → loved NPCs → the Travelers.";

// -------------------------------------------------------------- T-43 neuroscape
export const NEUROSCAPE = {
  type: [
    "Major global, constantly upgraded, many visitors, famous",
    "Important and central, well-known",
    "Global with many visitors",
    "Local and popular",
    "Local peripheral, odd and unused",
    "Local peripheral, almost deserted, bad reputation"
  ],
  theme: ["Ancient Rome", "Heaven", "Beach party", "Space station with aliens", "Stone age", "Deep sea"],
  mood: ["Euphoria", "Mystery", "Chill", "Indulgence", "Nostalgia", "Surreal"]
};

// -------------------------------------------------------------- T-44 journey
export const JOURNEY_LENGTH = [
  { id: "oneShot", label: "One-shot", stops: [1, 1] },
  { id: "short", label: "Short journey", stops: [2, 4] },
  { id: "medium", label: "Medium journey", stops: [4, 7] },
  { id: "long", label: "Long journey", stops: [8, 12] }
];
export const SESSIONS_PER_STOP = [1, 3];
export const KICKER_EXAMPLES = [
  "Gangsters raid the community where the Traveler lives and burn it to the ground.",
  "A sibling gone for months contacts a Traveler and asks for help.",
  "The Traveler finds a corpse in a car loaded with bags of neurine.",
  "A revolutionary leader tells the Traveler it is time to strike back."
];
export const WHY_STICK_TOGETHER = [
  "To split gas money.",
  "You were all stranded together at a bus station.",
  "It is the only car available where the Journey starts.",
  "A relative or friend asked if the others could come along as a favor.",
  "Only a fool travels this road alone and without guns.",
  "One of you owns the car and the others are hitchhikers."
];
// Ruling A17: the personal Goal table referenced on p.114 does not exist in print.
export const PERSONAL_GOAL_TABLE = null;

// ------------------------------------------------------------------- reactions
export const NPC_REACTIONS = [
  { roll: [2, 2], reaction: "Hostile" },
  { roll: [3, 5], reaction: "Unfriendly" },
  { roll: [6, 8], reaction: "Neutral" },
  { roll: [9, 11], reaction: "Friendly" },
  { roll: [12, 12], reaction: "Eager to help" }
];
export const COMBAT_MORALE = [
  { roll: [2, 2], reaction: "Flee" },
  { roll: [3, 3], reaction: "Surrender" },
  { roll: [4, 5], reaction: "Retreat or negotiate" },
  { roll: [6, 12], reaction: "Keep fighting" }
];

export const MINOR_NPC_BASELINE = { allAttributes: 3, mayHaveTalent: true };

export default {
  SETTING, BLOCKERS, NEEDS, CONFLICT_PARTIES, CONFLICT_SUBJECTS, LOCATIONS,
  ELECTRIC_STATE_ELEMENTS, NINETIES_NOSTALGIA, NPC_QUIRKS, COUNTDOWN_ELEMENTS,
  NEUROSCAPE, JOURNEY_LENGTH, NPC_REACTIONS, COMBAT_MORALE, MINOR_NPC_BASELINE
};
