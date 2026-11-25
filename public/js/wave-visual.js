// Анимация «Моей волны»: пучок световых лент (ribbons) или живое кольцо (orb).
// Амплитуда следует за спектром музыки, цвет — за обложкой текущего трека.

import { motionReduced, root } from './core.js';

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));

const DEFAULT_DARK = [[236, 236, 240], [150, 150, 160]];
const DEFAULT_LIGHT = [[28, 28, 32], [110, 110, 120]];

export class WaveVisual {
  constructor(canvas, { levels, shape = 'ribbons', lines = 7, intensity = 1 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.levels = levels || (() => ({ bass: 0, mid: 0, high: 0, energy: 0 }));
    this.shape = shape;
    this.lines = lines;
    this.intensity = intensity;
    this.colors = null;
    this.current = null;
    this.target = null;
    this.running = false;
    this.visible = true;
    this.active = false;
    this.activity = 0;
    this.t = Math.random() * 100;
    this.last = 0;
    this.frame = 0;
    this.dpr = 1;
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(entries => {
      this.visible = entries.some(e => e.isIntersecting);
      this.kick();
    });
    this.io.observe(canvas);
    this.onVisibility = () => this.kick();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
  }

  palette() {
    if (this.colors) return this.colors;
    return root.dataset.theme === 'light' ? DEFAULT_LIGHT : DEFAULT_DARK;
  }
  /** Цвета обложки: accent — яркий, average — средний. null — монохром. */
  setColors(colors) {
    if (!colors) { this.colors = null; return; }
    const light = root.dataset.theme === 'light';
    const lift = c => light ? c.map(v => Math.round(v * .7)) : c.map(v => Math.round(v + (255 - v) * .35));
    const a = lift(colors.accent || colors.average);
    const b = lift(colors.average);
    this.colors = [a, mix(b, light ? [40, 40, 44] : [220, 220, 228], .45)];
  }
  setActive(active) { this.active = active; this.kick(); }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width * this.dpr)), h = Math.max(1, Math.round(rect.height * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    if (!this.running || motionReduced()) this.draw(0);
  }

  start() { this.running = true; this.kick(); }
  stop() { this.running = false; cancelAnimationFrame(this.frame); this.frame = 0; }
  destroy() { this.stop(); this.ro.disconnect(); this.io.disconnect(); document.removeEventListener('visibilitychange', this.onVisibility); }

  kick() {
    if (!this.running) return;
    if (motionReduced() || !this.visible || document.hidden) { cancelAnimationFrame(this.frame); this.frame = 0; this.draw(0); return; }
    if (!this.frame) { this.last = performance.now(); this.frame = requestAnimationFrame(this.loop); }
  }

  loop(now) {
    this.frame = 0;
    if (!this.running || !this.visible || document.hidden || motionReduced()) return;
    const dt = Math.min(.05, (now - this.last) / 1000);
    this.last = now;
    this.activity = lerp(this.activity, this.active ? 1 : 0, .04);
    this.t += dt * (.35 + this.activity * .55);
    this.draw(dt, now);
    this.frame = requestAnimationFrame(this.loop);
  }

  draw(dt, now = performance.now()) {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return;
    const lv = this.levels(now);
    const energy = Math.min(1.2, lv.energy * 1.6) * this.activity;
    const bass = Math.min(1.2, lv.bass * 1.5) * this.activity;
    const [c1, c2] = this.palette();
    this.current = this.current ? [mix(this.current[0], c1, .05), mix(this.current[1], c2, .05)] : [c1, c2];
    const [ca, cb] = this.current;
    const light = root.dataset.theme === 'light';
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
    if (this.shape === 'orb') this.drawOrb(w, h, ca, cb, energy, bass, light);
    else this.drawRibbons(w, h, ca, cb, energy, bass, light, lv);
    ctx.globalCompositeOperation = 'source-over';
  }

  drawRibbons(w, h, ca, cb, energy, bass, light, lv) {
    const { ctx } = this;
    const n = this.lines, t = this.t, d = this.dpr;
    // мягкое свечение за лентами
    const glow = ctx.createRadialGradient(w * .62, h * .52, 0, w * .62, h * .52, Math.max(w, h) * .55);
    glow.addColorStop(0, `rgba(${ca.join(',')},${(light ? .10 : .14) + energy * .12})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    const step = Math.max(4, Math.round(7 * d));
    for (let i = 0; i < n; i++) {
      const f = n > 1 ? i / (n - 1) : .5;
      const color = mix(ca, cb, f);
      const base = h * (.5 + (f - .5) * .32);
      const amp = h * (.12 + .06 * Math.sin(i * 1.7)) * (.55 + energy * .9 + bass * .35) * this.intensity;
      const k = (1.15 + i * .16) * Math.PI * 2 / w;
      const ph = t * (.9 + i * .13) + i * .8;
      const pts = [];
      for (let x = -step; x <= w + step; x += step) {
        const env = .3 + .7 * Math.sin(Math.PI * Math.min(1, Math.max(0, x / w)));
        const y = base + amp * env * (
          Math.sin(k * x + ph) * .62 +
          Math.sin(k * 1.85 * x - ph * 1.25 + i) * .28 +
          Math.sin(k * .45 * x + ph * .55) * .42 +
          (lv.high || 0) * this.activity * .25 * Math.sin(k * 5 * x + ph * 3));
        pts.push(x, y);
      }
      // полупрозрачная лента под линией
      const thick = h * (.035 + .02 * Math.sin(t + i)) * (1 + energy * .6);
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let p = 2; p < pts.length; p += 2) ctx.lineTo(pts[p], pts[p + 1]);
      for (let p = pts.length - 2; p >= 0; p -= 2) ctx.lineTo(pts[p], pts[p + 1] + thick);
      ctx.closePath();
      const band = ctx.createLinearGradient(0, base - amp, 0, base + amp + thick);
      const a = (light ? .05 : .055) + energy * .035;
      band.addColorStop(0, `rgba(${color.join(',')},0)`);
      band.addColorStop(.5, `rgba(${color.join(',')},${a})`);
      band.addColorStop(1, `rgba(${color.join(',')},0)`);
      ctx.fillStyle = band;
      ctx.fill();
      // тонкая светящаяся линия
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let p = 2; p < pts.length; p += 2) ctx.lineTo(pts[p], pts[p + 1]);
      ctx.lineWidth = (i === Math.floor(n / 2) ? 1.8 : 1.1) * d;
      ctx.strokeStyle = `rgba(${color.join(',')},${(light ? .42 : .5) + energy * .3 - Math.abs(f - .5) * .3})`;
      ctx.stroke();
    }
  }

  drawOrb(w, h, ca, cb, energy, bass, light) {
    const { ctx } = this;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .3, t = this.t, d = this.dpr;
    const rings = 5;
    for (let i = 0; i < rings; i++) {
      const f = i / (rings - 1);
      const color = mix(ca, cb, f);
      ctx.beginPath();
      for (let s = 0; s <= 96; s++) {
        const a = s / 96 * Math.PI * 2;
        const r = R * (1 + (f - .5) * .5) + R * (.08 + energy * .16 + bass * .06) * (
          Math.sin(a * 3 + t * (1.2 + i * .2) + i) * .6 + Math.sin(a * 5 - t * 1.6 + i * 2) * .35);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (s) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = 1.2 * d;
      ctx.strokeStyle = `rgba(${color.join(',')},${(light ? .55 : .6) - f * .25 + energy * .2})`;
      ctx.stroke();
    }
  }
}
