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

// ------------------------------------------------- d100 description: the body
// Three tables instead of one, rolled once each, so a description always covers
// how they are built, what they wear, and how they behave.
export const DESC_BUILD = [
  "rangy", "barrel-chested", "stooped", "wiry", "heavyset", "hollow-cheeked", "broad-shouldered",
  "small-framed", "long-limbed", "thick-necked", "narrow-shouldered", "bow-legged", "gaunt",
  "well-fed", "unusually tall", "short and square", "sunburnt", "weather-beaten", "pale as paper",
  "freckled", "sun-damaged", "acne-scarred", "birthmarked cheek", "cleft chin", "heavy jaw",
  "sharp cheekbones", "soft round face", "deep-set eyes", "pale eyes", "black eyes",
  "one milky eye", "gouged eye", "permanent squint", "dark circles", "laugh lines",
  "frown lines", "crooked nose", "broken nose set badly", "chipped front tooth", "gap-toothed",
  "gold tooth", "split lip", "bruised knuckles", "scraped knuckles", "calloused hands",
  "ink-stained hands", "nicotine-stained fingers", "bitten nails", "missing finger",
  "prosthetic hand", "thick glasses", "cracked glasses", "wire-rimmed glasses", "shaved head",
  "buzzcut", "unruly hair", "bleached tips", "long braid", "dreadlocks", "ponytail",
  "receding hairline", "greying early", "jet-black dye", "box-dyed red", "curtain fringe",
  "mustache", "patchy beard", "full beard", "clean-shaven", "sideburns", "pierced ear",
  "pierced nose", "faded tattoo", "prison tattoo", "unit tattoo", "burn scar on the forearm",
  "surgical scar", "scar across the brow", "throat scar", "anti-neuronic surgery scars",
  "port scar at the temple", "tremor in one hand", "limp", "favours one arm", "stiff shoulder",
  "bad back", "ruined knee", "wheezing breath", "hoarse voice", "high thin voice", "deep voice",
  "soft voice", "carrying voice", "slow drawl", "clipped speech", "accent from elsewhere",
  "lisp", "stutter under stress", "hard of hearing", "never quite still"
];

// ----------------------------------------------- d100 description: what they wear
export const DESC_WEAR = [
  "grease-stained coveralls", "sun-bleached denim", "threadbare flannel", "a borrowed jacket",
  "an oversized coat", "military surplus parka", "hand-me-down boots", "a thrifted dress",
  "an immaculate suit", "a permanently wrinkled shirt", "a band t-shirt", "a Bart Simpson t-shirt",
  "a Billabong shirt", "a black trench coat", "a cracked leather jacket", "a denim vest",
  "a hoodie with the strings gone", "a windbreaker", "cargo pants", "flared jeans",
  "ripped jeans", "steel-toed work boots", "sneakers held together with tape", "cowboy boots",
  "sandals in all weather", "a baseball cap", "a trucker cap", "a beanie",
  "a bandana", "sunglasses worn at night", "prescription shades", "hoop earrings",
  "dog tags", "a crucifix", "a saint's medal", "a friendship bracelet",
  "a wedding ring", "a ring on a chain", "a heavy wristwatch", "a watch stopped at one time",
  "a Walkman on the belt", "headphones round the neck", "a camera on a strap", "a notebook in the back pocket",
  "a worn deck of cards", "a Zippo", "a cigarette behind the ear", "a rattling pill bottle",
  "a hip flask", "an army canteen", "a first aid pouch", "a tool belt",
  "an overstuffed backpack", "a duffel bag", "a plastic bag of everything", "a guitar case",
  "a sidearm on the hip", "a knife on the belt", "a crowbar carried like a cane", "a neurocaster slung at the hip",
  "a neurocaster never taken off", "a cracked neurocaster", "trailing cables", "the smell of motor oil",
  "the smell of antiseptic", "the smell of woodsmoke", "the smell of gasoline", "cheap perfume",
  "old sweat", "stale cigarettes", "mint over something worse", "dust in every seam",
  "sand in the cuffs", "mud to the knee", "an old bloodstain", "bleach burns",
  "flecks of paint", "patched elbows", "duct tape repairs", "mismatched socks",
  "one glove", "fingerless gloves", "a long scarf", "a poncho",
  "an apron never taken off", "a uniform from the wrong job", "a name tag from somewhere else", "a hospital bracelet",
  "an expired security badge", "someone else's ID", "a photograph in the wallet", "a child's drawing, folded soft",
  "letters in a rubber band", "a map covered in notes", "a rosary wound round the wrist", "a lucky coin",
  "a St Christopher on the dash", "keys for a door that's gone", "nothing honestly come by", "a jacket two sizes too big"
];

// -------------------------------------------- d100 description: how they behave
export const DESC_MANNER = [
  "watchful", "restless", "unhurried", "twitchy",
  "unnervingly still", "smiles at the wrong moment", "never smiles", "laughs first",
  "laughs a beat late", "stares too long", "won't meet your eyes", "flinches at sudden noise",
  "mutters aloud", "hums constantly", "whistles tunelessly", "quotes movies",
  "swears creatively", "prays quietly", "counts things", "taps fingers",
  "cracks knuckles", "always chewing gum", "chain-smokes", "never without coffee",
  "rattles a pill bottle", "always eating", "never seen eating", "sleeps anywhere",
  "sleeps badly", "wakes at any sound", "sits facing the door", "checks the exits",
  "walks point", "hangs back", "drives too fast", "won't drive",
  "keeps the radio on", "keeps the radio off", "interrupts", "explains everything",
  "asks nothing", "apologises reflexively", "never apologises", "deflects with jokes",
  "answers questions with questions", "listens more than speaks", "monologues", "whispers",
  "shouts when nervous", "goes quiet when angry", "cries easily", "never cries",
  "touches people constantly", "flinches from touch", "gives things away", "takes without asking",
  "hoards batteries", "collects junk", "keeps a journal", "writes letters never sent",
  "carries photographs", "named the car", "talks to machines", "won't touch a neurocaster",
  "wears the neurocaster too long", "stares at the towers", "salutes out of habit", "checks every mirror",
  "avoids mirrors", "lies for practice", "tells the truth too bluntly", "over-shares",
  "keeps secrets badly", "keeps secrets far too well", "first to volunteer", "last to commit",
  "argues for sport", "agrees to end the argument", "changes the subject", "remembers every name",
  "forgets names immediately", "gives everyone a nickname", "refuses all nicknames", "cooks for everyone",
  "eats alone", "always shares a cigarette", "shares nothing", "pays for everything",
  "never has money", "tips too well", "haggles over everything", "feeds strays",
  "kicks at strays", "steps between people", "stands too close", "keeps a hand near the holster",
  "goes unarmed by choice", "sings along badly", "dances when drunk", "doesn't drink"
];

export const DESCRIPTOR_TABLES = [
  { id: "build", label: "Build", table: DESC_BUILD },
  { id: "wear", label: "Wear", table: DESC_WEAR },
  { id: "manner", label: "Manner", table: DESC_MANNER }
];

export const DESCRIPTOR_ROLLS = 3;   // one from each table

// ----------------------------------------------------------- d100 goal seeds
// A Mythic-style meaning table: single words only. Three rolls give an act, a thing and a
// pressure, and the reader wires them together — "Deliver / Grave / Winter" is more generative
// than any phrase would be. Includes the ten Anything Words as state-shift modifiers.
// The book gives no Goal table at all (it points at one never printed — ruling A17).
export const GOAL_SEEDS = [
  "Deliver", "Bury", "Reunite", "Confess", "Return", "Retrieve",
  "Destroy", "Witness", "Warn", "Heal", "Record", "Atone",
  "Inherit", "Escort", "Sell", "Repay", "Unplug", "Prove",
  "Disprove", "Finish", "Abandon", "Rebuild", "Release", "Forgive",
  "Avenge", "Find", "Outlive", "Outrun", "Join", "Leave",
  "Refuse", "Surrender", "Escape", "Protect", "Rescue", "Steal",
  "Trade", "Vigil", "Grave", "Letter", "Child", "Sibling",
  "Parent", "Lover", "Rival", "Stranger", "Corpse", "Recording",
  "Photograph", "Map", "Key", "Drone", "Neurocaster", "Vehicle",
  "Home", "Farm", "Church", "Clinic", "Laboratory", "Bunker",
  "Tower", "Wreck", "Border", "Coast", "Desert", "City",
  "Memory", "Promise", "Debt", "Diagnosis", "Name", "Inheritance",
  "Signal", "Frequency", "Rumour", "Remedy", "Formula", "Password",
  "Body", "Money", "Weapon", "Medicine", "Water", "Fuel",
  "Evidence", "Truth", "Secret", "Family", "Freedom", "Justice",
  "Change", "Continue", "Decrease", "Increase", "Mundane", "Mysterious",
  "Start", "Stop", "Strange", "Extra"
];

// -------------------------------------------------- d100 goal and threat modifiers
// Mythic's Anything Words: universal state-shift modifiers. Rolled alongside the seeds
// they turn a static noun into a change — "Stop / Signal" reads very differently to
// "Increase / Signal". Doubles amplify: two Decreases is not less, it is almost nothing.
export const ANYTHING_WORDS = [
  "Change", "Continue", "Decrease", "Increase", "Mundane",
  "Mysterious", "Start", "Stop", "Strange", "Extra"
];

// --------------------------------------------------------- d100 threat seeds
// Single words again. Three rolls give who or what, how it reaches the Traveler, and what
// it wants. Internal threats sit in the same table — the core rules avoid them, but solo
// play permits them and this is a house table either way.
export const THREAT_SEEDS = [
  "Hunter", "Partner", "Squadmate", "Sibling", "Parent", "Child",
  "Employer", "Creditor", "Landlord", "Sheriff", "Patrol", "Militia",
  "Gang", "Cult", "Preacher", "Agent", "Fixer", "Rival",
  "Journalist", "Investigator", "Growth", "Intelligence", "Robot", "System",
  "Swarm", "Hitchhiker", "Doctor", "Nurse", "Mayor", "Smuggler",
  "Dealer", "Addict", "Witness", "Debt", "Warrant", "Feud",
  "Contract", "Prototype", "Confession", "Photograph", "Recording", "Rumour",
  "Blackmail", "Diagnosis", "Addiction", "Withdrawal", "Disease", "Wound",
  "Grief", "Guilt", "Shame", "Phobia", "Flashback", "Insomnia",
  "Paranoia", "Promise", "Lie", "Body", "Fire", "Pursuit",
  "Ambush", "Surveillance", "Betrayal", "Hostage", "Ransom", "Bounty",
  "Deadline", "Trap", "Roadblock", "Storm", "Machine", "Network",
  "Signal", "Static", "Mask", "Name", "Evidence", "Money",
  "Weapon", "Poison", "Sabotage", "Silence", "Patience", "Desperation",
  "Mistake", "Obligation", "Illusion", "Zealot", "Deserter", "Scavenger",
  "Change", "Continue", "Decrease", "Increase", "Mundane", "Mysterious",
  "Start", "Stop", "Strange", "Extra"
];

export const SEED_ROLLS = 3;
export const USE_ANYTHING_WORDS = true;

export default { FIRST_NAMES, SURNAMES, SONGS, DESCRIPTOR_TABLES, GOAL_SEEDS, THREAT_SEEDS, HOUSE_AID };
