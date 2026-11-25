// Караоке: построчная и пословная подсветка с плавной заливкой, паузы-проигрыши,
// мягкая автопрокрутка, которая уступает ручной прокрутке, и переход к строке по нажатию.

import { esc, icon, motionReduced } from '../core.js';

const GAP_MIN = 4500;

function estimate(text) { return Math.max(1400, text.replace(/\s+/g, '').length * 85 + 700); }

/** Разбивает строку на слова с таймингами (настоящими или вычисленными по длине слов). */
function wordsOf(line, end) {
  if (line.words?.length) {
    return line.words.map((w, i) => ({ text: w.text, start: w.time, end: line.words[i + 1]?.time ?? end }));
  }
  const parts = line.text.match(/\S+\s*/g) || [];
  const weights = parts.map(p => p.trim().length + 1.5);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let t = line.time;
  const span = end - line.time;
  return parts.map((text, i) => {
    const start = t;
    t += span * weights[i] / total;
    return { text, start, end: t };
  });
}

export class Karaoke {
  constructor(container, { onSeek, onFollowChange } = {}) {
    this.el = container;
    this.onSeek = onSeek;
    this.onFollowChange = onFollowChange;
    this.items = [];
    this.active = -2;
    this.userUntil = 0;
    this.scrollCurrent = 0;
    this.scrollTarget = 0;
    this.lastFrame = 0;
    this.follow = true;
    this.mode = 'empty';
    const userScroll = () => {
      if (this.mode !== 'synced') return;
      this.userUntil = performance.now() + 3500;
      this.setFollowing(false);
    };
    container.addEventListener('wheel', userScroll, { passive: true });
    container.addEventListener('touchstart', userScroll, { passive: true });
    container.addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) userScroll(); });
    container.addEventListener('click', event => {
      const line = event.target.closest('[data-t]');
      if (line && this.mode === 'synced') this.onSeek?.(Number(line.dataset.t));
    });
  }

  setFollowing(value) {
    if (this.following === value) return;
    this.following = value;
    this.onFollowChange?.(value);
  }

  status(glyph, title, text = '') {
    this.mode = 'empty';
    this.items = [];
    this.el.innerHTML = `<div class="ly-status">${icon(glyph)}<strong>${esc(title)}</strong>${text ? `<p>${esc(text)}</p>` : ''}</div>`;
  }
  loading() {
    this.mode = 'empty';
    this.items = [];
    this.el.innerHTML = `<div class="ly-loading" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<i class="sk" style="width:${[78, 62, 88, 54, 70, 84, 48][i]}%"></i>`).join('')}</div>`;
  }

  set(data) {
    this.active = -2;
    this.userUntil = 0;
    this.setFollowing(true);
    if (!data) return this.loading();
    if (data.error) return this.status('cloud', data.error);
    if (data.type === 'instrumental') return this.status('note', 'Инструментальный трек', 'Здесь нет слов — просто слушайте.');
    if (data.type === 'plain') {
      this.mode = 'plain';
      this.items = [];
      const blocks = data.lines.reduce((acc, line) => { if (!line) acc.push([]); else acc.at(-1).push(line); return acc; }, [[]]).filter(b => b.length);
      this.el.innerHTML = `<div class="ly ly-plain"><p class="ly-note">${icon('info')} Текст без синхронизации</p>${blocks.map(b => `<p class="ly-stanza">${b.map(esc).join('<br>')}</p>`).join('')}${credit(data.source)}</div>`;
      this.el.scrollTop = 0;
      return;
    }
    if (data.type !== 'synced' || !data.lines?.length) return this.status('lyrics', 'Текст не найден', 'Для этого трека пока нет слов в открытых источниках.');
    this.mode = 'synced';
    const lines = data.lines;
    const items = [];
    if (lines[0].time >= 4000) items.push({ gap: true, start: 0, end: lines[0].time });
    lines.forEach((line, i) => {
      const next = lines[i + 1]?.time ?? line.time + estimate(line.text) + 2000;
      if (!line.text) return;
      const end = line.words?.length ? Math.min(next, Math.max(line.words.at(-1).time + 600, line.time + 400)) : Math.min(next, line.time + estimate(line.text));
      items.push({ start: line.time, end, text: line.text, words: wordsOf(line, end) });
      if (lines[i + 1] && lines[i + 1].time - end >= GAP_MIN) items.push({ gap: true, start: end, end: lines[i + 1].time });
    });
    this.items = items;
    this.el.innerHTML = `<div class="ly ly-synced"><div class="ly-pad"></div>${items.map((item, i) => item.gap
      ? `<div class="ly-gap" data-i="${i}" data-t="${item.start}" aria-hidden="true"><i></i><i></i><i></i></div>`
      : `<p class="ly-line" data-i="${i}" data-t="${item.start}" role="button" tabindex="-1">${item.words.map(w => `<span class="w">${esc(w.text)}</span>`).join('')}</p>`).join('')}<div class="ly-pad end"></div>${credit(data.source)}</div>`;
    this.nodes = [...this.el.querySelectorAll('[data-i]')];
    this.wordNodes = this.nodes.map(node => [...node.querySelectorAll('.w')]);
    this.el.scrollTop = 0;
    this.scrollCurrent = 0;
  }

  /** Вызывается на каждом кадре, пока виден текст. time — миллисекунды с учётом сдвига. */
  tick(time, now = performance.now()) {
    if (this.mode !== 'synced' || !this.items.length) return;
    const items = this.items;
    let lo = 0, hi = items.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (items[mid].start <= time) lo = mid + 1; else hi = mid; }
    let index = lo - 1;
    if (index >= 0 && items[index].gap && time >= items[index].end) index = Math.min(items.length - 1, index + 1);
    if (index !== this.active) this.activate(index);
    // заливка слов активной строки и точек проигрыша
    const item = items[index];
    if (item) {
      if (item.gap) {
        const p = Math.min(1, Math.max(0, (time - item.start) / (item.end - item.start)));
        this.nodes[index].style.setProperty('--p', p.toFixed(3));
      } else {
        const words = this.wordNodes[index];
        for (let w = 0; w < words.length; w++) {
          const word = item.words[w];
          const p = time <= word.start ? 0 : time >= word.end ? 1 : (time - word.start) / (word.end - word.start);
          const value = p.toFixed(3);
          if (words[w]._p !== value) { words[w]._p = value; words[w].style.setProperty('--p', value); }
        }
      }
    }
    // автопрокрутка
    if (now > this.userUntil && this.follow) {
      if (this.following === false) this.setFollowing(true);
      const dt = Math.min(.1, (now - (this.lastFrame || now)) / 1000);
      const diff = this.scrollTarget - this.el.scrollTop;
      if (Math.abs(diff) > .5) {
        const step = motionReduced() ? diff : diff * (1 - Math.exp(-dt * 7.5));
        this.el.scrollTop += step;
      }
    }
    this.lastFrame = now;
  }

  activate(index) {
    const prev = this.active;
    this.active = index;
    this.nodes.forEach((node, i) => {
      const d = index < 0 ? Math.min(4, i + 1) : Math.min(4, Math.abs(i - index));
      if (node._d !== d) { node._d = d; node.dataset.d = d; }
      const state = i === index ? 'active' : i < index ? 'past' : 'future';
      if (node._s !== state) {
        node._s = state;
        node.dataset.s = state;
        if (state !== 'active' && !this.items[i].gap) for (const w of this.wordNodes[i]) { const v = state === 'past' ? '1' : '0'; if (w._p !== v) { w._p = v; w.style.setProperty('--p', v); } }
      }
    });
    const target = this.nodes[Math.max(0, index)];
    if (target) {
      const box = this.el.clientHeight;
      this.scrollTarget = Math.max(0, target.offsetTop - box * .36 + target.offsetHeight / 2 - box * .0);
      if (prev === -2) this.el.scrollTop = this.scrollTarget;
    }
  }

  /** Вернуться к текущей строке после ручной прокрутки. */
  resume() { this.userUntil = 0; this.setFollowing(true); }
  relayout() { if (this.active >= -1) { const i = this.active; this.active = -3; this.activate(i); } }
}

function credit(source) {
  if (!source) return '';
  const link = source === 'LRCLIB' ? '<a href="https://lrclib.net/" target="_blank" rel="noopener">LRCLIB</a>' : esc(source);
  return `<p class="ly-credit">Текст: ${link}</p>`;
}
