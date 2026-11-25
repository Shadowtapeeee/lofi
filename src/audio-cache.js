'use strict';

// Дисковый кеш треков. Первый раз трек играет напрямую из CDN, параллельно сервер скачивает
// его целиком (MP3 или HLS-сегменты подряд) и дальше отдаёт файл со своего домена:
// мгновенный старт, перемотка через Range, без истекающих ссылок и CORS.

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');
const { sql, now } = require('./db');
const { fetchRetry, formatBytes } = require('./util');
const { SC, isMediaHost, isPlayable, fullTranscodings } = require('./soundcloud');

const dir = path.join(config.cacheDir, 'audio');
const MAX_TRACK_BYTES = 120 * 1024 * 1024;
const MAX_DURATION_MS = 45 * 60e3;
const CONCURRENCY = 2;
const SEGMENT_PARALLEL = 6;

const enabled = () => config.audioCacheBytes > 0;
const jobs = new Map();
const waiting = [];
let active = 0;
const failures = new Map();
const lastTouch = new Map();
const stats = { hits: 0, misses: 0, downloads: 0, errors: 0 };

if (enabled()) {
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(dir)) if (name.endsWith('.part')) fs.rmSync(path.join(dir, name), { force: true });
  for (const row of sql('SELECT track_id, file FROM audio_cache').all()) {
    if (!fs.existsSync(path.join(dir, row.file))) sql('DELETE FROM audio_cache WHERE track_id = ?').run(row.track_id);
  }
}

function lookup(id) {
  if (!enabled()) return null;
  const row = sql('SELECT * FROM audio_cache WHERE track_id = ?').get(String(id));
  if (!row) return null;
  if (!fs.existsSync(path.join(dir, row.file))) {
    sql('DELETE FROM audio_cache WHERE track_id = ?').run(row.track_id);
    return null;
  }
  return row;
}

/** Ставит трек в очередь на скачивание. Возвращает промис строки кеша либо null. */
function ensure(id, { priority = false } = {}) {
  id = String(id);
  if (!enabled() || !/^\d{1,15}$/.test(id)) return Promise.resolve(null);
  const row = lookup(id);
  if (row) return Promise.resolve(row);
  if (jobs.has(id)) return jobs.get(id).promise;
  if ((failures.get(id) || 0) > Date.now()) return Promise.resolve(null);
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  promise.catch(() => {});
  const job = { id, promise, resolve, reject };
  jobs.set(id, job);
  if (priority) waiting.unshift(job); else waiting.push(job);
  while (waiting.length > 40) {
    const dropped = waiting.pop();
    jobs.delete(dropped.id);
    dropped.resolve(null);
  }
  pump();
  return promise;
}

function pump() {
  while (active < CONCURRENCY && waiting.length) {
    const job = waiting.shift();
    active++;
    download(job.id)
      .then(row => { stats.downloads++; job.resolve(row); })
      .catch(error => {
        stats.errors++;
        failures.set(job.id, Date.now() + 30 * 60e3);
        if (failures.size > 2000) failures.delete(failures.keys().next().value);
        if (!/недоступ|unsupported|длинн/i.test(error.message)) console.warn('Кеш трека', job.id + ':', error.message);
        job.resolve(null);
      })
      .finally(() => { active--; jobs.delete(job.id); pump(); });
  }
}

/** Формат для кеша: сначала MP3 (любой браузер играет его файлом), затем AAC во фрагментированном MP4. */
function cacheCandidates(track) {
  const list = fullTranscodings(track).filter(t => ['progressive', 'hls'].includes(t.format.protocol));
  const score = t => {
    const mime = t.format.mime_type || '';
    if (/mpeg/.test(mime)) return t.format.protocol === 'progressive' ? 30 : 20;
    if (/mp4|aac/.test(mime) && t.format.protocol === 'hls') return 10;
    return 0;
  };
  return list.filter(t => score(t) > 0).sort((a, b) => score(b) - score(a));
}

async function fetchMedia(url, timeout = 20000) {
  if (!isMediaHost(url)) throw Error('Недопустимый адрес медиа');
  const response = await fetchRetry(url, {}, 3, timeout);
  if (!response.ok) { await response.body?.cancel().catch(() => {}); throw Error('HTTP ' + response.status); }
  if (!isMediaHost(response.url)) { await response.body?.cancel().catch(() => {}); throw Error('Недопустимое перенаправление'); }
  return response;
}

async function writeProgressive(url, file) {
  const response = await fetchMedia(url, 60000);
  const handle = await fsp.open(file, 'w');
  let bytes = 0;
  try {
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > MAX_TRACK_BYTES) throw Error('Слишком длинный трек');
      await handle.write(chunk);
    }
  } finally { await handle.close(); }
  return bytes;
}

async function writeHls(url, file) {
  let playlistUrl = url;
  let text = await (await fetchMedia(playlistUrl)).text();
  if (/#EXT-X-STREAM-INF/.test(text)) {
    const variant = text.split(/\r?\n/).find(line => line && !line.startsWith('#'));
    if (!variant) throw Error('Пустой мастер-плейлист');
    playlistUrl = new URL(variant.trim(), playlistUrl).href;
    text = await (await fetchMedia(playlistUrl)).text();
  }
  if (/#EXT-X-KEY:(?![^\n]*METHOD=NONE)/.test(text)) throw Error('Поток зашифрован (unsupported)');
  const mapUri = text.match(/#EXT-X-MAP:[^\n]*URI="([^"]+)"/)?.[1];
  const parts = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'))
    .map(line => new URL(line, playlistUrl).href);
  if (!parts.length || parts.length > 2000) throw Error('Неожиданный плейлист');
  const urls = mapUri ? [new URL(mapUri, playlistUrl).href, ...parts] : parts;
  for (const item of urls) if (!isMediaHost(item)) throw Error('Недопустимый адрес сегмента');

  const handle = await fsp.open(file, 'w');
  let bytes = 0;
  try {
    const inflight = [];
    const load = item => fetchMedia(item).then(r => r.arrayBuffer());
    let next = 0;
    while (next < urls.length && inflight.length < SEGMENT_PARALLEL) inflight.push(load(urls[next++]));
    while (inflight.length) {
      const buffer = Buffer.from(await inflight.shift());
      if (next < urls.length) inflight.push(load(urls[next++]));
      bytes += buffer.length;
      if (bytes > MAX_TRACK_BYTES) throw Error('Слишком длинный трек');
      await handle.write(buffer);
    }
  } finally { await handle.close(); }
  return bytes;
}

async function download(id) {
  const track = await SC.track(id);
  if (!isPlayable(track)) throw Error('Трек недоступен');
  if ((track.full_duration || track.duration || 0) > MAX_DURATION_MS) throw Error('Слишком длинный трек');
  const candidates = cacheCandidates(track);
  if (!candidates.length) throw Error('Нет подходящего формата (unsupported)');
  let lastError;
  for (const transcoding of candidates) {
    const mp3 = /mpeg/.test(transcoding.format.mime_type || '');
    const tmp = path.join(dir, `${id}.${crypto.randomBytes(4).toString('hex')}.part`);
    try {
      const url = await SC.streamUrl(transcoding, track);
      if (transcoding.format.protocol === 'hls' && !mp3) {
        // AAC подходит для файла только во фрагментированном MP4 (с EXT-X-MAP).
        const probe = await (await fetchMedia(url)).text();
        if (!/#EXT-X-MAP|#EXT-X-STREAM-INF/.test(probe)) throw Error('AAC в MPEG-TS (unsupported)');
      }
      const bytes = transcoding.format.protocol === 'progressive' ? await writeProgressive(url, tmp) : await writeHls(url, tmp);
      if (bytes < 16 * 1024) throw Error('Слишком короткий файл');
      const name = `${id}.${mp3 ? 'mp3' : 'm4a'}`;
      await fsp.rename(tmp, path.join(dir, name));
      const ts = now();
      sql(`INSERT INTO audio_cache VALUES (?, ?, ?, ?, ?, ?, 0)
           ON CONFLICT(track_id) DO UPDATE SET file = excluded.file, mime = excluded.mime, bytes = excluded.bytes, used_at = excluded.used_at`)
        .run(String(id), name, mp3 ? 'audio/mpeg' : 'audio/mp4', bytes, ts, ts);
      evict();
      return lookup(id);
    } catch (error) {
      lastError = error;
      await fsp.rm(tmp, { force: true }).catch(() => {});
    }
  }
  throw lastError || Error('Не удалось скачать трек');
}

function totals() {
  const row = sql('SELECT COUNT(*) AS files, COALESCE(SUM(bytes), 0) AS bytes, COALESCE(SUM(hits), 0) AS hits FROM audio_cache').get();
  return { files: row.files, bytes: row.bytes, hits: row.hits };
}

function evict() {
  let { bytes } = totals();
  if (bytes <= config.audioCacheBytes) return;
  for (const row of sql('SELECT track_id, file, bytes FROM audio_cache ORDER BY used_at ASC LIMIT 500').all()) {
    if (bytes <= config.audioCacheBytes * 0.9) break;
    fs.rmSync(path.join(dir, row.file), { force: true });
    sql('DELETE FROM audio_cache WHERE track_id = ?').run(row.track_id);
    bytes -= row.bytes;
  }
}

function clear() {
  for (const row of sql('SELECT file FROM audio_cache').all()) fs.rmSync(path.join(dir, row.file), { force: true });
  sql('DELETE FROM audio_cache').run();
  failures.clear();
}

function touch(row) {
  const last = lastTouch.get(row.track_id) || 0;
  if (Date.now() - last < 60e3) return;
  lastTouch.set(row.track_id, Date.now());
  if (lastTouch.size > 5000) lastTouch.delete(lastTouch.keys().next().value);
  sql('UPDATE audio_cache SET used_at = ?, hits = hits + 1 WHERE track_id = ?').run(now(), row.track_id);
}

/** Отдаёт файл из кеша с поддержкой Range. */
function serve(req, res, row) {
  const file = path.join(dir, row.file);
  let size;
  try { size = fs.statSync(file).size; } catch { return false; }
  stats.hits++;
  touch(row);
  const headers = {
    'content-type': row.mime, 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=604800, immutable',
    etag: `"${row.track_id}-${size}"`,
  };
  if (req.headers['if-none-match'] === headers.etag) { res.writeHead(304, headers); res.end(); return true; }
  let start = 0, end = size - 1, status = 200;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    if (range[1]) { start = Number(range[1]); if (range[2]) end = Math.min(size - 1, Number(range[2])); }
    else { start = Math.max(0, size - Number(range[2])); }
    if (start > end || start >= size) {
      res.writeHead(416, { 'content-range': `bytes */${size}` });
      res.end();
      return true;
    }
    status = 206;
    headers['content-range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['content-length'] = end - start + 1;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') { res.end(); return true; }
  const stream = fs.createReadStream(file, { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
  return true;
}

function summary() {
  const t = totals();
  return { ...t, limit: config.audioCacheBytes, queue: waiting.length, active, ...stats,
    text: `${t.files} файлов · ${formatBytes(t.bytes)} из ${formatBytes(config.audioCacheBytes)}` };
}

module.exports = { enabled, lookup, ensure, serve, clear, summary, missed: () => { stats.misses++; } };
