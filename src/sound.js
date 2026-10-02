// Sound, made on the device: a dice rattle, a card flip, a burst of network static. No
// audio files — each is a few milliseconds of shaped noise from WebAudio. Off unless the
// player switches it on in Settings.
import { Settings } from "./settings.js";

let ctx = null;
const audio = () => {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

/** A burst of filtered noise: `at` seconds from now, `len` long, through a band at `freq`. */
function burst(a, { at = 0, len = 0.04, freq = 2400, q = 1.2, gain = 0.25, type = "bandpass" } = {}) {
  const frames = Math.ceil(a.sampleRate * len);
  const buf = a.createBuffer(1, frames, a.sampleRate);
  const data = buf.getChannelData(0);
  const bytes = new Uint32Array(frames);
  crypto.getRandomValues(bytes);   // the app's one source of randomness, even for noise
  for (let i = 0; i < frames; i++) data[i] = (bytes[i] / 0xffffffff * 2 - 1) * (1 - i / frames);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + at);
}

const SOUNDS = {
  // dice: a handful of clicks on a table, slowing down
  roll: (a) => [0, .05, .11, .16, .24, .33, .45].forEach((t, i) => burst(a, { at: t, len: .025, freq: 1800 + (i % 3) * 700, q: 4, gain: .35 - i * .03 })),
  success: (a) => { SOUNDS.roll(a); burst(a, { at: .5, len: .18, freq: 880, q: 18, gain: .25 }); },
  loss: (a) => burst(a, { len: .22, freq: 140, q: 2, gain: .5, type: "lowpass" }),
  tick: (a) => burst(a, { len: .012, freq: 3200, q: 6, gain: .12 }),
  card: (a) => burst(a, { len: .12, freq: 5200, q: .7, gain: .22, type: "highpass" }),
  static: (a) => [0, .07, .12].forEach((t) => burst(a, { at: t, len: .06, freq: 4000, q: .5, gain: .18 }))
};

/** Play a named sound if the player has asked for sound. Silent and harmless otherwise. */
export function sound(kind) {
  if (!Settings.sound()) return;
  const a = audio();
  if (a && SOUNDS[kind]) { try { SOUNDS[kind](a); } catch { /* audio refused */ } }
}
