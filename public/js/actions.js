// Общие действия: реестр списков для воспроизведения, меню трека, настройка волны, таймер сна.

import { esc, icon, safeUrl, tg, inTelegram, haptic, api } from './core.js';
import { prefs, setPref, isDisliked, catalogue, remember } from './store.js';
import { openMenu, openSheet, closeSheet, toast, cover, updateSheetBody } from './ui.js';
import * as player from './player/player.js';

// ── реестр списков: строка в любом списке знает, откуда запускать очередь ──
const lists = new Map();
export function registerList(source, tracks, context = {}) {
  remember(tracks);
  lists.set(source, { tracks, context });
}
export const getList = source => lists.get(source);

export function playFrom(source, id) {
  if (source === 'queue') {
    const index = player.P.queue.findIndex(t => t.id === id);
    if (index === player.P.index) return player.toggle();
    if (index >= 0) return player.jump(index);
    return;
  }
  const list = lists.get(source);
  const tracks = list?.tracks || [catalogue.get(id)].filter(Boolean);
  const index = tracks.findIndex(t => t.id === id);
  if (index < 0) return;
  if (player.P.track?.id === id && player.P.context.type === (list?.context.type || source)) return player.toggle();
  return player.playList(tracks, index, list?.context || { type: source });
}

// ── «Моя волна» ──
export const WAVE_OPTIONS = {
  waveActivity: { title: 'Занятие', items: [['any', 'Любое', 'infinity'], ['wake', 'Просыпаюсь', 'sunrise'], ['work', 'Работаю', 'laptop'], ['workout', 'Тренируюсь', 'dumbbell'], ['sleep', 'Засыпаю', 'bed'], ['drive', 'В дороге', 'car']] },
  waveMood: { title: 'Настроение', items: [['any', 'Любое', 'infinity'], ['calm', 'Спокойное', 'calm'], ['energetic', 'Бодрое', 'bolt'], ['happy', 'Весёлое', 'smile'], ['sad', 'Грустное', 'rain']] },
  waveCharacter: { title: 'Характер', items: [['default', 'Сбалансированный', 'logo'], ['favorite', 'Любимое', 'heart'], ['discover', 'Незнакомое', 'compass'], ['popular', 'Популярное', 'star']] },
};

export function waveSummary() {
  const parts = [];
  for (const [key, { items }] of Object.entries(WAVE_OPTIONS)) {
    const value = prefs[key];
    if (value !== 'any' && value !== 'default') parts.push(items.find(i => i[0] === value)?.[1]);
  }
  return parts.filter(Boolean);
}

function tunerBody() {
  return Object.entries(WAVE_OPTIONS).map(([key, { title, items }]) => `
    <fieldset class="tuner-group"><legend>${title}</legend><div class="tuner-chips">${items.map(([value, label, glyph]) =>
      `<button type="button" class="tuner-chip" data-action="wave-option" data-key="${key}" data-value="${value}" aria-pressed="${prefs[key] === value}">${icon(glyph)}<span>${label}</span></button>`).join('')}</div></fieldset>`).join('')
    + `<p class="sheet-note">Волна учитывает лайки, пропуски и историю. Чем больше слушаете, тем точнее подбор.</p>
    <div class="sheet-actions"><button class="btn primary" type="button" data-action="wave-apply">${icon('play')}<span>${player.isWave() ? 'Применить' : 'Запустить волну'}</span></button></div>`;
}
export function openWaveTuner() {
  openSheet({ title: 'Настроить волну', body: tunerBody(), kind: 'wave' });
}
let tuneDirty = false;
export function setWaveOption(button) {
  setPref(button.dataset.key, button.dataset.value);
  tuneDirty = true;
  for (const b of button.parentElement.children) b.setAttribute('aria-pressed', String(b === button));
  haptic('select');
}
export function applyWave() {
  closeSheet();
  if (player.isWave()) { if (tuneDirty) player.retuneWave(); }
  else player.startWave();
  tuneDirty = false;
}

export function toggleWave() {
  if (player.isWave()) return player.toggle();
  if (player.P.wave?.loading) return;
  return player.startWave();
}

// ── меню трека ──
export function shareLink(track) {
  const bot = window.__lofiConfig?.bot;
  if (bot) return `https://t.me/${bot}?start=t_${track.id}`;
  return safeUrl(track.url, 'sc') || location.origin + '/?track=' + track.id;
}
export async function share(track) {
  const url = shareLink(track);
  const text = `${track.artist} — ${track.title}`;
  if (inTelegram && tg.openTelegramLink) {
    tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text));
    return;
  }
  if (navigator.share) { try { await navigator.share({ title: text, url }); return; } catch (error) { if (error.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast('Ссылка скопирована', { glyph: 'link' }); }
  catch { toast(url, { glyph: 'link', duration: 6000 }); }
}

export function openTrackMenu(track, anchor, { inQueue = -1 } = {}) {
  if (!track) return;
  const sc = safeUrl(track.url, 'sc');
  const hidden = isDisliked(track.id);
  const header = `<div class="menu-track">${cover(track.artwork, { size: 't120x120' })}<span><strong>${esc(track.title)}</strong><small>${esc(track.artist)}</small></span></div>`;
  openMenu(anchor, {
    title: 'Трек',
    header,
    items: [
      { icon: 'queue', label: 'Сыграть следующим', run: () => player.playNext(track) },
      { icon: 'plus', label: 'Добавить в очередь', run: () => player.enqueue(track) },
      { icon: 'logo', label: 'Моя волна по треку', run: () => player.startWave({ seed: track.id, label: 'Волна по треку' }) },
      inQueue > player.P.index ? { icon: 'close', label: 'Убрать из очереди', run: () => player.removeAt(inQueue) } : null,
      { divider: true },
      { icon: 'user', label: 'Перейти к артисту', run: () => window.__lofiNavigate?.(track.artistId ? `/artist/${track.artistId}` : `/artist?name=${encodeURIComponent(track.artist)}`) },
      { icon: 'share', label: 'Поделиться', run: () => share(track) },
      sc ? { icon: 'external', label: 'Открыть в SoundCloud', run: () => (inTelegram ? tg.openLink(sc) : window.open(sc, '_blank', 'noopener')) } : null,
      { divider: true },
      { icon: hidden ? 'refresh' : 'dislike', label: hidden ? 'Вернуть в рекомендации' : 'Не нравится', danger: !hidden, run: () => player.dislikeTrack(track) },
    ],
  });
}

export function openPlayerMenu(anchor) {
  const track = player.P.track;
  if (!track) return;
  openTrackMenu(track, anchor);
}

// ── таймер сна ──
export function openSleepMenu(anchor) {
  const left = player.sleepLeft();
  const options = [[0, 'Выключен'], [-1, 'До конца трека'], [10, '10 минут'], [20, '20 минут'], [30, '30 минут'], [45, '45 минут'], [60, '1 час']];
  openMenu(anchor, {
    title: 'Таймер сна',
    header: left ? `<p class="menu-note">${left === -1 ? 'Остановится в конце трека' : 'Осталось ' + Math.ceil(left / 60000) + ' мин'}</p>` : '',
    items: options.map(([minutes, label]) => ({
      icon: minutes === 0 ? 'close' : 'timer', label, hint: (minutes === 0 && !left) || (minutes === -1 && left === -1) ? '✓' : '',
      run: () => { player.setSleep(minutes); if (minutes) toast(minutes === -1 ? 'Остановлю после этого трека' : `Остановлю через ${label}`, { glyph: 'timer' }); },
    })),
  });
}

// ── карточка трека из ссылки ──
export async function openSharedTrack(id) {
  openSheet({ title: 'Трек', body: '<div class="shared-track skeleton"><span class="sk sk-card"></span><i class="sk sk-line"></i><i class="sk sk-line short"></i></div>', kind: 'shared' });
  try {
    const { track } = await api('track', { params: { id } });
    remember([track]);
    registerList('shared', [track], { type: 'shared', label: 'Ссылка' });
    updateSheetBody(`<div class="shared-track">${cover(track.artwork, { size: 't500x500', cls: 'shared-cover', eager: true })}
      <strong>${esc(track.title)}</strong><small>${esc(track.artist)}</small>
      <div class="sheet-actions">
        <button class="btn primary" type="button" data-action="play-track" data-source="shared" data-id="${esc(track.id)}">${icon('play')}<span>Слушать</span></button>
        <button class="btn glass" type="button" data-action="shared-wave" data-id="${esc(track.id)}">${icon('logo')}<span>Волна по треку</span></button>
      </div></div>`);
  } catch (error) {
    updateSheetBody(`<div class="empty">${icon('cloud')}<strong>${esc(error.message)}</strong></div>`);
  }
}
