// Layout probe: where a screen's primary action actually sits, and how big its controls are.
//
// Ten passes of reading the code missed four screens whose primary action was below the
// fold, and a checkbox that rendered at 13px because an inline style beat the stylesheet.
// Neither is visible in source; both are one measurement away. This runs the measurement
// against all three seed states, because a screen that fits when empty may not when full.
//
//   node tests/probe-layout.mjs            report and fail on a violation
//   node tests/probe-layout.mjs --report   report only
import { chromium } from "playwright-core";
import { serve, CHROMIUM, GAME_HELPERS, SEEDS, seedPage } from "./fixtures.js";

const REPORT_ONLY = process.argv.includes("--report");

// WCAG 2.2 SC 2.5.8: 24 CSS px minimum. The app's own target is 44.
const MIN_TARGET = 24;
const WANT_TARGET = 44;

const ROUTES = ["home", "dice", "rules", "solo", "gm", "settings", "log", "create", "journey",
  "tension", "time", "neuro", "combat", "hazards", "driving", "tutorial", "play", "session"];

const { base, close } = await serve();
const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
await page.addInitScript(GAME_HELPERS);

const rows = [];
const violations = [];

const measure = () => page.evaluate(({ minTarget }) => {
  const visible = (n) => {
    const r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !n.closest("details:not([open])");
  };
  const nav = document.querySelector(".tabbar").getBoundingClientRect();
  const controls = [...document.querySelectorAll("#screen button, #screen a.btn, #screen input, #screen select, #screen .subnav-item")]
    .filter(visible);

  // The primary action is what the screen exists to press. A pinned action bar IS that
  // claim, so it wins; otherwise the first .btn-primary in the page; otherwise nothing,
  // which is fine — a reference screen has no action.
  const primary = [...document.querySelectorAll("#screen .actionbar .btn-primary, #screen .actionbar button")].filter(visible)[0]
    || [...document.querySelectorAll("#screen .btn-primary")].filter(visible)[0]
    || null;

  const target = (c) => {
    const box = (c.closest("label") || c).getBoundingClientRect();
    return { label: (c.getAttribute("aria-label") || c.textContent || c.tagName).trim().slice(0, 28),
             h: Math.round(box.height) };
  };
  const targets = controls.map(target).filter((t) => t.h > 0);
  const smallest = targets.reduce((a, b) => (a && a.h <= b.h ? a : b), null);

  return {
    controls: controls.length,
    primary: primary ? {
      text: primary.textContent.trim().slice(0, 24),
      top: Math.round(primary.getBoundingClientRect().top),
      fold: Math.round(nav.top)
    } : null,
    smallest,
    tiny: targets.filter((t) => t.h < minTarget),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  };
}, { minTarget: MIN_TARGET });

for (const [seedName, seed] of Object.entries(SEEDS)) {
  for (const route of ROUTES) {
    await seedPage(page, base, seed, route);
    await page.evaluate(() => window.scrollTo(0, 0));
    const m = await measure();
    const where = `${seedName}/${route}`;

    rows.push({
      where, controls: m.controls,
      primary: m.primary ? `${m.primary.text} @${m.primary.top}` : "—",
      belowFold: m.primary ? m.primary.top >= m.primary.fold : false,
      smallest: m.smallest ? `${m.smallest.h}px ${m.smallest.label}` : "—"
    });

    if (m.primary && m.primary.top >= m.primary.fold) {
      violations.push(`${where}: primary action "${m.primary.text}" starts ${m.primary.top - m.primary.fold}px below the fold`);
    }
    for (const t of m.tiny) violations.push(`${where}: "${t.label}" is ${t.h}px tall, under the ${MIN_TARGET}px minimum`);
    if (m.overflow) violations.push(`${where}: page scrolls sideways`);
  }
}

await browser.close();
close();

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(pad("state/route", 22) + pad("ctrls", 6) + pad("primary action", 34) + "smallest target");
for (const r of rows) {
  console.log(pad(r.where, 22) + pad(r.controls, 6) + pad(r.primary + (r.belowFold ? " ↓" : ""), 34) + r.smallest);
}
console.log(`\nTarget floor ${MIN_TARGET}px (WCAG 2.5.8); the app aims for ${WANT_TARGET}px.`);

if (!violations.length) { console.log("layout probe: every primary action is above the fold and every target is reachable"); process.exit(0); }
console.log("");
violations.forEach((v) => console.log("FAIL  " + v));
console.log(`\n${violations.length} violation(s)`);
process.exit(REPORT_ONLY ? 0 : 1);
