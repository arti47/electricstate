// Themed modal, toast, confirm and prompt. No native alert/confirm/prompt anywhere.
import { $, el } from "./core.js";
import { Settings } from "./settings.js";
import { icon } from "./icons.js";

let openModals = 0;

export function showToast(message, kind = "", action = null) {
  const t = el("div", { class: "toast" + (kind ? ` is-${kind}` : ""), role: "status" }, el("span", {}, message));
  // A destructive action that can be undone says so where it happened, instead of asking
  // "are you sure?" first. The toast stays longer when there is something to press.
  if (action) {
    t.append(el("button", {
      class: "toast-action",
      onclick: () => { t.remove(); action.run(); }
    }, action.label));
  }
  $("#toasts").append(t);
  setTimeout(() => t.remove(), action ? 7000 : 4000);
  return t;
}

/**
 * A short vibration where the device has one. A tick for a stepper, a roll's rattle, a
 * heavy buzz for something lost. Silent everywhere else, and never an error.
 */
const BUZZ = { tick: 8, roll: [12, 40, 12, 40, 18], loss: [60, 50, 90], success: [18, 30, 30] };
export function haptic(kind = "tick") {
  try { navigator.vibrate?.(BUZZ[kind] ?? kind); } catch { /* unsupported */ }
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
    if (dismissible) dragToDismiss(box, () => close(undefined));
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
 * On a phone a dialog is a sheet from the bottom; pull it down from its top edge to let
 * it go. Only a drag that starts while the sheet is scrolled to the top counts, so
 * scrolling a long list inside it never closes it by accident.
 */
function dragToDismiss(box, done) {
  let startY = null, dy = 0;
  box.addEventListener("touchstart", (e) => {
    if (box.scrollTop > 0 || e.touches.length !== 1) return;
    if (e.target.closest("input, select, textarea")) return;
    startY = e.touches[0].clientY; dy = 0;
  }, { passive: true });
  box.addEventListener("touchmove", (e) => {
    if (startY == null) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    if (dy > 4) { box.classList.add("is-dragging"); box.style.transform = `translateY(${dy}px)`; }
  }, { passive: true });
  box.addEventListener("touchend", () => {
    if (startY == null) return;
    box.classList.remove("is-dragging");
    box.style.removeProperty("transform");
    startY = null;
    if (dy > 90) done();
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
  const box = el("details", { class: "explain" });
  const shut = () => { box.open = false; box.classList.remove("is-intro"); };
  box.append(
    el("summary", { "aria-label": label, title: label },
      icon("info", { size: 22 }), el("span", { class: "explain-label" }, label)),
    // Only shown when this is the screen's own note, opened as a sheet: tap outside to close.
    el("div", { class: "explain-scrim", onclick: shut }),
    el("div", { class: "explain-body" },
      el("div", { class: "explain-head" }, label,
        el("button", { class: "icon-btn explain-close", "aria-label": "Close", onclick: shut }, icon("close"))),
      typeof text === "string" ? el("p", {}, text) : text));
  // Closing a first-visit note turns it back into the ⓘ.
  box.addEventListener("toggle", () => { if (!box.open) box.classList.remove("is-intro"); });
  return box;
}

/**
 * A ⋯ button that opens a short list of actions as a sheet. Destructive actions live
 * here instead of as full-width red blocks in the middle of a screen. Each item is
 * `{ label, run, danger }`; `run` is called after the sheet has closed.
 */
export function moreMenu(items, label = "More actions") {
  return el("button", {
    class: "icon-btn more-btn", "aria-label": label, title: label,
    onclick: async () => {
      const list = el("ul", { class: "menu-list" });
      items.filter(Boolean).forEach((item, i) => list.append(el("li", {},
        el("button", { class: item.danger ? "is-danger" : "", onclick: () => dismissModal(i) }, item.label))));
      const picked = await modal({ title: label, body: list });
      if (typeof picked === "number") await items.filter(Boolean)[picked].run();
    }
  }, icon("more", { size: 22 }));
}

// ------------------------------------------------------------------- dice
const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

/**
 * One die face. `gear` draws it as a gear die, `rolling` tumbles it in (index staggers
 * the tumble), `kept` marks a die a push left on the table. Anything that is not 1–6 is
 * some other die (D66, D100) and renders as a plain number chip.
 */
export function dieFace(value, { gear = false, rolling = false, index = 0, kept = false, mini = false } = {}) {
  if (!PIPS[value]) return el("span", { class: "die-num" }, String(value));
  const cls = ["die", gear && "is-gear", value === 6 && "is-six", value === 1 && "is-one",
    rolling && "is-rolling", kept && "is-kept", mini && "is-mini"].filter(Boolean).join(" ");
  const node = el("span", { class: cls, role: "img",
    "aria-label": `${gear ? "gear " : ""}${value}${value === 6 ? ", success" : ""}`, style: `--i:${index}` });
  for (let i = 0; i < 9; i++) node.append(el("i", { class: PIPS[value].includes(i) ? "on" : "" }));
  return node;
}

/** A row of dice: base dice, a divider, gear dice. */
export function diceRow({ base = [], gear = [] }, { rolling = false, kept = null, mini = false } = {}) {
  const row = el("div", { class: "dice" + (mini ? " is-mini" : "") });
  let i = 0;
  const keptBase = kept?.base || [], keptGear = kept?.gear || [];
  base.forEach((d, k) => row.append(dieFace(d, { rolling: rolling && !keptBase[k], index: i++, kept: keptBase[k], mini })));
  if (gear.length && base.length) row.append(el("span", { class: "dice-sep", "aria-hidden": "true" }));
  gear.forEach((d, k) => row.append(dieFace(d, { gear: true, rolling: rolling && !keptGear[k], index: i++, kept: keptGear[k], mini })));
  return row;
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
