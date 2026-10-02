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
  s.innerHTML = `<svg viewBox="0 0 120 120" width="96" height="96">
    <circle class="splash-ring" cx="60" cy="50" r="24"/>
    <path class="splash-ant" d="M60 74 V96 M44 96 H76"/>
    <path class="splash-visor" d="M40 50 H80"/></svg>
    <div class="splash-horizon"></div>`;
  document.body.append(s);
  setTimeout(() => s.classList.add("is-out"), 650);
  setTimeout(() => s.remove(), 1100);
}
