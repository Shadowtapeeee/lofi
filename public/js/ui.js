// Общие элементы интерфейса: листы, меню, тосты, переходы страниц, слайдеры и карточки.

import { $, $$, esc, icon, clock, sleep, motionReduced, coarse, wide, safeUrl, artSize, haptic } from './core.js';
import { isLiked } from './store.js';

// ── картинки: плавное появление без сдвига вёрстки ──
document.addEventListener('load', event => {
  const img = event.target;
  if (img.tagName === 'IMG') img.classList.add('is-loaded');
}, true);
document.addEventListener('error', event => {
  const img = event.target;
  if (img.tagName === 'IMG') img.remove();
}, true);

export function cover(url, { size = 't300x300', cls = '', eager = false } = {}) {
  const src = safeUrl(url);
  return `<span class="cover${cls ? ' ' + cls : ''}">${icon('logo', 'ph')}${src ? `<img src="${esc(artSize(src, size))}" alt="" decoding="async"${eager ? '' : ' loading="lazy"'}>` : ''}</span>`;
}

// ── строки и карточки ──
export const eq = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';

export function trackRow(track, { source = '', index = 0, number = false, compact = false } = {}) {
  const id = esc(track.id);
  if (track.available === false) {
    return `<div class="row is-unavailable" style="--i:${Math.min(index, 14)}">
      <span class="row-lead">${number ? `<span class="row-num">${index + 1}</span>` : cover(track.artwork)}</span>
      <span class="row-text"><strong>${esc(track.title)}</strong><small>${esc(track.artist)} · недоступен</small></span></div>`;
  }
  const liked = isLiked(track.id);
  return `<div class="row${compact ? ' compact' : ''}" data-row="${id}" style="--i:${Math.min(index, 14)}">
    <button class="row-main" type="button" data-action="play-track" data-id="${id}" data-source="${esc(source)}" data-index="${index}">
      <span class="row-lead">${number ? `<span class="row-num">${index + 1}</span>` : cover(track.artwork, { size: 't120x120' })}<span class="row-play">${icon('play')}${eq}</span></span>
      <span class="row-text"><strong>${esc(track.title)}${track.explicit ? '<em class="badge-e" title="Ненормативная лексика">E</em>' : ''}</strong><small>${esc(track.artist)}</small></span>
    </button>
    ${compact ? '' : `<time class="row-time">${track.dur ? clock(track.dur) : ''}</time>`}
    <button class="icon-btn ghost row-like${liked ? ' is-on' : ''}" type="button" data-action="like" data-id="${id}" aria-pressed="${liked}" aria-label="${liked ? 'Убрать из избранного' : 'В избранное'}">${icon(liked ? 'heart-fill' : 'heart')}</button>
    <button class="icon-btn ghost row-more" type="button" data-action="track-menu" data-id="${id}" aria-label="Действия">${icon('more')}</button>
  </div>`;
}

export const trackList = (tracks, options = {}) =>
  `<div class="rows">${tracks.map((t, i) => trackRow(t, { ...options, index: i })).join('')}</div>`;

export function albumCard(album, i = 0) {
  return `<a class="card" href="/album/${esc(album.id)}" data-link style="--i:${Math.min(i, 12)}">
    ${cover(album.artwork, { cls: 'card-cover' })}
    <strong>${esc(album.title)}</strong><small>${esc(album.artist)}${album.year ? ' · ' + esc(album.year) : ''}</small></a>`;
}

export function artistCard(user, i = 0) {
  return `<a class="card artist" href="/artist/${esc(user.id)}" data-link style="--i:${Math.min(i, 12)}">
    ${cover(user.artwork, { cls: 'card-cover round' })}
    <strong>${esc(user.title)}${user.verified ? ' ' + icon('check', 'verified') : ''}</strong><small>${user.followers ? formatCount(user.followers) + ' слушателей' : 'Артист'}</small></a>`;
}

export const formatCount = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' млн' : n >= 1e3 ? Math.round(n / 1e3) + ' тыс.' : String(n);

export const sectionHead = (title, link = '', linkLabel = 'Все') =>
  `<div class="section-head"><h2>${esc(title)}</h2>${link ? `<a class="text-link" href="${esc(link)}" data-link>${esc(linkLabel)}${icon('forward')}</a>` : ''}</div>`;

export const skeletonRows = (n = 6) => `<div class="rows" aria-hidden="true">${Array.from({ length: n }, () =>
  '<div class="row skeleton"><span class="row-lead"><span class="sk sk-cover"></span></span><span class="row-text"><i class="sk sk-line"></i><i class="sk sk-line short"></i></span></div>').join('')}</div>`;
const skeletonCard = round => `<div class="card skeleton"><span class="sk sk-card${round ? ' round' : ''}"></span><i class="sk sk-line"></i><i class="sk sk-line short"></i></div>`;
export const skeletonCards = (n = 6, round = false) => `<div class="shelf" aria-hidden="true">${Array.from({ length: n }, () => skeletonCard(round)).join('')}</div>`;
export const skeletonGrid = (n = 8, round = false) => `<div class="grid-cards" aria-hidden="true">${Array.from({ length: n }, () => skeletonCard(round)).join('')}</div>`;

export const empty = (glyph, title, text = '', action = '') =>
  `<div class="empty">${icon(glyph)}<strong>${esc(title)}</strong>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;

// ── переходы между страницами ──
let viewToken = 0;
export async function swapView(html, { mount, scroll = 0, direction = 'forward' } = {}) {
  const token = ++viewToken;
  const view = $('#view');
  if (!motionReduced() && view.firstElementChild) {
    view.dataset.leaving = direction;
    await sleep(130);
    if (token !== viewToken) return false;
  }
  view.innerHTML = `<div class="page" data-dir="${direction}">${html}</div>`;
  delete view.dataset.leaving;
  window.scrollTo({ top: scroll, behavior: 'instant' });
  mount?.(view.firstElementChild);
  return true;
}
export const viewAlive = token => token === viewToken;
export const currentViewToken = () => viewToken;

// ── тосты (в верхнем слое, поверх открытых диалогов) ──
const supportsPopover = typeof HTMLElement.prototype.showPopover === 'function';
function raise(el) {
  if (!supportsPopover) return;
  try { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } catch { /* уже показан */ }
}
export function toast(message, { glyph = '', action = null, duration = 2800 } = {}) {
  const box = $('#toasts');
  raise(box);
  const el = document.createElement('div');
  el.className = 'toast glass';
  el.setAttribute('role', 'status');
  el.innerHTML = `${glyph ? icon(glyph) : ''}<span>${esc(message)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('button').addEventListener('click', () => { action.run(); dismiss(); });
  box.append(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  requestAnimationFrame(() => el.classList.add('is-in'));
  let timer = setTimeout(dismiss, duration);
  el.addEventListener('pointerenter', () => clearTimeout(timer));
  el.addEventListener('pointerleave', () => { timer = setTimeout(dismiss, 1200); });
  function dismiss() {
    clearTimeout(timer);
    el.classList.remove('is-in');
    el.classList.add('is-out');
    setTimeout(() => el.remove(), motionReduced() ? 0 : 320);
  }
  return dismiss;
}

// ── листы: снизу на телефоне, по центру на компьютере ──
const sheet = $('#sheet');
const sheetState = { closing: null, onClose: null, kind: '' };

export function openSheet({ title = '', body = '', kind = '', size = '', onClose = null } = {}) {
  sheetState.kind = kind;
  const reopen = sheet.open && !sheetState.closing;
  clearTimeout(sheetState.closing);
  sheetState.closing = null;
  const prevClose = sheetState.onClose;
  sheetState.onClose = onClose;
  if (reopen) prevClose?.();
  const html = `<div class="sheet-scrim" data-action="sheet-close"></div>
    <div class="sheet-panel glass${size ? ' ' + size : ''}" role="document">
      <div class="sheet-grabber" aria-hidden="true"></div>
      <header class="sheet-head"><h2 id="sheet-title">${esc(title)}</h2>
        <button class="icon-btn ghost" type="button" data-action="sheet-close" aria-label="Закрыть">${icon('close')}</button></header>
      <div class="sheet-body">${body}</div>
    </div>`;
  if (reopen) {
    const panel = $('.sheet-panel', sheet);
    panel.classList.add('is-swapping');
    setTimeout(() => {
      sheet.innerHTML = html;
      sheet.classList.add('is-open');
      bindDrag();
    }, motionReduced() ? 0 : 110);
    return sheet;
  }
  sheet.innerHTML = html;
  sheet.classList.remove('is-open', 'is-closing');
  if (!sheet.open) sheet.showModal();
  bindDrag();
  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
  haptic('light');
  return sheet;
}

export function updateSheetBody(html) {
  const body = $('.sheet-body', sheet);
  if (body) body.innerHTML = html;
}
export const sheetKind = () => (sheet.open && !sheetState.closing ? sheetState.kind : '');

export function closeSheet() {
  if (!sheet.open || sheetState.closing) return;
  sheet.classList.remove('is-open');
  sheet.classList.add('is-closing');
  const done = () => {
    sheetState.closing = null;
    sheet.classList.remove('is-closing');
    if (sheet.open) sheet.close();
    sheet.innerHTML = '';
    const fn = sheetState.onClose;
    sheetState.onClose = null;
    fn?.();
  };
  sheetState.closing = setTimeout(done, motionReduced() ? 0 : 300);
}
sheet.addEventListener('cancel', event => { event.preventDefault(); closeSheet(); });

function bindDrag() {
  const panel = $('.sheet-panel', sheet);
  const handle = $('.sheet-grabber', sheet);
  const head = $('.sheet-head', sheet);
  if (!panel) return;
  let startY = 0, dy = 0, startT = 0, dragging = false;
  const down = event => {
    if (wide.matches || event.target.closest('button')) return;
    dragging = true; startY = event.clientY; dy = 0; startT = performance.now();
    panel.style.transition = 'none';
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = event => {
    if (!dragging) return;
    dy = Math.max(0, event.clientY - startY);
    panel.style.transform = `translateY(${dy}px)`;
  };
  const up = () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = '';
    panel.style.transform = '';
    const velocity = dy / Math.max(1, performance.now() - startT);
    if (dy > 110 || velocity > .6) closeSheet();
  };
  for (const el of [handle, head]) {
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
}

// ── контекстное меню: поповер на компьютере, лист на телефоне ──
const popover = $('#popover');
let popoverItems = [];

export function openMenu(anchor, { title = '', header = '', items = [] }) {
  const visible = items.filter(Boolean);
  const html = visible.map((item, i) => item.divider ? '<hr>' :
    `<button class="menu-item${item.danger ? ' danger' : ''}" type="button" role="menuitem" data-menu="${i}">${icon(item.icon)}<span>${esc(item.label)}</span>${item.hint ? `<small>${esc(item.hint)}</small>` : ''}</button>`).join('');
  popoverItems = visible;
  if (coarse.matches || !wide.matches || !anchor || !supportsPopover) {
    openSheet({ title, body: `${header}<div class="menu-list">${html}</div>`, kind: 'menu' });
    return;
  }
  closeMenu(true);
  popover.innerHTML = `${header ? `<div class="menu-header">${header}</div>` : ''}<div class="menu-list">${html}</div>`;
  raise(popover);
  const rect = anchor.getBoundingClientRect();
  const width = popover.offsetWidth, height = popover.offsetHeight;
  const below = rect.bottom + 6 + height < innerHeight - 8;
  const left = Math.min(innerWidth - width - 10, Math.max(10, rect.right - width));
  const top = below ? rect.bottom + 6 : Math.max(10, rect.top - height - 6);
  popover.style.left = left + 'px';
  popover.style.top = top + 'px';
  popover.style.transformOrigin = `${rect.left + rect.width / 2 - left}px ${below ? 0 : height}px`;
  requestAnimationFrame(() => popover.classList.add('is-open'));
  $('.menu-item', popover)?.focus({ preventScroll: true });
}

const menuOpen = () => supportsPopover && popover.matches(':popover-open');
export function closeMenu(instant = false) {
  if (!menuOpen()) return;
  popover.classList.remove('is-open');
  const hide = () => { if (!popover.classList.contains('is-open') && menuOpen()) popover.hidePopover(); };
  if (instant || motionReduced()) hide(); else setTimeout(hide, 160);
}

document.addEventListener('click', event => {
  const item = event.target.closest('[data-menu]');
  if (item && (popover.contains(item) || sheet.contains(item))) {
    const entry = popoverItems[Number(item.dataset.menu)];
    closeMenu();
    if (sheet.contains(item)) closeSheet();
    haptic('select');
    entry?.run?.();
    return;
  }
  if (menuOpen() && !popover.contains(event.target) && !event.target.closest('[data-action="track-menu"],[data-action="player-menu"],[data-action="sleep-menu"]')) closeMenu();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
addEventListener('resize', () => closeMenu(true));
addEventListener('scroll', () => closeMenu(), { passive: true });

// ── слайдер на указателе (позиция трека, громкость, настройки) ──
export class Slider {
  constructor(el, { onInput, onCommit, step = 0.02, label = v => Math.round(v * 100) + '%' } = {}) {
    this.el = el; this.value = 0; this.dragging = false;
    this.onInput = onInput; this.onCommit = onCommit; this.step = step; this.label = label;
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointermove', e => this.move(e));
    el.addEventListener('pointerup', e => this.up(e));
    el.addEventListener('pointercancel', e => this.up(e));
    el.addEventListener('keydown', e => this.key(e));
  }
  ratio(event) {
    const rect = this.el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  }
  down(event) {
    if (this.el.getAttribute('aria-disabled') === 'true') return;
    this.dragging = true;
    this.el.classList.add('is-dragging');
    this.el.setPointerCapture(event.pointerId);
    this.set(this.ratio(event));
    this.onInput?.(this.value);
  }
  move(event) {
    if (!this.dragging) return;
    this.set(this.ratio(event));
    this.onInput?.(this.value);
  }
  up() {
    if (!this.dragging) return;
    this.dragging = false;
    this.el.classList.remove('is-dragging');
    this.onCommit?.(this.value);
  }
  key(event) {
    const delta = { ArrowRight: this.step, ArrowUp: this.step, ArrowLeft: -this.step, ArrowDown: -this.step, PageUp: .1, PageDown: -.1 }[event.key];
    if (delta === undefined && !['Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    this.set(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : this.value + delta);
    this.onInput?.(this.value);
    this.onCommit?.(this.value);
  }
  set(value) {
    this.value = Math.min(1, Math.max(0, Number(value) || 0));
    this.el.style.setProperty('--v', this.value);
    this.el.setAttribute('aria-valuenow', String(Math.round(this.value * 100)));
    this.el.setAttribute('aria-valuetext', this.label(this.value));
  }
  disable(flag) { this.el.setAttribute('aria-disabled', String(!!flag)); }
}

/** Обновляет состояние лайков во всех видимых списках. */
export function refreshLikes(root = document) {
  for (const button of $$('[data-action="like"][data-id]', root)) {
    const on = isLiked(button.dataset.id);
    if (button.classList.contains('is-on') === on) continue;
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? 'Убрать из избранного' : 'В избранное');
    button.innerHTML = icon(on ? 'heart-fill' : 'heart');
    if (on && !motionReduced()) { button.classList.remove('pop'); void button.offsetWidth; button.classList.add('pop'); }
  }
}
