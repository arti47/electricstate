// Network-first for the app shell so updates land fast; cache is the offline fallback.
const CACHE_VERSION = "es-v66";
const SHELL = [
  "./", "./index.html", "./styles.css", "./manifest.json", "./icon.svg",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png",
  "./fonts/barlow-condensed-latin-500-normal.woff2", "./fonts/barlow-condensed-latin-600-normal.woff2",
  "./fonts/barlow-condensed-latin-700-normal.woff2", "./fonts/ibm-plex-mono-latin-500-normal.woff2",
  "./fonts/ibm-plex-mono-latin-600-normal.woff2", "./fonts/source-serif-4-latin-400-normal.woff2",
  "./fonts/source-serif-4-latin-400-italic.woff2", "./fonts/source-serif-4-latin-600-normal.woff2",
  "./data.js", "./data-tables.js", "./data-gm.js", "./data-solo.js",
  "./data-npcs.js", "./data-pregens.js", "./data-vehicles.js", "./data-library.js", "./data-names.js", "./data-journey.js",
  "./src/main.js", "./src/core.js", "./src/ui.js", "./src/rules.js", "./src/derived.js",
  "./src/play.js", "./src/session.js", "./src/pronouns.js", "./src/settings.js", "./src/store.js", "./src/router.js", "./src/screens.js", "./src/wizard.js", "./src/sheet.js", "./src/roller.js", "./src/lifecycle.js", "./src/neurocasting.js", "./src/combat.js", "./src/solo.js", "./src/gm.js", "./src/tutorial.js", "./src/hazards.js", "./src/stops.js", "./src/icons.js", "./src/scene.js", "./src/graphics.js", "./src/sound.js", "./src/integrity.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
  );
});
