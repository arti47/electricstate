// Network-first for the app shell so updates land fast; cache is the offline fallback.
const CACHE_VERSION = "es-v32";
const SHELL = [
  "./", "./index.html", "./styles.css", "./manifest.json", "./icon.svg",
  "./data.js", "./data-tables.js", "./data-gm.js", "./data-solo.js",
  "./data-npcs.js", "./data-pregens.js", "./data-vehicles.js", "./data-library.js", "./data-names.js", "./data-journey.js",
  "./src/main.js", "./src/core.js", "./src/ui.js", "./src/rules.js", "./src/derived.js",
  "./src/settings.js", "./src/store.js", "./src/router.js", "./src/screens.js", "./src/wizard.js", "./src/sheet.js", "./src/roller.js", "./src/lifecycle.js", "./src/neurocasting.js", "./src/combat.js", "./src/solo.js", "./src/gm.js", "./src/tutorial.js", "./src/hazards.js", "./src/stops.js"
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
