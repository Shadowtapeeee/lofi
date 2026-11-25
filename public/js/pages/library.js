// Медиатека: избранное, история и скрытые треки.

import { $, esc, icon, plural } from '../core.js';
import { state, clearList, setDislike } from '../store.js';
import { trackList, empty, cover } from '../ui.js';
import { registerList } from '../actions.js';
import * as player from '../player/player.js';

const TABS = [['favorites', 'Избранное', 'heart'], ['history', 'История', 'clock'], ['hidden', 'Скрытые', 'eye-off']];

export const tabFromPath = path => ({ '/library/history': 'history', '/library/hidden': 'hidden' })[path] || 'favorites';

function items(tab) { return tab === 'history' ? state.recent : tab === 'hidden' ? state.dislikes : state.favorites; }

export function render(tab) {
  return `
    <header class="page-head"><h1>Медиатека</h1></header>
    <nav class="segmented" aria-label="Разделы медиатеки">
      ${TABS.map(([key, label, glyph]) => `<a class="seg" href="/library${key === 'favorites' ? '' : '/' + key}" data-link data-replace aria-current="${key === tab ? 'page' : 'false'}">${icon(glyph)}<span>${label}</span><small>${items(key).length || ''}</small></a>`).join('')}
    </nav>
    <div id="library-body">${body(tab)}</div>`;
}

function body(tab) {
  const list = items(tab);
  if (!list.length) {
    if (tab === 'favorites') return empty('heart', 'Здесь будут любимые треки', 'Нажмите на сердечко рядом с треком — он сохранится в избранном и подскажет волне ваш вкус.', '<a class="btn glass" href="/search" data-link>Найти музыку</a>');
    if (tab === 'history') return empty('clock', 'История пока пуста', 'Здесь появятся треки, которые вы слушали.', '<button class="btn primary" type="button" data-action="wave-toggle">' + icon('play') + '<span>Включить волну</span></button>');
    return empty('eye-off', 'Скрытых треков нет', 'Треки с отметкой «Не нравится» не попадут в волну и подборки.');
  }
  if (tab === 'hidden') {
    return `<div class="list-actions"><span class="muted">${list.length} ${plural(list.length, 'трек', 'трека', 'треков')}</span><button class="btn ghost sm" type="button" data-action="library-clear" data-value="dislike">${icon('trash')}<span>Очистить</span></button></div>
      <div class="rows">${list.map((t, i) => `<div class="row" style="--i:${Math.min(i, 14)}"><span class="row-lead">${cover(t.artwork, { size: 't120x120' })}</span>
        <span class="row-text"><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></span>
        <button class="btn ghost sm" type="button" data-action="unhide" data-id="${esc(t.id)}">${icon('refresh')}<span>Вернуть</span></button></div>`).join('')}</div>`;
  }
  const source = 'library-' + tab;
  registerList(source, list, { type: 'library', label: tab === 'history' ? 'История' : 'Избранное', href: '/library' + (tab === 'history' ? '/history' : '') });
  return `<div class="list-actions">
      <button class="btn primary" type="button" data-action="library-play" data-value="${source}">${icon('play')}<span>Слушать</span></button>
      <button class="btn glass" type="button" data-action="library-shuffle" data-value="${source}">${icon('shuffle')}<span>Перемешать</span></button>
      <span class="spacer"></span>
      ${tab === 'history' ? `<button class="btn ghost sm" type="button" data-action="library-clear" data-value="recent">${icon('trash')}<span>Очистить</span></button>` : `<span class="muted">${list.length} ${plural(list.length, 'трек', 'трека', 'треков')}</span>`}
    </div>${trackList(list, { source })}`;
}

export function refresh(tab) {
  const box = $('#library-body');
  if (box) { box.classList.add('static'); box.innerHTML = body(tab); }
  for (const [key] of TABS) {
    const counter = document.querySelector(`.seg[href="/library${key === 'favorites' ? '' : '/' + key}"] small`);
    if (counter) counter.textContent = items(key).length || '';
  }
}

export const actions = {
  'library-clear': b => clearList(b.dataset.value),
  unhide: b => { const t = state.dislikes.find(x => x.id === b.dataset.id); if (t) setDislike(t, false); },
};

export function playAll(source, shuffle = false) {
  const list = state[source === 'library-history' ? 'recent' : 'favorites'];
  if (!list.length) return;
  if (shuffle !== player.P.shuffle) player.setShuffle(shuffle);
  const start = shuffle ? Math.floor(Math.random() * list.length) : 0;
  player.playList(list, start, { type: 'library', label: source === 'library-history' ? 'История' : 'Избранное', href: '/library' });
}
