// Полноэкранный плеер: обложка с размытым фоном, караоке и очередь.
// Разметка строится один раз; при смене трека обновляются только нужные части — без мигания.

import { $, $$, esc, icon, clock, api, bus, root, safeUrl, artSize, motionReduced, coverColors, wide, haptic } from '../core.js';
import { prefs, isLiked, lyricOffset, nudgeLyrics, trackLyricOffset, setPref } from '../store.js';
import { Slider, cover, trackRow, toast, refreshLikes } from '../ui.js';
import * as player from './player.js';
import { Karaoke } from './lyrics.js';
import { WaveVisual } from '../wave-visual.js';

const { P, engine } = player;
const dialog = $('#player');
const lyricsCache = new Map();
let karaoke, seekSlider, visual, frame = 0, panel = 'none', lastSecond = -1, closing = 0, colorToken = 0;

export function isOpen() { return dialog.open && !closing; }

function build() {
  dialog.innerHTML = `
    <div class="pl-bg" aria-hidden="true"><div class="pl-bg-art"></div><canvas class="pl-wave"></canvas><div class="pl-bg-shade"></div></div>
    <div class="pl-shell" data-panel="none">
      <header class="pl-top">
        <button class="icon-btn ghost" type="button" data-action="player-close" aria-label="Свернуть">${icon('down')}</button>
        <div class="pl-context"><small>Играет</small><strong id="pl-context">Lo-fi</strong></div>
        <button class="icon-btn ghost" type="button" data-action="player-menu" aria-label="Ещё">${icon('more')}</button>
      </header>
      <div class="pl-body">
        <section class="pl-main">
          <div class="pl-art-wrap"><div class="pl-art cover" id="pl-art">${icon('logo', 'ph')}</div></div>
          <div class="pl-info">
            <div class="pl-titles">
              <h2 class="pl-title" id="pl-title">Ничего не играет</h2>
              <button class="pl-artist" type="button" id="pl-artist" data-action="player-artist"></button>
            </div>
            <button class="icon-btn pl-like" type="button" data-action="like-current" aria-label="В избранное">${icon('heart')}</button>
          </div>
          <div class="pl-seek">
            <div class="slider seek big" id="pl-seek" role="slider" aria-label="Позиция" tabindex="0" aria-valuemin="0" aria-valuemax="100"><span class="slider-track"><i class="slider-buffer"></i><i class="slider-fill"></i></span><span class="slider-thumb"></span></div>
            <div class="pl-times"><time id="pl-pos">0:00</time><span class="pl-badges" id="pl-badges"></span><time id="pl-dur">0:00</time></div>
          </div>
          <div class="pl-transport">
            <button class="icon-btn ghost" type="button" data-action="shuffle" aria-label="Перемешать" aria-pressed="false">${icon('shuffle')}</button>
            <button class="icon-btn ghost lg" type="button" data-action="prev" aria-label="Предыдущий">${icon('prev')}</button>
            <button class="play-btn xl" type="button" data-action="toggle" aria-label="Играть">${icon('play')}<span class="spinner" aria-hidden="true"></span></button>
            <button class="icon-btn ghost lg" type="button" data-action="next" aria-label="Следующий">${icon('next')}</button>
            <button class="icon-btn ghost" type="button" data-action="repeat" aria-label="Повтор" aria-pressed="false">${icon('repeat')}</button>
          </div>
          <div class="pl-tools">
            <button class="tool" type="button" data-action="player-panel" data-panel="lyrics" aria-pressed="false">${icon('lyrics')}<span>Текст</span></button>
            <button class="tool" type="button" data-action="player-panel" data-panel="queue" aria-pressed="false">${icon('queue')}<span>Очередь</span></button>
            <button class="tool wave-only" type="button" data-action="wave-tune">${icon('tune')}<span>Волна</span></button>
            <button class="tool wave-only" type="button" data-action="dislike-current">${icon('dislike')}<span>Не то</span></button>
            <button class="tool" type="button" data-action="sleep-menu" id="pl-sleep">${icon('timer')}<span>Сон</span></button>
          </div>
        </section>
        <section class="pl-side" aria-label="Текст и очередь">
          <div class="pl-pane" data-pane="lyrics">
            <div class="pl-lyrics" id="pl-lyrics" tabindex="0" aria-label="Текст песни"></div>
            <button class="ly-follow glass" type="button" data-action="lyrics-follow" hidden>${icon('down')}<span>К текущей строке</span></button>
            <div class="ly-tools glass" id="ly-tools" hidden>
              <button class="icon-btn ghost sm" type="button" data-action="lyrics-shift" data-value="-250" aria-label="Текст раньше">${icon('minus')}</button>
              <span id="ly-offset" title="Сдвиг текста для этого трека">0,0 с</span>
              <button class="icon-btn ghost sm" type="button" data-action="lyrics-shift" data-value="250" aria-label="Текст позже">${icon('plus')}</button>
              <span class="ly-sep"></span>
              <button class="icon-btn ghost sm" type="button" data-action="lyrics-size" aria-label="Размер текста">${icon('text')}</button>
            </div>
          </div>
          <div class="pl-pane" data-pane="queue"><div class="pl-queue" id="pl-queue"></div></div>
        </section>
      </div>
    </div>`;
  karaoke = new Karaoke($('#pl-lyrics'), {
    onSeek: ms => { player.seek(Math.max(0, (ms - lyricOffset(P.track?.id)) / 1000)); karaoke.resume(); haptic('select'); },
    onFollowChange: following => { $('.ly-follow', dialog).hidden = following; },
  });
  seekSlider = new Slider($('#pl-seek'), {
    onInput: v => { $('#pl-pos').textContent = clock(v * player.duration()); },
    onCommit: v => player.seek(v * player.duration()),
    label: v => clock(v * player.duration()),
  });
  visual = new WaveVisual($('.pl-wave', dialog), { levels: () => engine.levels(), lines: 9, intensity: 1.1 });
  bindDrag();
}

// ── открытие и закрытие ──
export function open(view = panel === 'none' && wide.matches ? 'none' : panel) {
  if (!dialog.firstChild) build();
  clearTimeout(closing);
  closing = 0;
  setPanel(view === 'cover' ? 'none' : view, false);
  updateTrack(true);
  updateState();
  if (!dialog.open) dialog.showModal();
  dialog.classList.remove('is-closing');
  requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-open')));
  applyBackground();
  startLoop();
  bus.emit('player:open', true);
  haptic('light');
}

export function close() {
  if (!dialog.open || closing) return;
  dialog.classList.remove('is-open');
  dialog.classList.add('is-closing');
  closing = setTimeout(() => {
    closing = 0;
    dialog.classList.remove('is-closing');
    dialog.style.transform = '';
    if (dialog.open) dialog.close();
    stopLoop();
    visual?.stop();
    bus.emit('player:open', false);
  }, motionReduced() ? 0 : 420);
}
dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });

export function setPanel(name, animate = true) {
  if (!dialog.firstChild) build();
  panel = panel === name && animate ? 'none' : name;
  const shell = $('.pl-shell', dialog);
  shell.dataset.panel = panel;
  for (const b of $$('[data-action="player-panel"]', dialog)) b.setAttribute('aria-pressed', String(b.dataset.panel === panel));
  $('#ly-tools').hidden = panel !== 'lyrics' || karaoke.mode !== 'synced';
  if (panel === 'lyrics') { loadLyrics(); requestAnimationFrame(() => karaoke.relayout()); }
  if (panel === 'queue') renderQueue();
}
export const currentPanel = () => panel;

// ── трек ──
let shownTrack = null;
function updateTrack(force = false) {
  if (!dialog.firstChild) return;
  const track = P.track;
  if (!force && shownTrack === track) return;
  const changed = shownTrack?.id !== track?.id;
  shownTrack = track;
  $('#pl-context').textContent = P.context.label || (P.wave ? 'Моя волна' : 'Очередь');
  $('.pl-shell', dialog).classList.toggle('is-wave', player.isWave());
  const title = $('#pl-title'), artist = $('#pl-artist');
  const apply = () => {
    title.textContent = track?.title || 'Ничего не играет';
    title.title = track?.title || '';
    artist.innerHTML = track ? `${track.avatar && safeUrl(track.avatar) ? `<img src="${esc(safeUrl(track.avatar))}" alt="">` : ''}<span>${esc(track.artist)}</span>${icon('forward')}` : '';
  };
  if (changed && !motionReduced() && isOpen()) {
    title.parentElement.classList.add('is-swapping');
    setTimeout(() => { apply(); title.parentElement.classList.remove('is-swapping'); }, 160);
  } else apply();
  swapArt($('#pl-art'), track, 't500x500');
  swapArt($('.pl-bg-art', dialog), track, 't300x300');
  updateCanvas(track);
  updateLike();
  if (changed) {
    karaoke.set(null);
    if (panel === 'lyrics' || track) loadLyrics();
    if (panel === 'queue') renderQueue();
    applyColors(track);
  }
  updateBadges();
}

/** Плавная смена обложки: новая картинка проявляется поверх старой. */
function swapArt(box, track, size) {
  const url = safeUrl(track?.artwork);
  const current = box.querySelector('img:last-of-type');
  if (current?.dataset.src === (url || '')) return;
  if (!url) { $$('img', box).forEach(img => img.remove()); return; }
  const img = new Image();
  img.alt = '';
  img.decoding = 'async';
  img.dataset.src = url;
  img.src = artSize(url, size);
  box.append(img);
  const done = () => { for (const old of $$('img', box)) if (old !== img) setTimeout(() => old.remove(), 500); };
  if (img.complete) { img.classList.add('is-loaded'); done(); }
  else img.addEventListener('load', done, { once: true });
}

function updateCanvas(track) {
  const box = $('#pl-art');
  let video = $('video', box);
  const url = prefs.canvas && !motionReduced() ? safeUrl(track?.canvas, 'canvas') : '';
  if (!url) { video?.remove(); return; }
  if (video?.dataset.src === url) return;
  video?.remove();
  video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, autoplay: true, playsInline: true });
  video.dataset.src = url;
  video.src = url;
  video.addEventListener('playing', () => video.classList.add('is-loaded'), { once: true });
  video.addEventListener('error', () => video.remove(), { once: true });
  box.append(video);
  video.play().catch(() => video.remove());
}

async function applyColors(track) {
  const token = ++colorToken;
  const colors = prefs.dynamicColor ? await coverColors(safeUrl(track?.artwork)) : null;
  if (token !== colorToken) return;
  const tint = colors?.accent || colors?.average;
  if (tint) {
    root.style.setProperty('--tint', tint.join(' '));
    root.style.setProperty('--tint-avg', colors.average.join(' '));
    root.dataset.tinted = 'true';
  } else {
    root.style.removeProperty('--tint');
    root.style.removeProperty('--tint-avg');
    delete root.dataset.tinted;
  }
  visual?.setColors(colors);
  bus.emit('player:colors', colors);
}

function applyBackground() {
  const shell = dialog;
  shell.dataset.bg = prefs.playerBg;
  if (prefs.playerBg === 'wave' || prefs.playerBg === 'cover') { visual.start(); visual.setActive(player.isPlaying()); }
  else visual.stop();
}

function updateLike() {
  const button = $('.pl-like', dialog);
  if (!button) return;
  const liked = isLiked(P.track?.id);
  button.classList.toggle('is-on', liked);
  button.innerHTML = icon(liked ? 'heart-fill' : 'heart');
  button.setAttribute('aria-pressed', String(liked));
  button.disabled = !P.track;
}

function updateBadges() {
  const box = $('#pl-badges');
  if (!box) return;
  const parts = [];
  if (P.cached) parts.push(`<span class="badge" title="Трек в кеше сервера: мгновенный старт и перемотка">${icon('database')}кеш</span>`);
  if (P.bitrate) parts.push(`<span class="badge">${P.bitrate} кбит/с</span>`);
  if (P.mode === 'widget') parts.push('<span class="badge">виджет</span>');
  box.innerHTML = parts.join('');
}

export function updateState() {
  if (!dialog.firstChild) return;
  const shell = $('.pl-shell', dialog);
  shell.classList.toggle('is-wave', player.isWave());
  $('#pl-sleep').classList.toggle('is-on', player.sleepLeft() !== 0);
  updateLike();
  updateBadges();
  visual?.setActive(player.isPlaying());
  seekSlider?.disable(!P.track);
}

// ── текст песни ──
async function loadLyrics() {
  const track = P.track;
  if (!track) return karaoke.status('lyrics', 'Текст появится здесь', 'Включите трек, и строки будут подсвечиваться в такт.');
  karaoke.follow = prefs.lyricFollow;
  if (lyricsCache.has(track.id)) {
    const data = await lyricsCache.get(track.id);
    if (P.track?.id === track.id && karaoke._for !== track.id) { karaoke._for = track.id; karaoke.set(data); updateLyricTools(); }
    return;
  }
  karaoke._for = null;
  karaoke.set(null);
  const task = api('lyrics', { params: { id: track.id } }).catch(error => ({ error: error.message }));
  lyricsCache.set(track.id, task);
  if (lyricsCache.size > 60) lyricsCache.delete(lyricsCache.keys().next().value);
  const data = await task;
  if (data.error) lyricsCache.delete(track.id);
  if (P.track?.id !== track.id) return;
  karaoke._for = track.id;
  karaoke.set(data);
  updateLyricTools();
}
export function retryLyrics() { if (P.track) { lyricsCache.delete(P.track.id); karaoke._for = null; loadLyrics(); } }

function updateLyricTools() {
  const tools = $('#ly-tools');
  if (!tools) return;
  tools.hidden = panel !== 'lyrics' || karaoke.mode !== 'synced';
  const value = trackLyricOffset(P.track?.id) / 1000;
  $('#ly-offset').textContent = (value > 0 ? '+' : value < 0 ? '−' : '') + Math.abs(value).toFixed(2).replace('.', ',').replace(/0$/, '') + ' с';
}
export function shiftLyrics(delta) {
  if (!P.track) return;
  nudgeLyrics(P.track.id, delta);
  updateLyricTools();
  haptic('select');
}
export function cycleLyricSize() {
  const sizes = ['s', 'm', 'l', 'xl'];
  setPref('lyricSize', sizes[(sizes.indexOf(prefs.lyricSize) + 1) % sizes.length]);
  requestAnimationFrame(() => karaoke.relayout());
}
export const followLyrics = () => karaoke?.resume();

// ── очередь ──
export function renderQueue() {
  const box = $('#pl-queue');
  if (!box || panel !== 'queue') return;
  const upcoming = P.queue.slice(P.index + 1);
  const current = P.queue[P.index];
  box.innerHTML = `
    ${current ? `<h3 class="q-head">Сейчас играет</h3><div class="rows">${trackRow(current, { source: 'queue', index: P.index, compact: true })}</div>` : ''}
    <h3 class="q-head">${player.isWave() ? 'Дальше в волне' : 'Далее'}<small>${upcoming.length ? upcoming.length : ''}</small></h3>
    ${upcoming.length ? `<div class="rows q-list">${upcoming.map((t, i) => `<div class="q-item" data-q="${P.index + 1 + i}">
        <span class="q-grip" data-grip aria-hidden="true">${icon('grip')}</span>
        ${trackRow(t, { source: 'queue', index: P.index + 1 + i, compact: true })}
        <button class="icon-btn ghost sm" type="button" data-action="queue-remove" data-index="${P.index + 1 + i}" aria-label="Убрать">${icon('close')}</button>
      </div>`).join('')}</div>` : `<p class="q-empty">${player.isWave() ? 'Подбираем следующие треки…' : 'Очередь пуста. Добавляйте треки через меню «⋯».'}</p>`}`;
  markCurrentRows(box);
}

/** Перетаскивание треков в очереди за ручку. */
function bindQueueDrag() {
  const box = $('#pl-queue');
  let drag = null;
  box.addEventListener('pointerdown', event => {
    const grip = event.target.closest('[data-grip]');
    if (!grip) return;
    const item = grip.closest('.q-item');
    const items = $$('.q-item', box);
    drag = { item, from: Number(item.dataset.q), startY: event.clientY, rects: items.map(el => el.getBoundingClientRect()), items, to: Number(item.dataset.q) };
    item.classList.add('is-dragging');
    grip.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  box.addEventListener('pointermove', event => {
    if (!drag) return;
    const dy = event.clientY - drag.startY;
    drag.item.style.transform = `translateY(${dy}px)`;
    const y = event.clientY;
    const fromPos = drag.items.indexOf(drag.item);
    let pos = drag.rects.findIndex(r => y < r.top + r.height / 2);
    if (pos < 0) pos = drag.items.length - 1;
    else if (pos > fromPos) pos -= 1;
    const h = drag.rects[fromPos].height;
    drag.items.forEach((el, i) => {
      if (el === drag.item) return;
      const shift = fromPos < pos && i > fromPos && i <= pos ? -h : fromPos > pos && i >= pos && i < fromPos ? h : 0;
      el.style.transform = shift ? `translateY(${shift}px)` : '';
    });
    drag.to = Number(drag.items[0].dataset.q) + pos;
  });
  const end = () => {
    if (!drag) return;
    const { from, to } = drag;
    drag.items.forEach(el => { el.style.transform = ''; el.classList.remove('is-dragging'); });
    drag = null;
    if (from !== to) { player.moveItem(from, to); haptic('select'); }
  };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
}

function markCurrentRows(scope = document) {
  for (const row of $$('[data-row]', scope)) {
    const current = row.dataset.row === P.track?.id;
    row.classList.toggle('is-current', current);
    row.classList.toggle('is-playing', current && player.isPlaying());
  }
}

// ── кадр анимации ──
function startLoop() { if (!frame) frame = requestAnimationFrame(tick); }
function stopLoop() { cancelAnimationFrame(frame); frame = 0; }
function tick(now) {
  frame = 0;
  if (!dialog.open) return;
  const pos = player.position(), dur = player.duration();
  if (!seekSlider.dragging) {
    seekSlider.set(dur ? pos / dur : 0);
    const second = Math.floor(pos);
    if (second !== lastSecond) { lastSecond = second; $('#pl-pos').textContent = clock(pos); $('#pl-dur').textContent = clock(dur); }
  }
  const buffered = engine.el.buffered;
  if (P.mode === 'audio' && buffered?.length && dur) $('.slider-buffer', dialog).style.width = (buffered.end(buffered.length - 1) / dur * 100).toFixed(1) + '%';
  if (panel === 'lyrics' || wide.matches) karaoke.tick(pos * 1000 + lyricOffset(P.track?.id), now);
  if (player.isPlaying() || seekSlider.dragging || panel === 'lyrics') frame = requestAnimationFrame(tick);
  else setTimeout(() => { if (dialog.open && !frame) frame = requestAnimationFrame(tick); }, 250);
}

// ── жест «смахнуть вниз» на телефоне ──
function bindDrag() {
  const top = $('.pl-top', dialog), art = $('.pl-art-wrap', dialog);
  let start = null;
  const down = event => {
    if (wide.matches || event.target.closest('button')) return;
    start = { y: event.clientY, t: performance.now(), dy: 0 };
    dialog.style.transition = 'none';
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = event => {
    if (!start) return;
    start.dy = Math.max(0, event.clientY - start.y);
    dialog.style.transform = `translateY(${start.dy}px)`;
  };
  const up = () => {
    if (!start) return;
    const { dy, t } = start;
    start = null;
    dialog.style.transition = '';
    if (dy > 140 || dy / Math.max(1, performance.now() - t) > .7) close();
    else dialog.style.transform = '';
  };
  for (const el of [top, art]) {
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
}

// ── подписки ──
bus.on('player:track', () => { if (dialog.firstChild) { updateTrack(); markCurrentRows(dialog); } if (!dialog.open) applyColors(P.track); });
bus.on('player:state', () => { updateState(); markCurrentRows(dialog); if (dialog.open) startLoop(); });
bus.on('player:queue', () => { if (panel === 'queue') renderQueue(); });
bus.on('player:wave', () => { if (dialog.firstChild) updateTrack(true); });
bus.on('library', () => { updateLike(); if (dialog.firstChild) refreshLikes(dialog); });
bus.on('prefs', key => {
  if (!dialog.firstChild) return;
  if (['playerBg', '*'].includes(key)) applyBackground();
  if (['dynamicColor', '*'].includes(key)) applyColors(P.track);
  if (['canvas', '*'].includes(key)) updateCanvas(P.track);
  if (['lyricFollow', '*'].includes(key)) karaoke.follow = prefs.lyricFollow;
  if (['lyricSize', 'textScale', '*'].includes(key)) requestAnimationFrame(() => karaoke.relayout());
});
addEventListener('resize', () => { if (dialog.open) karaoke?.relayout(); });

export function init() {
  build();
  bindQueueDrag();
  dialog.dataset.bg = prefs.playerBg;
}
