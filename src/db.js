'use strict';

const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS preferences (uid TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS library (
  uid TEXT NOT NULL, kind TEXT NOT NULL, track_id TEXT NOT NULL, track TEXT NOT NULL, ts INTEGER NOT NULL,
  PRIMARY KEY (uid, kind, track_id));
CREATE INDEX IF NOT EXISTS library_order ON library(uid, kind, ts DESC);
CREATE TABLE IF NOT EXISTS lyrics (track_id TEXT PRIMARY KEY, lrc TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS lyrics_cache (track_id TEXT PRIMARY KEY, data TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '', lang TEXT NOT NULL DEFAULT '', premium INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, bot_seen_at INTEGER, app_seen_at INTEGER, started INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0, banned INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS users_bot_seen ON users(bot_seen_at);
CREATE INDEX IF NOT EXISTS users_app_seen ON users(app_seen_at);
CREATE INDEX IF NOT EXISTS users_username ON users(username COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY, uid TEXT, track_id TEXT NOT NULL, kind TEXT NOT NULL, source TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '', artist TEXT NOT NULL DEFAULT '', ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS events_kind_ts ON events(kind, ts);
CREATE TABLE IF NOT EXISTS audio_cache (
  track_id TEXT PRIMARY KEY, file TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL, used_at INTEGER NOT NULL, hits INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS audio_cache_used ON audio_cache(used_at);
CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, added_by TEXT NOT NULL, added_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY, admin_id TEXT NOT NULL, source_chat TEXT NOT NULL, source_message INTEGER NOT NULL,
  options TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'draft', scheduled_at INTEGER,
  created_at INTEGER NOT NULL, started_at INTEGER, finished_at INTEGER, total INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, blocked INTEGER NOT NULL DEFAULT 0,
  cursor TEXT NOT NULL DEFAULT '', status_chat TEXT, status_message INTEGER);
CREATE TABLE IF NOT EXISTS broadcast_messages (
  broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE, chat_id TEXT NOT NULL,
  message_id INTEGER NOT NULL, PRIMARY KEY (broadcast_id, chat_id));
`);

const statements = new Map();
/** Подготовленный запрос с кешированием. */
const sql = text => {
  let statement = statements.get(text);
  if (!statement) statements.set(text, statement = db.prepare(text));
  return statement;
};

function tx(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const getSetting = (key, fallback = '') => sql('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? fallback;
const setSetting = (key, value) => sql('INSERT INTO settings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
const deleteSetting = key => sql('DELETE FROM settings WHERE key = ?').run(key);
function getJson(key, fallback) {
  try { const raw = getSetting(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
const setJson = (key, value) => setSetting(key, JSON.stringify(value));

const now = () => Date.now();

// ── пользователи ──
function touchUser(user, { via = 'bot', started = false, source = '' } = {}) {
  if (!user?.id || user.is_bot) return;
  const id = String(user.id), ts = now();
  sql(`INSERT INTO users (id, first_name, last_name, username, lang, premium, created_at, bot_seen_at, app_seen_at, started, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name,
         username = excluded.username, lang = CASE WHEN excluded.lang != '' THEN excluded.lang ELSE users.lang END,
         premium = excluded.premium,
         bot_seen_at = COALESCE(excluded.bot_seen_at, users.bot_seen_at),
         app_seen_at = COALESCE(excluded.app_seen_at, users.app_seen_at),
         started = MAX(users.started, excluded.started),
         blocked = CASE WHEN excluded.bot_seen_at IS NOT NULL THEN 0 ELSE users.blocked END`)
    .run(id, String(user.first_name || '').slice(0, 128), String(user.last_name || '').slice(0, 128),
      String(user.username || '').slice(0, 64), String(user.language_code || '').slice(0, 12), user.is_premium ? 1 : 0,
      ts, via === 'bot' ? ts : null, via === 'app' ? ts : null, started ? 1 : 0, String(source).slice(0, 64));
}
const getUser = id => sql('SELECT * FROM users WHERE id = ?').get(String(id));
const setBlocked = (id, blocked) => sql('UPDATE users SET blocked = ? WHERE id = ?').run(blocked ? 1 : 0, String(id));
const setBanned = (id, banned) => sql('UPDATE users SET banned = ? WHERE id = ?').run(banned ? 1 : 0, String(id));
const isBanned = id => !!sql('SELECT banned FROM users WHERE id = ?').get(String(id))?.banned;

// ── администраторы ──
const isOwner = id => config.owners.has(String(id));
const isAdmin = id => isOwner(id) || !!sql('SELECT 1 AS x FROM admins WHERE id = ?').get(String(id));
const listAdmins = () => sql('SELECT * FROM admins ORDER BY added_at').all();
const addAdmin = (id, by) => sql('INSERT OR IGNORE INTO admins VALUES (?, ?, ?)').run(String(id), String(by), now());
const removeAdmin = id => sql('DELETE FROM admins WHERE id = ?').run(String(id));

// ── медиатека ──
const LIBRARY_LIMITS = { favorite: 1000, dislike: 1000, recent: 100 };
function library(uid, kind, count = LIBRARY_LIMITS[kind]) {
  return sql('SELECT track FROM library WHERE uid = ? AND kind = ? ORDER BY ts DESC LIMIT ?').all(uid, kind, count)
    .map(row => { try { return JSON.parse(row.track); } catch { return null; } }).filter(Boolean);
}
function libraryPut(uid, kind, track) {
  tx(() => {
    sql('INSERT INTO library VALUES (?, ?, ?, ?, ?) ON CONFLICT(uid, kind, track_id) DO UPDATE SET track = excluded.track, ts = excluded.ts')
      .run(uid, kind, String(track.id), JSON.stringify(track), now());
    sql('DELETE FROM library WHERE uid = ? AND kind = ? AND track_id IN (SELECT track_id FROM library WHERE uid = ? AND kind = ? ORDER BY ts DESC LIMIT -1 OFFSET ?)')
      .run(uid, kind, uid, kind, LIBRARY_LIMITS[kind]);
  });
}
const libraryRemove = (uid, kind, id) => sql('DELETE FROM library WHERE uid = ? AND kind = ? AND track_id = ?').run(uid, kind, String(id));
const libraryClear = (uid, kind) => sql('DELETE FROM library WHERE uid = ? AND kind = ?').run(uid, kind);

// ── события прослушивания (для статистики и «Моей волны») ──
function logEvent(uid, track, kind, source = '') {
  sql('INSERT INTO events (uid, track_id, kind, source, title, artist, ts) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(uid || null, String(track.id), kind, String(source).slice(0, 24), String(track.title || '').slice(0, 200), String(track.artist || '').slice(0, 200), now());
}

// Миграция настроек стартового сообщения из версии 1.
(function migrateStartCard() {
  if (getSetting('start_config')) return;
  const caption = getSetting('start_caption'), photo = getSetting('start_photo'), button = getSetting('start_button'), emoji = getSetting('start_emoji');
  if (!caption && !photo && !button && !emoji) return;
  const card = {};
  if (caption) card.text = caption;
  if (photo) card.media = { type: 'photo', file_id: photo };
  card.buttons = [[{ text: button || 'Открыть Lo-fi', kind: 'app', page: 'home', ...(/^\d+$/.test(emoji) ? { emoji } : {}) }]];
  setJson('start_config', card);
})();

function housekeeping() {
  const cutoff = now() - 120 * 864e5;
  sql('DELETE FROM events WHERE ts < ?').run(cutoff);
  sql('DELETE FROM lyrics_cache WHERE ts < ?').run(now() - 30 * 864e5);
  sql("DELETE FROM broadcast_messages WHERE broadcast_id IN (SELECT id FROM broadcasts WHERE finished_at < ?)").run(now() - 7 * 864e5);
}

module.exports = {
  db, sql, tx, now, getSetting, setSetting, deleteSetting, getJson, setJson,
  touchUser, getUser, setBlocked, setBanned, isBanned,
  isOwner, isAdmin, listAdmins, addAdmin, removeAdmin,
  library, libraryPut, libraryRemove, libraryClear, LIBRARY_LIMITS, logEvent, housekeeping,
};
