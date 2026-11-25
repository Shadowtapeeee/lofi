// Базовые утилиты клиента: DOM, форматирование, API, Telegram, шина событий.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const root = document.documentElement;

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const icon = (name, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const clock = sec => {
  const t = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};
export const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many;
};
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
export const raf = () => new Promise(resolve => requestAnimationFrame(resolve));

// ── окружение ──
export const tg = window.Telegram?.WebApp;
export const inTelegram = !!tg?.initData;
export const tgUser = inTelegram ? tg.initDataUnsafe?.user || null : null;
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const coarse = matchMedia('(pointer: coarse)');
export const wide = matchMedia('(min-width: 900px)');
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
export const motionReduced = () => reducedQuery.matches || root.dataset.motion === 'reduced';
export const onMotionChange = fn => reducedQuery.addEventListener('change', fn);

// ── безопасные внешние адреса ──
export function safeUrl(value, kind = 'art') {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return '';
    const ok = kind === 'art' ? /\.sndcdn\.com$/.test(url.hostname)
      : kind === 'sc' ? ['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'].includes(url.hostname)
      : kind === 'canvas' ? /(?:^|\.)(?:sndcdn\.com|soundcloud\.cloud)$/.test(url.hostname)
      : kind === 'tg' ? /(?:^|\.)(?:t\.me|telegram\.org)$/.test(url.hostname) : false;
    return ok ? url.href : '';
  } catch { return ''; }
}
/** Обложка нужного размера: t500x500 → t300x300 и т. п. */
export const artSize = (url, size) => url ? url.replace(/-t\d+x\d+\.jpg$/, `-${size}.jpg`) : '';

// ── шина событий ──
const listeners = new Map();
export const bus = {
  on(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); return () => listeners.get(event)?.delete(fn); },
  emit(event, data) { for (const fn of listeners.get(event) || []) { try { fn(data); } catch (error) { console.error(event, error); } } },
};

// ── API ──
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export async function api(path, { params, body, signal, method } = {}) {
  const url = new URL('/api/' + path, location.origin);
  for (const [key, value] of Object.entries(params || {})) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  const headers = inTelegram ? { authorization: 'tma ' + tg.initData } : {};
  if (body) headers['content-type'] = 'application/json';
  let response;
  try {
    response = await fetch(url, { headers, signal, method: method || (body ? 'POST' : 'GET'), body: body ? JSON.stringify(body) : undefined });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Нет соединения. Проверьте интернет.', 0);
  }
  let data = null;
  try { data = await response.json(); } catch { /* не JSON: например, ошибка прокси */ }
  if (!response.ok) throw new ApiError(data?.error || (response.status >= 500 ? 'Сервер временно недоступен' : 'Запрос не удался'), response.status);
  return data;
}

// ── хранилище ──
export const account = tgUser?.id ? String(tgUser.id) : 'guest';
export function load(key, fallback) {
  try { const raw = localStorage.getItem(`lofi2:${account}:${key}`); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(`lofi2:${account}:${key}`, JSON.stringify(value)); } catch { /* хранилище недоступно или заполнено */ }
}

// ── тактильный отклик Telegram ──
let hapticsOn = true;
export const setHaptics = value => { hapticsOn = value; };
export function haptic(kind = 'light') {
  if (!hapticsOn || !tg?.HapticFeedback) return;
  try {
    if (kind === 'select') tg.HapticFeedback.selectionChanged();
    else if (['success', 'error', 'warning'].includes(kind)) tg.HapticFeedback.notificationOccurred(kind);
    else tg.HapticFeedback.impactOccurred(kind);
  } catch { /* старый клиент */ }
}

/** Средний и акцентный цвет обложки (для подсветки интерфейса и волны). */
const colorCache = new Map();
export function coverColors(url) {
  if (!url) return Promise.resolve(null);
  if (colorCache.has(url)) return colorCache.get(url);
  const task = new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const size = 12, canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, best = null, bestScore = -1;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2];
          const max = Math.max(data[i], data[i + 1], data[i + 2]), min = Math.min(data[i], data[i + 1], data[i + 2]);
          const sat = max ? (max - min) / max : 0, light = (max + min) / 510;
          const score = sat * (1 - Math.abs(light - .55) * 1.4);
          if (score > bestScore) { bestScore = score; best = [data[i], data[i + 1], data[i + 2]]; }
        }
        const n = data.length / 4;
        resolve({ average: [r / n, g / n, b / n].map(Math.round), accent: bestScore > .12 ? best : null });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = artSize(url, 't67x67');
  });
  colorCache.set(url, task);
  if (colorCache.size > 200) colorCache.delete(colorCache.keys().next().value);
  return task;
}
