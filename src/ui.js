// Themed modal, toast, confirm and prompt. No native alert/confirm/prompt anywhere.
import { $, el } from "./core.js";

let openModals = 0;

export function showToast(message, kind = "") {
  const t = el("div", { class: "toast" + (kind ? ` is-${kind}` : ""), role: "status" }, message);
  $("#toasts").append(t);
  setTimeout(() => t.remove(), 4000);
  return t;
}

export function modal({ title, body, actions = [], dismissible = true }) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const backdrop = el("div", { class: "modal-backdrop" });
    const box = el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": title || "Dialog" });

    if (title) box.append(el("h2", {}, title));
    if (body) box.append(body instanceof Node ? body : el("div", {}, body));

    const close = (value) => {
      backdrop.remove();
      openModals--;
      if (!openModals) document.body.style.removeProperty("overflow");
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      resolve(value);
    };

    if (actions.length) {
      const row = el("div", { class: "btn-row", style: "margin-top:16px" });
      for (const a of actions) {
        row.append(el("button", {
          class: "btn " + (a.class || ""),
          onclick: () => close(a.value)
        }, a.label));
      }
      box.append(row);
    }

    backdrop.append(box);
    backdrop.addEventListener("mousedown", (e) => { if (dismissible && e.target === backdrop) close(undefined); });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && dismissible) { e.stopPropagation(); close(undefined); }
      if (e.key !== "Tab") return;
      const focusables = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    $("#modalRoot").append(backdrop);
    openModals++;
    document.body.style.overflow = "hidden";
    (box.querySelector("input, button") || box).focus();
  });
}

/**
 * A collapsed "what this does" note. Every panel gets one so a first-time player can
 * find out what a surface is for without leaving it.
 */
export function explain(text, label = "What this does") {
  return el("details", { class: "explain" },
    el("summary", {}, label),
    typeof text === "string" ? el("p", {}, text) : text);
}

export const confirmModal = (title, message, confirmLabel = "Confirm") =>
  modal({
    title, body: el("p", { class: "muted" }, message),
    actions: [
      { label: confirmLabel, value: true, class: "btn-primary" },
      { label: "Cancel", value: false }
    ]
  }).then((v) => v === true);

export function promptModal(title, { label = "", value = "", placeholder = "" } = {}) {
  const input = el("input", { value, placeholder, "aria-label": label || title });
  const body = el("div", { class: "field" }, label ? el("label", {}, label) : null, input);
  return modal({
    title, body,
    actions: [{ label: "Save", value: "__ok", class: "btn-primary" }, { label: "Cancel", value: undefined }]
  }).then((v) => (v === "__ok" ? input.value.trim() : undefined));
}
