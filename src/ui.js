// Themed modal, toast, confirm and prompt. No native alert/confirm/prompt anywhere.
import { $, el } from "./core.js";
import { Settings } from "./settings.js";

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
      openModals = Math.max(0, openModals - 1);
      if (!openModals) document.body.style.removeProperty("overflow");
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      resolve(value);
    };
    // A caller that closes the dialog from inside its own body has to go through this,
    // or the open-modal count drifts up and `overflow: hidden` never comes off the body —
    // which reads as "the app will not scroll" long after the dialog has gone.
    backdrop.__close = close;

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
 * Close the dialog on top from inside its own body, resolving its promise. Never remove a
 * `.modal-backdrop` by hand: see the note in `close` above.
 */
export function dismissModal(value) {
  const stack = document.querySelectorAll("#modalRoot .modal-backdrop");
  const top = stack[stack.length - 1];
  if (!top) return false;
  if (typeof top.__close === "function") top.__close(value);
  else { top.remove(); document.body.style.removeProperty("overflow"); }
  return true;
}

/** Nothing open means nothing may be holding the page still. The router calls this. */
export function releaseScrollLock() {
  if (!document.querySelector("#modalRoot .modal-backdrop")) {
    openModals = 0;
    document.body.style.removeProperty("overflow");
  }
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

/**
 * Content the table is not supposed to have read yet — a prepared Stop, a Countdown step
 * that has not fired. With "Hide GM content" on it arrives blurred and unblurs on a tap,
 * so one phone can be passed around a table without spoiling what is coming.
 */
export function spoiler(content, label = "Tap to reveal") {
  const node = content instanceof Node ? content : el("span", {}, String(content));
  if (!Settings.hideGmContent()) return node;
  const wrap = el("span", {
    class: "spoil", role: "button", tabindex: "0", title: label, "aria-label": label,
    onclick: () => wrap.classList.remove("spoil"),
    onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wrap.classList.remove("spoil"); } }
  }, node);
  return wrap;
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

/**
 * The controls a screen exists to press, pinned above the tab bar. Returns the spacer and
 * the bar together, so a caller cannot forget the spacer and have the bar cover its own
 * last card. Pass a lead element (a pool size, a shift name) to sit left of the buttons.
 */
export function actionBar({ lead = null, children = [] } = {}) {
  const bar = el("div", { class: "actionbar" },
    el("div", { class: "actionbar-inner" }, lead, ...children.filter(Boolean)));
  return [el("div", { class: "actionbar-spacer" }), bar];
}
