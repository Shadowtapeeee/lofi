// Контроллер воспроизведения: очередь, перемешивание, повтор, «Моя волна», предзагрузка,
// кроссфейд, Media Session и события прослушивания.

import { api, bus, safeUrl, artSize, inTelegram, haptic, $ } from '../core.js';
import { prefs, state, addRecent, isDisliked, remember, setDislike, toggleLike, isLiked } from '../store.js';
import { Engine, WidgetPlayer } from './engine.js';
import { toast } from '../ui.js';

export const engine = new Engine();
const widget = new WidgetPlayer($('#widget-slot'));

export const P = {
  queue: [], index: -1, track: null,
  context: { type: '', label: '', href: '' },
  status: 'idle', want: false, mode: '',
  shuffle: false, repeat: 'off', original: null,
  wave: null, version: 0, startedAt: 0, bitrate: null, cached: false, errors: 0,
};

const sources = new Map();
const SOURCE_TTL = 80e3;
let watchdog = 0;
let lastTimeEmit = 0;
let recentFor = -1;

const emit = (name, data) => bus.emit('player:' + name, data);
const setStatus = status => { if (P.status !== status) { P.status = status; emit('state'); updateSession(); } };

export const position = () => P.mode === 'widget' ? widget.currentTime : engine.currentTime;
export const duration = () => (P.mode === 'widget' ? widget.duration : engine.duration) || P.track?.dur || 0;
export const isPlaying = () => P.status === 'playing';
export const isWave = () => !!P.wave && P.context.type === 'wave';

function logEvent(kind, track = P.track, source = P.context.type) {
  if (!track) return;
  api('event', { body: { id: track.id, kind, source, title: track.title, artist: track.artist } }).catch(() => {});
}

// ── источник звука ──
async function resolveSource(track, { fresh = false } = {}) {
  const hit = sources.get(track.id);
  if (!fresh && hit && (hit.data.protocol === 'file' || Date.now() - hit.at < SOURCE_TTL)) return hit.data;
  const data = await api('playback', { params: { id: track.id, quality: prefs.quality } });
  sources.set(track.id, { data, at: Date.now() });
  if (sources.size > 200) sources.delete(sources.keys().next().value);
  return data;
}
const toEngineSource = data => ({ url: data.protocol === 'file' ? data.source : data.source, protocol: data.protocol === 'hls' ? 'hls' : 'file' });

// ── загрузка трека ──
async function load(index, { autoplay = true, fade = 0 } = {}) {
  const track = P.queue[index];
  if (!track) return;
  const version = ++P.version;
  clearTimeout(watchdog);
  if (P.mode === 'widget') { widget.destroy(); P.mode = ''; }
  Object.assign(P, { index, track, want: autoplay, bitrate: null, cached: false, startedAt: 0, _retried: false });
  setStatus('loading');
  emit('track', track);
  updateMetadata();
  maybeExtendWave();

  const key = track.id + ':' + version;
  // Следующий трек уже на запасной деке — переключаемся без паузы или с кроссфейдом.
  const standby = engine.standby();
  if (standby.key.startsWith(track.id + ':') && standby.el.readyState >= 2) {
    standby.key = key;
    const data = sources.get(track.id)?.data;
    P.bitrate = data?.bitrate || null; P.cached = !!data?.cached;
    P.mode = 'audio';
    engine.swap(fade);
    afterStart(version);
    return;
  }
  try {
    const data = await resolveSource(track);
    if (version !== P.version) return;
    P.bitrate = data.bitrate || null;
    P.cached = !!data.cached;
    if (data.protocol === 'widget' || !data.source) return useWidget(version, autoplay);
    P.mode = 'audio';
    await engine.load(toEngineSource(data), key, { autoplay }).catch(error => {
      if (error?.name === 'NotAllowedError') { P.want = false; setStatus('paused'); return; }
      if (error?.name !== 'AbortError') throw error;
    });
    afterStart(version);
  } catch (error) {
    if (version !== P.version) return;
    failed(version, error);
  }
}

function afterStart(version) {
  clearTimeout(watchdog);
  watchdog = setTimeout(() => {
    if (version === P.version && P.status === 'loading' && P.want) failed(version, Error('Трек долго не загружается'));
  }, 16000);
  prefetchAhead();
}

async function useWidget(version, autoplay) {
  const track = P.track;
  const url = safeUrl(track?.url, 'sc');
  if (!url) return failed(version, Error('Трек недоступен'));
  engine.stop();
  P.mode = 'widget';
  try {
    await widget.load(url, { autoplay, volume: Math.round(prefs.volume) });
    if (version !== P.version) return;
    if (!autoplay) setStatus('paused');
  } catch (error) { if (version === P.version) failed(version, error, true); }
}

function failed(version, error, final = false) {
  clearTimeout(watchdog);
  if (version !== P.version) return;
  if (!final && P.mode === 'audio' && P.track) {
    // Ссылка могла устареть: пробуем свежий поток, затем виджет.
    if (!P._retried) {
      P._retried = true;
      sources.delete(P.track.id);
      resolveSource(P.track, { fresh: true }).then(data => {
        if (version !== P.version) return;
        if (data.protocol === 'widget' || !data.source) return useWidget(version, P.want);
        return engine.load(toEngineSource(data), P.track.id + ':' + version, { autoplay: P.want }).then(() => afterStart(version));
      }).catch(() => useWidget(version, P.want));
      return;
    }
    return useWidget(version, P.want);
  }
  P._retried = false;
  setStatus('error');
  P.errors++;
  toast(error?.message && !/HTTP|fetch/i.test(error.message) ? error.message : 'Не удалось воспроизвести трек', { glyph: 'cloud' });
  // В очереди или волне пропускаем недоступный трек, но не бесконечно.
  if (P.errors < 4 && P.want && (P.index + 1 < P.queue.length || isWave())) setTimeout(() => { if (version === P.version) next({ auto: true }); }, 900);
}

// ── события движка ──
function onPlaying() {
  clearTimeout(watchdog);
  P._retried = false;
  P.errors = 0;
  if (!P.startedAt) P.startedAt = Date.now();
  P.want = true;
  setStatus('playing');
  if (recentFor !== P.version && P.track) {
    recentFor = P.version;
    addRecent(P.track);
    logEvent('play');
    if (P.wave) P.wave.played.push(P.track.id);
  }
}
function onPause() {
  if (P.status === 'loading' && P.want) return;
  // Перед «ended» браузер шлёт «pause» — не мигаем кнопкой между треками.
  if (P.mode === 'audio' && engine.el.ended) return;
  P.want = false;
  setStatus('paused');
}
function onEnded() {
  if (P.track) logEvent('finish');
  if (sleepAt === -1) {
    sleepAt = 0;
    P.want = false;
    setStatus('paused');
    toast('Таймер сна: трек закончился', { glyph: 'timer' });
    return;
  }
  if (P.repeat === 'one') { seek(0); play(); return; }
  next({ auto: true });
}
function onTime() {
  const now = performance.now();
  if (now - lastTimeEmit > 240) { lastTimeEmit = now; emit('time'); updatePosition(); }
  if (P.mode !== 'audio' || !P.track) return;
  const dur = engine.duration, pos = engine.currentTime;
  if (!dur) return;
  const remaining = dur - pos;
  const nextIndex = upcomingIndex();
  const nextTrack = P.queue[nextIndex];
  if (nextTrack && remaining < 25 && (prefs.gapless || prefs.crossfade) && P.repeat !== 'one') void preloadNext(nextTrack);
  if (prefs.crossfade && nextTrack && remaining <= prefs.crossfadeSec && remaining > .3 && engine.isPreloaded(nextTrack.id + ':pre') && !P.fadingTo) {
    P.fadingTo = nextTrack.id;
    load(nextIndex, { fade: Math.min(prefs.crossfadeSec, remaining) }).finally(() => { P.fadingTo = null; });
  }
}

let preloading = '';
async function preloadNext(track) {
  if (preloading === track.id || engine.standby().key.startsWith(track.id + ':')) return;
  preloading = track.id;
  try {
    const data = await resolveSource(track);
    if (data.protocol !== 'widget' && data.source && upcomingIndex() >= 0 && P.queue[upcomingIndex()]?.id === track.id) {
      await engine.preload(toEngineSource(data), track.id + ':pre');
    }
  } catch { /* при переходе попробуем ещё раз */ }
  finally { if (preloading === track.id) preloading = ''; }
}

/** Просит сервер заранее скачать следующие треки в кеш. */
function prefetchAhead() {
  const ids = P.queue.slice(P.index + 1, P.index + 3).map(t => t.id);
  if (ids.length) api('prefetch', { body: { ids } }).catch(() => {});
  for (const t of P.queue.slice(P.index + 1, P.index + 2)) resolveSource(t).catch(() => {});
}

for (const [type, fn] of Object.entries({ playing: onPlaying, pause: onPause, ended: onEnded, timeupdate: onTime,
  error: () => P.mode === 'audio' && failed(P.version, Error('Ошибка потока')),
  waiting: () => { if (P.want && P.status === 'playing') setStatus('loading'); },
  canplay: () => { if (P.status === 'loading' && !P.want) setStatus('paused'); },
  durationchange: () => emit('time'), swap: () => emit('time') })) {
  engine.addEventListener(type, fn);
}
for (const [type, fn] of Object.entries({ playing: onPlaying, pause: onPause, ended: onEnded, timeupdate: () => emit('time'),
  durationchange: () => emit('time'), error: () => failed(P.version, Error('Виджет не смог воспроизвести трек'), true) })) {
  widget.addEventListener(type, () => { if (P.mode === 'widget') fn(); });
}

// ── управление ──
export function playList(tracks, index = 0, context = {}) {
  const selected = tracks[index];
  if (!selected || selected.available === false) return;
  remember(tracks);
  const list = tracks.filter(t => t.available !== false && (t.id === selected.id || !isDisliked(t.id)));
  let start = list.findIndex(t => t.id === selected.id);
  if (context.type !== 'wave') P.wave = null;
  P.context = { type: context.type || '', label: context.label || '', href: context.href || '' };
  P.original = [...list];
  if (P.shuffle && context.type !== 'wave') {
    const rest = list.filter((_, i) => i !== start);
    shuffleInPlace(rest);
    P.queue = [list[start], ...rest];
    start = 0;
  } else P.queue = list;
  engine.ensureContext();
  emit('queue');
  return load(start);
}

export function play() {
  engine.ensureContext();
  if (!P.track) return P.queue.length ? load(0) : startWave();
  P.want = true;
  if (P.mode === 'widget') return widget.play();
  if (P.mode !== 'audio' || P.status === 'error') return load(P.index);
  if (P.status === 'paused' || P.status === 'idle') setStatus(engine.ready ? 'playing' : 'loading');
  return engine.play().catch(error => {
    if (error?.name === 'NotAllowedError') { P.want = false; setStatus('paused'); }
    else if (error?.name !== 'AbortError') load(P.index);
  });
}
export function pause() {
  P.want = false;
  if (P.mode === 'widget') widget.pause(); else engine.pause();
  if (P.status === 'loading') setStatus('paused');
}
export function toggle() {
  haptic('light');
  if (P.status === 'playing' || (P.status === 'loading' && P.want)) pause(); else play();
}
export function seek(seconds) {
  const target = Math.max(0, Math.min(duration() || seconds, seconds));
  if (P.mode === 'widget') widget.seek(target);
  else if (P.mode === 'audio') { engine.cancelFade(); engine.seek(target); }
  emit('time');
  updatePosition();
}

function upcomingIndex() {
  if (P.repeat === 'one') return P.index;
  if (P.index + 1 < P.queue.length) return P.index + 1;
  return P.repeat === 'all' && P.queue.length > 1 ? 0 : -1;
}

export async function next({ auto = false } = {}) {
  if (!P.track) return play();
  const pos = position(), dur = duration();
  if (!auto) {
    haptic('light');
    if (pos < 30 && dur > 45) {
      logEvent('skip');
      if (P.wave) P.wave.skipped.push(P.track.artist);
    }
  }
  if (P.index + 1 < P.queue.length) return load(P.index + 1);
  if (isWave()) {
    await extendWave(true);
    if (P.index + 1 < P.queue.length) return load(P.index + 1);
  }
  if (P.repeat === 'all' && P.queue.length) return load(0);
  if (auto && prefs.autoplay && P.track) {
    toast('Очередь закончилась — включаю «Мою волну»', { glyph: 'logo' });
    return startWave({ seed: P.track.id, quiet: true });
  }
  if (!auto) toast('Это последний трек в очереди', { glyph: 'queue' });
  else { P.want = false; setStatus('paused'); }
}

export function prev() {
  haptic('light');
  if (position() > 4 || P.index <= 0) return seek(0);
  return load(P.index - 1);
}

export function jump(index) { if (P.queue[index]) return load(index); }

export function setShuffle(on = !P.shuffle) {
  P.shuffle = on;
  if (P.queue.length > 1 && !isWave()) {
    const current = P.queue[P.index];
    if (on) {
      P.original = [...P.queue];
      const upcoming = P.queue.slice(P.index + 1);
      shuffleInPlace(upcoming);
      P.queue = [...P.queue.slice(0, P.index + 1), ...upcoming];
    } else if (P.original) {
      const known = new Set(P.original.map(t => t.id));
      const extra = P.queue.filter(t => !known.has(t.id));
      P.queue = [...P.original.filter(t => P.queue.some(q => q.id === t.id)), ...extra];
      P.index = Math.max(0, P.queue.findIndex(t => t.id === current?.id));
    }
    engine.standby().unload();
  }
  emit('queue');
  emit('state');
}
export function cycleRepeat() {
  P.repeat = { off: 'all', all: 'one', one: 'off' }[P.repeat];
  emit('state');
}

export function playNext(track) {
  remember([track]);
  P.queue = P.queue.filter((t, i) => t.id !== track.id || i === P.index);
  if (P.index < 0 || !P.track) return playList([track], 0);
  P.queue.splice(P.index + 1, 0, track);
  engine.standby().unload();
  emit('queue');
  toast('Сыграет следующим', { glyph: 'queue' });
}
export function enqueue(track) {
  remember([track]);
  if (!P.track) return playList([track], 0);
  if (P.queue.some((t, i) => t.id === track.id && i > P.index)) { toast('Уже в очереди', { glyph: 'queue' }); return; }
  P.queue.push(track);
  emit('queue');
  toast('Добавлено в очередь', { glyph: 'plus' });
}
export function removeAt(index) {
  if (index === P.index || !P.queue[index]) return;
  P.queue.splice(index, 1);
  if (index < P.index) P.index--;
  engine.standby().unload();
  emit('queue');
}
export function moveItem(from, to) {
  if (from === P.index || !P.queue[from]) return;
  to = Math.max(P.index + 1, Math.min(P.queue.length - 1, to));
  const [item] = P.queue.splice(from, 1);
  P.queue.splice(to, 0, item);
  if (from < P.index && to >= P.index) P.index--;
  engine.standby().unload();
  emit('queue');
}

export function setVolume(value) {
  engine.setVolume(value / 100);
  widget.setVolume(value / 100);
}

// ── «Моя волна» ──
function waveBody(extra = {}) {
  const w = P.wave;
  const body = {
    seed: w?.seed || undefined,
    liked: w?.liked.slice(-24) || [],
    played: [...new Set([...(w?.played || []), ...P.queue.slice(Math.max(0, P.index)).map(t => t.id)])].slice(-400),
    skipped: w?.skipped.slice(-40) || [],
    mood: prefs.waveMood, activity: prefs.waveActivity, character: prefs.waveCharacter, taste: prefs.taste, count: 10,
    ...extra,
  };
  if (!inTelegram) {
    body.favorites = state.favorites.slice(0, 120).map(t => ({ id: t.id, artist: t.artist, userId: t.userId || t.artistId }));
    body.recent = state.recent.slice(0, 60).map(t => ({ id: t.id, artist: t.artist, userId: t.userId || t.artistId }));
    body.dislikes = state.dislikes.slice(0, 1000).map(t => t.id);
  }
  return body;
}

export async function startWave({ seed = null, quiet = false, label = '' } = {}) {
  engine.ensureContext();
  const token = Symbol('wave');
  P.wave = { token, seed, liked: [], skipped: [], played: [], loading: true, label: label || 'Моя волна' };
  emit('wave');
  if (!quiet) haptic('medium');
  try {
    const data = await api('wave', { body: waveBody() });
    if (P.wave?.token !== token) return;
    P.wave.loading = false;
    const items = data.items.filter(t => !isDisliked(t.id));
    if (!items.length) throw Error('Волна пока пустая — послушайте пару треков, и она подстроится.');
    void playList(items, 0, { type: 'wave', label: P.wave.label, href: '/' });
    emit('wave');
  } catch (error) {
    if (P.wave?.token === token) { P.wave = null; emit('wave'); }
    toast(error.message || 'Волна недоступна', { glyph: 'cloud' });
  }
}

export function stopWave() {
  if (!P.wave) return;
  P.wave = null;
  P.context = { type: 'queue', label: 'Очередь', href: '' };
  emit('wave');
}

let extending = null;
async function extendWave(force = false) {
  if (!isWave()) return;
  if (!force && P.queue.length - P.index > 3) return;
  if (extending) return extending;
  const token = P.wave.token;
  extending = api('wave', { body: waveBody() }).then(data => {
    if (P.wave?.token !== token) return;
    const known = new Set(P.queue.map(t => t.id));
    const fresh = data.items.filter(t => !known.has(t.id) && !isDisliked(t.id));
    remember(fresh);
    P.queue.push(...fresh);
    emit('queue');
  }).catch(() => {}).finally(() => { extending = null; });
  return extending;
}
function maybeExtendWave() { if (isWave()) void extendWave(); }

/** Настройки волны изменились — заменяем то, что ещё не играло. */
export async function retuneWave() {
  if (!isWave()) return;
  const token = P.wave.token;
  P.queue = P.queue.slice(0, P.index + 1);
  engine.standby().unload();
  emit('queue');
  await extendWave(true);
  if (P.wave?.token === token) toast('Волна подстроилась', { glyph: 'sparkle' });
}

export function likeCurrent() {
  if (!P.track) return;
  const active = toggleLike(P.track);
  haptic(active ? 'success' : 'light');
  if (active) logEvent('like');
  if (active && P.wave) P.wave.liked.push(P.track.id);
  return active;
}
export function dislikeTrack(track) {
  const active = setDislike(track);
  if (active) {
    logEvent('dislike', track);
    if (P.wave) P.wave.skipped.push(track.artist, track.artist);
    toast('Больше не будем это предлагать', { glyph: 'dislike', action: { label: 'Вернуть', run: () => setDislike(track, false) } });
    if (P.track?.id === track.id) next({ auto: true });
    else {
      const i = P.queue.findIndex((t, n) => t.id === track.id && n > P.index);
      if (i > 0) removeAt(i);
    }
  }
  return active;
}

// ── таймер сна ──
let sleepTimer = 0, sleepAt = 0;
export function setSleep(minutes) {
  clearTimeout(sleepTimer);
  sleepAt = minutes ? Date.now() + minutes * 60e3 : 0;
  if (minutes === -1) { sleepAt = -1; emit('state'); return; }
  if (minutes) sleepTimer = setTimeout(() => { sleepAt = 0; pause(); toast('Таймер сна: воспроизведение остановлено', { glyph: 'timer' }); emit('state'); }, minutes * 60e3);
  emit('state');
}
export const sleepLeft = () => sleepAt === -1 ? -1 : sleepAt ? Math.max(0, sleepAt - Date.now()) : 0;

// ── Media Session ──
function updateMetadata() {
  if (!('mediaSession' in navigator) || !P.track) return;
  const art = safeUrl(P.track.artwork);
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: P.track.title, artist: P.track.artist, album: P.track.album || P.context.label || 'Lo-fi',
      artwork: art ? [{ src: artSize(art, 't300x300'), sizes: '300x300', type: 'image/jpeg' }, { src: art, sizes: '500x500', type: 'image/jpeg' }] : [],
    });
  } catch { /* старый браузер */ }
}
function updateSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = !P.track ? 'none' : P.status === 'playing' ? 'playing' : 'paused';
}
function updatePosition() {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  const dur = duration();
  if (!dur) return;
  try { navigator.mediaSession.setPositionState({ duration: dur, position: Math.min(dur, position()), playbackRate: 1 }); } catch {}
}
if ('mediaSession' in navigator) {
  const handlers = {
    play: () => play(), pause: () => pause(), previoustrack: () => prev(), nexttrack: () => next(),
    seekto: e => seek(e.seekTime), seekbackward: e => seek(position() - (e.seekOffset || 10)), seekforward: e => seek(position() + (e.seekOffset || 10)),
  };
  for (const [action, fn] of Object.entries(handlers)) { try { navigator.mediaSession.setActionHandler(action, fn); } catch {} }
}

// Аудиоконтекст засыпает в фоне на некоторых устройствах — будим при возврате.
document.addEventListener('visibilitychange', () => { if (!document.hidden && engine.ctx?.state === 'suspended' && P.want) engine.ctx.resume().catch(() => {}); });

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export { isLiked };
