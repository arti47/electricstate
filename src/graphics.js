// Drawn things: dials, the Tension graph, the road of the Journey, the fuel gauge, playing
// cards, archetype glyphs, the neurocaster helmet, vehicle silhouettes, die icons. Every
// one is inline SVG coloured by CSS tokens, carries no text of its own beyond numbers the
// screen already shows, and is either decorative (aria-hidden) or labelled.
import { el } from "./core.js";

const svg = (viewBox, body, attrs = "") =>
  `<svg viewBox="${viewBox}" ${attrs} xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const html = (cls, markup, props = {}) => {
  const node = el("span", { class: cls, ...props });
  node.innerHTML = markup;
  return node;
};
const polar = (cx, cy, r, deg) => {
  const a = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const arc = (cx, cy, r, a0, a1) => {
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

// ---------------------------------------------------------------- ring dial
/**
 * A ring of `max` segments with `value` of them lit: a Countdown, a healing clock, a
 * neurocasting difficulty. `tone` is accent, danger or neuro.
 */
export function ringDial(value, max, { tone = "accent", size = 56, label = "", center = null } = {}) {
  const n = Math.max(1, max), gap = n > 1 ? 10 : 0, step = 360 / n;
  let segs = "";
  for (let i = 0; i < n; i++) {
    segs += `<path class="dial-seg${i < value ? " on" : ""}" d="${arc(32, 32, 26, i * step + gap / 2, (i + 1) * step - gap / 2)}"/>`;
  }
  const mid = center ?? `${value}/${max}`;
  return html(`dial tone-${tone}`, svg("0 0 64 64",
    `${segs}<text x="32" y="36.5" text-anchor="middle">${mid}</text>`, `width="${size}" height="${size}"`),
    { role: "meter", "aria-label": label || `${value} of ${max}`, "aria-valuemin": "0", "aria-valuemax": String(max), "aria-valuenow": String(value) });
}

/** The four Shifts of a day around a dial, the current one lit, sun or moon at its heart. */
export function shiftDial(names, current, day) {
  const idx = Math.max(0, names.indexOf(current));
  let segs = "";
  names.forEach((n, i) => {
    segs += `<path class="dial-seg${i === idx ? " on" : i < idx ? " past" : ""}" d="${arc(40, 40, 32, i * 90 + 6, (i + 1) * 90 - 6)}"/>`;
  });
  const night = idx === 3;
  const glyph = night
    ? `<path class="dial-moon" d="M37 28 A12 12 0 1 0 52 44 A10 10 0 1 1 37 28 Z"/>`
    : `<circle class="dial-sun" cx="40" cy="40" r="${idx === 1 ? 11 : 9}"/>`;
  return html("dial dial-shift", svg("0 0 80 80", segs + glyph, 'width="76" height="76"'),
    { role: "img", "aria-label": `${current}, day ${day}` });
}

// ---------------------------------------------------------------- tension
/**
 * Everyone around a ring, an arrow from each Traveler to each other one. Thin and dashed
 * at 0, amber at 1, heavy rust at 2. Tapping an arrow steps it 0 → 1 → 2 → 0.
 */
export function tensionGraph(chars, onSet) {
  const n = chars.length, C = 160, R = n === 2 ? 92 : 104;
  const pos = chars.map((_, i) => {
    const a = n === 2 ? (i ? 90 : 270) : (360 / n) * i;
    return polar(C, C, R, a);
  });
  let edges = "", hits = "", nodes = "";
  chars.forEach((from, i) => chars.forEach((to, j) => {
    if (i === j) return;
    const v = from.tension?.[to.id] ?? 0;
    const [x1, y1] = pos[i], [x2, y2] = pos[j];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const sx = x1 + ux * 30 + nx * 7, sy = y1 + uy * 30 + ny * 7;
    const ex = x2 - ux * 34 + nx * 7, ey = y2 - uy * 34 + ny * 7;
    const cx = (sx + ex) / 2 + nx * 16, cy = (sy + ey) / 2 + ny * 16;
    const d = `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    edges += `<path class="t-edge t-${v}" d="${d}" marker-end="url(#t-head-${v})"/>`;
    const mx = 0.25 * sx + 0.5 * cx + 0.25 * ex, my = 0.25 * sy + 0.5 * cy + 0.25 * ey;
    edges += `<g class="t-badge t-${v}"><circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="9"/><text x="${mx.toFixed(1)}" y="${(my + 3.6).toFixed(1)}" text-anchor="middle">${v}</text></g>`;
    hits += `<path class="t-hit" d="${d}" data-from="${from.id}" data-to="${to.id}" data-v="${v}" tabindex="0" role="button" aria-label="${esc(from.name)} tension ${v} toward ${esc(to.name)} — tap to change"/>`;
  }));
  chars.forEach((c, i) => {
    const [x, y] = pos[i];
    const initials = String(c.name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    nodes += `<g class="t-node"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="24"/><text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle">${esc(initials)}</text>` +
      `<text class="t-name" x="${x.toFixed(1)}" y="${(y + (y > C ? 40 : -32)).toFixed(1)}" text-anchor="middle">${esc(c.name || "Unnamed")}</text></g>`;
  });
  const heads = [0, 1, 2].map((v) => `<marker id="t-head-${v}" class="t-head t-${v}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="${v === 2 ? 3.4 : 5}" markerHeight="${v === 2 ? 3.4 : 5}" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z"/></marker>`).join("");
  // Two people sit side by side; a square field would leave a band of empty space above
  // and below them.
  const box = n === 2 ? "0 92 320 136" : "0 0 320 320";
  const node = html("tgraph", svg(box, `<defs>${heads}</defs>${edges}${nodes}${hits}`));
  const act = (e) => {
    const t = e.target.closest(".t-hit");
    if (!t) return;
    onSet(t.dataset.from, t.dataset.to, (Number(t.dataset.v) + 1) % 3);
  };
  node.addEventListener("click", act);
  node.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(e); } });
  return node;
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------------------------------------------------------------- journey
/**
 * The Journey as a road: where you set out, a node per Stop (played, current, still to
 * come), the destination flag, and the vehicle wherever you have got to.
 */
export function routeStrip({ planned = 0, played = 0, current = false }) {
  const total = Math.max(planned, played + (current ? 1 : 0), 1);
  const x0 = 22, x1 = 338, y = 40;
  const at = (i) => x0 + ((x1 - x0) * (i + 1)) / (total + 1);
  let stops = "";
  for (let i = 0; i < total; i++) {
    const cls = i < played ? "done" : i === played && current ? "here" : "todo";
    stops += `<circle class="r-stop r-${cls}" cx="${at(i).toFixed(1)}" cy="${y}" r="${cls === "here" ? 7 : 5.5}"/>`;
  }
  const carX = played + (current ? 1 : 0) === 0 ? x0 : at(Math.min(total - 1, played - (current ? 0 : 1)));
  const car = `<g class="r-car" transform="translate(${(carX - 11).toFixed(1)} ${y - 26})"><path d="M2 12 L5 6 Q6 4 8 4 L15 4 Q17 4 18 6 L21 12 Z"/><rect x="0" y="11" width="22" height="6" rx="2"/><circle cx="5" cy="17.5" r="2.4"/><circle cx="17" cy="17.5" r="2.4"/></g>`;
  const road = `<path class="r-road" d="M${x0} ${y} L${x1} ${y}"/><path class="r-dash" d="M${x0} ${y} L${x1} ${y}"/>`;
  const start = `<circle class="r-start" cx="${x0}" cy="${y}" r="6"/>`;
  const flag = `<g class="r-flag"><path d="M${x1} ${y + 6} L${x1} ${y - 22}"/><path class="r-cloth" d="M${x1} ${y - 22} L${x1 + 14} ${y - 17} L${x1} ${y - 12} Z"/></g>`;
  return html("route", svg("0 0 360 60", road + start + stops + flag + car, 'preserveAspectRatio="xMidYMid meet"'),
    { role: "img", "aria-label": `Journey: ${played} Stop${played === 1 ? "" : "s"} played${planned ? ` of about ${planned}` : ""}` });
}

/** A fuel gauge: E to F on a half dial, the needle where the tank is. */
export function fuelDial(fuel, tank) {
  const f = Math.max(0, Math.min(1, (fuel || 0) / (tank || 1)));
  const deg = -90 + f * 180;
  let ticks = "";
  for (let i = 0; i <= 8; i++) {
    const a = -90 + i * 22.5, [xa, ya] = polar(50, 52, 40, a), [xb, yb] = polar(50, 52, i % 4 ? 35 : 31, a);
    ticks += `<path class="f-tick" d="M${xa.toFixed(1)} ${ya.toFixed(1)} L${xb.toFixed(1)} ${yb.toFixed(1)}"/>`;
  }
  const [nx, ny] = polar(50, 52, 34, deg);
  return html("fuel" + (f <= 0.1 ? " is-low" : ""), svg("0 0 100 60",
    `<path class="f-arc" d="${arc(50, 52, 42, -90, 90)}"/><path class="f-red" d="${arc(50, 52, 42, -90, -72)}"/>${ticks}` +
    `<text x="12" y="58">E</text><text x="82" y="58">F</text>` +
    `<path class="f-needle" d="M50 52 L${nx.toFixed(1)} ${ny.toFixed(1)}"/><circle class="f-hub" cx="50" cy="52" r="3.5"/>`, 'width="92" height="56"'),
    { role: "meter", "aria-label": "Fuel", "aria-valuemin": "0", "aria-valuemax": String(tank), "aria-valuenow": String(fuel ?? 0) });
}

// ---------------------------------------------------------------- cards
const SUIT_PATH = {
  spades: "M12 3 C16 8 21 10 21 14 C21 17 18 18.5 15.5 17 L16.5 21 L7.5 21 L8.5 17 C6 18.5 3 17 3 14 C3 10 8 8 12 3 Z",
  hearts: "M12 20 C6 15 3 12 3 8.5 C3 5.5 5.5 4 7.7 4 C9.6 4 11 5.2 12 7 C13 5.2 14.4 4 16.3 4 C18.5 4 21 5.5 21 8.5 C21 12 18 15 12 20 Z",
  diamonds: "M12 2 L20 12 L12 22 L4 12 Z",
  clubs: "M12 3 A4 4 0 0 1 15.6 8.6 A4 4 0 1 1 14 15 L15.5 21 L8.5 21 L10 15 A4 4 0 1 1 8.4 8.6 A4 4 0 0 1 12 3 Z"
};
const RED = new Set(["hearts", "diamonds"]);
const FACE = new Set(["J", "Q", "K"]);

/** A card face: rank and suit in the corners, the suit large, or a crown on a face card. */
export function playingCard(card, { flip = true } = {}) {
  const suit = `<path d="${SUIT_PATH[card.suit] || ""}"/>`;
  const centre = FACE.has(String(card.rank))
    ? `<g class="pc-face"><path d="M18 30 L22 20 L28 27 L32 16 L36 27 L42 20 L46 30 Z"/><rect x="18" y="31" width="28" height="4" rx="1"/><g transform="translate(20 40) scale(1)">${suit}</g></g>`
    : String(card.rank) === "A"
      ? `<g transform="translate(14 22) scale(1.5)">${suit}</g>`
      : `<g transform="translate(17 26) scale(1.25)">${suit}</g>`;
  const corner = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><text x="0" y="0" text-anchor="middle">${esc(card.rank)}</text><g transform="translate(-4 3) scale(.34)">${suit}</g></g>`;
  return html(`pcard${RED.has(card.suit) ? " is-red" : ""}${flip ? " is-flipping" : ""}`,
    svg("0 0 64 90", `<rect class="pc-paper" x="1" y="1" width="62" height="88" rx="6"/>${corner(9, 14, 0)}${corner(55, 76, 180)}${centre}`, 'width="88" height="124"'),
    { role: "img", "aria-label": `${card.rank} of ${card.suit}` });
}

/** The deck as a stack that thins as it is drawn down. */
export function deckStack(left, total = 52) {
  const layers = left <= 0 ? 0 : Math.max(1, Math.ceil((left / total) * 5));
  let body = "";
  for (let i = layers - 1; i >= 0; i--) {
    body += `<rect class="ds-card" x="${4 + i * 2.2}" y="${4 + i * 2.2}" width="44" height="62" rx="4"/>`;
  }
  if (layers) body += `<path class="ds-mark" d="M17 30 A9 9 0 1 1 35 30 A9 9 0 1 1 17 30 M26 39 L26 48 M21 48 L31 48"/>`;
  else body = `<rect class="ds-empty" x="4" y="4" width="44" height="62" rx="4"/>`;
  return html("deckstack", svg("0 0 62 80", body, 'width="62" height="80"'), { "aria-hidden": "true" });
}

// ---------------------------------------------------------------- archetypes
const GLYPH = {
  artist: '<path d="M4 20c2.5 0 4-1.2 4-3.4 0-1.6 1.2-2.8 2.8-2.8 1.8 0 3 1.4 2.6 3.2"/><path d="M11.5 13.2 20 4.7a1.6 1.6 0 0 0-2.3-2.3l-8.5 8.5"/>',
  criminal: '<path d="M5 21 18.5 6.5"/><path d="M18.5 6.5c1-1.3 2.6-1.4 3-.4.3.8-.4 1.6-1.4 1.5"/><path d="M5 21c-1.3.2-2-.7-1.6-1.8"/>',
  devotee: '<rect x="9" y="11" width="6" height="10" rx="1"/><path d="M12 11V9"/><path d="M12 3c2 2.2 2.2 4 0 6-2.2-2-2-3.8 0-6Z"/>',
  doctor: '<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5Z"/>',
  dronePilot: '<rect x="9" y="10" width="6" height="4" rx="1"/><path d="M9 11 5.5 7.5M15 11l3.5-3.5M9 13l-3.5 3.5M15 13l3.5 3.5"/><circle cx="5" cy="7" r="2.4"/><circle cx="19" cy="7" r="2.4"/><circle cx="5" cy="17" r="2.4"/><circle cx="19" cy="17" r="2.4"/>',
  investigator: '<circle cx="10" cy="10" r="5.5"/><path d="m14 14 6 6"/>',
  outsider: '<path d="M3 20 12 4l9 16Z"/><path d="M12 12v8M9.5 20l2.5-5 2.5 5"/>',
  runawayKid: '<path d="M7 7a5 5 0 0 1 10 0v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z"/><path d="M9.5 13h5M10 5V3.5h4V5"/>',
  scientist: '<path d="M9.5 3h5M10.5 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L13.5 9V3"/><path d="M7.5 15h9"/>',
  veteran: '<rect x="7" y="8" width="10" height="13" rx="3"/><circle cx="12" cy="11" r=".9" fill="currentColor"/><path d="M12 8V5M9 2.5l3 2.5 3-2.5"/>'
};

/** One line glyph per archetype: a brush, a crowbar, a candle, a drone… */
export function archetypeGlyph(id, size = 28) {
  return html("glyph", svg("0 0 24 24", GLYPH[id] || '<circle cx="12" cy="12" r="8"/>',
    `width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`),
    { "aria-hidden": "true" });
}

// ---------------------------------------------------------------- neurocaster
/**
 * The helmet, with its three ratings as bars on the visor. It glitches when Bliss has
 * come within one of Hope, and burns rust once it has caught it.
 */
export function helmetGraphic({ processor = 0, network = 0, graphics = 0, max = {} } = {}, { worn = false, near = false, lost = false } = {}) {
  const bar = (i, v, m) => {
    const w = 28 * Math.max(0, Math.min(1, v / (m || 1)));
    return `<rect class="h-track" x="62" y="${21 + i * 11}" width="28" height="5" rx="2"/><rect class="h-bar" x="62" y="${21 + i * 11}" width="${w.toFixed(1)}" height="5" rx="2"/>`;
  };
  const body = `<path class="h-shell" d="M8 44 C8 20 22 8 38 8 C52 8 58 18 58 30 L58 44 Q58 50 52 50 L14 50 Q8 50 8 44 Z"/>
    <path class="h-visor" d="M14 30 Q34 24 54 30 L54 38 Q34 33 14 38 Z"/>
    <path class="h-cable" d="M30 50 Q30 58 22 60"/>
    <circle class="h-led" cx="48" cy="16" r="2"/>
    ${bar(0, processor, max.processor)}${bar(1, network, max.network)}${bar(2, graphics, max.graphics)}`;
  return html(`helmet${worn ? " is-worn" : ""}${near ? " is-near" : ""}${lost ? " is-lost" : ""}`,
    svg("0 0 96 64", body, 'width="120" height="80"'), { "aria-hidden": "true" });
}

// ---------------------------------------------------------------- vehicles
const VEHICLE_SHAPE = {
  car: '<path d="M10 30 L18 20 Q20 18 24 18 L48 18 Q52 18 55 21 L62 28 L74 30 Q78 31 78 35 L78 40 L6 40 L6 34 Q6 31 10 30 Z"/><circle cx="20" cy="41" r="6"/><circle cx="62" cy="41" r="6"/>',
  pickup: '<path d="M6 30 L6 40 L80 40 L80 30 L44 30 L44 18 L26 18 Q22 18 20 21 L14 30 Z"/><circle cx="20" cy="41" r="6"/><circle cx="66" cy="41" r="6"/>',
  van: '<path d="M8 14 L56 14 Q60 14 64 20 L74 30 Q78 31 78 35 L78 40 L6 40 L6 16 Q6 14 8 14 Z"/><circle cx="20" cy="41" r="6"/><circle cx="64" cy="41" r="6"/>',
  truck: '<path d="M4 10 L50 10 L50 40 L4 40 Z"/><path d="M52 18 L66 18 Q70 18 72 22 L78 30 L78 40 L52 40 Z"/><circle cx="16" cy="41" r="6"/><circle cx="36" cy="41" r="6"/><circle cx="68" cy="41" r="6"/>',
  bus: '<path d="M4 12 L74 12 Q80 12 80 18 L80 40 L4 40 Z"/><circle cx="18" cy="41" r="6"/><circle cx="66" cy="41" r="6"/>',
  bike: '<circle cx="18" cy="36" r="9"/><circle cx="66" cy="36" r="9"/><path d="M18 36 L32 22 L52 22 L66 36 M32 22 L42 36 L52 22 M50 16 L56 16 M28 18 L36 18" fill="none" stroke-width="3"/>',
  boat: '<path d="M4 30 L80 30 L70 42 L12 42 Z"/><path d="M30 30 L30 18 L50 18 L56 30 Z"/>',
  air: '<path d="M4 26 L60 24 Q76 24 80 28 Q76 32 60 32 L4 30 Z"/><path d="M30 25 L44 8 L50 8 L44 25 M30 31 L44 44 L50 44 L44 31 M6 26 L4 16 L10 16 L16 26"/>',
  wagon: '<path d="M14 18 Q40 6 66 18 L66 34 L14 34 Z"/><circle cx="22" cy="38" r="7"/><circle cx="58" cy="38" r="7"/>'
};
const SHAPE_FOR = (id = "") =>
  /motor|bike|bicycle/i.test(id) ? "bike" : /pickup/i.test(id) ? "pickup" : /van/i.test(id) ? "van"
    : /truck/i.test(id) ? "truck" : /bus/i.test(id) ? "bus" : /boat|row|sail/i.test(id) ? "boat"
      : /heli|plane|drone/i.test(id) ? "air" : /horse|wagon/i.test(id) ? "wagon" : "car";

/** The Journey's vehicle as a silhouette, with its Hull as a bar beneath. */
export function vehicleArt(vehicle, { hull = null, max = null } = {}) {
  const shape = VEHICLE_SHAPE[SHAPE_FOR(vehicle?.id || vehicle?.name)];
  const m = max ?? vehicle?.hull ?? 0, h = hull ?? m;
  const bar = m ? `<rect class="v-track" x="6" y="52" width="72" height="4" rx="2"/><rect class="v-bar${h / m <= 0.34 ? " is-low" : ""}" x="6" y="52" width="${(72 * Math.max(0, h) / m).toFixed(1)}" height="4" rx="2"/>` : "";
  return html("vehicle", svg("0 0 84 58", `<g class="v-body">${shape}</g>${bar}`, 'width="132" height="92"'), { "aria-hidden": "true" });
}

// ---------------------------------------------------------------- dice
/** A small die for a table-roll button: one d6, two for D66, a ten-sider for D100. */
export function dieIcon(kind) {
  const d6 = (x, y, pips) => `<rect x="${x}" y="${y}" width="11" height="11" rx="2.4"/>` +
    pips.map(([px, py]) => `<circle cx="${x + px}" cy="${y + py}" r="1.1" fill="currentColor" stroke="none"/>`).join("");
  const body = kind === "66" ? d6(1, 6, [[3, 3], [8, 8]]) + d6(12, 6, [[3, 3], [5.5, 5.5], [8, 8]])
    : kind === "100" ? '<path d="M12 2 L21 9 L18 20 L6 20 L3 9 Z M12 2 L12 9 M3 9 L12 9 L21 9 M12 9 L6 20 M12 9 L18 20"/>'
      : d6(6, 6, [[3, 3], [8, 3], [5.5, 5.5], [3, 8], [8, 8]]);
  return html("die-icon", svg("0 0 24 24", body, 'width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"'), { "aria-hidden": "true" });
}

/** The mark a success leaves: an amber seal stamped with a six. */
export function successSeal() {
  const pips = [[24, 22], [24, 32], [24, 42], [40, 22], [40, 32], [40, 42]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`).join("");
  return html("seal", svg("0 0 64 64", `<circle class="seal-ring" cx="32" cy="32" r="28"/><circle class="seal-inner" cx="32" cy="32" r="22"/>${pips}`, 'width="64" height="64"'), { "aria-hidden": "true" });
}

/** And the mark a failure leaves: a line of dead static. */
export function failureStatic() {
  let d = "M0 10";
  for (let x = 4; x <= 200; x += 4) d += ` L${x} ${10 + ((x * 7919) % 13) - 6}`;
  return html("static", svg("0 0 200 20", `<path d="${d}"/>`, 'preserveAspectRatio="none" width="100%" height="20"'), { "aria-hidden": "true" });
}

// ---------------------------------------------------------------- pool preview
/**
 * The pool about to be thrown, before it is: your attribute's dice, the dice talents and
 * Tension add (lit), the ones penalties take away (struck), and the gear dice (rimmed).
 */
export function poolPreview({ attr = 0, boost = 0, penalty = 0, gear = 0 }) {
  const row = el("div", { class: "pool-strip", "aria-hidden": "true" });
  const own = attr + boost;
  for (let i = 0; i < own; i++) {
    const struck = i >= own - penalty;
    row.append(el("span", { class: "ghost" + (i >= attr ? " is-boost" : "") + (struck ? " is-struck" : "") }));
  }
  // A pool never drops below one die: penalties past that leave one standing.
  if (own - penalty < 1) row.append(el("span", { class: "ghost is-floor" }));
  if (gear) row.append(el("span", { class: "dice-sep" }));
  for (let i = 0; i < gear; i++) row.append(el("span", { class: "ghost is-gear" }));
  return row;
}

// ---------------------------------------------------------------- hazards
const HAZARD = {
  explosion: '<path d="M32 6 L37 22 L52 14 L44 29 L60 33 L44 38 L52 53 L37 44 L32 58 L27 44 L12 53 L20 38 L4 33 L20 29 L12 14 L27 22 Z"/><circle class="hz-core" cx="32" cy="33" r="7"/>',
  fire: '<path d="M32 58 C18 58 12 48 14 38 C16 30 22 26 22 18 C28 22 30 28 30 32 C34 26 36 18 34 8 C46 16 52 28 50 40 C49 51 42 58 32 58 Z"/><path class="hz-core" d="M32 56 C26 56 23 51 24 46 C25 42 28 40 29 36 C32 39 33 42 33 44 C36 41 37 38 37 35 C42 40 43 46 41 50 C39 54 36 56 32 56 Z"/>',
  falling: '<circle cx="30" cy="12" r="5"/><path d="M30 18 L28 34 M28 22 L18 16 M28 22 L40 18 M28 34 L20 46 M28 34 L36 44" fill="none" stroke-width="4" stroke-linecap="round"/><path class="hz-core" d="M48 20 L48 50 M42 44 L48 52 L54 44" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
  disease: '<circle cx="32" cy="32" r="14"/><path d="M32 8v10M32 46v10M8 32h10M46 32h10M15 15l7 7M42 42l7 7M15 49l7-7M42 22l7-7" fill="none" stroke-width="3.5" stroke-linecap="round"/><circle class="hz-core" cx="27" cy="29" r="3"/><circle class="hz-core" cx="37" cy="36" r="2.5"/>'
};
/** A blast, a flame, a falling figure, a virus. */
export function hazardArt(kind, size = 44) {
  return html(`hazard-art hz-${kind}`, svg("0 0 64 64", HAZARD[kind] || "", `width="${size}" height="${size}"`), { "aria-hidden": "true" });
}
