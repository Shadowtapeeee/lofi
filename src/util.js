'use strict';

const config = require('./config');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const lc = value => String(value ?? '').toLocaleLowerCase('ru-RU');
const normQ = value => lc(value).replace(/\s+/g, ' ').trim();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Ошибка с HTTP-статусом: сервер отдаёт её сообщение клиенту. */
const httpError = (status, message) => Object.assign(Error(message), { status, expose: true });

/** Экранирование для parse_mode HTML в сообщениях бота. */
const html = value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

class LRU {
  constructor(max, ttl) { this.max = max; this.ttl = ttl; this.map = new Map(); }
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.exp < Date.now()) { this.map.delete(key); return undefined; }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }
  set(key, value, ttl = this.ttl) {
    this.map.delete(key);
    this.map.set(key, { value, exp: Date.now() + Math.max(0, ttl) });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value);
    return value;
  }
  has(key) { return this.get(key) !== undefined; }
  delete(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
  get size() { return this.map.size; }
}

/** Кеширует промис по ключу; неудачные результаты сразу удаляются из кеша. */
function memo(cache, key, fn, ttl) {
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = Promise.resolve().then(fn);
  cache.set(key, promise, ttl);
  promise.catch(() => { if (cache.get(key) === promise) cache.delete(key); });
  return promise;
}

function statusError(response) {
  return Object.assign(Error('HTTP ' + response.status), { status: response.status });
}

/** fetch с таймаутом и повтором при 429/5xx и сетевых сбоях. */
async function fetchRetry(url, options = {}, tries = 2, timeout = 10000) {
  let error;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 'user-agent': config.userAgent, ...options.headers },
        signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout),
      });
      if (response.status !== 429 && response.status < 500) return response;
      error = statusError(response);
      await response.body?.cancel().catch(() => {});
    } catch (cause) {
      error = cause;
      if (options.signal?.aborted) break;
    }
    if (attempt + 1 < tries) await sleep(350 * (attempt + 1));
  }
  throw error;
}

function weightedPick(items, weight) {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (!total) return items[Math.floor(Math.random() * items.length)];
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, weight(item));
    if (roll <= 0) return item;
  }
  return items.at(-1);
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many;
};

const formatBytes = bytes => {
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return (unit ? value.toFixed(value < 10 ? 1 : 0) : value) + ' ' + units[unit];
};

module.exports = { sleep, lc, normQ, clamp, httpError, html, LRU, memo, statusError, fetchRetry, weightedPick, shuffle, plural, formatBytes };
