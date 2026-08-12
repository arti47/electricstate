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
  "a St Christopher on the dash", "keys for a door that's gone", "nothing they didn't steal", "a jacket two sizes too big"
];

// -------------------------------------------- d100 description: how they behave
export const DESC_MANNER = [
  "watchful", "restless", "unhurried", "twitchy",
  "unnervingly still", "smiles at the wrong moment", "never smiles", "laughs first",
  "laughs a beat late", "stares too long", "won't meet your eyes", "flinches at sudden noise",
  "talks to themselves", "hums constantly", "whistles tunelessly", "quotes movies",
  "swears creatively", "prays under their breath", "counts things", "taps fingers",
  "cracks knuckles", "always chewing gum", "chain-smokes", "never without coffee",
  "rattles a pill bottle", "always eating", "never seen eating", "sleeps anywhere",
  "sleeps badly", "wakes at any sound", "sits facing the door", "checks the exits",
  "walks point", "hangs back", "drives too fast", "won't drive",
  "keeps the radio on", "keeps the radio off", "interrupts", "explains everything",
  "asks nothing", "apologises reflexively", "never apologises", "deflects with jokes",
  "answers questions with questions", "listens more than speaks", "monologues", "whispers",
  "shouts when nervous", "goes quiet when angry", "cries easily", "never cries",
  "touches people constantly", "flinches from touch", "gives things away", "takes without asking",
  "hoards batteries", "collects junk", "keeps a journal", "writes letters they never send",
  "carries photographs", "named the car", "talks to machines", "won't touch a neurocaster",
  "wears the neurocaster too long", "stares at the towers", "salutes out of habit", "checks every mirror",
  "avoids mirrors", "lies for practice", "tells the truth too bluntly", "over-shares",
  "keeps secrets badly", "keeps secrets far too well", "first to volunteer", "last to commit",
  "argues for sport", "agrees to end the argument", "changes the subject", "remembers every name",
  "forgets names immediately", "gives everyone a nickname", "refuses all nicknames", "cooks for everyone",
  "eats alone", "shares their cigarettes", "shares nothing", "pays for everything",
  "never has money", "tips too well", "haggles over everything", "feeds strays",
  "kicks at strays", "steps between people", "stands too close", "keeps a hand near their weapon",
  "goes unarmed by choice", "sings along badly", "dances when drunk", "doesn't drink"
];

export const DESCRIPTOR_TABLES = [
  { id: "build", label: "Build", table: DESC_BUILD },
  { id: "wear", label: "Wear", table: DESC_WEAR },
  { id: "manner", label: "Manner", table: DESC_MANNER }
];

export const DESCRIPTOR_ROLLS = 3;   // one from each table

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

export default { FIRST_NAMES, SURNAMES, SONGS, DESCRIPTOR_TABLES, GOAL_SEEDS, THREAT_SEEDS, HOUSE_AID };
