'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.resolve(__dirname, '..');

try { process.loadEnvFile(path.join(ROOT, '.env')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) http.setGlobalProxyFromEnv?.();

const env = (key, fallback = '') => String(process.env[key] ?? fallback).trim();
const int = (key, fallback, min, max) => {
  const value = Number(env(key, String(fallback)));
  if (!Number.isInteger(value) || value < min || value > max) throw Error(`${key} должен быть целым числом ${min}–${max}`);
  return value;
};

const appUrl = env('APP_URL').replace(/\/+$/, '');
if (appUrl) {
  const url = new URL(appUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw Error('APP_URL должен быть корневым публичным HTTPS-адресом, например https://lofi.example.com');
  }
}

const dataDir = path.resolve(ROOT, env('DATA_DIR', 'data'));
const dbPath = path.resolve(ROOT, env('DB_PATH', path.join(path.relative(ROOT, dataDir) || 'data', 'lofi.sqlite3')));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const config = Object.freeze({
  root: ROOT,
  publicDir: path.join(ROOT, 'public'),
  dataDir,
  dbPath,
  cacheDir: path.resolve(ROOT, env('CACHE_DIR', path.join(path.relative(ROOT, dataDir) || 'data', 'cache'))),
  token: env('BOT_TOKEN'),
  appUrl,
  port: int('PORT', 8080, 1, 65535),
  host: env('HOST', '0.0.0.0'),
  /** Владельцы из окружения. Дополнительных администраторов можно добавить в панели. */
  owners: new Set(env('ADMIN_IDS').split(/[\s,]+/).filter(id => /^\d+$/.test(id))),
  originalsByDefault: env('ORIGINALS_ONLY', '1') !== '0',
  scClientId: env('SC_CLIENT_ID'),
  audioCacheBytes: int('AUDIO_CACHE_MB', 1024, 0, 1024 * 1024) * 1024 * 1024,
  /** Часовой пояс админ-панели в минутах от UTC (по умолчанию Москва). */
  tzOffset: int('TZ_OFFSET', 180, -720, 840),
  version: '2.0.0',
  userAgent: 'Lo-fi/2.0 (' + (appUrl || 'local preview') + ')',
});

module.exports = config;
