// HOUSE AID — not from the rulebook.
// The house d100 tables for the creation wizard: names, songs, description words,
// and seed words for the personal Goal and personal Threat.
// The book publishes no such tables; these exist to unblock a blank page.
// Name pairs follow the book's own pre-made convention (Cade/Courtney, Nancy/Pascal),
// so read whichever half fits your Traveler, or mix them.

export const HOUSE_AID = true;

// ------------------------------------------------------------- d100 first names
// Era-appropriate for adults in 1997: born roughly 1955–1980.
export const FIRST_NAMES = [
  "Cade/Courtney", "Dale/Dana", "Wes/Wendy", "Marcus/Marcy", "Vic/Vera",
  "Ray/Renee", "Hal/Hallie", "Gene/Jean", "Curtis/Corinne", "Dom/Dominique",
  "Russ/Roslyn", "Ike/Ida", "Lonnie/Loretta", "Bo/Bobbie", "Chet/Cheryl",
  "Dwight/Dawn", "Emmett/Emma", "Floyd/Faye", "Gus/Gwen", "Hank/Hannah",
  "Irv/Iris", "Jules/Julie", "Kip/Kim", "Lyle/Lynn", "Miles/Mila",
  "Nash/Nadine", "Otis/Odette", "Pete/Patsy", "Quinn/Quinn", "Rex/Roxanne",
  "Sal/Sally", "Tobias/Tabitha", "Ulys/Una", "Vince/Vivian", "Wade/Wanda",
  "Xavier/Ximena", "York/Yolanda", "Zeke/Zelda", "Abel/Abby", "Barrett/Bree",
  "Cormac/Cora", "Desmond/Delia", "Elias/Elena", "Franklin/Frankie", "Grady/Greta",
  "Hollis/Holly", "Ivan/Ivy", "Jonah/Joan", "Knox/Kendra", "Levi/Leona",
  "Mateo/Mariela", "Nico/Nina", "Omar/Odalys", "Paolo/Paloma", "Rafael/Rosalia",
  "Santiago/Sofia", "Tomas/Teresa", "Ulises/Ursula", "Vidal/Valeria", "Xander/Xiomara",
  "Andre/Angela", "Booker/Bernice", "Cyrus/Camille", "Darius/Dionne", "Everett/Eartha",
  "Garrett/Gladys", "Isaiah/Imani", "Jerome/Josephine", "Kendrick/Karla", "Lamar/Lurline",
  "Malik/Monique", "Nathaniel/Nia", "Otho/Ophelia", "Percy/Priscilla", "Reuben/Ramona",
  "Kenji/Keiko", "Hiro/Hana", "Minh/Mai", "Duc/Dao", "Jae/Jin",
  "Sung/Sun", "Wei/Wen", "Arjun/Anjali", "Ravi/Rina", "Farid/Farah",
  "Amir/Amira", "Boris/Bela", "Dmitri/Dasha", "Janek/Jadwiga", "Milos/Mira",
  "Anders/Astrid", "Bjorn/Britta", "Casper/Clara", "Halvard/Hedda", "Ansel/Annika",
  "Fitz/Fern", "Gower/Glory", "Harlan/Hazel", "Judd/June", "Merle/Maud"
];

// --------------------------------------------------------------- d100 surnames
export const SURNAMES = [
  "Draper", "Carbone", "Alvarez", "Harker", "Lopez", "Whitfield", "Okonkwo", "Nakamura",
  "Vance", "Ferraro", "Delgado", "Boyle", "Kowalski", "Petrov", "Mbeki", "Tran",
  "Ruiz", "Halloran", "Castellanos", "Njoku", "Reyes", "Sandoval", "Brennan", "Kaufman",
  "Ibarra", "Moreau", "Vasquez", "Pham", "Silva", "Nunez", "Duval", "Ortega",
  "Bishop", "Calloway", "Doyle", "Everly", "Fontaine", "Garrison", "Hollis", "Ingram",
  "Jessup", "Keller", "Lindqvist", "Mercer", "Novak", "Oyelaran", "Pruitt", "Quintero",
  "Rasmussen", "Salazar", "Tobin", "Ulrich", "Valdez", "Whitlock", "Yarrow", "Zamora",
  "Ashby", "Barlow", "Cardoso", "Dunbar", "Eastman", "Fitzgerald", "Grimaldi", "Hargrove",
  "Iverson", "Jarrett", "Kimura", "Langston", "Marchetti", "Nakashima", "Ocampo", "Pemberton",
  "Rojas", "Stroud", "Thibodeaux", "Underwood", "Villareal", "Wexler", "Yoon", "Zielinski",
  "Abernathy", "Bracken", "Cortez", "Deaver", "Estrada", "Fenwick", "Guzman", "Holloway",
  "Ishida", "Juarez", "Kirkland", "Lassiter", "Montoya", "Nakagawa", "Oakes", "Pena",
  "Ramsey", "Sokolov", "Trevino", "Winslow"
];

// -------------------------------------------------------- d100 favourite songs
// Real songs of the decade, for the sheet's Favorite '90s Song line. No mechanical effect.
export const SONGS = [
  "Smells Like Teen Spirit — Nirvana", "Losing My Religion — R.E.M.", "Enter Sandman — Metallica",
  "Under the Bridge — Red Hot Chili Peppers", "Creep — Radiohead", "Black Hole Sun — Soundgarden",
  "Alive — Pearl Jam", "Come As You Are — Nirvana", "Man in the Box — Alice in Chains",
  "No Rain — Blind Melon", "Everlong — Foo Fighters", "1979 — The Smashing Pumpkins",
  "Today — The Smashing Pumpkins", "Bullet with Butterfly Wings — The Smashing Pumpkins",
  "Closer — Nine Inch Nails", "Hurt — Nine Inch Nails", "Wicked Game — Chris Isaak",
  "Nothing Compares 2 U — Sinéad O'Connor", "It's Oh So Quiet — Björk", "Army of Me — Björk",
  "Friday I'm in Love — The Cure", "Just Like Heaven — The Cure", "Fade Into You — Mazzy Star",
  "Linger — The Cranberries", "Zombie — The Cranberries", "Cannonball — The Breeders",
  "Connection — Elastica", "Common People — Pulp", "Wonderwall — Oasis",
  "Don't Look Back in Anger — Oasis", "Bitter Sweet Symphony — The Verve",
  "Song 2 — Blur", "Girls & Boys — Blur", "Karma Police — Radiohead", "No Surprises — Radiohead",
  "Bittersweet — Big Head Todd", "Runaway Train — Soul Asylum", "Two Princes — Spin Doctors",
  "What's Up? — 4 Non Blondes", "Loser — Beck", "Where It's At — Beck",
  "Sabotage — Beastie Boys", "Intergalactic — Beastie Boys",
  "Killing in the Name — Rage Against the Machine", "Bulls on Parade — Rage Against the Machine",
  "Would? — Alice in Chains", "Plush — Stone Temple Pilots", "Interstate Love Song — Stone Temple Pilots",
  "Basket Case — Green Day", "When I Come Around — Green Day", "Self Esteem — The Offspring",
  "Come Out and Play — The Offspring", "Longview — Green Day", "Cut Your Hair — Pavement",
  "Buddy Holly — Weezer", "Say It Ain't So — Weezer", "Doll Parts — Hole",
  "Violet — Hole", "Rebel Girl — Bikini Kill", "Seether — Veruca Salt",
  "Bull in the Heather — Sonic Youth", "Been Caught Stealing — Jane's Addiction",
  "Give It Away — Red Hot Chili Peppers", "Jeremy — Pearl Jam", "Even Flow — Pearl Jam",
  "Black — Pearl Jam", "Heart-Shaped Box — Nirvana", "All Apologies — Nirvana",
  "The Man Who Sold the World — Nirvana", "Change the World — Eric Clapton",
  "Tears in Heaven — Eric Clapton", "One — U2", "Mysterious Ways — U2", "Zooropa — U2",
  "Regret — New Order", "Enjoy the Silence — Depeche Mode", "Personal Jesus — Depeche Mode",
  "Blue Monday — New Order", "Firestarter — The Prodigy", "Block Rockin' Beats — The Chemical Brothers",
  "Setting Sun — The Chemical Brothers", "Born Slippy — Underworld", "Windowlicker — Aphex Twin",
  "Teardrop — Massive Attack", "Unfinished Sympathy — Massive Attack", "Protection — Massive Attack",
  "Glory Box — Portishead", "Sour Times — Portishead", "Roads — Portishead",
  "California Love — 2Pac", "Juicy — The Notorious B.I.G.", "Nuthin' but a G Thang — Dr. Dre",
  "Regulate — Warren G", "Scenario — A Tribe Called Quest", "They Reminisce Over You — Pete Rock & CL Smooth",
  "Waterfalls — TLC", "No Scrubs — TLC", "Vogue — Madonna", "Ray of Light — Madonna",
  "Fast Car — Tracy Chapman"
];

// --------------------------------------------------- d100 description words
// Roll three times for three unique words, then write a description around them.
// Deliberately mixed: build, wear, manner, mark, habit.
export const DESCRIPTORS = [
  "sunburnt", "rangy", "barrel-chested", "stooped", "wiry",
  "heavyset", "hollow-cheeked", "broad-shouldered", "small-framed", "long-limbed",
  "soft-spoken", "loud", "clipped", "drawling", "hoarse",
  "restless", "watchful", "unhurried", "twitchy", "still",
  "grease-stained", "sun-bleached", "immaculate", "threadbare", "borrowed",
  "oversized", "military-surplus", "hand-me-down", "thrifted", "meticulous",
  "cracked glasses", "chipped tooth", "burn scar", "faded tattoo", "shaved head",
  "unruly hair", "bleached tips", "buzzcut", "long braid", "receding",
  "nicotine-stained fingers", "bitten nails", "calloused hands", "ink-stained", "bandaged",
  "limping", "favouring one arm", "squinting", "hard of hearing", "wheezing",
  "chain-smoker", "gum-chewer", "coffee-fuelled", "pill-rattling", "always eating",
  "never eating", "always cold", "always sweating", "sleeps badly", "sleeps anywhere",
  "flinches at noise", "stares too long", "avoids eyes", "smiles wrong", "never smiles",
  "laughs first", "laughs late", "hums constantly", "talks to themselves", "quotes movies",
  "swears creatively", "religious about it", "counts things", "collects junk", "hoards batteries",
  "carries photographs", "keeps a journal", "writes letters unsent", "listens more than speaks", "interrupts",
  "explains everything", "asks nothing", "apologises reflexively", "never apologises", "walks point",
  "hangs back", "drives too fast", "won't drive", "sits facing the door", "sleeps in the car",
  "smells of motor oil", "smells of antiseptic", "smells of woodsmoke", "wears the neurocaster too long", "won't touch a neurocaster",
  "flinches from screens", "stares at towers", "hums with static", "wears sunglasses at night", "keeps the radio on"
];

export const DESCRIPTOR_ROLLS = 3;   // roll three, keep them distinct

// ----------------------------------------------------------- d100 goal seeds
// The book gives no Goal table (it points at one that was never printed — ruling A17).
// Roll three and build a specific objective out of them: an act, a thing, a person.
export const GOAL_SEEDS = [
  "deliver", "bury", "reunite", "confess", "return", "retrieve", "destroy", "witness",
  "warn", "cure", "record", "atone", "inherit", "escort", "sell", "buy back", "unplug",
  "prove", "disprove", "finish", "abandon", "rebuild", "release", "forgive", "avenge",
  "find", "outlive", "outrun", "outbid", "join", "leave", "refuse", "surrender",
  "a grave", "a letter", "a child", "a sibling", "a parent", "a lover", "a rival",
  "a stranger", "a corpse", "a recording", "a photograph", "a map", "a key", "a drone",
  "a neurocaster", "a car", "a house", "a farm", "a bar", "a church", "a clinic",
  "a laboratory", "a bunker", "a tower", "a wreck", "a border", "a coastline", "a desert",
  "a city", "a hometown", "a memory", "a promise", "a debt", "a diagnosis", "a name",
  "a confession", "a signal", "a frequency", "a rumour", "a cure",
  "a formula", "a password", "a body", "before winter", "before the drought", "before they die",
  "before the trial", "before the wedding", "before the funeral", "before the network falls",
  "one last time", "for money", "for love", "for spite", "for nothing", "out of guilt",
  "out of duty", "out of habit", "in secret", "in the open", "with witnesses", "alone",
  "against orders", "with the wrong people", "too late", "too early", "at any cost"
];

// --------------------------------------------------------- d100 threat seeds
// A personal Threat opposes the Goal. Roll three: who or what, how it reaches you, what it wants.
export const THREAT_SEEDS = [
  "a bounty hunter", "an old partner", "a former squadmate", "an ex-lover", "a sibling",
  "a parent", "a child grown up", "a jilted employer", "a creditor", "a landlord",
  "a sheriff", "a highway patrol unit", "a militia", "a biker gang", "a cult",
  "a cult leader", "a corporate agent", "a Sentre fixer", "a rival scientist", "a journalist",
  "a private investigator", "a drone growth", "an intercerebral intelligence", "a robot",
  "a rogue system", "a swarm of scavenger drones", "a hitchhiker", "a doctor", "a nurse",
  "a preacher", "a mayor", "a smuggler", "a dealer", "an addict", "a witness",
  "a debt", "a warrant", "a blood feud", "a broken contract", "a stolen prototype",
  "a false confession", "a photograph", "a recording", "a rumour", "blackmail",
  "a diagnosis", "an addiction", "withdrawal", "a disease", "an infected wound",
  "grief", "guilt", "shame", "a phobia", "flashbacks", "sleeplessness", "paranoia",
  "a promise you broke", "a lie you told", "a body you left", "a fire you started",
  "follows the car", "waits at the destination", "is already in the group", "arrives by radio",
  "arrives by letter", "arrives in a neuroscape", "appears in dreams", "wears your face",
  "knows your name", "has your photograph", "has the money", "has the evidence",
  "has hostages", "has the law", "has the network", "wants you dead", "wants you back",
  "wants you to confess", "wants what you carry", "wants the drone", "wants the child",
  "wants an apology", "wants nothing you can give", "will not explain", "will not stop",
  "will trade", "will lie first", "will take a hostage", "will burn it down",
  "gets closer each Stop", "is patient", "is desperate", "is dying", "is mistaken",
  "was right about you", "is protecting someone", "is owed something", "is not real", "already won once"
];

export const SEED_ROLLS = 3;

export default { FIRST_NAMES, SURNAMES, SONGS, DESCRIPTORS, HOUSE_AID };
