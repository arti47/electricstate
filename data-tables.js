// Injury, trauma, gear and service tables (T-15, T-17, T-24, T-46, T-51).
// D66 arrays are 36 entries in D66_ORDER; injury/trauma tables use explicit ranges
// because 11-36 is a single "None" band.

// -------------------------------------------------------- T-15 serious injuries p.84
// effect descriptors are machine-readable so the roller applies them without UI logic.
export const SERIOUS_INJURIES = [
  { range: [11, 36], name: "None", effects: [] },
  { roll: 41, name: "Broken finger", effects: [{ dice: -1, when: "rolls requiring two arms" }], heal: "d6" },
  { roll: 42, name: "Ear torn off", effects: [{ dice: -1, attr: "wits", when: "hearing" }], heal: "2d6" },
  { roll: 43, name: "Broken toe", effects: [{ rule: "moveOrAction" }], heal: "d6" },
  { roll: 44, name: "Broken ribs", effects: [{ dice: -2, attr: ["strength", "agility"] }], heal: "d6" },
  { roll: 45, name: "Teeth knocked out", effects: [{ dice: -1, attr: "empathy" }], heal: "2d6" },
  { roll: 46, name: "Concussion", effects: [{ dice: -2, attr: "wits" }], heal: "d6" },
  { roll: 51, name: "Broken nose", effects: [{ dice: -1, attr: "empathy" }], heal: "d6" },
  { roll: 52, name: "Busted knee", effects: [{ rule: "moveOrAction" }], heal: "2d6" },
  { roll: 53, name: "Traumatized", effects: [{ rule: "rollMentalTrauma" }] },
  { roll: 54, name: "Gouged eye", effects: [{ dice: -2, attr: "wits", when: "spotting" }], heal: "d6" },
  { roll: 55, name: "Damaged throat", effects: [{ dice: -2, attr: "empathy" }], heal: "d6" },
  { roll: 56, name: "Infected wound", effects: [{ rule: "disease", virulence: 6 }] },
  { roll: 61, name: "Broken arm", effects: [{ dice: -3, when: "rolls requiring two arms" }], heal: "3d6" },
  { roll: 62, name: "Broken leg", effects: [{ rule: "moveOrAction" }], heal: "3d6" },
  { roll: 63, name: "Disfigured face", effects: [{ dice: -2, attr: "empathy" }], heal: "2d6", surgery: true },
  { roll: 64, name: "Punctured lung", effects: [{ dice: -2, attr: ["strength", "agility"] }], heal: "2d6", surgery: true },
  { roll: 65, name: "Cracked skull", effects: [{ dice: -2, attr: "wits" }], heal: "2d6", surgery: true },
  { roll: 66, name: "Internal bleeding", effects: [{ dice: -2, attr: ["strength", "agility"] }, { rule: "damageOnUse", damage: "d6" }], heal: "2d6", surgery: true }
];
export const SURGERY = { attr: "wits", talent: "surgeon", time: "shift", onFail: "incapacitated", cashAlternative: 1000 };

// ----------------------------------------------------------- T-17 mental trauma p.87
// 13 of 18 entries change engine behaviour — rule ids are handled in roller.js.
export const MENTAL_TRAUMAS = [
  { range: [11, 36], name: "None", effects: [] },
  { roll: 41, name: "Confused", effects: [{ dice: -1, attr: "wits" }] },
  { roll: 42, name: "Apathetic", effects: [{ rule: "cannotPush" }] },
  { roll: 43, name: "Reclusive", effects: [{ rule: "noHopeFromTension" }] },
  { roll: 44, name: "Obsessive", effects: [{ rule: "mustPush" }] },
  { roll: 45, name: "Overwhelmed", effects: [{ dice: -2, when: "resisting traumatic events" }] },
  { roll: 46, name: "Alcoholic", effects: [{ rule: "hopeOnlyFrom", source: "alcohol", maxPerDay: 1 }] },
  { roll: 51, name: "Depressed", effects: [{ rule: "cannotBeRallied" }] },
  { roll: 52, name: "Worrisome", effects: [{ rule: "minorConcernsAreTraumatic", hope: 1 }] },
  { roll: 53, name: "Changed personality", effects: [{ rule: "rerollDream" }] },
  { roll: 54, name: "Phobic", effects: [{ rule: "phobia", hope: 2 }] },
  { roll: 55, name: "Speech loss", effects: [{ rule: "cannotSpeak" }] },
  { roll: 56, name: "Nightmares", effects: [{ rule: "traumaticEventPerSleep", hope: 1 }] },
  { roll: 61, name: "Flashbacks", effects: [{ rule: "traumaticLossPlus", value: 1 }] },
  { roll: 62, name: "Panic attacks", effects: [{ rule: "autoBreakdownOnHopeLoss" }] },
  { roll: 63, name: "Violent", effects: [{ rule: "attackInsteadOfFreeze" }] },
  { roll: 64, name: "Psychotic", effects: [{ rule: "hallucinationPerShift", hope: 1 }] },
  { roll: 65, name: "Amnesiac", effects: [{ rule: "roleplayOnly" }] },
  { roll: 66, name: "Personality split", effects: [{ rule: "secondPersonality" }] }
];
// A42 cannotPush and A44 mustPush are mutually exclusive; the later trauma wins.
export const TRAUMA_CONFLICTS = [["cannotPush", "mustPush"]];
export const TRAUMA_CONSENT_NOTE =
  "The book asks groups to agree before using mental trauma. This surface is gated behind a setting.";

// ------------------------------------------------------------- T-24 shared items p.63
export const SHARED_ITEMS = [
  { roll: 11, name: "Tools, general", use: "repair", scope: "any" },
  { roll: 12, name: "Tools, vehicle", use: "repair", scope: "vehicle" },
  { roll: 13, name: "Tools, weapon", use: "repair", scope: "weapon" },
  { roll: 14, name: "Tools, neurocaster", use: "repair", scope: "neurocaster" },
  { roll: 15, name: "First aid kit", use: "stabilize", requiresTalent: "medic" },
  { roll: 16, name: "Surgical instruments", use: "surgeryBonus" },
  { roll: 21, name: "Bottle of hard liquor", hope: { amount: 1, per: "shift", healthCost: 1, uses: 3 } },
  { roll: 22, name: "Binoculars", use: "spotBonus" },
  { roll: 23, name: "Canned food", food: { cansDice: "2d6", personDaysPerCan: 1 } },
  { roll: 24, name: "Clothes, outdoor", use: "coldProtection", capacity: 1 },
  { roll: 25, name: "Musical instrument", use: "empathyBonus", requiresTalent: "musician", time: "stretch" },
  { roll: 26, name: "Dog, pet", hope: { amount: 1, per: "day", time: "stretch" } },
  { roll: 31, name: "Dog, guard", npc: { strength: 5, agility: 4, health: 9, damage: 2 } },
  { roll: 32, name: "Book, fiction", hope: { amount: 1, per: "day", time: "stretch" } },
  { roll: 33, name: "Book, religious", hope: { amount: 1, per: "day", time: "stretch" } },
  { roll: 34, name: "Book, medical", use: "surgeryBonus" },
  { roll: 35, name: "Book, non-fiction", use: "witsBonus" },
  { roll: 36, name: "Newspaper", use: "witsBonus", scope: "current events", uses: 1 },
  { roll: 41, name: "Walkman", hope: { amount: 1, per: "day", time: "stretch" } },
  { roll: 42, name: "Pain reliever", heals: { health: 1, per: "day", uses: 10, notWhenIncapacitated: true } },
  { roll: 43, name: "Crowbar", use: "strengthBonus", weapon: "crowbar" },
  { roll: 44, name: "Sleeping bag", use: "sleepOutdoors", capacity: 1 },
  { roll: 45, name: "Tent", use: "sleepOutdoors", capacity: 4 },
  { roll: 46, name: "Walkie-Talkies", use: "comms", rangeMiles: 1 },
  { roll: 51, name: "Jerrycan", fuelGallons: 5 },
  { roll: 52, name: "Vanadium Redox battery", use: "power" },
  { roll: 53, name: "Knife", weapon: "knife" },
  { roll: 54, name: "Baseball Bat", weapon: "baseballBat" },
  { roll: 55, name: "Taser", weapon: "taser" },
  { roll: 56, name: "Handgun", weapon: "handgun" },
  { roll: 61, name: "Magnum revolver", weapon: "magnumRevolver" },
  { roll: 62, name: "Crossbow", weapon: "crossbow" },
  { roll: 63, name: "Hunting rifle", weapon: "huntingRifle" },
  { roll: 64, name: "Shotgun", weapon: "shotgun" },
  { roll: 65, name: 'Kids Drone "Kid Kosmo"', drone: "kidKosmo" },
  { roll: 66, name: 'Classic Gaming Drone "Wally Wayne"', drone: "wallyWayne" }
];

// ---------------------------------------------------------------- T-46 gear p.109
export const GEAR = [
  { id: "toolsGeneral", name: "Tools, general", bonus: 1, price: 25, use: "repair", scope: "any" },
  { id: "toolsVehicle", name: "Tools, vehicle", bonus: 2, price: 50, use: "repair", scope: "vehicle" },
  { id: "toolsWeapon", name: "Tools, weapon", bonus: 2, price: 100, use: "repair", scope: "weapon" },
  { id: "toolsNeurocaster", name: "Tools, neurocaster", bonus: 2, price: 50, use: "repair", scope: "neurocaster" },
  { id: "firstAidKit", name: "First aid kit", bonus: 3, price: 25, use: "stabilize", requiresTalent: "medic", uses: 5 },
  { id: "surgicalInstruments", name: "Surgical instruments", bonus: 2, price: 100, use: "surgeryBonus" },
  { id: "cigarettes", name: "Pack of cigarettes", bonus: 0, price: 2, hope: { amount: 1, per: "shift", healthCost: 1 }, uses: 4 },
  { id: "beer", name: "Bottle of beer", bonus: 0, price: 2, hope: { amount: 1, per: "day" }, uses: 1, alcohol: true },
  { id: "liquor", name: "Bottle of hard liquor", bonus: 0, price: 5, hope: { amount: 1, per: "shift", healthCost: 1 }, uses: 3, alcohol: true },
  { id: "chewingGum", name: "Pack of chewing gum", bonus: 1, price: 1, use: "empathyBonus", scope: "being cool", uses: 3 },
  { id: "binoculars", name: "Binoculars", bonus: 2, price: 100, use: "spotBonus" },
  { id: "neurine", name: "Neurine", bonus: 0, price: 20, hope: { amount: 1, per: "shift" }, uses: 1,
    addiction: { attr: "wits", onFail: "hopeOnlyFromNeurine" }, alias: "dream glint" },
  { id: "cannedFood", name: "Food, canned", bonus: 0, price: 5, food: { personDays: 1 }, uses: 1 },
  { id: "clothesOutdoor", name: "Clothes, outdoor", bonus: 0, price: 50, use: "coldProtection", capacity: 1 },
  { id: "clothesFine", name: "Clothes, fine", bonus: 1, price: 200, use: "empathyBonus", scope: "impressing" },
  { id: "sleepingBag", name: "Sleeping bag", bonus: 0, price: 25, use: "sleepOutdoors", capacity: 1 },
  { id: "shades", name: "Shades", bonus: 1, price: 20, use: "empathyBonus", scope: "being cool" },
  { id: "musicalInstrument", name: "Musical instrument", bonus: 2, price: 100, use: "empathyBonus", requiresTalent: "musician", time: "stretch" },
  { id: "dogPet", name: "Dog, pet", bonus: 0, price: 100, hope: { amount: 1, per: "day", time: "stretch" } },
  { id: "dogGuard", name: "Dog, guard", bonus: 0, price: 250, npc: { strength: 5, agility: 4, health: 9, damage: 2 } },
  { id: "bookFiction", name: "Book, fiction", bonus: 0, price: 10, hope: { amount: 1, per: "day", time: "stretch" } },
  { id: "bookReligious", name: "Book, religious", bonus: 0, price: 10, hope: { amount: 1, per: "day", time: "stretch" } },
  { id: "bookMedical", name: "Book, medical", bonus: 1, price: 30, use: "surgeryBonus" },
  { id: "bookNonFiction", name: "Book, non-fiction", bonus: 1, price: 20, use: "witsBonus" },
  { id: "newspaper", name: "Newspaper", bonus: 1, price: 0.5, use: "witsBonus", scope: "current events", uses: 1 },
  { id: "walkman", name: "Walkman", bonus: 0, price: 45, hope: { amount: 1, per: "day", time: "stretch" } },
  { id: "sparePart", name: "Spare part", bonus: 0, price: 100, use: "repairInoperableVehicle" },
  { id: "camera", name: "Camera", bonus: 0, price: 200, note: "Needs film." },
  { id: "painReliever", name: "Pain reliever", bonus: 0, price: 3, heals: { health: 1, per: "day", notWhenIncapacitated: true }, uses: 10 },
  { id: "crowbar", name: "Crowbar", bonus: 2, price: 10, use: "strengthBonus", weaponDamage: 1 },
  { id: "tent", name: "Tent", bonus: 0, price: 75, use: "sleepOutdoors", capacity: 4 },
  { id: "walkieTalkies", name: "Walkie-Talkies", bonus: 0, price: 50, use: "comms", rangeMiles: 1 },
  { id: "gasoline", name: "Gasoline (gallon)", bonus: 0, price: 1, fuelGallons: 1 },
  { id: "jerrycan", name: "Jerrycan", bonus: 0, price: 20, fuelGallons: 5 },
  { id: "vanadiumBattery", name: "Vanadium Redox battery", bonus: 0, price: 50, notCommercial: true, use: "power" }
];

// ------------------------------------------------------------- T-51 services
export const SERVICES = [
  { id: "cheapMotel", name: "Cheap motel", price: 20, per: "night" },
  { id: "fancyHotel", name: "Fancy hotel", price: 100, per: "night" },
  { id: "coffeePie", name: "Coffee & pie", price: 5, food: { personDays: 0.5 } },
  { id: "junkFood", name: "Junk food", price: 3, food: { personDays: 1 } },
  { id: "decentMeal", name: "Decent meal", price: 10, food: { personDays: 1 } },
  { id: "fineDining", name: "Fine dining", price: 40, food: { personDays: 1 } },
  { id: "surgery", name: "Surgery", price: 1000, use: "surgeryForCash" }
];

export const REPAIR = { attr: "wits", time: "shift", eachSuccessRestores: 1, requiresTools: true,
  vehicleAtZeroRequires: "sparePart" };

export default { SERIOUS_INJURIES, MENTAL_TRAUMAS, SHARED_ITEMS, GEAR, SERVICES, SURGERY, REPAIR };
