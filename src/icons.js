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
  search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
  // rules subjects
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  hazard: '<path d="M12 4 21 19H3Z"/><path d="M12 10v4"/><circle cx="12" cy="16.6" r=".8" fill="currentColor"/>',
  helmet: '<path d="M5 15a7 7 0 0 1 14 0v2H5Z"/><path d="M6.5 13h11"/><path d="M12 17v3"/>',
  car: '<path d="M4 15l1.6-4.4A2 2 0 0 1 7.5 9h9a2 2 0 0 1 1.9 1.6L20 15v3H4Z"/><circle cx="8" cy="18" r="1.6"/><circle cx="16" cy="18" r="1.6"/>',
  pack: '<path d="M7 8a5 5 0 0 1 10 0v11H7Z"/><path d="M9 13h6M10 5V3h4v2"/>',
  link: '<path d="M5 8h10l-3-3M19 16H9l3 3"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z"/>',
  road: '<path d="M9 4 5 20M15 4l4 16M12 6v2M12 11v2M12 16v2"/>',
  cassette: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><path d="M7 18l1.5-3h7l1.5 3"/>',
  mask: '<path d="M4 7c5-2 11-2 16 0 0 6-3 11-8 11S4 13 4 7Z"/><path d="M8 11h2M14 11h2"/>',
  chat: '<path d="M4 5h16v10H9l-4 4V5Z"/>',
  flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
  grid: '<path d="M3 20h18M5 16h14M8 12h8M12 8v12M7 20l3-8M17 20l-3-8"/>',
  bolt: '<path d="M13 3 5 13h6l-1 8 8-10h-6Z"/>',
  gun: '<path d="M3 9h15l2 2v2h-8l-2 6H6l1.5-6H3Z"/><path d="M12 13v2"/>',
  blade: '<path d="M4 20 15 9l3-5 2 2-5 3L5 20Z"/><path d="M8 13l3 3"/>',
  med: '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2M12 10v6M9 13h6"/>',
  rope: '<circle cx="12" cy="10" r="6"/><circle cx="12" cy="10" r="2.5"/><path d="M17 14c2 2 2 5-1 6"/>',
  food: '<rect x="6" y="5" width="12" height="15" rx="2"/><path d="M6 9h12M6 16h12"/>',
  wrench: '<path d="M14.5 4a4 4 0 0 0-4.6 5.4L4 15.3 6.7 18l5.9-5.9A4 4 0 0 0 18 7.5l-2.6 2.6-2.4-.5-.5-2.4Z"/>',
  radio: '<rect x="5" y="8" width="14" height="12" rx="2"/><path d="M8 8 16 3M9 12h6M9 16h2"/>',
  flashlight: '<path d="M7 3h10l-2 6H9Z"/><rect x="9" y="9" width="6" height="12" rx="1"/>',
  shield: '<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z"/>',
  cash: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
  fuel: '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9"/><path d="M14 8h2l2 2v7a1.5 1.5 0 0 0 3 0v-6l-2-2"/>',
  bed: '<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>',
  moon: '<path d="M19 15A8 8 0 1 1 10 4a6 6 0 0 0 9 11Z"/>',
  snow: '<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
  person: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',
  animal: '<path d="M4 15c0-3 2-5 6-5h5l2-3h2l1 3-2 2v6h-2v-3h-7v3H7v-3c-2 0-3-.5-3-1Z"/>'
};

/** An inline SVG icon. Decorative by default; pass a label when it is the only content. */
export function icon(name, { label = null, size = 20 } = {}) {
  const wrap = document.createElement("span");
  wrap.className = `icon icon-${name}`;
  wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}>${PATHS[name] || ""}</svg>`;
  return wrap;
}
