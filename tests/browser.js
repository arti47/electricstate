// Browser smoke test: boot the app, walk every tab, assert zero console errors
// and zero horizontal overflow at phone widths.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(req.url.split("?")[0]));
    const file = join(ROOT, path === "/" ? "index.html" : path);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end("not found"); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  // enable the gated tabs so every route renders
  await page.evaluate(() => {
    localStorage.setItem("electricState.v1.settings", JSON.stringify({ solo: true, gmScreen: true, theme: "dark" }));
  });
  await page.reload({ waitUntil: "networkidle" });

  for (const route of ["home", "dice", "rules", "solo", "gm", "settings", "log", "create", "sheet"]) {
    await page.evaluate((r) => { location.hash = `#/${r}`; }, route);
    await page.waitForTimeout(60);
    const heading = await page.textContent("#screen h1").catch(() => null);
    check(heading && heading.trim().length > 0, `${viewport.width}px: route ${route} rendered no heading`);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check(!overflow, `${viewport.width}px: route ${route} overflows horizontally`);
  }

  // rules search filters
  await page.evaluate(() => { location.hash = "#/rules"; });
  await page.waitForTimeout(60);
  await page.fill('input[type="search"]', "bliss");
  await page.waitForTimeout(60);
  const cards = await page.locator("#screen article.card").count();
  check(cards > 0 && cards < 38, `rules search did not filter (got ${cards} cards)`);

  // theme toggle switches the document attribute
  await page.click("#themeToggle");
  const themed = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  check(themed !== null, "theme toggle did not set data-theme");

  check(errors.length === 0, `${viewport.width}px: console errors: ${errors.join(" | ")}`);
  await page.close();
}

await browser.close();
server.close();

if (failures.length) { failures.forEach((f) => console.log("FAIL  " + f)); console.log(`\n${failures.length} failure(s)`); process.exit(1); }
console.log("browser smoke: all routes render, no console errors, no horizontal overflow at 360 and 390px");
