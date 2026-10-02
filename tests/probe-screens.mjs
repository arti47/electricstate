// Every working screen, pressed only on its lit button for a dozen presses, from a
// mid-session game. It fails on a page error or on reaching a screen with nothing lit — the
// shape every dead end so far has taken (a GM screen with a Stop in play, a resolved Stop,
// a finished neurocasting task, a blank Stop name that silently did nothing).
import { chromium } from "playwright-core";
import { serve, GAME_HELPERS, CHROMIUM, SEEDS, seedPage } from "./fixtures.js";
const { base, close } = await serve();
const b = await chromium.launch({ executablePath: CHROMIUM });
const c = await b.newContext({ viewport: { width: 390, height: 844 } });
await c.addInitScript(GAME_HELPERS);
await c.addInitScript(() => sessionStorage.setItem("es.splashed","1"));
const p = await c.newPage();
const errors = [], dead = [];
p.on("pageerror", (e) => errors.push(e.message));
for (const route of ["session", "solo", "gm", "journey", "time", "tension", "sheet/a1", "injury/a1", "dice", "combat", "neuro", "hazards", "driving", "log"]) {
  await seedPage(p, base, SEEDS.mid, route); await p.waitForTimeout(300);
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const r = await p.evaluate(() => {
      const vis = (e) => { const x = e.getBoundingClientRect(); return x.width > 0 && x.height > 0 && !e.disabled; };
      const d = document.querySelector(".modal-backdrop:last-of-type .modal");
      const tray = document.querySelector("#tray:not([hidden])");
      let t;
      if (d) t = [...d.querySelectorAll(".btn-primary, button")].filter(vis)[0];
      else if (tray && tray.getBoundingClientRect().height) t = tray.querySelector(".result-head") ? tray.querySelector(".tray-close") : [...tray.querySelectorAll(".actionbar .btn-primary")].filter(vis)[0];
      else t = [...document.querySelectorAll("#screen .btn-primary, .actionbar .btn-primary")].filter(vis)[0];
      const head = d ? d.textContent.replace(/\s+/g, " ").slice(0, 80) : "";
      if (!t) return { h: location.hash, x: null, head };
      t.setAttribute("data-w", "1");
      return { h: location.hash, x: t.textContent.trim().slice(0, 30), head };
    });
    seen.push(`${r.h.replace("#/","")}:${r.x}${r.head ? " ["+r.head+"]" : ""}`);
    if (!r.x) { dead.push(`#/${route} → ${seen.join(" → ")}`); break; }
    await p.click('[data-w="1"]', { timeout: 3000 }).catch(() => seen.push("clickfail"));
    await p.evaluate(() => document.querySelectorAll("[data-w]").forEach((e) => e.removeAttribute("data-w")));
    await p.waitForTimeout(200);
  }
}
await b.close(); close();
if (errors.length || dead.length) {
  console.error("screens probe FAILED\n  " + [...errors.map((e) => "page error: " + e), ...dead.map((d) => "dead end: " + d)].join("\n  "));
  process.exit(1);
}
console.log("screens probe: every screen keeps offering a lit button for a dozen presses");
