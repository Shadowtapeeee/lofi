// Поиск: треки, альбомы и артисты, фильтр оригиналов, недавние запросы, бесконечная подгрузка.

import { $, $$, esc, icon, api } from '../core.js';
import { prefs, setPref, state, rememberSearch, forgetSearches } from '../store.js';
import { trackList, albumCard, artistCard, skeletonRows, skeletonGrid, empty, sectionHead } from '../ui.js';
import { registerList } from '../actions.js';

const S = { q: '', kind: 't', page: 0, result: null, loading: false, error: '', controller: null, more: false };
let observer = null;
let timer = 0;

const KINDS = [['t', 'Треки'], ['a', 'Альбомы'], ['u', 'Артисты']];

export function setQuery(q, { immediate = false } = {}) {
  const value = q.trim();
  clearTimeout(timer);
  if (value === S.q && S.result && !immediate) return;
  S.q = value;
  if (value.length < 2) { abort(); S.result = null; S.error = ''; return paint(); }
  if (immediate) return run();
  S.loading = true;
  paint();
  timer = setTimeout(run, 320);
}
export function setKind(kind) {
  if (S.kind === kind) return;
  S.kind = kind;
  for (const b of $$('[data-action="search-kind"]')) b.setAttribute('aria-pressed', String(b.dataset.value === kind));
  syncUrl();
  if (S.q.length >= 2) run();
  else paint();
}
export const query = () => S.q;
export const kind = () => S.kind;

function abort() { S.controller?.abort(); S.controller = null; S.loading = false; }

function syncUrl() {
  const url = new URL(location.href);
  if (url.pathname !== '/search') return;
  if (S.q) url.searchParams.set('q', S.q); else url.searchParams.delete('q');
  if (S.kind !== 't') url.searchParams.set('kind', S.kind); else url.searchParams.delete('kind');
  history.replaceState(history.state, '', url.pathname + url.search);
}

async function run(append = false) {
  abort();
  const controller = new AbortController();
  S.controller = controller;
  S.loading = true;
  S.error = '';
  const page = append ? S.page + 1 : 0;
  if (!append) { S.result = null; paint(); }
  else paintMore();
  syncUrl();
  try {
    const data = await api('search', { params: { q: S.q, kind: S.kind, page, originals: prefs.originals ? 1 : 0 }, signal: controller.signal });
    if (controller.signal.aborted) return;
    S.result = append && S.result ? { ...data, items: [...S.result.items, ...data.items] } : data;
    S.page = page;
    S.more = !!data.more;
    if (!append) rememberSearch(S.q);
  } catch (error) {
    if (error.name === 'AbortError') return;
    S.error = error.message;
  } finally {
    if (S.controller === controller) { S.loading = false; S.controller = null; }
  }
  append ? appendResults() : paint();
}

export function render() {
  return `
    <header class="page-head"><h1>Поиск</h1></header>
    <div class="filters" role="toolbar" aria-label="Что искать">
      ${KINDS.map(([value, label]) => `<button class="chip-btn" type="button" data-action="search-kind" data-value="${value}" aria-pressed="${S.kind === value}">${label}</button>`).join('')}
      <span class="filters-sep"></span>
      <button class="chip-btn toggle" type="button" data-action="search-originals" aria-pressed="${prefs.originals}" title="Скрыть перезаливы, ускоренные версии и сборники">${icon('check')}<span>Только оригиналы</span></button>
    </div>
    <div class="search-results" id="search-results" aria-live="polite"></div>`;
}

function resultsHtml() {
  if (S.q.length < 2) return idleHtml();
  if (S.error) return empty('cloud', S.error, '', '<button class="btn glass" type="button" data-action="search-retry">Повторить</button>');
  if (!S.result) return S.kind === 't' ? skeletonRows(8) : skeletonGrid(8, S.kind === 'u');
  const r = S.result;
  if (!r.items.length) return empty('search', 'Ничего не нашлось', r.hidden ? 'Часть версий скрыта фильтром «Только оригиналы» — попробуйте выключить его.' : 'Попробуйте другой запрос или ссылку SoundCloud.');
  let head = '';
  if (r.album) head = `<a class="result-banner" href="/album/${esc(r.album.id)}" data-link>${icon('disc')}<span>Альбом «${esc(r.album.title)}»</span>${icon('forward')}</a>`;
  else if (r.artist) head = `<a class="result-banner" href="/artist/${esc(r.artist.id)}" data-link>${icon('user')}<span>${esc(r.artist.title)}</span>${icon('forward')}</a>`;
  else if (r.label) head = sectionHead(r.label);
  return head + itemsHtml(r.items, 0) + moreHtml();
}

function itemsHtml(items, offset) {
  if (S.kind === 'a' && S.result?.kind === 'a') return `<div class="grid-cards">${items.map((a, i) => albumCard(a, i + offset)).join('')}</div>`;
  if (S.kind === 'u' && S.result?.kind === 'u') return `<div class="grid-cards">${items.map((u, i) => artistCard(u, i + offset)).join('')}</div>`;
  registerList('search', S.result.items, { type: 'search', label: 'Поиск: ' + S.q, href: '/search?q=' + encodeURIComponent(S.q) });
  return trackList(items, { source: 'search' }).replace(/--i:(\d+)/g, (_, n) => `--i:${Math.min(14, Number(n))}`);
}

const moreHtml = () => S.more ? `<div class="more" data-more><button class="btn glass" type="button" data-action="search-more">${S.loading ? '<span class="spinner inline"></span>' : 'Показать ещё'}</button></div>` : '';

function idleHtml() {
  const recent = state.searches;
  const genres = window.__lofiConfig?.genres || [];
  return `
    ${recent.length ? `<section class="block">${sectionHead('Вы искали')}
      <div class="recent-searches">${recent.map(q => `<button class="chip-btn" type="button" data-action="search-suggest" data-value="${esc(q)}">${icon('clock')}<span>${esc(q)}</span></button>`).join('')}
      <button class="text-link" type="button" data-action="search-forget">Очистить</button></div></section>` : ''}
    <section class="block">${sectionHead('Жанры и сцены')}
      <div class="genres">${genres.map((g, i) => `<button class="genre" type="button" data-action="search-suggest" data-value="${esc(g.query)}" style="--i:${i}"><span>${esc(g.name)}</span>${icon('arrow-right')}</button>`).join('')}</div>
    </section>
    <p class="hint">${icon('link')} Можно вставить ссылку SoundCloud на трек, альбом или артиста.</p>`;
}

function paint() {
  const box = $('#search-results');
  if (!box) return;
  box.innerHTML = resultsHtml();
  watchMore();
}
function paintMore() {
  const more = $('[data-more] button');
  if (more) more.innerHTML = '<span class="spinner inline"></span>';
}
function appendResults() {
  const box = $('#search-results');
  if (!box || !S.result) return paint();
  if (S.error) { const more = $('[data-more] button'); if (more) more.textContent = 'Повторить загрузку'; return; }
  const shown = $$('.row, .grid-cards > .card', box).length;
  const fresh = S.result.items.slice(shown);
  $('[data-more]', box)?.remove();
  const container = S.kind === 't' ? $('.rows', box) : $('.grid-cards', box);
  if (!container) return paint();
  const tmp = document.createElement('div');
  tmp.innerHTML = itemsHtml(fresh, shown);
  container.append(...tmp.firstElementChild.children);
  box.insertAdjacentHTML('beforeend', moreHtml());
  watchMore();
}

function watchMore() {
  observer?.disconnect();
  const sentinel = $('[data-more]');
  if (!sentinel) return;
  observer = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting) && !S.loading && S.more) run(true);
  }, { rootMargin: '400px' });
  observer.observe(sentinel);
}

export function mount() {
  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  const kind = params.get('kind');
  if (['t', 'a', 'u'].includes(kind)) S.kind = kind;
  const input = $('#search-input');
  if (q !== null && q !== S.q) { input.value = q; setQuery(q, { immediate: true }); }
  else { if (S.q && input.value !== S.q) input.value = S.q; paint(); }
  for (const b of $$('[data-action="search-kind"]')) b.setAttribute('aria-pressed', String(b.dataset.value === S.kind));
}
export function unmount() { observer?.disconnect(); }

export const actions = {
  'search-kind': b => setKind(b.dataset.value),
  'search-more': () => run(true),
  'search-retry': () => run(),
  'search-originals': b => { setPref('originals', !prefs.originals); b.setAttribute('aria-pressed', String(prefs.originals)); if (S.q.length >= 2) run(); },
  'search-forget': () => { forgetSearches(); paint(); },
};
