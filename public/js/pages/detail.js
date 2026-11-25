// Страницы альбома, артиста и подборки под настроение.

import { $, esc, icon, api, plural, clock, safeUrl, artSize, tg, inTelegram } from '../core.js';
import { trackList, skeletonRows, empty, cover, formatCount, viewAlive, currentViewToken } from '../ui.js';
import { registerList } from '../actions.js';
import { moodArt } from './home.js';
import * as player from '../player/player.js';

const cache = new Map();
let current = null;

export function render(kind, id, name = '') {
  const key = `${kind}:${id || name}`;
  const data = cache.get(key);
  current = { kind, id, name, key, page: data?.page || 0, data };
  return `<div class="detail" data-kind="${kind}">${headHtml()}<div id="detail-body">${data ? bodyHtml() : skeletonRows(8)}</div></div>`;
}

function headHtml() {
  const { kind, data, name, id } = current;
  const album = data?.album;
  const title = data?.label || album?.title || name || (kind === 'mood' ? '' : '');
  const art = kind === 'album' ? album?.artwork : kind === 'artist' ? data?.portrait : '';
  const playable = data?.items?.some(t => t.available !== false);
  const total = data?.items?.reduce((s, t) => s + (t.dur || 0), 0) || 0;
  const meta = [];
  if (kind === 'album' && album) {
    meta.push(`<a class="link" href="${album.artistId ? '/artist/' + esc(album.artistId) : '/artist?name=' + encodeURIComponent(album.artist)}" data-link>${esc(album.artist)}</a>`);
    if (album.year) meta.push(esc(album.year));
    if (album.count) meta.push(`${album.count} ${plural(album.count, 'трек', 'трека', 'треков')}`);
    if (total) meta.push(clock(total));
  }
  if (kind === 'artist' && data) {
    if (data.followers) meta.push(`${formatCount(data.followers)} слушателей`);
    if (data.items?.length) meta.push(`${data.items.length} ${plural(data.items.length, 'трек', 'трека', 'треков')}`);
  }
  if (kind === 'mood' && data?.note) meta.push(esc(data.note));
  const label = { album: 'Альбом', artist: 'Артист', mood: 'Подборка' }[kind];
  const backdrop = safeUrl(art);
  return `<header class="detail-head${kind === 'artist' ? ' is-artist' : ''}">
      ${backdrop ? `<div class="detail-backdrop" style="background-image:url('${esc(artSize(backdrop, 't300x300'))}')" aria-hidden="true"></div>` : ''}
      <div class="detail-art">${kind === 'mood' ? `<span class="cover mood-cover" data-mood="${esc(id)}">${moodArt(id)}</span>` : cover(art, { size: 't500x500', cls: kind === 'artist' ? 'round' : '', eager: true })}</div>
      <div class="detail-copy">
        <small class="eyebrow">${label}${data?.verified ? ' · ' + icon('check', 'verified') + ' подтверждён' : ''}</small>
        <h1 class="${title ? '' : 'sk sk-title'}">${esc(title)}</h1>
        <p class="detail-meta">${data ? meta.join('<span class="dot-sep">·</span>') : '<i class="sk sk-line short"></i>'}</p>
        <div class="detail-actions">
          <button class="btn primary" type="button" data-action="detail-play" ${playable ? '' : 'disabled'}>${icon('play')}<span>Слушать</span></button>
          <button class="btn glass" type="button" data-action="detail-shuffle" ${playable ? '' : 'disabled'}>${icon('shuffle')}<span>Перемешать</span></button>
          ${kind !== 'mood' ? `<button class="btn glass" type="button" data-action="detail-wave" ${playable ? '' : 'disabled'} title="Моя волна на основе этой музыки">${icon('logo')}<span>Волна</span></button>` : ''}
          ${kind === 'album' && safeUrl(album?.url, 'sc') ? `<button class="icon-btn glass" type="button" data-action="open-external" data-url="${esc(album.url)}" aria-label="Открыть в SoundCloud">${icon('external')}</button>` : ''}
        </div>
      </div>
    </header>`;
}

function bodyHtml() {
  const { kind, data } = current;
  if (data?.error) return empty('cloud', data.error, '', '<button class="btn glass" type="button" data-action="detail-retry">Повторить</button>');
  const items = data?.items || [];
  if (!items.length) return empty('note', 'Здесь пока нет треков');
  const source = 'detail';
  registerList(source, items, { type: kind, label: data.label || '', href: location.pathname + location.search });
  return `${data.bio ? `<details class="bio"><summary>Об артисте</summary><p>${esc(data.bio)}</p></details>` : ''}
    ${trackList(items, { source, number: kind === 'album' })}
    ${data.more ? `<div class="more"><button class="btn glass" type="button" data-action="detail-more">Загрузить ещё</button></div>` : ''}`;
}

export async function load(retry = false) {
  const state = current;
  if (!state || (state.data && !retry)) return;
  const token = currentViewToken();
  try {
    const params = state.kind === 'artist' ? { id: state.id, name: state.name } : { id: state.id };
    const data = await api(state.kind, { params });
    state.data = data;
    cache.set(state.key, data);
    if (cache.size > 30) cache.delete(cache.keys().next().value);
  } catch (error) {
    state.data = { error: error.message };
  }
  if (current !== state || !viewAlive(token)) return;
  repaint();
}

function repaint() {
  const head = $('.detail-head');
  if (head) head.outerHTML = headHtml();
  const body = $('#detail-body');
  if (body) { body.innerHTML = bodyHtml(); body.classList.add('fade-in'); }
}

async function more(button) {
  const state = current;
  if (!state?.data) return;
  button.disabled = true;
  button.innerHTML = '<span class="spinner inline"></span>';
  try {
    const page = (state.page || 0) + 1;
    const next = await api(state.kind, { params: { id: state.id, page } });
    if (current !== state) return;
    state.page = page;
    state.data = { ...state.data, items: [...state.data.items, ...next.items], more: next.more, page };
    cache.set(state.key, state.data);
    const body = $('#detail-body');
    if (body) body.innerHTML = bodyHtml();
  } catch {
    button.disabled = false;
    button.textContent = 'Повторить загрузку';
  }
}

export const actions = {
  'detail-play': () => { const items = current?.data?.items || []; if (player.P.shuffle) player.setShuffle(false); player.playList(items, Math.max(0, items.findIndex(t => t.available !== false)), { type: current.kind, label: current.data.label, href: location.pathname + location.search }); },
  'detail-shuffle': () => { const items = (current?.data?.items || []).filter(t => t.available !== false); if (!items.length) return; player.setShuffle(true); player.playList(items, Math.floor(Math.random() * items.length), { type: current.kind, label: current.data.label, href: location.pathname + location.search }); },
  'detail-wave': () => { const first = current?.data?.items?.find(t => t.available !== false); if (first) player.startWave({ seed: first.id, label: 'Волна: ' + (current.data.label || '') }); },
  'detail-more': more,
  'detail-retry': () => { if (current) { current.data = null; $('#detail-body').innerHTML = skeletonRows(8); load(true); } },
  'open-external': b => { const url = safeUrl(b.dataset.url, 'sc'); if (url) inTelegram ? tg.openLink(url) : window.open(url, '_blank', 'noopener'); },
};
