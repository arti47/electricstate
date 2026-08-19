// Rules library (T-27) — one entry per automated surface, so every roller, tracker and
// generator can link to the rule it implements. `id` is the citation key used in src/.

export const LIBRARY = [
  { id: "resolution", title: "Rolling dice", tags: ["core"], page: 16,
    text: "Roll a d6 pool equal to the relevant attribute, plus dice from talents, gear and situation. Any 6 is a success; you only need one. Extra 6s improve the result — in combat each adds 1 damage. You can never roll fewer than one die." },
  { id: "push", title: "Pushing a roll", tags: ["core"], page: 53,
    text: "Once per roll you may re-roll every die not showing a 1 or a 6. All dice count afterwards. Each 1 on a base die costs 1 Hope; each 1 on a gear die reduces that gear's bonus by 1, and gear at bonus 0 is Busted. NPCs never push." },
  { id: "opposed", title: "Opposed rolls", tags: ["core", "combat"], page: 54,
    text: "The active party must roll more 6s than the opponent. Only the active party may push, except in an open opposed roll where both may. A tie in an open opposed roll means a compromise, or a re-roll if none is possible. Between Travelers, both sides add bonus dice equal to the Tension each feels toward the other." },
  { id: "helping", title: "Helping", tags: ["core"], page: 53,
    text: "Up to three others can help, each giving +1 die, where the help is plausible. In combat, helping uses the helper's turn." },
  { id: "health", title: "Health", tags: ["vitals"], page: 54,
    text: "Maximum Health is Strength plus Agility divided by two, rounded up, +2 with the Tough talent. At zero you are Incapacitated." },
  { id: "hope", title: "Hope", tags: ["vitals"], page: 55,
    text: "Maximum Hope is Wits plus Empathy divided by two, rounded up, +2 with the Dreamer talent. Pushing and traumatic events cost Hope. At zero you suffer a Breakdown." },
  { id: "bliss", title: "Bliss", tags: ["vitals", "neuronics"], page: 92,
    text: "Each failed roll inside a neuroscape adds 1 Bliss, counted before any push. If Bliss ever equals or exceeds your current Hope you cannot leave the Electric State on your own. Off-cast, Bliss drops 1 per day, but roll a die per point — on a 1 that point becomes permanent." },
  { id: "tension", title: "Tension", tags: ["social"], page: 64,
    text: "Tension runs 0 to 2 toward each other Traveler and is asymmetric. It adds bonus dice in opposed rolls against that Traveler. Talking it through in a calm scene lowers both sides by 1 and returns 1 Hope each — the main way Hope comes back." },
  { id: "traumaticEvent", title: "Traumatic events", tags: ["vitals"], page: 85,
    text: "The GM sets a potential Hope loss. Roll Empathy; each 6 reduces the loss by 1. Losing any Hope this way also makes you freeze, losing your next turn." },
  { id: "breakdown", title: "Breakdown", tags: ["vitals"], page: 85,
    text: "At zero Hope you can still talk, move and flee, but cannot roll attributes or use talents. Another character can rally you with an Empathy roll, restoring Hope equal to the 6s rolled. Otherwise you recover 1 Hope after a Shift." },
  { id: "zones", title: "Zones and range", tags: ["combat"], page: 78,
    text: "Combat is divided into zones — a room indoors, about 100 feet outdoors. Range runs Engaged, Short, Medium, Long, Extreme. Attacking below a weapon's minimum range costs 2 dice per band; beyond its maximum is impossible." },
  { id: "initiative", title: "Initiative", tags: ["combat"], page: 78,
    text: "The side that starts the fight acts first, in any order, then the other side. If it is unclear, each side rolls a d6 and adds the best Wits on that side; highest total attacks first, re-rolling ties." },
  { id: "actions", title: "Actions and moves", tags: ["combat"], page: 78,
    text: "Each turn gives one move and one action, or two moves, and the move must come first. Minor things like drawing a weapon or speaking are free. A reaction costs your next turn but covers every attack until then." },
  { id: "closeCombat", title: "Close combat", tags: ["combat"], page: 80,
    text: "Roll Strength plus weapon dice at Engaged range. Before dice are rolled the target chooses to take the hit or fight back. Fighting back makes it opposed, and a target who wins deals the damage of the weapon in hand to the attacker. A tie means neither is hurt." },
  { id: "rangedCombat", title: "Ranged combat", tags: ["combat"], page: 80,
    text: "Roll Agility plus weapon dice at Short range or further. The target chooses to stand tall or dodge. Dodging makes it opposed, and a tie means the attack misses." },
  { id: "cover", title: "Cover and armor", tags: ["combat"], page: 80,
    text: "Roll dice equal to the cover's or armor's Armor Level; each 6 cancels 1 damage. Taking cover is an action. Body armor also penalises Agility." },
  { id: "fullAuto", title: "Full auto", tags: ["combat"], page: 81,
    text: "On a hit you may immediately fire another burst, and a third if that hits too. A burst empties the magazine regardless of how many rolls were made. Reloading is an action. Ammunition is otherwise not tracked." },
  { id: "ambush", title: "Ambushes", tags: ["combat"], page: 81,
    text: "An unaware target must take the hit and cannot fight back or dodge. Sneaking into close combat range costs 3 dice. You cannot ambush someone already in active combat." },
  { id: "damage", title: "Damage and Incapacitation", tags: ["combat", "vitals"], page: 82,
    text: "At zero Health you are Incapacitated: you can crawl and mumble but not roll or use talents. A single hit of twice your maximum Health kills outright." },
  { id: "deathRoll", title: "Death rolls", tags: ["vitals"], page: 82,
    text: "While Incapacitated, roll four dice each turn — this cannot be pushed. Accumulate three 6s in total to stabilize; three failed rolls and you die. The Nine lives talent rolls six dice. Any further damage restarts the count." },
  { id: "rally", title: "Rallying and stabilizing", tags: ["vitals"], page: 82,
    text: "Someone in the same zone can rally you with an Empathy roll, restoring Health equal to the 6s rolled, but you still make death rolls. Only a Medic can stabilize, with a Wits roll. Unaided, you rally alone after a Stretch with 1 Health." },
  { id: "seriousInjury", title: "Serious injuries", tags: ["vitals"], page: 84,
    text: "Surviving Incapacitation means rolling on the injury table. Most results carry dice penalties and a healing time in days; four require surgery before any healing starts at all." },
  { id: "surgery", title: "Surgery", tags: ["vitals"], page: 84,
    text: "Surgery takes a Shift and a Wits roll from someone with the Surgeon talent; improvised tools work but proper instruments give gear dice. A failed operation leaves the patient Incapacitated. Paid surgery costs $1,000." },
  { id: "mentalTrauma", title: "Mental trauma", tags: ["vitals"], page: 87,
    text: "A Breakdown you were rallied from may leave lasting trauma. Many results change how you roll — some forbid pushing, some force it. One roll of Wits or Empathy per week to recover." },
  { id: "recovery", title: "Rest and recovery", tags: ["vitals"], page: 84,
    text: "Health returns at 1 per Shift while resting, or 2 under a Nurse's care. Hope only returns by reducing Tension or by using an item, and never more than 1 point per Shift from items. Hunger or sleep deprivation blocks Hope recovery entirely." },
  { id: "hazards", title: "Hazards", tags: ["hazards"], page: 88,
    text: "Explosions roll Blast Power dice, fire rolls Intensity, disease is an opposed Strength roll against Virulence — in each case every 6 is a point of damage. None of these hazard rolls can be pushed." },
  { id: "neurocaster", title: "Wearing a neurocaster", tags: ["neuronics"], page: 90,
    text: "Actions in the real world take 2 fewer dice while wearing one, or 1 fewer with a Stimulus GO. You cannot act in both the real world and the neuroscape in the same round. Plugging into a terminal gives 2 extra dice." },
  { id: "findInformation", title: "Finding information", tags: ["neuronics"], page: 94,
    text: "Difficulty 1 to 3 is the number of successful Wits rolls needed, each taking a Stretch, with the neurocaster's Processor as gear dice. After a failure, further attempts at the same information take a Shift each." },
  { id: "hacking", title: "Hacking systems", tags: ["neuronics"], page: 94,
    text: "Difficulty 1 to 3 is the number of successful Wits rolls needed, with the neurocaster's Network as gear dice, disabling the system for a Stretch. Add 1 to take control, and another 1 to extend to a Shift. Failure usually trips an alarm." },
  { id: "avatars", title: "Avatars", tags: ["neuronics"], page: 97,
    text: "Persuading an avatar uses Empathy with the Graphics attribute as gear dice; opponents resist with Wits and the Network attribute. Avatar combat is close combat at Engaged range but rolls Wits. Damage hits the user's real Health, and being reduced to zero disconnects you with a mental trauma instead of a death roll." },
  { id: "drones", title: "Drones", tags: ["neuronics"], page: 98,
    text: "A piloted drone uses its own Strength and Agility with your Wits and Empathy, and every roll gains gear dice from your neurocaster's Network. Damage reduces the drone's Hull; at zero the operator is disconnected. Every failed roll while piloting adds Bliss." },
  { id: "vehicleStunt", title: "Stunts and accidents", tags: ["vehicles"], page: 103,
    text: "Any special maneuver is a stunt: an Agility roll with the vehicle's Maneuverability as gear dice, using your action. Failure means rolling on the accident table for the terrain." },
  { id: "ramming", title: "Ramming", tags: ["vehicles"], page: 105,
    text: "Ramming works like a ranged attack at Engaged range and the target may dodge. You deal half your vehicle's starting Hull, rounded up, and take half the target's Hull in return. Your movement ends immediately." },
  { id: "chase", title: "Chases", tags: ["vehicles"], page: 106,
    text: "Chases use range categories, not zones, and ignore Speed. Each round opens with an open opposed Agility roll; the winner shifts the range one step per extra 6. Past Extreme the chase ends; at Engaged the pursuer can ram or attack." },
  { id: "repairs", title: "Gear and repairs", tags: ["gear"], page: 108,
    text: "Gear degrades only through pushed rolls, and at bonus zero it is Busted. Repairs need the right tools, a Shift and a Wits roll, restoring 1 point per 6. A vehicle at zero Hull or Maneuverability also needs a spare part." },
  { id: "advancement", title: "Developing your Traveler", tags: ["advancement"], page: 65,
    text: "At each session's debrief, say how you followed your Dream or Flaw. If the table agrees, pick an attribute and roll a die: higher than its current score raises it, equal or lower earns a new talent. Overcoming your Flaw gives three rolls at once and ends all further improvement." },
  { id: "lifecycle", title: "Time and boundaries", tags: ["lifecycle"], page: 16,
    text: "A Round is five to ten seconds, a Stretch five to ten minutes, a Shift five to ten hours, with four Shifts to a day. Healing, hunger, cold and sleep are checked per Shift; Bliss decay and disease are checked per day." },
  { id: "stops", title: "Stops", tags: ["journey"], page: 118,
    text: "A Stop is where play happens: a Blocker keeps the Travelers there, a Situation is already underway, and a Countdown escalates it while the Travelers stay. Leaving usually ends the session." }
];


/**
 * Words this game uses, for someone who has not read the book.
 *
 * The rules above are grouped by subject, which only helps if you already know what the
 * subject is called. This is the other index: one plain sentence per word, so a player who
 * meets "Tilt" or "Blocker" on a screen can find out what it means without leaving the app.
 * `see` points at the fuller rule where there is one.
 */
export const GLOSSARY = [
  // --- who and where
  { term: "Traveler", text: "A player character. You play one at a table, or two to four alone.", see: null },
  { term: "Journey", text: "The whole campaign: one destination, one vehicle, one group. Everything else happens on the way.", see: "stops" },
  { term: "Stop", text: "One adventure. Something blocks the road, a situation is already running, and it gets worse the longer you stay.", see: "stops" },
  { term: "Blocker", text: "The reason you cannot simply drive on. Resolve it and the Stop is over.", see: "stops" },
  { term: "Situation", text: "What was already happening in this place before you arrived. Not aimed at you.", see: "stops" },
  { term: "Countdown", text: "Three steps that fire while you stay at a Stop, each worse than the last. It is the clock on the scene.", see: "stops" },
  { term: "Session", text: "One sitting at the table. It ends with a debrief where Travelers improve.", see: "advancement" },

  // --- the dice
  { term: "Attribute", text: "Strength, Agility, Wits or Empathy, rated 2 to 6. The number is how many dice you roll.", see: "resolution" },
  { term: "Talent", text: "A trick your Traveler is good at. Most add dice to a particular kind of roll; some change a rule outright.", see: null },
  { term: "Archetype", text: "The role you picked at creation — Veteran, Doctor, Drone Pilot and so on. It sets a key attribute and the talents you start from. One per group.", see: null },
  { term: "Dice pool", text: "Every die you roll at once: the attribute, plus talents, gear and anything the situation is worth.", see: "resolution" },
  { term: "Success", text: "A 6. One is enough. Every 6 past the first makes the result better — a point more damage in a fight.", see: "resolution" },
  { term: "Base die", text: "Base dice come from you: your attribute, your talents, the situation. A 1 on one of these after a push costs Hope.", see: "push" },
  { term: "Gear die", text: "Gear dice come from a thing you are holding — a weapon, a tool, a neurocaster. A 1 on one of these after a push breaks the gear a little.", see: "push" },
  { term: "D66", text: "Two dice read as a two-digit number: the first is the tens, so 3 and 4 is 34. It is how the app rolls a 36-row table.", see: null },
  { term: "D100", text: "A roll from 1 to 100, for the app's biggest tables. It rolls it for you.", see: null },
  { term: "Push", text: "Re-roll everything that is not a 1 or a 6, once per roll. It is how you turn a failure around, and it always costs something.", see: "push" },
  { term: "Opposed roll", text: "Two people roll and the one with more 6s wins. In a fight the loser takes the difference as extra damage.", see: "opposed" },
  { term: "Helping", text: "Up to three others can each add a die if the help is plausible. In combat each helper spends a turn on it.", see: "helping" },

  // --- the three numbers
  { term: "Health", text: "Your body. At zero you are Incapacitated and start rolling to survive.", see: "health" },
  { term: "Hope", text: "Your will. It pays for pushing, and at zero you have a Breakdown. It comes back almost only through other people.", see: "hope" },
  { term: "Bliss", text: "How much the network has taken. It rises when neurocasting goes wrong and fades slowly, if at all.", see: "bliss" },
  { term: "Permanent Bliss", text: "Bliss that has stopped fading. It is the floor your Bliss can never drop below.", see: "bliss" },
  { term: "Lost in the Electric State", text: "Bliss has caught up with your current Hope. You cannot leave a neuroscape on your own — someone has to pull the helmet off, and that costs everything.", see: "bliss" },
  { term: "Incapacitated", text: "Health at zero. You can crawl and mumble, nothing else, and you roll for death each turn until someone stabilizes you.", see: "damage" },
  { term: "Breakdown", text: "Hope at zero. You can still move and talk but cannot roll attributes or use talents until someone rallies you.", see: "breakdown" },
  { term: "Death roll", text: "Four dice a turn while Incapacitated, no pushing. Three 6s in total and you stabilize; three rolls with no 6 and you die.", see: "deathRoll" },
  { term: "Rally", text: "An Empathy roll to bring someone back from zero Health or zero Hope. It does not stop the death rolls — only a Medic does that.", see: "rally" },
  { term: "Condition", text: "A serious injury or a mental trauma written on the sheet. Most take dice off particular rolls until healed.", see: "seriousInjury" },
  { term: "Tension", text: "What one Traveler feels toward another, 0 to 2, and not necessarily returned. It adds dice when you two are opposed, and talking it down is the reliable way to get Hope back.", see: "tension" },

  // --- the network
  { term: "Neurocaster", text: "The helmet. Wearing one costs you dice out here and lets you into a neuroscape.", see: "neurocaster" },
  { term: "Neuroscape", text: "A place inside the network. You act in one realm per round and are inert in the other.", see: "avatars" },
  { term: "Neurine", text: "The drug the network runs on. It is the one thing that reliably brings Hope back to an addict, and it is why the addiction holds.", see: "bliss" },
  { term: "Avatar", text: "Someone's body inside a neuroscape. Fighting one is close combat rolled on Wits, and the damage lands on the real person.", see: "avatars" },
  { term: "Difficulty", text: "How many successful rolls a neurocasting task needs — one, two or three, one roll per Stretch.", see: "hacking" },

  // --- fighting
  { term: "Zone", text: "A chunk of the fight you can cross in one move. There is no grid and no measuring.", see: "zones" },
  { term: "Engaged", text: "Close enough to touch. Firearms are clumsy here and hit on Strength rather than Agility.", see: "zones" },
  { term: "Reaction", text: "Fighting back or dodging instead of taking a hit. It answers every attack until your next turn, and costs you that turn.", see: "opposed" },
  { term: "Hull", text: "A machine's Health — a drone body or a vehicle. At zero it stops working and needs repairing, not healing.", see: "drones" },
  { term: "Drone", text: "A machine with a person driving it from elsewhere. A Drone Pilot takes damage as one: no death rolls, no injuries, a repair job.", see: "drones" },

  // --- your story
  { term: "Dream", text: "What your Traveler wants out of life. Acting on it is one of the two ways to improve at a debrief.", see: "advancement" },
  { term: "Flaw", text: "What keeps getting in the way. Acting on it improves you too — and overcoming it for good ends your improvement entirely.", see: "advancement" },
  { term: "Goal", text: "A specific thing this Traveler is trying to achieve on this Journey. Shorter-term than a Dream.", see: null },
  { term: "Threat", text: "Two different things share this word. Your personal Threat is what is coming for you — an enemy, an illness, a debt — and it closes in over three steps. A Threat with a stat block is an antagonist in a fight.", see: null },
  { term: "Kicker", text: "The event that put your Traveler on the road in the first place. One line, written at creation.", see: null },

  // --- time
  { term: "Round", text: "Five to ten seconds. One move and one action each.", see: "lifecycle" },
  { term: "Stretch", text: "Five to ten minutes. The unit for anything that takes a scene — searching a building, one neurocasting roll.", see: "lifecycle" },
  { term: "Shift", text: "Five to ten hours; four to a day. Healing, hunger, cold and sleep are all checked when one ends.", see: "lifecycle" },

  // --- playing alone
  { term: "Solo play", text: "Playing with no GM. You run two to four Travelers and a deck of cards answers the questions a GM would have answered.", see: null },
  { term: "The deck", text: "Fifty-two ordinary cards, used as the pacing clock. Draw when you want input; do not reshuffle until it is spent.", see: null },
  { term: "Tilt", text: "One card that answers is this good or bad, and how much. The suit gives the direction, the rank gives the degree.", see: null },
  { term: "Spotlight", text: "Whichever Traveler is the main character of the current Stop. Rotate it so everyone gets one.", see: null }
];

export const GLOSSARY_BY_TERM = Object.fromEntries(GLOSSARY.map((g) => [g.term.toLowerCase(), g]));

export const BY_ID = Object.fromEntries(LIBRARY.map(e => [e.id, e]));
export default { LIBRARY, BY_ID, GLOSSARY };
