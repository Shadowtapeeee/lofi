// Собственный набор тонких линейных иконок на сетке 24×24 (обводка 1.6, скруглённые концы).
// Залитые фигуры задаются атрибутами: они надёжно работают внутри <use>.

const F = 'fill="currentColor" stroke="none"';

export const ICONS = {
  logo: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12c1.4-2.6 2.85-2.6 4.25 0s2.85 2.6 4.25 0 2.85-2.6 4.25 0 2.85 2.6 4.25 0"/>',
  home: '<path d="M4 10.4 12 4l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.2H5.5A1.5 1.5 0 0 1 4 19z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
  library: '<path d="M5 4v16M9 4v16"/><path d="m13.2 4.6 4.4-1 3 14.9-4.4 1z"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  play: `<path ${F} d="M8 5.8v12.4a1 1 0 0 0 1.5.86l10.2-6.2a1 1 0 0 0 0-1.72L9.5 4.94A1 1 0 0 0 8 5.8z"/>`,
  pause: `<rect ${F} x="6.5" y="5" width="4" height="14" rx="1.3"/><rect ${F} x="13.5" y="5" width="4" height="14" rx="1.3"/>`,
  next: `<path ${F} d="M5.5 6.6v10.8a.9.9 0 0 0 1.4.74l7.9-5.4a.9.9 0 0 0 0-1.48l-7.9-5.4a.9.9 0 0 0-1.4.74z"/><path d="M18.5 5.5v13"/>`,
  prev: `<path ${F} d="M18.5 6.6v10.8a.9.9 0 0 1-1.4.74l-7.9-5.4a.9.9 0 0 1 0-1.48l7.9-5.4a.9.9 0 0 1 1.4.74z"/><path d="M5.5 5.5v13"/>`,
  shuffle: '<path d="M4 7h2.5c4.5 0 6.5 10 11 10H20M4 17h2.5c1.6 0 2.8-1.2 3.9-2.8M13.6 9.8C14.7 8.2 15.9 7 17.5 7H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/>',
  repeat: '<path d="M4.5 11V9.5A2.5 2.5 0 0 1 7 7h12.5M17 4.5 19.5 7 17 9.5M19.5 13v1.5A2.5 2.5 0 0 1 17 17H4.5M7 19.5 4.5 17 7 14.5"/>',
  'repeat-one': '<path d="M4.5 11V9.5A2.5 2.5 0 0 1 7 7h12.5M17 4.5 19.5 7 17 9.5M19.5 13v1.5A2.5 2.5 0 0 1 17 17H4.5M7 19.5 4.5 17 7 14.5"/><path d="m11 11.2 1.5-.9v4"/>',
  heart: '<path d="M12 19.6s-7.6-4.5-7.6-10.1A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.6 2.5c0 5.6-7.6 10.1-7.6 10.1z"/>',
  'heart-fill': `<path ${F} d="M12 19.6s-7.6-4.5-7.6-10.1A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.6 2.5c0 5.6-7.6 10.1-7.6 10.1z"/>`,
  more: `<circle ${F} cx="5.5" cy="12" r="1.4"/><circle ${F} cx="12" cy="12" r="1.4"/><circle ${F} cx="18.5" cy="12" r="1.4"/>`,
  close: '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  forward: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  down: '<path d="m5.5 9 6.5 6.5L18.5 9"/>',
  up: '<path d="m5.5 15 6.5-6.5 6.5 6.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  queue: `<path d="M4 6.5h12M4 11.5h12M4 16.5h7"/><path ${F} d="M15 14.2v5.6a.4.4 0 0 0 .6.34l4.3-2.8a.4.4 0 0 0 0-.68l-4.3-2.8a.4.4 0 0 0-.6.34z"/>`,
  lyrics: '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-7l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"/><path d="M7.5 9.5h9M7.5 13h6"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
  volume: '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  'volume-low': '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/>',
  mute: '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="m16 9.5 5 5m0-5-5 5"/>',
  share: '<path d="M12 14.5V3.8M8 7.5 12 3.5l4 4"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H16"/>',
  external: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13M17 13.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5 18V9a1.5 1.5 0 0 1 1.5-1.5H11"/>',
  link: '<path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1"/>',
  trash: '<path d="M4.5 7h15M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7M6.5 7l.8 11.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/>',
  dislike: '<circle cx="12" cy="12" r="8"/><path d="m6.5 17.5 11-11"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z"/>',
  system: `<circle cx="12" cy="12" r="8"/><path ${F} d="M12 4a8 8 0 0 1 0 16z"/>`,
  tune: '<path d="M7 4v5M7 13v7M17 4v9M17 17v3M12 4v1.5M12 9.5V20"/><circle cx="7" cy="11" r="2"/><circle cx="17" cy="15" r="2"/><circle cx="12" cy="7.5" r="2"/>',
  sparkle: '<path d="M11 4c.6 4.4 2.1 5.9 6.5 6.5-4.4.6-5.9 2.1-6.5 6.5-.6-4.4-2.1-5.9-6.5-6.5C8.9 9.9 10.4 8.4 11 4z"/><path d="M18.5 15.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5a7 7 0 0 1 14 0"/>',
  disc: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.4"/><path d="M12 6.5A5.5 5.5 0 0 1 17.5 12"/>',
  cloud: '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 6.9 9.2 4.7 4.7 0 0 0 7 18.5z"/><path d="M12 10.5v3.5M12 16.3v.1"/>',
  refresh: '<path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5"/>',
  timer: '<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.2 1.6M9.5 3.5h5"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  expand: '<path d="M14.5 4.5h5v5M19.5 4.5l-6 6M9.5 19.5h-5v-5M4.5 19.5l6-6"/>',
  'eye-off': '<path d="M3.5 12S6.5 6 12 6c1.6 0 3 .5 4.2 1.2M20.5 12s-3 6-8.5 6c-1.6 0-3-.5-4.2-1.2M4.5 19.5l15-15M9.9 14.1a3 3 0 0 1 4.2-4.2"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8v.1"/>',
  note: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  bolt: '<path d="M13 3.5 6 13.5h5.5l-1 7 7.5-10h-5.5z"/>',
  leaf: '<path d="M5 19c0-8 5-13.5 14.5-14 .5 9.5-5 14.5-13 14.5M5 19c3-4 6-6.5 9.5-8.5"/>',
  sunrise: '<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 5.5v3M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8"/>',
  laptop: '<rect x="5" y="5.5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/>',
  dumbbell: '<path d="M8 7.5v9M16 7.5v9M8 12h8M5 9.5v5M19 9.5v5"/>',
  bed: '<path d="M3.5 18.5v-11M3.5 15h17v3.5M20.5 15v-2.5a3 3 0 0 0-3-3H11V15"/><circle cx="7.3" cy="11.8" r="1.8"/>',
  car: '<path d="m5 15 1.6-4.9A2 2 0 0 1 8.5 8.7h7a2 2 0 0 1 1.9 1.4L19 15"/><rect x="3.5" y="15" width="17" height="3.8" rx="1.6"/><path d="M7 18.8v1.2M17 18.8v1.2"/>',
  smile: '<circle cx="12" cy="12" r="8"/><path d="M8.8 14a4 4 0 0 0 6.4 0M9.5 10v.1M14.5 10v.1"/>',
  rain: '<path d="M7 14.5h10a3.5 3.5 0 0 0 .5-7A5 5 0 0 0 7.8 6.8 3.9 3.9 0 0 0 7 14.5z"/><path d="m9 17.5-1 2M13 17.5l-1 2M17 17.5l-1 2"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  compass: '<circle cx="12" cy="12" r="8"/><path d="m14.8 9.2-1.6 4-4 1.6 1.6-4z"/>',
  calm: '<path d="M4 10c2-1.6 4-1.6 6 0s4 1.6 6 0 3-1.2 4-.6M4 15c2-1.6 4-1.6 6 0s4 1.6 6 0 3-1.2 4-.6"/>',
  infinity: '<path d="M8.5 15.5a3.5 3.5 0 1 1 0-7c3.5 0 3.5 7 7 7a3.5 3.5 0 1 0 0-7c-3.5 0-3.5 7-7 7z"/>',
  database: '<ellipse cx="12" cy="6.5" rx="7" ry="2.5"/><path d="M5 6.5v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  grip: `<circle ${F} cx="9" cy="7" r="1.2"/><circle ${F} cx="15" cy="7" r="1.2"/><circle ${F} cx="9" cy="12" r="1.2"/><circle ${F} cx="15" cy="12" r="1.2"/><circle ${F} cx="9" cy="17" r="1.2"/><circle ${F} cx="15" cy="17" r="1.2"/>`,
  'arrow-right': '<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>',
  minus: '<path d="M5 12h14"/>',
  text: '<path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/>',
  palette: '<path d="M12 20a8 8 0 1 1 8-8c0 2.2-1.8 3-3.3 3h-1.9a1.8 1.8 0 0 0-1.3 3.1c.5.5.3 1.9-1.5 1.9z"/><circle cx="8" cy="11" r="1"/><circle cx="11" cy="7.8" r="1"/><circle cx="15.2" cy="8.6" r="1"/>',
  speaker: '<rect x="6" y="3.5" width="12" height="17" rx="2.5"/><circle cx="12" cy="14" r="3"/><path d="M12 7.5v.1"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
};

export function installIcons() {
  if (document.getElementById('icon-sprite')) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.id = 'icon-sprite';
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = Object.entries(ICONS).map(([name, body]) => `<symbol id="i-${name}" viewBox="0 0 24 24">${body}</symbol>`).join('');
  document.body.prepend(svg);
}
