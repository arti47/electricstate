// One line-icon set, drawn on a 24px grid at a 1.6 stroke, so every glyph in the chrome
// renders the same on every platform. Unicode symbols did not: the theme toggle's ◐ came
// out as a four-pixel sliver and the tab glyphs changed weight from phone to phone.

const PATHS = {
  play: '<path d="M4 19h16"/><path d="M6 19c0-6 3-10 6-10s6 4 6 10"/><path d="M12 9V5"/><circle cx="12" cy="4" r="1"/>',
  traveler: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/>',
  book: '<path d="M5 4.5h9a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h9"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  theme: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  fight: '<path d="M5 19L17 7M17 7V4h3v3h-3"/><path d="M19 19L7 7M7 7V4H4v3h3"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  // rules subjects
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  hazard: '<path d="M12 4 21 19H3Z"/><path d="M12 10v4"/><circle cx="12" cy="16.6" r=".8" fill="currentColor"/>',
  helmet: '<path d="M5 15a7 7 0 0 1 14 0v2H5Z"/><path d="M6.5 13h11"/><path d="M12 17v3"/>',
  car: '<path d="M4 15l1.6-4.4A2 2 0 0 1 7.5 9h9a2 2 0 0 1 1.9 1.6L20 15v3H4Z"/><circle cx="8" cy="18" r="1.6"/><circle cx="16" cy="18" r="1.6"/>',
  pack: '<path d="M7 8a5 5 0 0 1 10 0v11H7Z"/><path d="M9 13h6M10 5V3h4v2"/>',
  link: '<path d="M5 8h10l-3-3M19 16H9l3 3"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z"/>',
  road: '<path d="M9 4 5 20M15 4l4 16M12 6v2M12 11v2M12 16v2"/>'
};

/** An inline SVG icon. Decorative by default; pass a label when it is the only content. */
export function icon(name, { label = null, size = 20 } = {}) {
  const wrap = document.createElement("span");
  wrap.className = `icon icon-${name}`;
  wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}>${PATHS[name] || ""}</svg>`;
  return wrap;
}
