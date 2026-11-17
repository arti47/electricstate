// The landscape behind the app: a road running to the horizon, power pylons and their
// wires, a derelict giant on the far ridge, fog lying in the low ground. Flat silhouettes
// drawn here as inline SVG, tinted entirely by CSS tokens, so there is no image to load and
// nothing to license. The sky follows the Journey's Shift — Morning, Day, Evening, Night.
//
// The same drawing, cropped and tinted per phase, is the scene band on the session screen.
import { SHIFT_NAMES } from "../data.js";

// ------------------------------------------------------------------ drawing
// Everything is drawn on a 400×160 field with the horizon at y=112.
const H = 112;

/** A lattice pylon standing on the ground at x, h tall. */
function pylon(x, h, light = true) {
  const top = H + 4 - h, w = h * 0.22, arm = h * 0.34;
  const legs = `M${x - w} ${H + 4} L${x - w * 0.18} ${top} L${x + w * 0.18} ${top} L${x + w} ${H + 4} Z`;
  const lattice = [0.25, 0.5, 0.72].map((t) => {
    const y = top + h * t, half = w * (0.18 + 0.82 * t);
    return `M${x - half} ${y} L${x + half} ${y}`;
  }).join(" ");
  const cross = `M${x - w * 0.75} ${H + 4 - h * 0.25} L${x + w * 0.5} ${top + h * 0.5} M${x + w * 0.75} ${H + 4 - h * 0.25} L${x - w * 0.5} ${top + h * 0.5}`;
  const arms = `M${x - arm} ${top + h * 0.12} L${x + arm} ${top + h * 0.12} M${x - arm * 0.7} ${top + h * 0.3} L${x + arm * 0.7} ${top + h * 0.3}`;
  return `<path class="ls-pylon" d="${legs}"/><path class="ls-strut" d="${lattice} ${cross} ${arms}" stroke-width="${Math.max(0.6, h / 60)}"/>` +
    (light ? `<circle class="ls-light" cx="${x}" cy="${top - 1.2}" r="${Math.max(0.8, h / 50)}"/>` : "");
}

/** The wire sagging between two pylon arm tips. */
const wire = (x1, y1, x2, y2, sag = 6) =>
  `<path class="ls-wire" d="M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.max(y1, y2) + sag} ${x2} ${y2}"/>`;

/** A row of pylons marching to the vanishing point, with their wires. */
function pylons() {
  // Left of the road, receding toward it, so a phone's narrow crop keeps most of them.
  const row = [[46, 70], [124, 46], [172, 30], [202, 19], [220, 12]];
  let out = "";
  row.forEach(([x, h], i) => {
    out += pylon(x, h);
    if (i < row.length - 1) {
      const [x2, h2] = row[i + 1];
      const y1 = H + 4 - h + h * 0.12, y2 = H + 4 - h2 + h2 * 0.12;
      out += wire(x + h * 0.34, y1, x2 + h2 * 0.34, y2, 7 - i) + wire(x - h * 0.34, y1, x2 - h2 * 0.34, y2, 8 - i);
    }
  });
  return out;
}

/** The far ridge, and the giant that died on it: a walker's hull on four bent legs. */
function ridge(withHulk = true) {
  const hills = `<path class="ls-far" d="M0 ${H} L0 98 Q40 88 80 95 T170 92 Q220 84 260 93 T340 90 Q372 86 400 94 L400 ${H} Z"/>`;
  if (!withHulk) return hills;
  // Right of the road and inside a phone's crop: it is the thing your eye should find.
  const hulk = `<g class="ls-hulk" transform="translate(-52 0)">
    <path d="M318 74 Q340 62 366 70 L370 80 Q344 86 316 82 Z"/>
    <path d="M326 81 L318 100 L322 101 L331 83 M340 83 L338 103 L342 103 L345 83 M354 82 L360 102 L364 101 L358 82 M366 79 L380 99 L383 97 L370 78"/>
    <path d="M344 64 L346 52 M346 52 L350 50" stroke-width="1"/>
    <circle class="ls-eye" cx="331" cy="74" r="1.3"/>
  </g>`;
  return hills + hulk;
}

/** Ground and road: a two-lane blacktop running to the vanishing point. */
function road() {
  const vx = 236;
  const dashes = [[0.18, 0.05], [0.34, 0.07], [0.55, 0.1], [0.8, 0.13]].map(([t, len]) => {
    const y1 = H + (160 - H) * t, y2 = H + (160 - H) * Math.min(1, t + len);
    const x1 = vx + (200 - vx) * t, x2 = vx + (200 - vx) * Math.min(1, t + len);
    return `M${x1} ${y1} L${x2} ${y2}`;
  }).join(" ");
  const posts = [[40, 128, 10], [96, 120, 6], [140, 116, 4]]
    .map(([x, y, h]) => `M${x} ${y} L${x} ${y - h}`).join(" ");
  return `<path class="ls-ground" d="M0 ${H} L400 ${H} L400 160 L0 160 Z"/>
    <path class="ls-road" d="M${vx - 1} ${H} L${vx + 1} ${H} L330 160 L70 160 Z"/>
    <path class="ls-dash" d="${dashes}"/>
    <path class="ls-post" d="${posts} M40 120 L96 114 L140 111"/>`;
}

/** A shuttered roadside stop: canopy on poles, a dead sign. */
const station = () => `<g class="ls-near-obj">
  <path d="M28 102 L96 102 L96 106 L28 106 Z"/>
  <path d="M34 106 L34 ${H + 4} M90 106 L90 ${H + 4}" stroke-width="2.5"/>
  <path d="M104 92 L132 92 L132 ${H + 4} L104 ${H + 4} Z"/>
  <path d="M14 ${H + 4} L14 74 M6 74 L22 74 L22 86 L6 86 Z" stroke-width="2"/>
</g>`;

/** Smoke rising off the ridge and a drone loose in the sky: the scene has turned. */
const trouble = () => `<g class="ls-trouble">
  <path class="ls-smoke" d="M300 92 Q290 70 304 56 Q318 40 306 20 Q300 10 312 0 L330 0 Q322 14 330 26 Q340 44 324 60 Q314 74 318 92 Z"/>
  <g class="ls-drone"><path d="M150 34 L170 34 M160 34 L160 38 M146 32 L154 32 M166 32 L174 32"/><circle cx="160" cy="39" r="2.2"/></g>
</g>`;

/** Night: a scatter of stars and a thin moon. */
const night = () => {
  const stars = [[30, 14], [72, 30], [118, 10], [190, 22], [246, 8], [300, 28], [352, 12], [384, 36], [96, 52], [214, 46]]
    .map(([x, y], i) => `<circle class="ls-star" cx="${x}" cy="${y}" r="${i % 3 ? 0.7 : 1.1}"/>`).join("");
  return stars + `<path class="ls-moon" d="M330 26 A11 11 0 1 0 344 40 A9 9 0 1 1 330 26 Z"/>`;
};

/** The group's vehicle on the road, small, heading for the vanishing point. */
const roadVehicle = () => `<g class="ls-vehicle"><g class="ls-vehicle-body">
  <path d="M-9 0 L-7 -3.6 Q-6.4 -4.6 -5 -4.6 L4 -4.6 Q5.4 -4.6 6.4 -3.4 L8.6 -1 L10 -.6 L10 1.6 L-10 1.6 L-10 .2 Z"/>
  <circle cx="-5.6" cy="1.8" r="1.6"/><circle cx="5.6" cy="1.8" r="1.6"/>
  <path class="ls-beam" d="M10 -.4 L40 -6 L40 6 Z"/></g></g>`;

/** The neuroscape's grid laid over the low ground: perspective lines to the vanishing point. */
const neuroGrid = () => {
  let d = "";
  for (let i = -8; i <= 8; i++) d += `M${236 + i * 6} ${H} L${236 + i * 70} 160 `;
  [0.08, 0.2, 0.38, 0.62, 0.9].forEach((t) => { const y = H + (160 - H) * t; d += `M0 ${y.toFixed(1)} L400 ${y.toFixed(1)} `; });
  return `<path class="ls-gridlines" d="${d}"/>`;
};

/** What the Stop's weather does to the sky. */
const WEATHER = { "Storm": "storm", "Rain or snow": "rain", "Windy": "wind", "Clear blue sky": "clear",
  "Unusually hot or cold": "haze", "Mist and heavy cloud cover": "mist" };

/**
 * Point the whole scene at the game: the Shift, the Stop's weather, whether things have
 * turned (a fight, or a Countdown on its last step), whether the group has a vehicle and
 * is moving or parked at a Stop, and whether someone is in the network.
 */
export function syncScene({ journey = null, stop = null, combat = null, chars = [], route = "" } = {}) {
  syncSky(journey?.shift);
  const root = document.documentElement;
  const set = (k, v) => { if (v) { if (root.dataset[k] !== v) root.dataset[k] = v; } else if (k in root.dataset) delete root.dataset[k]; };
  set("weather", stop && !stop.resolved ? WEATHER[stop.setting?.weather] || "" : "");
  const lastStep = stop && !stop.resolved && stop.countdown?.length && (stop.countdownProgress || 0) >= stop.countdown.length - 1;
  set("crisis", combat?.active || lastStep ? "1" : "");
  set("vehicle", journey?.vehicle ? (stop && !stop.resolved ? "parked" : "moving") : "");
  set("neuro", route === "neuro" || chars.some((c) => c.state?.wearingCaster) ? "1" : "");
}

/** Incapacitated, broken or lost: the edges of the screen say so while it lasts. */
export function syncVignette(kind = "") {
  const root = document.documentElement;
  if (kind) root.dataset.state = kind; else delete root.dataset.state;
}

// ------------------------------------------------------------------ the sky
export const shiftKey = (shift) => {
  const s = String(shift || "").toLowerCase();
  return SHIFT_NAMES.map((n) => n.toLowerCase()).includes(s) ? s : "evening";
};

let mounted = false;

/** Build the background once; after that only the Shift attribute changes. */
export function mountScene(host = document.querySelector(".sky")) {
  if (!host || mounted) return;
  mounted = true;
  const layer = (cls, body) =>
    `<svg class="ls-layer ${cls}" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${body}</svg>`;
  host.innerHTML =
    SHIFT_NAMES.map((n) => `<div class="sky-shift" data-s="${n.toLowerCase()}"></div>`).join("") +
    `<div class="sky-sun"></div>` +
    layer("ls-stars", night()) +
    layer("ls-l-far", ridge()) +
    `<div class="ls-fog ls-fog-far"></div>` +
    layer("ls-l-mid", pylons()) +
    layer("ls-l-near", road() + roadVehicle()) +
    layer("ls-grid", neuroGrid()) +
    `<div class="ls-fog ls-fog-near"></div>` +
    `<div class="wx" aria-hidden="true"><i class="wx-a"></i><i class="wx-b"></i><i class="wx-flash"></i></div>` +
    `<div class="crisis-tint"></div>`;
  // The state of the Traveler in view, at the edges of the screen (see syncVignette).
  if (!document.querySelector(".vignette")) {
    const v = document.createElement("div");
    v.className = "vignette"; v.setAttribute("aria-hidden", "true");
    document.body.append(v);
  }

  // Parallax: the far ridge barely moves, the pylons a little more. Cheap — two
  // transforms in a frame callback, and nothing at all under reduced motion.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const far = host.querySelector(".ls-l-far"), mid = host.querySelector(".ls-l-mid");
  let queued = false;
  addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const y = Math.min(scrollY, 600);
      far.style.transform = `translateY(${y * 0.04}px)`;
      mid.style.transform = `translateY(${y * 0.1}px)`;
    });
  }, { passive: true });
}

/** Point the sky at the Journey's current Shift. */
// The browser's own chrome takes the colour of the sky overhead.
const CHROME = { morning: "#141a24", day: "#1a1f26", evening: "#0b0e13", night: "#04060a" };

function syncSky(shift) {
  const key = shiftKey(shift);
  const root = document.documentElement;
  if (root.dataset.shift !== key) root.dataset.shift = key;
  const light = root.dataset.theme === "light" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: light)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#e2ded6" : CHROME[key]);
}

/**
 * A scene band for the session screen: the same road, dressed for what is happening.
 * `kind` is one of open, road, stop, crisis, close.
 */
export function sceneBand(kind = "road") {
  const wrap = document.createElement("div");
  wrap.className = `scene-band scene-${kind}`;
  wrap.setAttribute("aria-hidden", "true");
  const body = (kind === "close" ? night() : "") +
    ridge(kind !== "open") + pylons() + road() +
    (kind === "stop" || kind === "crisis" ? station() : "") +
    (kind === "crisis" ? trouble() : "");
  wrap.innerHTML = `<svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice">${body}</svg>`;
  return wrap;
}

/** Once per launch: the helmet draws itself and the horizon comes up. */
export function splash() {
  try { if (sessionStorage.getItem("es.splashed")) return; sessionStorage.setItem("es.splashed", "1"); } catch { return; }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const s = document.createElement("div");
  s.className = "splash";
  s.setAttribute("aria-hidden", "true");
  // Two headlights come on in the dark, then the horizon draws itself under them.
  s.innerHTML = `<div class="splash-lights"><i></i><i></i></div>
    <div class="splash-title">Electric State</div>
    <div class="splash-horizon"></div>`;
  document.body.append(s);
  setTimeout(() => s.classList.add("is-out"), 1100);
  setTimeout(() => s.remove(), 1600);
}

// ------------------------------------------------------------- screen bands
// Every panel opens on its own place: a short band of scenery that says where you are before
// a word is read — the motel, the paper map, the card table, the garage, the library. Drawn
// here as flat original silhouettes on a 400×110 field (ground at y=96), tinted by CSS.
const G = 96;
const cube = (x, y, s, pips = 3, tilt = 0) => {
  const dots = { 1: [[.5, .5]], 2: [[.28, .28], [.72, .72]], 3: [[.25, .25], [.5, .5], [.75, .75]],
    4: [[.28, .28], [.72, .28], [.28, .72], [.72, .72]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]],
    6: [[.28, .22], [.72, .22], [.28, .5], [.72, .5], [.28, .78], [.72, .78]] }[pips];
  return `<g transform="translate(${x} ${y}) rotate(${tilt} ${s / 2} ${s / 2})"><rect class="b-die" width="${s}" height="${s}" rx="${s / 6}"/>${
    dots.map(([a, b]) => `<circle class="b-pip" cx="${(a * s).toFixed(1)}" cy="${(b * s).toFixed(1)}" r="${(s / 11).toFixed(1)}"/>`).join("")}</g>`;
};
const lamp = (x, y, len = 40) => `<path class="b-line" d="M${x} 0 V${y}"/><path class="b-sil" d="M${x - 9} ${y + 8} L${x - 5} ${y} H${x + 5} L${x + 9} ${y + 8} Z"/>` +
  `<path class="b-glow" d="M${x - 9} ${y + 8} L${x - len} ${G} H${x + len} L${x + 9} ${y + 8} Z"/>`;

const BANDS = {
  // a motel off the highway: rooms in a row, one window lit, the sign on its pole
  motel: () => `<path class="b-far" d="M0 ${G} V84 Q90 76 180 82 T400 80 V${G} Z"/>
    <rect class="b-sil" x="70" y="58" width="240" height="38"/><path class="b-sil" d="M64 58 H316 L306 50 H74 Z"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect class="${i === 4 ? "b-lit" : "b-dark"}" x="${84 + i * 32}" y="70" width="12" height="14"/><rect class="b-dark" x="${98 + i * 32}" y="66" width="8" height="30"/>`).join("")}
    <path class="b-line" d="M346 ${G} V30"/><rect class="b-neon" x="326" y="18" width="40" height="18" rx="3"/>
    <circle class="b-lit" cx="334" cy="27" r="2"/><circle class="b-lit" cx="346" cy="27" r="2"/><circle class="b-lit" cx="358" cy="27" r="2"/>
    <rect class="b-ground" x="0" y="${G}" width="400" height="14"/>`,
  // a paper road map, folded: contour lines, the route dashed in red, pins
  map: () => `<rect class="b-paper" width="400" height="110"/>
    <path class="b-fold" d="M133 0 V110 M266 0 V110 M0 55 H400"/>
    <path class="b-contour" d="M-10 80 Q60 60 120 76 T250 70 T410 64 M-10 96 Q70 80 140 92 T270 88 T410 80 M30 20 Q80 10 120 26 T200 22"/>
    <path class="b-road-map" d="M20 92 C80 80 90 40 150 50 S240 90 300 56 S370 20 388 18"/>
    <path class="b-pin" d="M150 50 m0 -14 a6 6 0 1 1 0.1 0 Z M150 50 L150 36"/><circle class="b-pin" cx="150" cy="34" r="5"/>
    <circle class="b-pin" cx="300" cy="54" r="5"/><path class="b-flag" d="M388 18 V0 M388 0 L398 4 L388 8"/>`,
  // corkboard: pinned notes and the red string between them
  cork: () => `<rect class="b-cork" width="400" height="110"/>
    <rect class="b-note" x="40" y="22" width="56" height="46" transform="rotate(-6 68 45)"/>
    <rect class="b-photo" x="160" y="14" width="50" height="60" transform="rotate(4 185 44)"/>
    <rect class="b-note" x="270" y="30" width="62" height="44" transform="rotate(3 301 52)"/>
    <path class="b-string" d="M68 26 L185 18 L301 34 M68 26 Q170 90 301 34"/>
    <circle class="b-tack" cx="68" cy="26" r="4"/><circle class="b-tack" cx="185" cy="18" r="4"/><circle class="b-tack" cx="301" cy="34" r="4"/>`,
  // the solo table: felt, a lamp, the deck and a fan of cards
  cards: () => `<rect class="b-felt" y="70" width="400" height="40"/>${lamp(200, 22, 70)}
    <g class="b-cards"><rect x="120" y="66" width="26" height="36" rx="3" transform="rotate(-14 133 84)"/><rect x="146" y="64" width="26" height="36" rx="3" transform="rotate(-4 159 82)"/>
    <rect x="172" y="64" width="26" height="36" rx="3" transform="rotate(6 185 82)"/></g>
    <g class="b-deck"><rect x="262" y="70" width="28" height="36" rx="3"/><rect x="259" y="67" width="28" height="36" rx="3"/></g>`,
  // the GM's side of the table: notebook, dice, mug, lamp
  desk: () => `<rect class="b-wood" y="68" width="400" height="42"/>${lamp(330, 18, 60)}
    <path class="b-page" d="M70 74 L150 70 L150 100 L70 104 Z M150 70 L230 74 L230 104 L150 100 Z"/>
    <path class="b-ruled" d="M82 82 H140 M82 88 H140 M82 94 H134 M160 80 H218 M160 86 H218 M160 92 H210"/>
    ${cube(258, 78, 16, 6, -12)}${cube(280, 84, 16, 3, 10)}<rect class="b-sil" x="352" y="74" width="18" height="24" rx="3"/><path class="b-line" d="M370 80 q8 0 8 8 q0 8 -8 8"/>`,
  // a tray on the dash with dice in it
  tray: () => `<rect class="b-dash" y="60" width="400" height="50"/><rect class="b-tray" x="100" y="70" width="200" height="34" rx="10"/>
    ${cube(126, 76, 20, 6, -10)}${cube(160, 78, 20, 2, 8)}${cube(196, 74, 20, 6, -4)}${cube(232, 79, 20, 4, 14)}${cube(264, 76, 18, 1, -6)}`,
  // a receipt curling off the counter
  receipt: () => `<rect class="b-counter" y="74" width="400" height="36"/>
    <path class="b-receipt" d="M150 10 H250 V96 l-8 -5 l-8 5 l-8 -5 l-8 5 l-8 -5 l-8 5 l-8 -5 l-8 5 l-8 -5 l-8 5 l-8 -5 l-8 5 l-4 -2 Z"/>
    <path class="b-ruled" d="M162 24 H238 M162 34 H220 M162 44 H238 M162 54 H210 M162 64 H238 M162 74 H226"/>`,
  // trouble on the road: a burning drum and a striped barrier
  hazard: () => `<path class="b-far" d="M0 ${G} V84 Q90 78 200 84 T400 80 V${G} Z"/><rect class="b-ground" y="${G}" width="400" height="14"/>
    <path class="b-flame" d="M96 62 Q90 44 102 30 Q100 44 110 40 Q108 52 118 46 Q120 60 112 66 Z"/><rect class="b-sil" x="90" y="62" width="30" height="34" rx="2"/>
    <g class="b-stripe"><rect x="230" y="66" width="120" height="14"/><path d="M240 66 l-10 14 M260 66 l-10 14 M280 66 l-10 14 M300 66 l-10 14 M320 66 l-10 14 M340 66 l-10 14"/></g>
    <path class="b-line" d="M240 80 V${G} M340 80 V${G}"/>`,
  // the garage: pegboard of tools, a hanging lamp, the car's nose
  garage: () => `<rect class="b-wall" width="400" height="110"/><rect class="b-ground" y="${G}" width="400" height="14"/>
    <rect class="b-peg" x="30" y="16" width="130" height="58"/>
    <path class="b-tool" d="M48 26 v30 M44 26 h8 M70 24 l14 30 M98 24 v26 m-6 0 h12 M124 26 q10 0 10 10 q0 10 -10 10 M146 24 v34"/>
    ${lamp(260, 20, 80)}
    <path class="b-sil" d="M210 ${G} V80 Q214 66 240 62 L300 58 Q330 58 350 72 L380 76 V${G} Z"/><circle class="b-dark" cx="246" cy="${G}" r="10"/><circle class="b-dark" cx="350" cy="${G}" r="10"/>`,
  // the library: shelves of spines, a reading lamp
  library: () => `<rect class="b-wall" width="400" height="110"/>
    ${[22, 66].map((y) => `<rect class="b-shelf" x="0" y="${y + 30}" width="400" height="4"/>` + Array.from({ length: 26 }, (_, i) => {
      const h = 18 + ((i * 7 + y) % 12), w = 8 + ((i * 5) % 6), x = 8 + i * 15;
      return `<rect class="b-spine s${(i + y) % 4}" x="${x}" y="${y + 30 - h}" width="${w}" height="${h}"/>`;
    }).join("")).join("")}`,
  // the glovebox, open: a folded map, a flashlight, a cassette
  glovebox: () => `<rect class="b-dash" width="400" height="110"/><rect class="b-box" x="70" y="18" width="260" height="78" rx="10"/>
    <path class="b-paper" d="M96 50 L170 42 L176 88 L102 94 Z"/><path class="b-fold" d="M134 46 L139 91"/>
    <rect class="b-sil" x="196" y="56" width="66" height="14" rx="6"/><path class="b-glow" d="M262 63 L330 40 V86 Z"/>
    <rect class="b-tape" x="208" y="74" width="54" height="18" rx="2"/><circle class="b-dark" cx="224" cy="83" r="4"/><circle class="b-dark" cx="246" cy="83" r="4"/>`,
  // a field hospital tent with a cross on it
  tent: () => `<path class="b-far" d="M0 ${G} V86 Q120 78 220 84 T400 82 V${G} Z"/><rect class="b-ground" y="${G}" width="400" height="14"/>
    <path class="b-canvas" d="M110 ${G} L200 30 L290 ${G} Z"/><path class="b-dark" d="M186 ${G} L200 60 L214 ${G} Z"/>
    <path class="b-cross" d="M194 46 h12 v-8 h-12 Z M196 36 h8 v18 h-8 Z"/>
    <path class="b-line" d="M330 ${G} V40 M320 44 H340"/><rect class="b-lit" x="334" y="46" width="10" height="16" rx="3"/>`
};

const ROUTE_BAND = {
  home: "motel", journey: "map", tension: "cork", solo: "cards", gm: "desk", dice: "tray", log: "receipt",
  hazards: "hazard", driving: "garage", rules: "library", tutorial: "library", play: "library", book: "library",
  settings: "glovebox", injury: "tent"
};

/** The band for a route, or null where the screen has its own picture (Play, the fight, the network, the sheet). */
export function screenBand(route) {
  const kind = ROUTE_BAND[route];
  if (!kind) return null;
  const wrap = document.createElement("div");
  wrap.className = `screen-band band-${kind}`;
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `<svg viewBox="0 0 400 110" preserveAspectRatio="xMidYMax slice">${BANDS[kind]()}</svg>`;
  return wrap;
}
