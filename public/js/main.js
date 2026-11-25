// Точка входа Mini App: маршрутизация, мини-плеер, Telegram, тема и горячие клавиши.

import { installIcons } from './icons.js';
import { $, $$, esc, icon, clock, api, bus, root, tg, inTelegram, tgUser, wide, safeUrl, artSize, haptic, motionReduced, onMotionChange } from './core.js';
import { prefs, setPref, state, hydrate, catalogue, isLiked, toggleLike } from './store.js';
import { swapView, Slider, closeSheet, sheetKind, refreshLikes, cover, toast } from './ui.js';
import * as actionsModule from './actions.js';
import * as player from './player/player.js';
import * as full from './player/fullscreen.js';
import * as home from './pages/home.js';
import * as search from './pages/search.js';
import * as library from './pages/library.js';
import * as detail from './pages/detail.js';
import * as settings from './pages/settings.js';
import { WaveVisual } from './wave-visual.js';

installIcons();

const FALLBACK_CONFIG = {
  moods: [
    { id: 'focus', name: 'В потоке', note: 'Для концентрации' }, { id: 'rain', name: 'За окном дождь', note: 'Спокойный фон' },
    { id: 'night', name: 'Поздняя ночь', note: 'Тихий вечер' }, { id: 'drive', name: 'В дороге', note: 'Ровный темп' },
    { id: 'energy', name: 'Заряд', note: 'Для движения' }, { id: 'sleep', name: 'Перед сном', note: 'Медленно и мягко' },
  ],
  genres: [{ name: 'Lo-fi', query: 'lofi hip hop' }, { name: 'Рэп', query: 'русский рэп' }, { name: 'Фонк', query: 'phonk' }, { name: 'Инди', query: 'indie' },
    { name: 'Джаз', query: 'jazz' }, { name: 'Эмбиент', query: 'ambient' }, { name: 'Хаус', query: 'deep house' }, { name: 'Поп', query: 'pop' }],
  bot: '', version: '', cache: false,
};
window.__lofiConfig = FALLBACK_CONFIG;

// ── тема и внешний вид ──
const systemDark = matchMedia('(prefers-color-scheme: dark)');
function resolvedTheme() {
  if (prefs.theme !== 'system') return prefs.theme;
  if (inTelegram && tg.colorScheme) return tg.colorScheme;
  return systemDark.matches ? 'dark' : 'light';
}
function applyPrefs(key = '*') {
  const theme = resolvedTheme();
  const changedTheme = root.dataset.theme !== theme;
  if (changedTheme && root.dataset.ready && !motionReduced()) {
    root.classList.add('theme-fade');
    setTimeout(() => root.classList.remove('theme-fade'), 450);
  }
  root.dataset.theme = theme;
  root.dataset.motion = prefs.motion;
  root.dataset.glass = prefs.glass ? 'on' : 'off';
  root.dataset.scale = prefs.textScale;
  root.dataset.lyricSize = prefs.lyricSize;
  root.dataset.lyricBlur = String(prefs.lyricBlur);
  const bg = theme === 'light' ? '#f4f4f2' : '#050506';
  $('meta[name="theme-color"]').content = bg;
  if (inTelegram) {
    try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); tg.setBottomBarColor?.(bg); } catch {}
  }
  const glyph = { system: 'system', dark: 'moon', light: 'sun' }[prefs.theme];
  const label = { system: 'Тема: как в системе', dark: 'Тема: тёмная', light: 'Тема: светлая' }[prefs.theme];
  for (const b of $$('[data-action="theme-cycle"]')) {
    b.querySelector('use').setAttribute('href', '#i-' + glyph);
    b.setAttribute('aria-label', label);
    b.title = label;
    const text = b.querySelector('span');
    if (text) text.textContent = { system: 'Системная тема', dark: 'Тёмная тема', light: 'Светлая тема' }[prefs.theme];
  }
  if (['volume', '*'].includes(key)) { player.setVolume(prefs.volume); volumeSlider?.set(prefs.volume / 100); updateMute(); }
  if (['normalize', '*'].includes(key)) player.engine.setNormalize(prefs.normalize);
  for (const b of $$('[data-action="set-pref"]')) {
    const on = prefs[b.dataset.key] === b.dataset.value;
    b.setAttribute('aria-checked', String(on));
  }
  for (const input of $$('input[data-pref]')) input.checked = !!prefs[input.dataset.pref];
}
systemDark.addEventListener('change', () => { if (prefs.theme === 'system') applyPrefs('theme'); });
onMotionChange(() => applyPrefs('motion'));

// ── маршрутизация ──
let page = null;
let depth = 0;
const MODULES = { home, search, library, detail, settings };

function parse(path = location.pathname) {
  let m;
  if (path === '/' || path === '') return { page: 'home', nav: 'home' };
  if (path === '/search') return { page: 'search', nav: 'search' };
  if ((m = path.match(/^\/library(?:\/(history|hidden))?$/))) return { page: 'library', nav: 'library', tab: m[1] || 'favorites' };
  if (path === '/settings') return { page: 'settings', nav: 'settings' };
  if ((m = path.match(/^\/album\/(\d{1,15})$/))) return { page: 'detail', nav: '', kind: 'album', id: m[1] };
  if ((m = path.match(/^\/artist\/(\d{1,15})$/))) return { page: 'detail', nav: '', kind: 'artist', id: m[1] };
  if (path === '/artist') return { page: 'detail', nav: '', kind: 'artist', id: '', name: new URLSearchParams(location.search).get('name') || '' };
  if ((m = path.match(/^\/mood\/([\w-]{1,24})$/))) return { page: 'detail', nav: 'home', kind: 'mood', id: m[1], name: window.__lofiConfig.moods.find(x => x.id === m[1])?.name || '' };
  return { page: 'home', nav: 'home' };
}

export async function navigate(path, { replace = false } = {}) {
  closeSheet();
  if (full.isOpen()) full.close();
  const url = new URL(path, location.origin);
  if (url.pathname + url.search === location.pathname + location.search && !replace) { window.scrollTo({ top: 0, behavior: motionReduced() ? 'instant' : 'smooth' }); return; }
  history.replaceState({ ...(history.state || {}), scroll: scrollY, depth }, '');
  if (replace) history.replaceState({ depth }, '', url.pathname + url.search);
  else { depth++; history.pushState({ depth }, '', url.pathname + url.search); }
  await render('forward');
}
window.__lofiNavigate = path => navigate(path);

async function render(direction = 'forward', scroll = 0) {
  const route = parse();
  const module = MODULES[route.page];
  MODULES[page?.page]?.unmount?.();
  page = route;
  root.dataset.page = route.page;
  for (const link of $$('[data-nav]')) {
    const active = link.dataset.nav === route.nav;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }
  const html = route.page === 'library' ? module.render(route.tab) : route.page === 'detail' ? module.render(route.kind, route.id, route.name) : module.render();
  updateBack();
  await swapView(html, {
    direction, scroll,
    mount: el => {
      module.mount?.(el);
      if (route.page === 'detail') detail.load();
      markRows();
      if (route.page === 'search' && !coarseInput()) $('#search-input').focus({ preventScroll: true });
    },
  });
}
const coarseInput = () => matchMedia('(pointer: coarse)').matches;

addEventListener('popstate', event => {
  depth = event.state?.depth || 0;
  closeSheet();
  if (full.isOpen()) full.close();
  render('back', event.state?.scroll || 0);
});

function goBack() {
  if (sheetKind()) return closeSheet();
  if (full.isOpen()) return full.close();
  if (depth > 0) return history.back();
  if (page?.page !== 'home') return navigate('/', { replace: true });
}

function updateBack() {
  const canGoBack = depth > 0 || page?.page !== 'home' || full.isOpen() || !!sheetKind();
  root.dataset.canBack = String(depth > 0);
  if (!inTelegram) return;
  if (canGoBack) tg.BackButton?.show(); else tg.BackButton?.hide();
}
bus.on('player:open', updateBack);
new MutationObserver(updateBack).observe($('#sheet'), { attributes: true, attributeFilter: ['open'] });

// ── мини-плеер ──
let seekSlider, volumeSlider, dockFrame = 0, dockSecond = -1, lastVolume = 80, railOrb = null;
const dock = $('#dock');

function updateDockTrack() {
  const t = player.P.track;
  dock.dataset.empty = String(!t);
  root.dataset.hasTrack = String(!!t);
  const box = $('#dock-cover');
  const url = safeUrl(t?.artwork);
  if (box.dataset.src !== (url || '')) {
    box.dataset.src = url || '';
    box.innerHTML = cover(url, { size: 't120x120', eager: true }).replace(/^<span class="cover">|<\/span>$/g, '');
  }
  const title = $('#dock-title'), artist = $('#dock-artist');
  title.textContent = t?.title || 'Ничего не играет';
  artist.textContent = t ? t.artist : 'Включите «Мою волну»';
  dock.classList.remove('track-in');
  if (t && !motionReduced()) { void dock.offsetWidth; dock.classList.add('track-in'); }
  updateLikeCurrent();
}

function updateLikeCurrent() {
  const liked = isLiked(player.P.track?.id);
  for (const b of $$('[data-action="like-current"]')) {
    b.disabled = !player.P.track;
    b.classList.toggle('is-on', liked);
    b.setAttribute('aria-pressed', String(liked));
    b.setAttribute('aria-label', liked ? 'Убрать из избранного' : 'В избранное');
    const use = b.querySelector('use');
    if (use) use.setAttribute('href', '#i-' + (liked ? 'heart-fill' : 'heart'));
  }
}

function updateControls() {
  const P = player.P;
  const playing = P.status === 'playing' || (P.status === 'loading' && P.want);
  const loading = P.status === 'loading' && P.want;
  for (const b of $$('[data-action="toggle"]')) {
    b.querySelector('use').setAttribute('href', '#i-' + (playing ? 'pause' : 'play'));
    b.setAttribute('aria-label', playing ? 'Пауза' : 'Играть');
    b.classList.toggle('is-loading', loading);
  }
  for (const b of $$('[data-action="shuffle"]')) b.setAttribute('aria-pressed', String(P.shuffle));
  for (const b of $$('[data-action="repeat"]')) {
    b.setAttribute('aria-pressed', String(P.repeat !== 'off'));
    b.querySelector('use').setAttribute('href', '#i-' + (P.repeat === 'one' ? 'repeat-one' : 'repeat'));
    b.setAttribute('aria-label', { off: 'Повтор выключен', all: 'Повторять очередь', one: 'Повторять трек' }[P.repeat]);
  }
  for (const b of $$('[data-action="prev"],[data-action="next"]')) b.disabled = !P.track && !P.queue.length;
  root.dataset.playing = String(P.status === 'playing');
  root.dataset.wave = String(player.isWave());
  const waveStatus = $('[data-wave-status]');
  if (waveStatus) waveStatus.textContent = player.isWave() ? (P.status === 'playing' ? 'Играет' : 'На паузе') : P.wave?.loading ? 'Подбираем…' : 'Включить';
  railOrb?.setActive(player.isWave() && P.status === 'playing');
  seekSlider?.disable(!P.track);
  markRows();
  home.refreshHero();
  startDockLoop();
}

function markRows() {
  const id = player.P.track?.id;
  const playing = player.isPlaying();
  for (const row of $$('#view [data-row]')) {
    const current = row.dataset.row === id;
    row.classList.toggle('is-current', current);
    row.classList.toggle('is-playing', current && playing);
  }
}

function startDockLoop() { if (!dockFrame) dockFrame = requestAnimationFrame(dockTick); }
function dockTick() {
  dockFrame = 0;
  const pos = player.position(), dur = player.duration();
  const ratio = dur ? Math.min(1, pos / dur) : 0;
  dock.style.setProperty('--progress', ratio.toFixed(4));
  if (seekSlider && !seekSlider.dragging) {
    seekSlider.set(ratio);
    const s = Math.floor(pos);
    if (s !== dockSecond) { dockSecond = s; $('[data-time="pos"]', dock).textContent = clock(pos); $('[data-time="dur"]', dock).textContent = clock(dur); }
  }
  if (player.isPlaying() && !document.hidden) dockFrame = requestAnimationFrame(dockTick);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) startDockLoop(); });
addEventListener('scroll', () => {
  const scrolled = String(scrollY > 6);
  if (root.dataset.scrolled !== scrolled) root.dataset.scrolled = scrolled;
}, { passive: true });

function updateMute() {
  const b = $('[data-action="mute"]');
  if (!b) return;
  const glyph = prefs.volume === 0 ? 'mute' : prefs.volume < 45 ? 'volume-low' : 'volume';
  b.querySelector('use').setAttribute('href', '#i-' + glyph);
  b.setAttribute('aria-label', prefs.volume ? 'Выключить звук' : 'Включить звук');
}

// ── действия ──
const ACTIONS = {
  'play-track': b => actionsModule.playFrom(b.dataset.source, b.dataset.id),
  like: b => {
    const track = catalogue.get(b.dataset.id);
    if (!track) return;
    const on = toggleLike(track);
    haptic(on ? 'success' : 'light');
    if (on && player.P.wave && player.P.track?.id === track.id) player.P.wave.liked.push(track.id);
  },
  'like-current': () => player.likeCurrent(),
  'dislike-current': () => player.P.track && player.dislikeTrack(player.P.track),
  'track-menu': b => {
    const row = b.closest('[data-q]');
    actionsModule.openTrackMenu(catalogue.get(b.dataset.id), b, { inQueue: row ? Number(row.dataset.q) : -1 });
  },
  toggle: () => player.toggle(),
  next: () => player.next(),
  prev: () => player.prev(),
  shuffle: () => { player.setShuffle(); haptic('select'); },
  repeat: () => { player.cycleRepeat(); haptic('select'); },
  mute: () => { if (prefs.volume) { lastVolume = prefs.volume; setPref('volume', 0); } else setPref('volume', lastVolume || 80); },
  'player-open': () => full.open(),
  'player-close': () => full.close(),
  'player-lyrics': () => { full.open('lyrics'); },
  'player-queue': () => { full.open('queue'); },
  'player-panel': b => full.setPanel(b.dataset.panel),
  'player-menu': b => actionsModule.openPlayerMenu(b),
  'player-artist': () => { const t = player.P.track; if (t) navigate(t.artistId ? `/artist/${t.artistId}` : `/artist?name=${encodeURIComponent(t.artist)}`); },
  'queue-remove': b => player.removeAt(Number(b.dataset.index)),
  'lyrics-follow': () => full.followLyrics(),
  'lyrics-shift': b => full.shiftLyrics(Number(b.dataset.value)),
  'lyrics-size': () => full.cycleLyricSize(),
  'sleep-menu': b => actionsModule.openSleepMenu(b),
  'wave-toggle': () => actionsModule.toggleWave(),
  'wave-tune': () => actionsModule.openWaveTuner(),
  'wave-option': b => actionsModule.setWaveOption(b),
  'wave-apply': () => actionsModule.applyWave(),
  'shared-wave': b => { closeSheet(); player.startWave({ seed: b.dataset.id, label: 'Волна по треку' }); },
  'sheet-close': () => closeSheet(),
  'theme-cycle': () => {
    const order = ['system', 'dark', 'light'];
    setPref('theme', order[(order.indexOf(prefs.theme) + 1) % 3]);
    haptic('select');
  },
  'set-pref': b => {
    const { key, value } = b.dataset;
    setPref(key, value);
    haptic('select');
    if (key.startsWith('wave') && player.isWave()) player.retuneWave();
  },
  fullscreen: () => {
    if (inTelegram && tg.isVersionAtLeast?.('8.0')) { tg.isFullscreen ? tg.exitFullscreen() : tg.requestFullscreen(); return; }
    if (document.fullscreenElement) document.exitFullscreen?.(); else root.requestFullscreen?.().catch(() => {});
  },
  'history-back': () => goBack(),
  'search-clear': () => { const input = $('#search-input'); input.value = ''; onSearchInput(); input.focus(); },
  'search-suggest': b => { const input = $('#search-input'); input.value = b.dataset.value; onSearchInput(true); },
  'retry-home': () => home.load(true),
  'library-play': b => library.playAll(b.dataset.value, false),
  'library-shuffle': b => library.playAll(b.dataset.value, true),
  ...search.actions, ...library.actions, ...detail.actions, ...settings.actions,
};

document.addEventListener('click', event => {
  const link = event.target.closest('a[data-link]');
  if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault();
    haptic('select');
    navigate(link.getAttribute('href'), { replace: link.hasAttribute('data-replace') });
    return;
  }
  const control = event.target.closest('[data-action]');
  if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
  const handler = ACTIONS[control.dataset.action];
  if (!handler) return;
  if (['toggle', 'play-track', 'wave-toggle', 'next', 'prev', 'detail-play', 'detail-shuffle', 'library-play', 'library-shuffle', 'wave-apply'].includes(control.dataset.action)) player.engine.ensureContext();
  handler(control, event);
});

document.addEventListener('change', event => {
  const input = event.target;
  if (input.matches('input[data-pref]')) {
    setPref(input.dataset.pref, input.checked);
    haptic('select');
    if (input.dataset.pref === 'crossfade' && page?.page === 'settings') render('none', scrollY);
  }
});

// ── поиск ──
const searchInput = $('#search-input');
function onSearchInput(immediate = false) {
  const value = searchInput.value;
  $('[data-action="search-clear"]').hidden = !value;
  if (page?.page !== 'search') {
    navigate('/search' + (value.trim() ? '?q=' + encodeURIComponent(value.trim()) : ''));
    return;
  }
  search.setQuery(value, { immediate });
}
searchInput.addEventListener('input', () => onSearchInput());
$('#searchbar').addEventListener('submit', event => {
  event.preventDefault();
  onSearchInput(true);
  if (coarseInput()) searchInput.blur();
});
searchInput.addEventListener('focus', () => { if (page?.page !== 'search' && wide.matches) root.dataset.searchFocus = 'true'; });
searchInput.addEventListener('blur', () => { delete root.dataset.searchFocus; });

// ── горячие клавиши ──
document.addEventListener('keydown', event => {
  if (event.target.closest('input, textarea, [contenteditable]') || event.altKey || event.ctrlKey || event.metaKey) {
    if (event.key === 'Escape' && event.target === searchInput) searchInput.blur();
    return;
  }
  const P = player.P;
  switch (event.key) {
    case ' ': if (event.target.closest('button, a, [role="slider"]')) return; event.preventDefault(); player.engine.ensureContext(); player.toggle(); break;
    case '/': event.preventDefault(); searchInput.focus(); break;
    case 'ArrowRight': if (P.track && !event.target.closest('[role="slider"]')) { event.preventDefault(); player.seek(player.position() + (event.shiftKey ? 30 : 10)); } break;
    case 'ArrowLeft': if (P.track && !event.target.closest('[role="slider"]')) { event.preventDefault(); player.seek(player.position() - (event.shiftKey ? 30 : 10)); } break;
    case 'ArrowUp': if (!event.target.closest('[role="slider"]') && !sheetKind()) { event.preventDefault(); setPref('volume', Math.min(100, prefs.volume + 5)); } break;
    case 'ArrowDown': if (!event.target.closest('[role="slider"]') && !sheetKind()) { event.preventDefault(); setPref('volume', Math.max(0, prefs.volume - 5)); } break;
    case 'l': case 'д': player.likeCurrent(); break;
    case 'n': case 'т': player.next(); break;
    case 'p': case 'з': player.prev(); break;
    case 'm': case 'ь': ACTIONS.mute(); break;
    case 'f': case 'а': full.isOpen() ? full.close() : full.open(); break;
    case 't': case 'е': full.open('lyrics'); break;
    default: return;
  }
});

// ── Telegram ──
function setInsets() {
  if (!inTelegram) return;
  for (const [side, key] of Object.entries({ top: 't', bottom: 'b', left: 'l', right: 'r' })) {
    root.style.setProperty('--tg-' + key, ((tg.safeAreaInset?.[side] || 0) + (tg.contentSafeAreaInset?.[side] || 0)) + 'px');
  }
  root.dataset.tgFullscreen = String(!!tg.isFullscreen);
  $('#fullscreen-btn').hidden = !tg.isVersionAtLeast?.('8.0') || ['android', 'ios'].includes(tg.platform);
}

function initTelegram() {
  if (!inTelegram) {
    $('#fullscreen-btn').hidden = !document.fullscreenEnabled;
    return;
  }
  root.dataset.telegram = 'true';
  tg.ready();
  tg.expand();
  if (tg.isVersionAtLeast?.('7.7')) tg.disableVerticalSwipes?.();
  if (tg.isVersionAtLeast?.('8.0') && ['android', 'ios'].includes(tg.platform)) { try { tg.requestFullscreen(); } catch {} }
  for (const event of ['safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged', 'viewportChanged']) tg.onEvent(event, setInsets);
  tg.onEvent('fullscreenFailed', () => { tg.expand(); setInsets(); });
  tg.onEvent('themeChanged', () => { if (prefs.theme === 'system') applyPrefs('theme'); });
  tg.BackButton?.onClick(goBack);
  if (tg.SettingsButton) { tg.SettingsButton.show(); tg.SettingsButton.onClick(() => navigate('/settings')); }
  setInsets();
  if (tgUser) {
    const box = $('#profile');
    box.hidden = false;
    box.innerHTML = `${tgUser.photo_url && safeUrl(tgUser.photo_url, 'tg') ? `<img src="${esc(tgUser.photo_url)}" alt="">` : `<span class="avatar">${icon('user')}</span>`}<span><strong>${esc(tgUser.first_name || '')}</strong><small>${tgUser.username ? '@' + esc(tgUser.username) : 'Telegram'}</small></span>`;
  }
}

// ── подписки на события ──
bus.on('player:track', () => { updateDockTrack(); updateControls(); });
bus.on('player:state', updateControls);
bus.on('player:wave', updateControls);
bus.on('player:time', startDockLoop);
bus.on('player:colors', colors => { home.setHeroColors(colors); railOrb?.setColors(colors); });
bus.on('library', event => {
  refreshLikes($('#view'));
  updateLikeCurrent();
  if (page?.page === 'library') library.refresh(page.tab);
  if (page?.page === 'home' && (event.kind === 'recent' || event.kind === '*' || event.cleared)) home.refreshRecent();
  if (page?.page === 'settings') settings.refreshTaste();
  markRows();
});
bus.on('prefs', key => {
  applyPrefs(key);
  if (key === 'taste' && page?.page === 'settings') settings.refreshTaste();
  if (key.startsWith?.('wave')) home.refreshHero();
});
bus.on('rows', markRows);

// ── запуск ──
async function boot() {
  applyPrefs();
  initTelegram();
  full.init();
  seekSlider = new Slider($('[data-slider="seek"]', dock), {
    onInput: v => { $('[data-time="pos"]', dock).textContent = clock(v * player.duration()); },
    onCommit: v => player.seek(v * player.duration()),
    label: v => clock(v * player.duration()),
  });
  volumeSlider = new Slider($('[data-slider="volume"]', dock), {
    onInput: v => { setPref('volume', Math.round(v * 100)); },
    step: .05,
  });
  volumeSlider.set(prefs.volume / 100);
  updateMute();
  if (wide.matches) {
    railOrb = new WaveVisual($('.rail-wave canvas'), { levels: () => player.engine.levels(), shape: 'orb' });
    railOrb.start();
  }
  history.replaceState({ depth: 0 }, '');
  updateDockTrack();
  updateControls();
  await render('none');
  root.dataset.ready = 'true';

  api('config').then(config => {
    window.__lofiConfig = { ...FALLBACK_CONFIG, ...config };
    if (page?.page === 'home' && JSON.stringify(config.moods) !== JSON.stringify(FALLBACK_CONFIG.moods)) render('none', scrollY);
  }).catch(() => {});
  hydrate().then(() => { if (page?.page === 'home') home.refreshRecent(); });

  // Параметры запуска: ?page=wave, ?track=123, ?q=..., start_param из прямой ссылки.
  const params = new URLSearchParams(location.search);
  const start = inTelegram ? tg.initDataUnsafe?.start_param || '' : '';
  const trackId = params.get('track') || start.match(/^t_(\d{1,15})$/)?.[1];
  const q = params.get('q');
  if (trackId && /^\d{1,15}$/.test(trackId)) actionsModule.openSharedTrack(trackId);
  else if (params.get('page') === 'wave' || start === 'w' || start === 'wave') {
    setTimeout(() => { if (!player.P.track) player.startWave({ quiet: true }); }, 300);
  } else if (q && location.pathname !== '/search') navigate('/search?q=' + encodeURIComponent(q), { replace: true });
  else if (params.get('page') && ['search', 'library'].includes(params.get('page'))) navigate('/' + params.get('page'), { replace: true });
}

boot();
