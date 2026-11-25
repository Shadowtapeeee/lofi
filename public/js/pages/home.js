// Главная: «Моя волна», подборки под настроение, недавнее, альбомы и популярное.

import { $, esc, icon, api, bus, tgUser } from '../core.js';
import { state } from '../store.js';
import { trackRow, albumCard, sectionHead, skeletonRows, skeletonCards, empty, viewAlive, currentViewToken } from '../ui.js';
import { registerList, waveSummary } from '../actions.js';
import * as player from '../player/player.js';
import { engine } from '../player/player.js';
import { WaveVisual } from '../wave-visual.js';

let shelves = { home: null, releases: null };
let visual = null;

function greeting() {
  const h = new Date().getHours();
  const word = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : h < 23 ? 'Добрый вечер' : 'Доброй ночи';
  return word + (tgUser?.first_name ? ', ' + tgUser.first_name : '');
}

/** Генеративные обложки подборок: у каждой свой линейный узор. */
export function moodArt(id) {
  const lines = [];
  const add = d => lines.push(`<path d="${d}"/>`);
  switch (id) {
    case 'focus': for (let i = 1; i <= 7; i++) lines.push(`<circle cx="150" cy="80" r="${i * 13}"/>`); break;
    case 'rain': for (let i = 0; i < 22; i++) { const x = (i * 37) % 300, y = (i * 53) % 150; add(`M${x} ${y}l-10 26`); } break;
    case 'night': add('M206 34a36 36 0 1 0 30 56 30 30 0 1 1-30-56z'); for (let i = 0; i < 14; i++) lines.push(`<circle cx="${(i * 71) % 290 + 8}" cy="${(i * 29) % 140 + 6}" r="1.4" class="dot"/>`); break;
    case 'drive': for (let i = -6; i <= 6; i++) add(`M150 60L${150 + i * 48} 170`); for (let i = 0; i < 5; i++) add(`M0 ${80 + i * i * 4}h300`); break;
    case 'energy': for (let r = 0; r < 4; r++) add(`M0 ${40 + r * 26}` + Array.from({ length: 12 }, (_, i) => `L${(i + 1) * 26} ${40 + r * 26 + (i % 2 ? -14 : 14)}`).join('')); break;
    case 'sleep': for (let r = 0; r < 6; r++) add(`M0 ${50 + r * 16}c50-${10 + r * 2} 100-${10 + r * 2} 150 0s100 ${10 + r * 2} 150 0`); break;
    default: for (let r = 0; r < 5; r++) add(`M0 ${40 + r * 20}c50-20 100-20 150 0s100 20 150 0`);
  }
  return `<svg class="mood-art" viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${lines.join('')}</svg>`;
}

function heroState() {
  const wave = player.P.wave;
  const playing = player.isWave() && player.isPlaying();
  const loading = !!wave?.loading || (player.isWave() && player.P.status === 'loading' && player.P.want);
  const track = player.isWave() ? player.P.track : null;
  return { playing, loading, track };
}

function heroControls() {
  const { playing, loading, track } = heroState();
  const chips = waveSummary();
  return `
    <p class="hero-sub" data-hero-sub>${track ? `Сейчас: <b>${esc(track.title)}</b> · ${esc(track.artist)}` : 'Бесконечный поток музыки, который подстраивается под ваш вкус'}</p>
    <div class="hero-actions">
      <button class="btn primary lg${loading ? ' is-loading' : ''}" type="button" data-action="wave-toggle">${icon(playing ? 'pause' : 'play')}<span>${playing ? 'Пауза' : player.isWave() ? 'Продолжить' : 'Слушать'}</span><span class="spinner" aria-hidden="true"></span></button>
      <button class="btn glass round lg" type="button" data-action="wave-tune" aria-label="Настроить волну" title="Настроить волну">${icon('tune')}</button>
    </div>
    ${chips.length ? `<div class="hero-chips">${chips.map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''}`;
}

export function render() {
  const moods = window.__lofiConfig?.moods || [];
  return `
    <section class="hero" data-hero>
      <canvas class="hero-canvas" aria-hidden="true"></canvas>
      <div class="hero-content">
        <p class="eyebrow">${esc(greeting())}</p>
        <h1 class="hero-title">Моя волна</h1>
        <div class="hero-controls" data-hero-controls>${heroControls()}</div>
      </div>
    </section>
    <section class="block reveal" style="--i:1">
      ${sectionHead('Под настроение')}
      <div class="moods">${moods.map((m, i) => `
        <a class="mood" href="/mood/${esc(m.id)}" data-link data-mood="${esc(m.id)}" style="--i:${i}">
          ${moodArt(m.id)}<span class="mood-text"><strong>${esc(m.name)}</strong><small>${esc(m.note)}</small></span>
          <span class="mood-go">${icon('arrow-right')}</span></a>`).join('')}</div>
    </section>
    <section class="block reveal" style="--i:2" data-recent-block>${recentBlock()}</section>
    <section class="block reveal" style="--i:3" data-releases-block>
      ${sectionHead('Альбомы для настроения')}
      <div data-releases>${shelves.releases ? releasesHtml() : skeletonCards(6)}</div>
    </section>
    <section class="block reveal" style="--i:4">
      ${sectionHead('Популярное в Lo-fi')}
      <div data-home-tracks>${shelves.home ? homeHtml() : skeletonRows(6)}</div>
    </section>`;
}

function recentBlock() {
  const items = state.recent.slice(0, 12);
  if (!items.length) return '';
  registerList('home-recent', items, { type: 'library', label: 'Недавнее', href: '/library/history' });
  return `${sectionHead('Недавнее', '/library/history', 'Вся история')}
    <div class="row-grid">${items.map((t, i) => trackRow(t, { source: 'home-recent', index: i, compact: true })).join('')}</div>`;
}
function releasesHtml() {
  const items = shelves.releases?.items || [];
  return items.length ? `<div class="shelf">${items.map(albumCard).join('')}</div>` : empty('disc', 'Альбомы пока недоступны');
}
function homeHtml() {
  if (shelves.home?.error) return empty('cloud', 'Подборка не загрузилась', shelves.home.error, '<button class="btn glass" type="button" data-action="retry-home">Обновить</button>');
  const items = shelves.home?.items || [];
  registerList('home', items, { type: 'home', label: 'Популярное', href: '/' });
  return `<div class="rows">${items.map((t, i) => trackRow(t, { source: 'home', index: i })).join('')}</div>`;
}

export async function load(force = false) {
  const token = currentViewToken();
  if (force) shelves = { home: null, releases: null };
  const tasks = [];
  if (!shelves.home) tasks.push(api('home').then(d => { shelves.home = d; }).catch(e => { shelves.home = { error: e.message, items: [] }; }).then(() => {
    const box = $('[data-home-tracks]');
    if (box && viewAlive(token)) { box.innerHTML = homeHtml(); box.classList.add('fade-in'); bus.emit('rows'); }
  }));
  if (!shelves.releases) tasks.push(api('releases').then(d => { shelves.releases = d; }).catch(() => { shelves.releases = { items: [] }; }).then(() => {
    const box = $('[data-releases]');
    if (box && viewAlive(token)) { box.innerHTML = releasesHtml(); box.classList.add('fade-in'); }
  }));
  await Promise.all(tasks);
}

export function mount(page) {
  visual?.destroy();
  const canvas = $('.hero-canvas', page);
  visual = new WaveVisual(canvas, { levels: () => engine.levels(), lines: 7 });
  visual.setActive(player.isWave() && player.isPlaying());
  visual.start();
  if (shelves.home) registerList('home', shelves.home.items || [], { type: 'home', label: 'Популярное', href: '/' });
  void load();
}
export function unmount() { visual?.destroy(); visual = null; }

export function refreshHero() {
  const box = $('[data-hero-controls]');
  if (box) box.innerHTML = heroControls();
  visual?.setActive(player.isWave() && player.isPlaying());
}
export function refreshRecent() {
  const box = $('[data-recent-block]');
  if (box) box.innerHTML = recentBlock();
}
export const setHeroColors = colors => visual?.setColors(colors);
