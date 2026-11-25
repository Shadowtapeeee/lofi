// Состояние пользователя: настройки, избранное, история, скрытые треки и синхронизация с сервером.

import { CHOICES, DEFAULTS, RANGES, TASTE } from './schema.js';
import { api, bus, load, save, inTelegram, setHaptics } from './core.js';

const stored = load('prefs', null) || (() => { try { return JSON.parse(localStorage.getItem('lofi2:prefs:last')); } catch { return null; } })() || {};

export function clean(value) {
  const prefs = { ...DEFAULTS, taste: {} };
  if (!value || typeof value !== 'object') return prefs;
  for (const [key, values] of Object.entries(CHOICES)) if (values.includes(value[key])) prefs[key] = value[key];
  for (const key of Object.keys(DEFAULTS)) if (typeof DEFAULTS[key] === 'boolean' && typeof value[key] === 'boolean') prefs[key] = value[key];
  for (const [key, [min, max]] of Object.entries(RANGES)) if (Number.isFinite(value[key])) prefs[key] = Math.round(Math.min(max, Math.max(min, value[key])));
  if (value.taste && typeof value.taste === 'object') {
    prefs.taste = Object.fromEntries(Object.entries(value.taste).filter(([k, v]) => k && k.length <= 140 && TASTE.includes(v) && v !== 'normal').slice(-80));
  }
  return prefs;
}

export const prefs = clean(stored);
export const state = {
  favorites: load('favorites', []),
  recent: load('recent', []),
  dislikes: load('dislikes', []),
  searches: load('searches', []),
  lyricOffsets: load('lyric-offsets', {}),
  synced: false,
  hydrated: !inTelegram,
};

/** Все известные клиенту треки по id (для кнопок в списках). */
export const catalogue = new Map();
export function remember(tracks = []) { for (const t of tracks) if (t?.id) catalogue.set(String(t.id), t); }
remember([...state.favorites, ...state.recent]);

// ── синхронизация ──
const queues = new Map();
const pendingOps = [];
function sync(path, body, key = path) {
  if (!inTelegram) return;
  if (!state.hydrated) { pendingOps.push([path, body, key]); return; }
  if (!state.synced) return;
  const previous = queues.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(() => api(path, { body })).catch(error => { if (error.status === 401) state.synced = false; });
  queues.set(key, next);
  next.finally(() => { if (queues.get(key) === next) queues.delete(key); });
}

let prefsTimer;
function persistPrefs() {
  save('prefs', prefs);
  try { localStorage.setItem('lofi2:prefs:last', JSON.stringify({ theme: prefs.theme, motion: prefs.motion, glass: prefs.glass, textScale: prefs.textScale })); } catch {}
  clearTimeout(prefsTimer);
  prefsTimer = setTimeout(() => sync('preferences', { ...prefs }), 400);
}

export function setPref(key, value) {
  if (prefs[key] === value) return;
  prefs[key] = value;
  if (key === 'haptics') setHaptics(value);
  persistPrefs();
  bus.emit('prefs', key);
}
export function setTaste(artist, level) {
  const taste = { ...prefs.taste };
  if (level === 'normal') delete taste[artist]; else taste[artist] = level;
  prefs.taste = Object.fromEntries(Object.entries(taste).slice(-80));
  persistPrefs();
  bus.emit('prefs', 'taste');
}
export function resetPrefs() {
  Object.assign(prefs, clean({}));
  persistPrefs();
  bus.emit('prefs', '*');
}
setHaptics(prefs.haptics);

// ── избранное, история, скрытые ──
export const isLiked = id => state.favorites.some(t => t.id === String(id));
export const isDisliked = id => state.dislikes.some(t => t.id === String(id));
const slim = t => ({ id: t.id, title: t.title, artist: t.artist, dur: t.dur, artwork: t.artwork, artistId: t.artistId || '', userId: t.userId || '',
  avatar: t.avatar || '', url: t.url || '', album: t.album || '', canvas: t.canvas || '', available: t.available !== false, genre: t.genre || '' });

export function toggleLike(track, force) {
  if (!track) return false;
  const active = force ?? !isLiked(track.id);
  state.favorites = active ? [slim(track), ...state.favorites.filter(t => t.id !== track.id)].slice(0, 1000) : state.favorites.filter(t => t.id !== track.id);
  if (active) state.dislikes = state.dislikes.filter(t => t.id !== track.id);
  save('favorites', state.favorites);
  save('dislikes', state.dislikes);
  remember([track]);
  sync('favorite', { id: track.id, active }, 'favorite:' + track.id);
  bus.emit('library', { kind: 'favorite', track, active });
  return active;
}

export function setDislike(track, active = !isDisliked(track.id)) {
  if (!track) return false;
  state.dislikes = active ? [slim(track), ...state.dislikes.filter(t => t.id !== track.id)].slice(0, 1000) : state.dislikes.filter(t => t.id !== track.id);
  if (active && isLiked(track.id)) toggleLike(track, false);
  save('dislikes', state.dislikes);
  sync('dislike', { id: track.id, active }, 'dislike:' + track.id);
  bus.emit('library', { kind: 'dislike', track, active });
  return active;
}

export function addRecent(track) {
  if (!track) return;
  state.recent = [slim(track), ...state.recent.filter(t => t.id !== track.id)].slice(0, 100);
  save('recent', state.recent);
  sync('recent', { id: track.id }, 'recent:' + track.id);
  bus.emit('library', { kind: 'recent', track, active: true });
}

export function clearList(kind) {
  if (kind === 'recent') { state.recent = []; save('recent', []); }
  if (kind === 'dislike') { state.dislikes = []; save('dislikes', []); }
  sync('clear', { kind }, 'clear:' + kind);
  bus.emit('library', { kind, cleared: true });
}

export function rememberSearch(query) {
  const q = query.trim();
  if (q.length < 2) return;
  state.searches = [q, ...state.searches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 12);
  save('searches', state.searches);
}
export function forgetSearches() { state.searches = []; save('searches', []); }

export function lyricOffset(id) { return (state.lyricOffsets[id] || 0) + prefs.lyricOffset; }
export function nudgeLyrics(id, delta) {
  const value = Math.max(-10000, Math.min(10000, (state.lyricOffsets[id] || 0) + delta));
  if (value) state.lyricOffsets[id] = value; else delete state.lyricOffsets[id];
  const keys = Object.keys(state.lyricOffsets);
  if (keys.length > 300) delete state.lyricOffsets[keys[0]];
  save('lyric-offsets', state.lyricOffsets);
  return value;
}
export const trackLyricOffset = id => state.lyricOffsets[id] || 0;

/** Доли артистов среди избранного и истории. */
export function tasteStats() {
  const counts = new Map();
  for (const t of [...state.favorites.slice(0, 300), ...state.recent]) {
    if (!t.artist) continue;
    const row = counts.get(t.artist) || { name: t.artist, n: 0, track: t };
    row.n++;
    counts.set(t.artist, row);
  }
  for (const name of Object.keys(prefs.taste)) if (!counts.has(name)) counts.set(name, { name, n: 0 });
  const sum = [...counts.values()].reduce((s, a) => s + a.n, 0) || 1;
  return [...counts.values()].sort((a, b) => b.n - a.n).map(a => ({ ...a, share: Math.round(a.n * 100 / sum) }));
}

// ── загрузка профиля из Telegram ──
export async function hydrate() {
  if (!inTelegram) return;
  try {
    const data = await api('state');
    state.synced = true;
    state.favorites = data.favorites || [];
    state.recent = data.recent || [];
    state.dislikes = data.dislikes || [];
    if (data.preferences) Object.assign(prefs, clean(data.preferences));
    save('favorites', state.favorites);
    save('recent', state.recent);
    save('dislikes', state.dislikes);
    remember([...state.favorites, ...state.recent]);
  } catch { /* остаёмся на локальных данных */ }
  state.hydrated = true;
  // Действия, сделанные до загрузки профиля, применяются поверх данных сервера.
  const ops = pendingOps.splice(0);
  for (const [path, body, key] of ops) {
    if (path === 'favorite') {
      const t = state.favorites.find(x => x.id === body.id) || catalogue.get(body.id);
      if (body.active && t && !isLiked(body.id)) state.favorites.unshift(slim(t));
      if (!body.active) state.favorites = state.favorites.filter(x => x.id !== body.id);
    }
    if (path === 'recent') { const t = catalogue.get(body.id); if (t) state.recent = [slim(t), ...state.recent.filter(x => x.id !== t.id)].slice(0, 100); }
    if (path === 'dislike') { const t = catalogue.get(body.id); if (body.active && t) state.dislikes.unshift(slim(t)); else state.dislikes = state.dislikes.filter(x => x.id !== body.id); }
    if (path === 'preferences') { Object.assign(prefs, clean(body)); continue; }
    sync(path, body, key);
  }
  if (ops.some(([path]) => path === 'preferences')) sync('preferences', { ...prefs });
  save('prefs', prefs);
  save('favorites', state.favorites);
  save('recent', state.recent);
  save('dislikes', state.dislikes);
  setHaptics(prefs.haptics);
  bus.emit('prefs', '*');
  bus.emit('library', { kind: '*' });
}
