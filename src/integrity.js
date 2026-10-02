// The links between the parts of a saved game, checked and kept whole.
//
// A campaign is one object, but its parts point at each other: a fight lists Travelers by
// id and copies their names, Tension is keyed by the other Traveler's id, the solo record
// names whoever leads, the Journey says which Stop is active and the session director says
// which Stop it is narrating, the Journey's damaged Hull belongs to one particular vehicle.
// Delete, rename or swap the thing pointed at and the pointer is left dangling — which is
// how Play once said "Ready when you are" three Countdown steps into a Stop.
//
// `checkLinks` lists every broken link; `repairLinks` mends them in place. The store runs
// the repair on every write, so no screen can leave the game in a state another screen
// misreads. Pure functions over plain data, no imports, so the tests can call them alone.

/** Every link in one campaign that points at nothing, or copies something that changed. */
export function checkLinks(c) {
  const problems = [];
  const chars = c?.characters || {};
  const ids = new Set(Object.keys(chars));
  const j = c?.journey || null;

  // Tension toward a Traveler who is gone, or toward yourself.
  for (const [id, ch] of Object.entries(chars)) {
    for (const other of Object.keys(ch.tension || {})) {
      if (!ids.has(other) || other === id) problems.push({ link: "tension", from: id, to: other });
    }
  }

  if (j) {
    // The fight: Travelers who no longer exist, and names copied before a rename.
    for (const x of j.combat?.combatants || []) {
      if (x.kind !== "traveler") continue;
      if (!ids.has(x.id)) problems.push({ link: "combatant", id: x.id });
      else if ((chars[x.id].name || "Unnamed") !== x.name) problems.push({ link: "combatant-name", id: x.id });
    }

    // Stops: the active one, and the one the session director is narrating.
    const stopIds = new Set((j.stops || []).map((s) => s.id));
    if (j.activeStopId && !stopIds.has(j.activeStopId)) problems.push({ link: "active-stop", id: j.activeStopId });
    if (j.director?.stopId && !stopIds.has(j.director.stopId)) problems.push({ link: "director-stop", id: j.director.stopId });

    // The Hull damage belongs to the vehicle that took it.
    if (!j.vehicle && (j.hull != null || j.chase)) problems.push({ link: "vehicle-state" });
    if (j.vehicle && j.hull != null && (j.hull > j.vehicle.hull || j.hull < 0)) problems.push({ link: "hull-range" });

    // Solo: who leads, who has led, whose personal Threat is running.
    const solo = j.solo;
    if (solo?.leadId && !ids.has(solo.leadId)) problems.push({ link: "solo-lead", id: solo.leadId });
    for (const id of Object.keys(solo?.ledStops || {})) if (!ids.has(id)) problems.push({ link: "solo-led", id });
    for (const id of Object.keys(solo?.personalThreats || {})) {
      if (id !== "party" && !ids.has(id)) problems.push({ link: "solo-threat", id });
    }
  }
  return problems;
}

/** Mend every broken link in place. Returns how many it fixed. */
export function repairLinks(c) {
  const problems = checkLinks(c);
  if (!problems.length) return 0;
  const chars = c.characters || {};
  const j = c.journey;

  for (const p of problems) {
    switch (p.link) {
      case "tension": {
        const t = { ...(chars[p.from].tension || {}) };
        delete t[p.to];
        chars[p.from].tension = t;
        break;
      }
      case "combatant":
        j.combat.combatants = j.combat.combatants.filter((x) => !(x.kind === "traveler" && x.id === p.id));
        break;
      case "combatant-name":
        j.combat.combatants = j.combat.combatants.map((x) =>
          (x.kind === "traveler" && x.id === p.id ? { ...x, name: chars[p.id].name || "Unnamed" } : x));
        break;
      case "active-stop":
        j.activeStopId = null;
        break;
      case "director-stop":
        // The Stop it was telling is gone; start again rather than narrate nothing.
        j.director = { ...j.director, beat: "idle", stopId: null, now: null };
        break;
      case "vehicle-state":
        j.hull = null; j.chase = null;
        break;
      case "hull-range":
        j.hull = Math.max(0, Math.min(j.vehicle.hull, j.hull));
        break;
      case "solo-lead":
        j.solo = { ...j.solo, leadId: null };
        break;
      case "solo-led": {
        const led = { ...j.solo.ledStops };
        delete led[p.id];
        j.solo = { ...j.solo, ledStops: led };
        break;
      }
      case "solo-threat": {
        const map = { ...j.solo.personalThreats };
        delete map[p.id];
        j.solo = { ...j.solo, personalThreats: map };
        break;
      }
    }
  }
  return problems.length;
}
