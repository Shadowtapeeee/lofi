'use strict';

// Рисует обложку стартового сообщения public/media/welcome.png: световые ленты «Моей волны»,
// знак и надпись Lo-fi. Чистый Node.js, без зависимостей: растеризация и PNG-кодировщик здесь же.
// Запуск: node scripts/make-welcome.js

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const W = 1280, H = 720;
const px = new Float32Array(W * H * 3);

// ── фон ──
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const dx = (x - W * .7) / W, dy = (y - H * .52) / H;
  const glow = Math.exp(-(dx * dx * 3.2 + dy * dy * 5)) * .018;
  const i = (y * W + x) * 3;
  px[i] = .0016 + glow; px[i + 1] = .0016 + glow; px[i + 2] = .0021 + glow * 1.15;
}

// ── ленты ──
const ribbons = 9;
for (let r = 0; r < ribbons; r++) {
  const f = r / (ribbons - 1);
  const base = H * (.5 + (f - .5) * .34);
  const amp = H * (.13 + .05 * Math.sin(r * 1.7));
  const k = (1.15 + r * .16) * Math.PI * 2 / W;
  const ph = r * .8 + 1.3;
  const tint = [.9 + .08 * f, .92 + .02 * f, 1];
  const strength = (r === 4 ? 1 : .62) * (1 - Math.abs(f - .5) * .55);
  const ys = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const env = (.3 + .7 * Math.sin(Math.PI * x / W)) * Math.min(1, Math.max(0, (x - W * .18) / (W * .32)));
    ys[x] = base + amp * env * (Math.sin(k * x + ph) * .62 + Math.sin(k * 1.85 * x - ph * 1.25 + r) * .28 + Math.sin(k * .45 * x + ph * .55) * .42);
  }
  for (let x = 1; x < W - 1; x++) {
    const slope = (ys[x + 1] - ys[x - 1]) / 2;
    const norm = Math.sqrt(1 + slope * slope);
    const fade = Math.min(1, Math.max(0, (x - W * .2) / (W * .25)));
    for (let y = Math.max(0, Math.floor(ys[x] - 60)); y < Math.min(H, Math.ceil(ys[x] + 80)); y++) {
      const d = (y - ys[x]) / norm;
      const line = Math.exp(-(d * d) / (r === 4 ? 1.6 : 1.0)) * .5;
      const halo = Math.exp(-(d * d) / 220) * .012;
      const band = d > 0 ? Math.exp(-((d - 18) * (d - 18)) / 180) * .006 : 0;
      const v = (line + halo + band) * strength * fade;
      const i = (y * W + x) * 3;
      px[i] += v * tint[0]; px[i + 1] += v * tint[1]; px[i + 2] += v * tint[2];
    }
  }
}

// ── знак и надпись: отрезки и дуги со сглаживанием ──
const shapes = [];
const seg = (x1, y1, x2, y2) => shapes.push({ t: 's', x1, y1, x2, y2 });
const arc = (cx, cy, r, a0, a1) => shapes.push({ t: 'a', cx, cy, r, a0, a1 });
const dot = (cx, cy, r) => shapes.push({ t: 'd', cx, cy, r });

// знак: кольцо с волной
const LX = 128, LY = 214, LR = 46;
arc(LX, LY, LR, 0, Math.PI * 2);
{
  const x0 = LX - LR, step = LR * 2 / 4;
  for (let i = 0; i < 4; i++) {
    const cx = x0 + step * i + step / 2, up = i % 2 === 0;
    arc(cx, LY, step / 2, up ? Math.PI : 0, up ? Math.PI * 2 : Math.PI);
  }
}

// надпись Lo-fi: геометрический гротеск, единицы × S
const S = 1.55, BX = 84, BY = 330;
const g = (x, y) => [BX + x * S, BY + y * S];
const S_ = (x1, y1, x2, y2) => { const a = g(x1, y1), b = g(x2, y2); seg(a[0], a[1], b[0], b[1]); };
const A_ = (cx, cy, r, a0, a1) => { const c = g(cx, cy); arc(c[0], c[1], r * S, a0, a1); };
S_(0, 0, 0, 100); S_(0, 100, 50, 100);                           // L
A_(100, 66, 34, 0, Math.PI * 2);                                 // o
S_(152, 66, 184, 66);                                            // -
S_(214, 100, 214, 26); A_(240, 26, 26, Math.PI, Math.PI * 1.5); S_(198, 44, 236, 44); // f
S_(272, 44, 272, 100);                                           // i
{ const c = g(272, 16); dot(c[0], c[1], 9.5 * S * .62); }

const STROKE = 7.2 * S * .9;
function dist(p, q, s) {
  if (s.t === 's') {
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1, wx = p - s.x1, wy = q - s.y1;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
    return Math.hypot(p - (s.x1 + t * vx), q - (s.y1 + t * vy)) - STROKE / 2;
  }
  if (s.t === 'd') return Math.hypot(p - s.cx, q - s.cy) - s.r;
  let a = Math.atan2(q - s.cy, p - s.cx);
  if (a < 0) a += Math.PI * 2;
  const inside = s.a1 - s.a0 >= Math.PI * 2 - 1e-6 || (a >= s.a0 && a <= s.a1) || (a + Math.PI * 2 >= s.a0 && a + Math.PI * 2 <= s.a1);
  if (inside) return Math.abs(Math.hypot(p - s.cx, q - s.cy) - s.r) - STROKE / 2;
  const e0 = [s.cx + Math.cos(s.a0) * s.r, s.cy + Math.sin(s.a0) * s.r], e1 = [s.cx + Math.cos(s.a1) * s.r, s.cy + Math.sin(s.a1) * s.r];
  return Math.min(Math.hypot(p - e0[0], q - e0[1]), Math.hypot(p - e1[0], q - e1[1])) - STROKE / 2;
}
for (let y = 150; y < 500; y++) for (let x = 60; x < 560; x++) {
  let d = Infinity;
  for (const s of shapes) d = Math.min(d, dist(x + .5, y + .5, s));
  const cover = Math.max(0, Math.min(1, .5 - d));
  if (!cover) continue;
  const i = (y * W + x) * 3;
  for (let c = 0; c < 3; c++) px[i + c] = px[i + c] * (1 - cover) + .96 * cover;
}

// ── PNG ──
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  for (let x = 0; x < W * 3; x++) {
    const v = px[y * W * 3 + x];
    const srgb = v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(Math.min(1, v), 1 / 2.4) - .055;
    raw[y * (W * 3 + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(srgb * 255 + (Math.random() - .5) * .9)));
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
const out = path.join(__dirname, '..', 'public', 'media', 'welcome.png');
fs.writeFileSync(out, png);
console.log('Готово:', out, Math.round(png.length / 1024) + ' КБ');
