// Vehicle operation, accidents, ramming and chases (T-45).
// Vehicle stats themselves live in data.js (VEHICLES, VEHICLE_TRAITS, FUEL).

export const STUNTS = {
  attr: "agility", gear: "maneuverability", costsAction: true,
  examples: ["jumping", "driving through hard terrain", "breaking through something", "hitting something"],
  onFail: "accident",
  otherActionsWhileDriving: -2
};

export const ACCIDENTS = {
  road: [
    { d6: 1, name: "Skid", effect: "Everyone inside gets –2 to all actions for the rest of the round." },
    { d6: 2, name: "Spin", effect: "The driver makes another Agility roll (not an action). On a failure, roll again on this table with +2." },
    { d6: 3, name: "Blowout", effect: "Maneuverability reduced by 1." },
    { d6: 4, name: "Collision", effect: "The vehicle crashes into something solid and takes damage equal to its own Speed rating." },
    { d6: 5, name: "Flip", effect: "The vehicle flips onto its side. Righting it takes an action and a Strength roll (bicycles and motorcycles need only the action)." },
    { d6: "6+", name: "Tumble", effect: "The vehicle tumbles and is Wrecked. Everyone in or on it takes damage equal to the Speed rating, reducible by an Agility roll (not an action), 1 per success. Vehicle armor gives no protection." }
  ],
  boat: [
    { d6: 1, name: "Splash", effect: "Everyone aboard gets –2 to all actions for the rest of the round." },
    { d6: 2, name: "Broach", effect: "The driver makes another Agility roll (not an action). On a failure, roll again with +2." },
    { d6: 3, name: "Capsize", effect: "The boat flips. Righting it takes an action and a Strength roll at –2 dice, one attempt per round." },
    { d6: 4, name: "Engine loss", effect: "Maneuverability reduced to zero." },
    { d6: 5, name: "Collision", effect: "The boat strikes something solid and takes damage equal to its Speed rating." },
    { d6: "6+", name: "Sinking", effect: "Everyone aboard takes damage equal to the Speed rating, reducible by an Agility roll. The boat sinks on the driver's next turn." }
  ],
  air: [
    { d6: 1, name: "Roll", effect: "Everyone aboard gets –2 to all actions for the rest of the round." },
    { d6: 2, name: "Spiral dive", effect: "Altitude drops one zone. Reaching the ground uses the road accident results." },
    { d6: 3, name: "Spin", effect: "The pilot makes another Agility roll (not an action). On a failure, roll again with +2 on the pilot's next turn." },
    { d6: 4, name: "Engine loss", effect: "Maneuverability reduced to zero; the aircraft loses one zone of altitude per round from the pilot's next turn. A controlled landing is possible." },
    { d6: 5, name: "Stall", effect: "Altitude drops two zones, and the pilot must make another Agility roll to regain control." },
    { d6: "6+", name: "Crash", effect: "The aircraft comes down." }
  ]
};
export const ACCIDENT_REROLL_MODIFIER = 2;

export const RAMMING = {
  range: "engaged", attr: "agility", gear: "maneuverability",
  targetMayReact: true,                       // stand tall or dodge, even when in a vehicle
  damageToTarget: "ceil(ownStartingHull / 2)",
  damageToSelf: "ceil(targetHull / 2)",
  movementEndsAfter: true,
  armorApplies: true
};

export const VEHICLE_DAMAGE = {
  wreckedAt: "damage >= hull",
  componentDamageThreshold: "damage >= ceil(hull / 2) in a single hit",
  secondComponentDamageWrecks: true,
  maneuverabilityIsGearBonus: true,           // degrades on pushed 1s like any gear
  inoperableWhen: ["hull == 0", "maneuverability == 0"],
  shootingAtOccupants: { minRange: "short", occupantGains: "vehicleArmor" }
};

export const COMPONENT_DAMAGE = [
  { d6: 1, name: "Driver hit", effect: "The driver suffers damage equal to that inflicted on the vehicle." },
  { d6: 2, name: "Passenger hit", effect: "A random passenger suffers damage equal to that inflicted on the vehicle. Re-roll if there are none." },
  { d6: 3, name: "Severe spin", effect: "The driver makes an immediate Agility roll (not an action); failure Wrecks the vehicle." },
  { d6: 4, name: "Weapon disabled", effect: "A random mounted weapon is disabled. Re-roll if there are none." },
  { d6: 5, name: "Engine disabled", effect: "Maneuverability reduced to zero." },
  { d6: 6, name: "Fuel explosion", effect: "The vehicle is destroyed in an Intensity 8 fire." }
];

// Chases use range categories only — no zones, and Speed is not used.
export const CHASE = {
  usesZones: false, usesSpeed: false,
  startingRangeMax: "long",
  movement: { openOpposed: true, attr: "agility", gear: "maneuverability", bothMayPush: true },
  rangeShiftPerExtraSuccess: 1,
  beyondExtreme: "chase ends",
  atEngaged: "pursuer may ram (vehicle) or make a close combat attack (on foot)",
  belowEngaged: "pursuer may stay Engaged or overtake and become the prey",
  actionOrder: ["preySide", "pursuerSide"],
  unrelatedActionPenalty: -2,
  obstacleRollTiming: "start of each round, resolved before the movement roll; prey rolls first"
};

export const CHASE_OBSTACLES = [
  { range: [11, 36], name: "The road is clear!", effect: null },
  { range: [41, 42], name: "Dead end!", effect: "The prey must double back, automatically failing this round's chase movement roll. No push possible." },
  { range: [43, 44], name: "Downpour!", effect: "Visibility drops for the rest of the chase: all further Agility rolls to control a vehicle get –1 die." },
  { range: [45, 46], name: "Pedestrians!", effect: "Only the prey rolls Agility; failure causes an accident." },
  { range: [51, 52], name: "Roadworks!", effect: "Both prey and pursuer roll Agility; failure causes an accident." },
  { range: [53, 54], name: "Huge potholes!", effect: "Both roll Agility; failure inflicts 1 damage to the vehicle, armor gives no protection." },
  { range: [55, 56], name: "Oil slick!", effect: "Both roll Agility; failure causes a spin (road accident result 2)." },
  { range: [61, 62], name: "Fallen tree!", effect: "Both roll Agility; failure inflicts damage equal to the vehicle's own Speed rating." },
  { range: [63, 64], name: "Wildlife!", effect: "The prey rolls Agility; failure causes an accident. If the prey succeeds, the pursuer must also roll." },
  { range: [65, 66], name: "Dust storm!", effect: "Visibility severely reduced for the rest of the chase: all further Agility rolls to control a vehicle get –2 dice." }
];

export default { STUNTS, ACCIDENTS, RAMMING, VEHICLE_DAMAGE, COMPONENT_DAMAGE, CHASE, CHASE_OBSTACLES };
