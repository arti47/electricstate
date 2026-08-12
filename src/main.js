// Entry point.
import { CACHE_VERSION } from "./core.js";
import { startRouter } from "./router.js";
import { applyTheme } from "./screens.js";
import { Settings, set as setSetting } from "./settings.js";
import { showToast } from "./ui.js";

applyTheme();

document.getElementById("themeToggle")?.addEventListener("click", () => {
  const order = ["system", "dark", "light"];
  const next = order[(order.indexOf(Settings.theme()) + 1) % order.length];
  setSetting("theme", next);
  applyTheme();
  showToast(`Theme: ${next}`);
});

// Zoom suppression. The viewport meta covers most browsers; iOS Safari ignores
// user-scalable=no, so pinch gestures and ctrl+wheel are cancelled explicitly.
for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "_", "0"].includes(e.key)) e.preventDefault();
});

startRouter();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            const t = showToast("Update available — tap to reload.");
            t.style.pointerEvents = "auto";
            t.style.cursor = "pointer";
            t.addEventListener("click", () => location.reload());
          }
        });
      });
    }).catch(() => { /* offline install is optional */ });
  });
}

console.info(`Electric State Player — ${CACHE_VERSION}`);
