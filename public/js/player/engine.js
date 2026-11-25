// Аудиодвижок: две деки <audio> для бесшовных переходов и кроссфейда, HLS через Hls.js,
// Web Audio для громкости, нормализации и анализатора спектра, виджет SoundCloud как запасной путь.

import { isIOS } from '../core.js';

const HLS_URL = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.16/dist/hls.light.min.js';
const scripts = new Map();
function loadScript(url) {
  if (!scripts.has(url)) {
    const task = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      const timer = setTimeout(() => { el.remove(); reject(Error('Скрипт не загрузился')); }, 9000);
      el.src = url;
      el.onload = () => { clearTimeout(timer); resolve(); };
      el.onerror = () => { clearTimeout(timer); el.remove(); reject(Error('Скрипт недоступен')); };
      document.head.append(el);
    }).catch(error => { scripts.delete(url); throw error; });
    scripts.set(url, task);
  }
  return scripts.get(url);
}

const EVENTS = ['playing', 'pause', 'ended', 'error', 'waiting', 'canplay', 'timeupdate', 'durationchange', 'loadedmetadata', 'seeked', 'stalled'];

class Deck {
  constructor() {
    this.el = document.createElement('audio');
    this.el.crossOrigin = 'anonymous';
    this.el.preload = 'auto';
    this.el.setAttribute('playsinline', '');
    this.el.hidden = true;
    document.body.append(this.el);
    this.hls = null;
    this.key = '';
    this.gain = null;
  }
  async load(source, key) {
    this.unload();
    this.key = key;
    if (source.protocol === 'hls' && !this.el.canPlayType('application/vnd.apple.mpegurl')) {
      await loadScript(HLS_URL);
      if (this.key !== key) return;
      const Hls = window.Hls;
      if (!Hls?.isSupported()) throw Error('HLS не поддерживается');
      const hls = new Hls({ enableWorker: true, maxBufferLength: 40, backBufferLength: 30 });
      this.hls = hls;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && this.hls === hls) this.el.dispatchEvent(new Event('error'));
      });
      hls.loadSource(source.url);
      hls.attachMedia(this.el);
    } else {
      this.el.src = source.url;
      this.el.load();
    }
  }
  unload() {
    this.key = '';
    if (this.hls) { this.hls.destroy(); this.hls = null; }
    this.el.pause();
    if (this.el.hasAttribute('src')) { this.el.removeAttribute('src'); try { this.el.load(); } catch {} }
  }
}

export class Engine extends EventTarget {
  constructor() {
    super();
    this.decks = [new Deck(), new Deck()];
    this.active = this.decks[0];
    this.volume = 0.8;
    this.normalize = false;
    this.ctx = null;
    this.fading = null;
    this.smooth = { bass: 0, mid: 0, high: 0, energy: 0 };
    this.webAudio = !isIOS && !!(window.AudioContext || window.webkitAudioContext);
    for (const deck of this.decks) {
      for (const type of EVENTS) deck.el.addEventListener(type, () => {
        if (deck === this.active) this.dispatchEvent(new Event(type));
      });
    }
  }

  get el() { return this.active.el; }
  get currentTime() { return this.el.currentTime || 0; }
  get duration() { const d = this.el.duration; return Number.isFinite(d) && d > 0 ? d : 0; }
  get paused() { return this.el.paused; }
  get ready() { return this.el.readyState >= 2; }
  get key() { return this.active.key; }
  standby() { return this.decks.find(d => d !== this.active); }

  /** Создаёт граф Web Audio. Вызывается из жеста пользователя. */
  ensureContext() {
    if (!this.webAudio) return;
    if (!this.ctx) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx({ latencyHint: 'playback' });
        const master = ctx.createGain();
        const direct = ctx.createGain();
        const compressed = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -20; compressor.knee.value = 14; compressor.ratio.value = 3.5;
        compressor.attack.value = .02; compressor.release.value = .25;
        const makeup = ctx.createGain(); makeup.gain.value = 1.35;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512; analyser.smoothingTimeConstant = .78;
        master.connect(direct).connect(analyser);
        master.connect(compressor).connect(makeup).connect(compressed).connect(analyser);
        analyser.connect(ctx.destination);
        for (const deck of this.decks) {
          const source = ctx.createMediaElementSource(deck.el);
          deck.gain = ctx.createGain();
          deck.gain.gain.value = deck === this.active ? 1 : 0;
          source.connect(deck.gain).connect(master);
        }
        Object.assign(this, { ctx, master, direct, compressed, analyser, bins: new Uint8Array(analyser.frequencyBinCount) });
        this.applyVolume();
        this.applyNormalize();
      } catch { this.webAudio = false; this.ctx = null; return; }
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  applyVolume() {
    const v = Math.pow(this.volume, 1.6);
    if (this.ctx) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .03);
      for (const deck of this.decks) deck.el.volume = 1;
    } else {
      for (const deck of this.decks) deck.el.volume = deck === this.active || this.fading ? v : 0;
    }
  }
  setVolume(value) { this.volume = Math.min(1, Math.max(0, value)); this.applyVolume(); }
  setNormalize(on) { this.normalize = !!on; this.applyNormalize(); }
  applyNormalize() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.direct.gain.setTargetAtTime(this.normalize ? 0 : 1, t, .05);
    this.compressed.gain.setTargetAtTime(this.normalize ? 1 : 0, t, .05);
  }

  async load(source, key, { autoplay = true, start = 0 } = {}) {
    this.cancelFade();
    this.standby().unload();
    if (this.active.gain) this.active.gain.gain.value = 1;
    await this.active.load(source, key);
    if (start) this.el.currentTime = start;
    this.applyVolume();
    if (autoplay) return this.play();
  }

  play() {
    this.ensureContext();
    return this.el.play();
  }
  pause() { this.el.pause(); }
  seek(seconds) {
    if (!this.el.readyState) return false;
    this.el.currentTime = Math.max(0, Math.min(this.duration || seconds, seconds));
    return true;
  }
  stop() { this.cancelFade(); for (const deck of this.decks) deck.unload(); }

  /** Готовит следующий трек на запасной деке. */
  async preload(source, key) {
    const deck = this.standby();
    if (deck.key === key) return true;
    try {
      await deck.load(source, key);
      if (deck.gain) deck.gain.gain.value = 0; else deck.el.volume = 0;
      return true;
    } catch { deck.unload(); return false; }
  }
  isPreloaded(key) { const d = this.standby(); return d.key === key && d.el.readyState >= 2; }

  /** Переключает на запасную деку: сразу (бесшовно) или с кроссфейдом. */
  swap(fadeSeconds = 0) {
    const next = this.standby();
    if (!next.key) return false;
    const prev = this.active;
    this.cancelFade();
    this.active = next;
    const fade = this.ctx && fadeSeconds > 0.3 ? fadeSeconds : 0;
    if (fade) {
      const t = this.ctx.currentTime;
      const curve = n => Float32Array.from({ length: 32 }, (_, i) => n ? Math.sin(i / 31 * Math.PI / 2) : Math.cos(i / 31 * Math.PI / 2));
      next.gain.gain.cancelScheduledValues(t);
      prev.gain.gain.cancelScheduledValues(t);
      next.gain.gain.setValueCurveAtTime(curve(true), t, fade);
      prev.gain.gain.setValueCurveAtTime(curve(false), t, fade);
      this.fading = { prev, timer: setTimeout(() => { if (this.fading?.prev === prev) { this.fading = null; prev.unload(); } }, fade * 1000 + 80) };
    } else {
      prev.unload();
      if (next.gain) next.gain.gain.value = 1;
    }
    this.applyVolume();
    next.el.play().catch(() => {});
    this.dispatchEvent(new Event('swap'));
    return true;
  }
  cancelFade() {
    if (!this.fading) return;
    clearTimeout(this.fading.timer);
    const prev = this.fading.prev;
    this.fading = null;
    if (prev !== this.active) prev.unload();
    if (this.ctx) {
      const t = this.ctx.currentTime;
      for (const deck of this.decks) { deck.gain.gain.cancelScheduledValues(t); deck.gain.gain.value = deck === this.active ? 1 : 0; }
    }
  }

  /** Энергия по полосам 0…1 для визуализации. Без Web Audio — мягкая имитация. */
  levels(now = performance.now()) {
    let bass, mid, high;
    if (this.analyser && !this.el.paused) {
      this.analyser.getByteFrequencyData(this.bins);
      const avg = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += this.bins[i]; return s / ((b - a) * 255); };
      bass = avg(1, 6); mid = avg(6, 40); high = avg(40, 120);
    } else if (!this.el.paused) {
      const t = now / 1000;
      bass = .45 + .25 * Math.sin(t * 3.1) * Math.sin(t * 1.3);
      mid = .35 + .18 * Math.sin(t * 2.2 + 1);
      high = .25 + .12 * Math.sin(t * 4.7 + 2);
    } else { bass = mid = high = 0; }
    const s = this.smooth, k = .18;
    s.bass += (bass - s.bass) * k; s.mid += (mid - s.mid) * k; s.high += (high - s.high) * k;
    s.energy = s.bass * .55 + s.mid * .3 + s.high * .15;
    return s;
  }

  async setSink(id) {
    const targets = this.ctx?.setSinkId ? [this.ctx] : this.decks.map(d => d.el);
    await Promise.all(targets.map(t => t.setSinkId?.(id)));
  }
}

/** Запасной путь: официальный виджет SoundCloud, если прямой поток недоступен. */
export class WidgetPlayer extends EventTarget {
  constructor(slot) {
    super();
    this.slot = slot;
    this.widget = null;
    this.position = 0;
    this.duration = 0;
    this.paused = true;
    this.at = 0;
  }
  async load(url, { autoplay = true, volume = 80 } = {}) {
    this.destroy();
    if (!window.SC?.Widget) await loadScript('https://w.soundcloud.com/player/api.js');
    const frame = document.createElement('iframe');
    const src = new URL('https://w.soundcloud.com/player/');
    src.searchParams.set('url', url);
    src.searchParams.set('auto_play', String(autoplay));
    src.searchParams.set('show_artwork', 'false');
    src.searchParams.set('show_teaser', 'false');
    frame.allow = 'autoplay; encrypted-media';
    frame.title = 'Аудиопоток';
    frame.tabIndex = -1;
    frame.src = src.href;
    this.slot.replaceChildren(frame);
    const widget = window.SC.Widget(frame);
    this.widget = widget;
    const E = window.SC.Widget.Events;
    const on = (name, fn) => widget.bind(E[name], data => { if (this.widget === widget) fn(data); });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Виджет не ответил')), 15000);
      on('READY', () => {
        clearTimeout(timer);
        widget.setVolume(volume);
        widget.getDuration(ms => { this.duration = ms / 1000 || 0; this.dispatchEvent(new Event('durationchange')); });
        resolve();
      });
      on('ERROR', () => { clearTimeout(timer); reject(Error('Виджет не смог воспроизвести трек')); });
    });
    on('PLAY', () => { this.paused = false; this.at = performance.now(); this.dispatchEvent(new Event('playing')); });
    on('PAUSE', () => { this.paused = true; this.dispatchEvent(new Event('pause')); });
    on('FINISH', () => { this.paused = true; this.dispatchEvent(new Event('ended')); });
    on('PLAY_PROGRESS', e => { this.position = (e?.currentPosition || 0) / 1000; this.at = performance.now(); this.dispatchEvent(new Event('timeupdate')); });
    on('SEEK', e => { this.position = (e?.currentPosition || 0) / 1000; this.at = performance.now(); });
    on('ERROR', () => this.dispatchEvent(new Event('error')));
  }
  get currentTime() { return this.paused ? this.position : this.position + (performance.now() - this.at) / 1000; }
  play() { this.widget?.play(); return Promise.resolve(); }
  pause() { this.widget?.pause(); }
  seek(seconds) { this.widget?.seekTo(seconds * 1000); this.position = seconds; this.at = performance.now(); return true; }
  setVolume(v) { this.widget?.setVolume(Math.round(v * 100)); }
  destroy() { this.widget = null; this.slot.replaceChildren(); this.paused = true; this.position = 0; this.duration = 0; }
}
