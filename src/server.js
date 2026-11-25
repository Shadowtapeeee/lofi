'use strict';

// HTTP: статика Mini App из public/ и JSON API.

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const config = require('./config');
const db = require('./db');
const { LRU, httpError } = require('./util');
const { DEFAULTS, cleanPrefs, schemaModule } = require('./prefs');
const catalog = require('./catalog');
const audioCache = require('./audio-cache');
const { getLyrics } = require('./lyrics');
const { waveBatch } = require('./wave');
const { SC, isPlayable, trackView } = require('./soundcloud');
const { bot } = require('./telegram/api');

// ── авторизация Telegram Mini App ──
const appSecret = config.token && crypto.createHmac('sha256', 'WebAppData').update(config.token).digest();
const authCache = new LRU(4000, 5 * 60e3);
const appSeen = new LRU(20000, 10 * 60e3);

function telegramUser(req) {
  const header = req.headers.authorization;
  if (!appSecret || !header?.startsWith('tma ')) return null;
  const raw = header.slice(4);
  const cached = authCache.get(raw);
  if (cached !== undefined) return cached;
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  let result = null;
  if (/^[a-f0-9]{64}$/i.test(hash || '') && new Set(params.keys()).size === [...params.keys()].length) {
    params.delete('hash');
    params.sort();
    const fields = [...params].map(([key, value]) => key + '=' + value).join('\n');
    const check = crypto.createHmac('sha256', appSecret).update(fields).digest();
    const time = Number(params.get('auth_date')), now = Math.floor(Date.now() / 1000);
    if (crypto.timingSafeEqual(check, Buffer.from(hash, 'hex')) && Number.isInteger(time) && time > now - 7 * 86400 && time < now + 60) {
      try {
        const user = JSON.parse(params.get('user'));
        if (Number.isSafeInteger(user?.id) && user.id > 0) result = user;
      } catch { /* нет пользователя */ }
    }
  }
  authCache.set(raw, result);
  return result;
}

// ── ответы ──
function json(res, status, data) {
  const body = Buffer.from(JSON.stringify(data));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': body.length });
  res.end(body);
}

async function bodyJson(req, limit = 65536) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) throw httpError(413, 'Слишком большой запрос');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw httpError(400, 'Неверный JSON'); }
}

const buckets = new LRU(8192, 60e3);
function rateLimit(req, uid, route, limit) {
  const key = route + ':' + (uid || req.socket.remoteAddress);
  const bucket = buckets.get(key) || { count: 0, until: Date.now() + 60e3 };
  if (++bucket.count > limit) throw httpError(429, 'Слишком много запросов. Попробуйте через минуту.');
  buckets.set(key, bucket, bucket.until - Date.now());
}

const trackId = value => /^\d{1,15}$/.test(String(value ?? '')) ? String(value) : null;
const page = (value, max) => Math.min(max, Math.max(0, parseInt(value, 10) || 0));

// ── API ──
async function api(req, res, url) {
  const route = url.pathname.slice(4);
  const q = url.searchParams;
  const user = telegramUser(req);
  const uid = user ? String(user.id) : null;
  if (uid) {
    if (db.isBanned(uid)) throw httpError(403, 'Доступ ограничен');
    if (!appSeen.has(uid)) { appSeen.set(uid, 1); db.touchUser(user, { via: 'app' }); }
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    if (route === '/config') {
      return json(res, 200, { moods: catalog.MOODS.map(({ query, ...m }) => m), genres: catalog.GENRES, defaults: DEFAULTS,
        bot: bot.username || '', cache: audioCache.enabled(), version: config.version });
    }
    if (route === '/state') {
      if (!uid) throw httpError(401, 'Откройте Lo-fi через Telegram для синхронизации');
      const prefs = db.sql('SELECT value FROM preferences WHERE uid = ?').get(uid);
      let preferences = null;
      try { preferences = prefs ? cleanPrefs(JSON.parse(prefs.value)) : null; } catch {}
      return json(res, 200, { preferences, favorites: db.library(uid, 'favorite'), recent: db.library(uid, 'recent'), dislikes: db.library(uid, 'dislike') });
    }
    const streamMatch = route.match(/^\/stream\/(\d{1,15})$/);
    if (streamMatch) {
      const row = audioCache.lookup(streamMatch[1]);
      if (row && audioCache.serve(req, res, row)) return;
      throw httpError(404, 'Трека нет в кеше');
    }

    rateLimit(req, uid, route, uid ? 240 : 150);
    const id = trackId(q.get('id'));
    const originals = q.has('originals') ? q.get('originals') === '1' : config.originalsByDefault;
    switch (route) {
      case '/home': return json(res, 200, await catalog.home());
      case '/releases': return json(res, 200, await catalog.releases());
      case '/mood': return json(res, 200, await catalog.moodView(q.get('id'), page(q.get('page'), 16)));
      case '/search': {
        const query = (q.get('q') || '').trim();
        if (query.length < 2 || query.length > 220) throw httpError(400, 'Введите от 2 до 220 символов');
        const kind = ['a', 'u'].includes(q.get('kind')) ? q.get('kind') : 't';
        return json(res, 200, await catalog.listTracks(query, kind, page(q.get('page'), 16), originals));
      }
      case '/artist': {
        const name = (q.get('name') || '').trim().slice(0, 140);
        if (!id && !name) throw httpError(400, 'Укажите артиста');
        return json(res, 200, await catalog.artistView(name, id));
      }
      case '/album':
        if (!id) break;
        return json(res, 200, await catalog.albumTracks(id, page(q.get('page'), 999)));
      case '/track': {
        if (!id) break;
        const track = await SC.track(id);
        return json(res, 200, { track: trackView(track) });
      }
      case '/playback': {
        if (!id) break;
        const row = audioCache.lookup(id);
        if (row) {
          const track = await SC.track(id).then(trackView).catch(() => null);
          return json(res, 200, { track, source: '/api/stream/' + id, protocol: 'file', cached: true, mime: row.mime });
        }
        audioCache.missed();
        const data = await catalog.playback(id, q.get('quality') === 'normal' ? 'normal' : 'high');
        if (data.protocol !== 'widget') void audioCache.ensure(id, { priority: true });
        return json(res, 200, { ...data, cached: false });
      }
      case '/lyrics':
        if (!id) break;
        return json(res, 200, await getLyrics(id));
    }
  }

  if (req.method === 'POST') {
    rateLimit(req, uid, route, uid ? 240 : 120);
    if (route === '/prefetch') {
      const body = await bodyJson(req);
      const ids = (Array.isArray(body.ids) ? body.ids : []).map(trackId).filter(Boolean).slice(0, 3);
      for (const item of ids) void audioCache.ensure(item);
      return json(res, 202, { queued: ids.length, enabled: audioCache.enabled() });
    }
    if (route === '/wave') {
      const body = await bodyJson(req, 131072);
      return json(res, 200, await waveBatch(uid, body));
    }
    if (route === '/event') {
      const body = await bodyJson(req);
      const id = trackId(body.id);
      if (!id || !['play', 'skip', 'finish', 'like', 'dislike'].includes(body.kind)) throw httpError(400, 'Некорректное событие');
      const track = { id, title: String(body.title || ''), artist: String(body.artist || '') };
      db.logEvent(uid, track, body.kind, ['wave', 'search', 'album', 'artist', 'mood', 'library', 'home', 'queue'].includes(body.source) ? body.source : '');
      return json(res, 200, { ok: true });
    }
    if (['/preferences', '/favorite', '/dislike', '/recent', '/clear'].includes(route)) {
      if (!uid) throw httpError(401, 'Откройте Lo-fi через Telegram для синхронизации');
      const body = await bodyJson(req);
      if (route === '/preferences') {
        const prefs = cleanPrefs(body);
        db.sql('INSERT INTO preferences VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET value = excluded.value').run(uid, JSON.stringify(prefs));
        return json(res, 200, { preferences: prefs });
      }
      if (route === '/clear') {
        if (!['recent', 'dislike'].includes(body.kind)) throw httpError(400, 'Нельзя очистить');
        db.libraryClear(uid, body.kind);
        return json(res, 200, { ok: true });
      }
      const id = trackId(body.id);
      if (!id) throw httpError(400, 'Некорректный трек');
      const kind = route.slice(1);
      if (kind !== 'recent' && body.active === false) db.libraryRemove(uid, kind, id);
      else {
        const track = await SC.track(id);
        if (!isPlayable(track) && kind !== 'dislike') throw httpError(404, 'Трек недоступен');
        db.libraryPut(uid, kind, trackView(track));
      }
      return json(res, 200, { ok: true });
    }
  }
  throw httpError(404, 'Маршрут не найден');
}

// ── статика ──
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.svg', '.txt', '.json', '.webmanifest']);
const files = new Map();

function loadFile(urlPath, file) {
  const ext = path.extname(file);
  const body = fs.readFileSync(file);
  const entry = { type: TYPES[ext] || 'application/octet-stream', body, etag: '"' + crypto.createHash('sha1').update(body).digest('base64url').slice(0, 20) + '"' };
  if (COMPRESSIBLE.has(ext) && body.length > 1024) {
    entry.br = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 10 } });
    entry.gzip = zlib.gzipSync(body, { level: 9 });
  }
  files.set(urlPath, entry);
}

function loadPublic(dir = config.publicDir, prefix = '') {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) loadPublic(full, prefix + '/' + item.name);
    else if (TYPES[path.extname(item.name)]) loadFile(prefix + '/' + item.name, full);
  }
  const schema = Buffer.from(schemaModule());
  files.set('/js/schema.js', { type: TYPES['.js'], body: schema, etag: '"' + crypto.createHash('sha1').update(schema).digest('base64url').slice(0, 20) + '"' });
}

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://telegram.org https://w.soundcloud.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.sndcdn.com https://t.me https://*.telegram.org https://*.t.me",
  "font-src 'self'",
  "media-src 'self' blob: https://*.sndcdn.com https://*.soundcloud.cloud",
  "connect-src 'self' https://*.sndcdn.com https://*.soundcloud.cloud",
  "frame-src https://w.soundcloud.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self' https://*.telegram.org https://telegram.org https://*.t.me https://t.me https://web.telegram.org",
].join('; ');

function serveStatic(req, res, url) {
  let key = url.pathname === '/' ? '/index.html' : url.pathname;
  // Клиентские маршруты (/search, /library…) отдают оболочку приложения.
  if (!files.has(key) && !path.extname(key)) key = '/index.html';
  const file = files.get(key);
  if (!file || !['GET', 'HEAD'].includes(req.method)) return json(res, 404, { error: 'Страница не найдена' });
  const headers = {
    'content-type': file.type, etag: file.etag, vary: 'accept-encoding',
    'cache-control': key === '/index.html' || key.endsWith('.js') || key.endsWith('.css') ? 'no-cache' : 'public, max-age=604800',
  };
  if (key === '/index.html') headers['content-security-policy'] = CSP;
  if (req.headers['if-none-match'] === file.etag) { res.writeHead(304, headers); return res.end(); }
  const accept = String(req.headers['accept-encoding'] || '');
  let body = file.body;
  if (file.br && /\bbr\b/.test(accept)) { body = file.br; headers['content-encoding'] = 'br'; }
  else if (file.gzip && /\bgzip\b/.test(accept)) { body = file.gzip; headers['content-encoding'] = 'gzip'; }
  headers['content-length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

async function handle(req, res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'no-referrer');
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/healthz') return json(res, 200, { ok: true, version: config.version });
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    if (res.headersSent) return res.destroy();
    if (error.expose || [400, 401, 403, 404, 413, 429].includes(error.status)) {
      const message = error.expose ? error.message : error.status === 429 ? 'Каталог ограничил частоту запросов, попробуйте позже' :
        error.status === 404 ? 'Каталог не нашёл трек или подборку' : 'Запрос отклонён';
      return json(res, error.status, { error: message });
    }
    console.warn('API', url?.pathname || req.url, error.message);
    return json(res, 502, { error: url?.pathname.startsWith('/api/lyrics') ? 'Источник текстов временно недоступен' : 'Каталог временно недоступен' });
  }
}

function createServer() {
  loadPublic();
  return http.createServer(handle);
}

/** Перечитывает public/ (используется в режиме разработки). */
function reloadPublic() { files.clear(); loadPublic(); }

module.exports = { createServer, reloadPublic };
