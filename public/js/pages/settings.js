// Настройки: внешний вид, воспроизведение, караоке, «Моя волна», данные и сведения о приложении.

import { $, $$, esc, icon, inTelegram, tgUser, plural } from '../core.js';
import { prefs, setPref, setTaste, resetPrefs, tasteStats, clearList, forgetSearches, state } from '../store.js';
import { Slider, toast, cover } from '../ui.js';
import { WAVE_OPTIONS } from '../actions.js';
import * as player from '../player/player.js';

const seg = (key, options) => `<div class="segmented small" role="radiogroup">${options.map(([value, label]) =>
  `<button class="seg" type="button" role="radio" data-action="set-pref" data-key="${key}" data-value="${value}" aria-checked="${prefs[key] === value}">${label}</button>`).join('')}</div>`;
const toggle = (key, title, note = '') => `<label class="setting">
  <span class="setting-text"><strong>${title}</strong>${note ? `<small>${note}</small>` : ''}</span>
  <input class="switch" type="checkbox" data-pref="${key}" ${prefs[key] ? 'checked' : ''}></label>`;
const row = (title, control, note = '') => `<div class="setting stacked"><span class="setting-text"><strong>${title}</strong>${note ? `<small>${note}</small>` : ''}</span>${control}</div>`;
const slider = (key, title, value, note = '') => `<div class="setting stacked"><span class="setting-text"><strong>${title}</strong>${note ? `<small>${note}</small>` : ''}</span>
  <div class="setting-slider"><div class="slider" data-pref-slider="${key}" role="slider" tabindex="0" aria-label="${esc(title)}"><span class="slider-track"><i class="slider-fill"></i></span><span class="slider-thumb"></span></div><output data-out="${key}">${value}</output></div></div>`;
const group = (id, glyph, title, body) => `<section class="settings-group reveal" id="${id}"><h2>${icon(glyph)}${title}</h2><div class="settings-card">${body}</div></section>`;

const SLIDERS = {
  crossfadeSec: { min: 2, max: 12, step: 1, fmt: v => v + ' с' },
  lyricOffset: { min: -5000, max: 5000, step: 100, fmt: v => (v > 0 ? '+' : v < 0 ? '−' : '') + (Math.abs(v) / 1000).toFixed(1).replace('.', ',') + ' с' },
  volume: { min: 0, max: 100, step: 1, fmt: v => v + '%' },
};

function tasteHtml() {
  const rows = tasteStats().slice(0, 14);
  if (!rows.length) return '<p class="setting-note">Послушайте несколько треков или добавьте их в избранное — здесь появятся ваши артисты, и вы сможете сказать волне, кого ставить чаще.</p>';
  return rows.map(r => `<div class="taste-row">
      ${cover(r.track?.artwork, { size: 't120x120', cls: 'round' })}
      <span class="taste-name"><strong>${esc(r.name)}</strong><small>${r.share ? r.share + '% прослушиваний' : 'настроено вручную'}</small></span>
      <div class="segmented tiny">${[['often', 'Чаще'], ['normal', 'Как есть'], ['rare', 'Реже'], ['never', 'Нет']].map(([v, l]) =>
        `<button class="seg" type="button" data-action="taste" data-artist="${esc(r.name)}" data-value="${v}" aria-checked="${(prefs.taste[r.name] || 'normal') === v}">${l}</button>`).join('')}</div>
    </div>`).join('');
}

export function render() {
  const user = tgUser;
  return `
    <header class="page-head"><h1>Настройки</h1></header>
    <div class="settings">
      ${user || !inTelegram ? `<div class="profile-card reveal">
        ${user?.photo_url ? `<img class="avatar" src="${esc(user.photo_url)}" alt="">` : `<span class="avatar">${icon('user')}</span>`}
        <span><strong>${esc(user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Гость')}</strong>
        <small>${user ? (user.username ? '@' + esc(user.username) + ' · ' : '') + 'медиатека синхронизируется' : 'Откройте Lo-fi в Telegram, чтобы медиатека сохранялась на всех устройствах'}</small></span>
      </div>` : ''}
      ${group('look', 'palette', 'Внешний вид',
        row('Тема', seg('theme', [['system', 'Как в системе'], ['dark', 'Тёмная'], ['light', 'Светлая']]))
        + toggle('glass', 'Эффект стекла', 'Размытие под панелями и плеером')
        + toggle('dynamicColor', 'Цвет из обложки', 'Плеер и волна подхватывают оттенок трека')
        + row('Анимации', seg('motion', [['full', 'Плавные'], ['reduced', 'Минимум']]), 'Системная настройка «уменьшить движение» учитывается всегда')
        + row('Размер текста', seg('textScale', [['s', 'Мельче'], ['m', 'Обычный'], ['l', 'Крупнее']])))}
      ${group('playback', 'speaker', 'Воспроизведение',
        row('Качество', seg('quality', [['high', 'Высокое'], ['normal', 'Экономия трафика']]))
        + toggle('gapless', 'Без пауз между треками', 'Следующий трек загружается заранее')
        + toggle('crossfade', 'Плавный переход', 'Треки перетекают друг в друга')
        + (prefs.crossfade ? slider('crossfadeSec', 'Длительность перехода', SLIDERS.crossfadeSec.fmt(prefs.crossfadeSec)) : '')
        + toggle('normalize', 'Выравнивать громкость', 'Тихие и громкие треки звучат ровнее')
        + toggle('autoplay', 'Продолжать «Моей волной»', 'Когда очередь закончится')
        + toggle('originals', 'Только оригиналы в поиске', 'Скрывать перезаливы, ускоренные версии и сборники')
        + toggle('canvas', 'Видеообложки', 'Если у трека есть анимированная обложка')
        + row('Фон плеера', seg('playerBg', [['cover', 'Обложка'], ['wave', 'Волна'], ['plain', 'Однотонный']]))
        + (inTelegram ? toggle('haptics', 'Вибрация', 'Лёгкий отклик на нажатия') : ''))}
      ${group('karaoke', 'lyrics', 'Караоке',
        row('Размер строк', seg('lyricSize', [['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL']]))
        + toggle('lyricFollow', 'Следовать за текстом', 'Автопрокрутка к текущей строке')
        + toggle('lyricBlur', 'Размывать дальние строки')
        + slider('lyricOffset', 'Общий сдвиг текста', SLIDERS.lyricOffset.fmt(prefs.lyricOffset), 'Для одного трека сдвиг меняется прямо в плеере'))}
      ${group('wave', 'logo', 'Моя волна',
        Object.entries(WAVE_OPTIONS).map(([key, { title, items }]) => row(title, `<div class="tuner-chips">${items.map(([value, label, glyph]) =>
          `<button type="button" class="tuner-chip" data-action="set-pref" data-key="${key}" data-value="${value}" aria-checked="${prefs[key] === value}">${icon(glyph)}<span>${label}</span></button>`).join('')}</div>`)).join('')
        + `<div class="setting stacked"><span class="setting-text"><strong>Вкус</strong><small>Подскажите волне, кого ставить чаще, а кого — никогда</small></span><div class="taste" id="taste">${tasteHtml()}</div></div>`)}
      ${group('data', 'database', 'Данные',
        `<div class="setting"><span class="setting-text"><strong>История прослушиваний</strong><small>${state.recent.length} ${plural(state.recent.length, 'трек', 'трека', 'треков')}</small></span><button class="btn ghost sm" type="button" data-action="settings-clear" data-value="recent">Очистить</button></div>
        <div class="setting"><span class="setting-text"><strong>Скрытые треки</strong><small>${state.dislikes.length} ${plural(state.dislikes.length, 'трек', 'трека', 'треков')}</small></span><button class="btn ghost sm" type="button" data-action="settings-clear" data-value="dislike">Очистить</button></div>
        <div class="setting"><span class="setting-text"><strong>История поиска</strong></span><button class="btn ghost sm" type="button" data-action="settings-clear" data-value="search">Очистить</button></div>
        <div class="setting"><span class="setting-text"><strong>Настройки по умолчанию</strong><small>Вернуть всё как было при первом запуске</small></span><button class="btn ghost sm danger" type="button" data-action="settings-reset">Сбросить</button></div>`)}
      <section class="settings-group about reveal">
        <p>${icon('logo')} Lo-fi ${esc(window.__lofiConfig?.version || '')}</p>
        <p>Музыка — SoundCloud. Тексты — LRCLIB, NetEase и lyrics.ovh. ${window.__lofiConfig?.cache ? 'Треки кешируются на сервере для мгновенного запуска.' : ''}</p>
        <p class="muted">Шрифт Manrope — SIL Open Font License 1.1.</p>
      </section>
    </div>`;
}

export function mount(page) {
  for (const el of $$('[data-pref-slider]', page)) {
    const key = el.dataset.prefSlider, cfg = SLIDERS[key];
    const toValue = r => Math.round((cfg.min + r * (cfg.max - cfg.min)) / cfg.step) * cfg.step;
    const slider = new Slider(el, {
      step: cfg.step / (cfg.max - cfg.min),
      label: r => cfg.fmt(toValue(r)),
      onInput: r => { $(`[data-out="${key}"]`, page).textContent = cfg.fmt(toValue(r)); },
      onCommit: r => setPref(key, toValue(r)),
    });
    slider.set((prefs[key] - cfg.min) / (cfg.max - cfg.min));
  }
}

export function refreshTaste() { const box = $('#taste'); if (box) box.innerHTML = tasteHtml(); }

export const actions = {
  taste: b => {
    setTaste(b.dataset.artist, b.dataset.value);
    for (const s of b.parentElement.children) s.setAttribute('aria-checked', String(s === b));
  },
  'settings-clear': b => {
    const kind = b.dataset.value;
    if (kind === 'search') forgetSearches(); else clearList(kind);
    toast('Очищено', { glyph: 'check' });
    const note = b.parentElement.querySelector('small');
    if (note && kind !== 'search') note.textContent = '0 треков';
  },
  'settings-reset': () => {
    resetPrefs();
    toast('Настройки сброшены', { glyph: 'refresh' });
    if (player.isWave()) player.retuneWave();
  },
};
