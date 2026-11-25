'use strict';

// Рассылки: копия сообщения администратора (copyMessage сохраняет форматирование и премиум-эмодзи),
// аудитории, отложенный запуск, прогресс, остановка, возобновление после перезапуска и удаление у получателей.

const config = require('../config');
const { sql, now, setBlocked, listAdmins } = require('../db');
const { sleep, html, plural } = require('../util');
const { tg, tgPatient, inline, cb } = require('./api');
const { toButton } = require('./start');

const AUDIENCES = {
  all: 'Все',
  active7: 'Активные за 7 дней',
  active30: 'Активные за 30 дней',
  app: 'Открывали приложение',
  test: 'Только администраторы',
};
const AUDIENCE_ORDER = Object.keys(AUDIENCES);
const BATCH = 20;

const controls = new Map();

function audienceWhere(audience) {
  const base = 'bot_seen_at IS NOT NULL AND blocked = 0 AND banned = 0';
  const day = 864e5;
  if (audience === 'active7') return { where: `${base} AND MAX(COALESCE(app_seen_at, 0), COALESCE(bot_seen_at, 0)) >= ?`, args: [now() - 7 * day] };
  if (audience === 'active30') return { where: `${base} AND MAX(COALESCE(app_seen_at, 0), COALESCE(bot_seen_at, 0)) >= ?`, args: [now() - 30 * day] };
  if (audience === 'app') return { where: `${base} AND app_seen_at IS NOT NULL`, args: [] };
  if (audience === 'test') {
    const ids = [...new Set([...config.owners, ...listAdmins().map(a => a.id)])];
    return { where: `id IN (${ids.map(() => '?').join(',') || "''"})`, args: ids };
  }
  return { where: base, args: [] };
}

function countAudience(audience) {
  const { where, args } = audienceWhere(audience);
  return sql(`SELECT COUNT(*) AS n FROM users WHERE ${where}`).get(...args).n;
}

const get = id => {
  const row = sql('SELECT * FROM broadcasts WHERE id = ?').get(Number(id));
  if (row) row.options = JSON.parse(row.options || '{}');
  return row;
};
const recent = (limit = 10) => sql('SELECT * FROM broadcasts ORDER BY id DESC LIMIT ?').all(limit).map(r => ({ ...r, options: JSON.parse(r.options || '{}') }));
const active = () => sql("SELECT * FROM broadcasts WHERE status IN ('running', 'scheduled') ORDER BY id").all();

function create(draft, adminId, statusChat, statusMessage) {
  const scheduled = draft.options.at && draft.options.at > now() + 30e3 ? draft.options.at : null;
  const info = sql(`INSERT INTO broadcasts (admin_id, source_chat, source_message, options, status, scheduled_at, created_at, total, status_chat, status_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(String(adminId), String(draft.chat), draft.message, JSON.stringify(draft.options), scheduled ? 'scheduled' : 'running',
      scheduled, now(), countAudience(draft.options.audience), statusChat ? String(statusChat) : null, statusMessage || null);
  const id = Number(info.lastInsertRowid);
  if (!scheduled) void run(id);
  return id;
}

const bar = (done, total) => {
  const width = 14, filled = total ? Math.round(done / total * width) : width;
  return '▰'.repeat(filled) + '▱'.repeat(width - filled);
};

const fmtTime = ts => {
  const d = new Date(ts + config.tzOffset * 60e3);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

function statusText(b) {
  const done = b.sent + b.failed + b.blocked;
  const state = { running: '⏳ Идёт рассылка', scheduled: '🕒 Запланирована на ' + fmtTime(b.scheduled_at || now()), done: '✅ Рассылка завершена',
    cancelled: '⏹ Рассылка остановлена', draft: 'Черновик' }[b.status] || b.status;
  const lines = [
    `<b>${state}</b> · #${b.id}`,
    '',
    `${bar(done, b.total)} ${b.total ? Math.round(done / b.total * 100) : 100}%`,
    `Доставлено: <b>${b.sent}</b> из ${b.total}`,
    `Заблокировали бота: ${b.blocked}`,
    `Ошибки: ${b.failed}`,
    `Аудитория: ${html(AUDIENCES[b.options.audience] || AUDIENCES.all)}`,
  ];
  if (b.started_at && b.finished_at) {
    const sec = Math.max(1, Math.round((b.finished_at - b.started_at) / 1000));
    lines.push(`Время: ${sec < 90 ? sec + ' с' : Math.round(sec / 60) + ' мин'}`);
  }
  return lines.join('\n');
}

async function updateStatus(b, final = false) {
  if (!b.status_chat || !b.status_message) return;
  const rows = [];
  if (!final && ['running', 'scheduled'].includes(b.status)) rows.push([cb('⏹ Остановить', `a:bh:${b.id}:stop`)]);
  rows.push([cb('Подробнее', `a:bh:${b.id}`), cb('← Рассылки', 'a:bc')]);
  await tg('editMessageText', { chat_id: b.status_chat, message_id: b.status_message, text: statusText(b), parse_mode: 'HTML', reply_markup: inline(rows) })
    .catch(() => {});
}

async function deliverOne(b, chatId) {
  const options = b.options;
  const reply_markup = options.buttons?.length ? { inline_keyboard: options.buttons.map(row => row.map(button => toButton(button))) } : undefined;
  const payload = {
    chat_id: chatId, from_chat_id: b.source_chat, message_id: b.source_message,
    disable_notification: !!options.silent, protect_content: !!options.protect, reply_markup,
  };
  let message;
  try { message = await tgPatient('copyMessage', payload); }
  catch (error) {
    // Telegram отклонил оформление кнопок (премиум-эмодзи/цвет) — повторяем с обычными.
    if (error.status === 400 && reply_markup && /button|emoji|style/i.test(error.description)) {
      message = await tgPatient('copyMessage', { ...payload, reply_markup: { inline_keyboard: options.buttons.map(row => row.map(button => toButton(button, { plain: true }))) } });
    } else throw error;
  }
  if (options.pin) await tg('pinChatMessage', { chat_id: chatId, message_id: message.message_id, disable_notification: true }).catch(() => {});
  return message.message_id;
}

async function run(id) {
  if (controls.has(id)) return;
  const control = { stop: false };
  controls.set(id, control);
  try {
    let b = get(id);
    if (!b || !['running', 'scheduled'].includes(b.status)) return;
    if (b.status === 'scheduled') {
      sql("UPDATE broadcasts SET status = 'running', total = ? WHERE id = ?").run(countAudience(b.options.audience), id);
      b = get(id);
    }
    if (!b.started_at) sql('UPDATE broadcasts SET started_at = ? WHERE id = ?').run(now(), id);
    const { where, args } = audienceWhere(b.options.audience);
    let lastStatus = 0;
    while (!control.stop) {
      const batch = sql(`SELECT id FROM users WHERE ${where} AND id > ? ORDER BY id LIMIT ?`).all(...args, b.cursor, BATCH);
      if (!batch.length) break;
      const started = Date.now();
      const results = await Promise.all(batch.map(async ({ id: chatId }) => {
        try { return { chatId, messageId: await deliverOne(b, chatId) }; }
        catch (error) { return { chatId, error }; }
      }));
      let sent = 0, failed = 0, blocked = 0;
      for (const r of results) {
        if (r.messageId) {
          sent++;
          sql('INSERT OR REPLACE INTO broadcast_messages VALUES (?, ?, ?)').run(id, r.chatId, r.messageId);
        } else if (r.error.status === 403) { blocked++; setBlocked(r.chatId, true); }
        else failed++;
      }
      const cursor = batch.at(-1).id;
      sql('UPDATE broadcasts SET sent = sent + ?, failed = failed + ?, blocked = blocked + ?, cursor = ? WHERE id = ?').run(sent, failed, blocked, cursor, id);
      b = get(id);
      if (Date.now() - lastStatus > 3000) { lastStatus = Date.now(); await updateStatus(b); }
      const spent = Date.now() - started;
      if (spent < 1050) await sleep(1050 - spent);
    }
    sql('UPDATE broadcasts SET status = ?, finished_at = ? WHERE id = ?').run(control.stop ? 'cancelled' : 'done', now(), id);
    await updateStatus(get(id), true);
  } catch (error) {
    console.warn('Рассылка', id + ':', error.message);
    sql("UPDATE broadcasts SET status = 'cancelled', finished_at = ? WHERE id = ?").run(now(), id);
  } finally {
    controls.delete(id);
  }
}

function stop(id) {
  const b = get(id);
  if (!b) return false;
  if (b.status === 'scheduled') {
    sql("UPDATE broadcasts SET status = 'cancelled', finished_at = ? WHERE id = ?").run(now(), id);
    return true;
  }
  const control = controls.get(Number(id));
  if (control) control.stop = true;
  return !!control;
}

async function deleteEverywhere(id, onProgress) {
  const rows = sql('SELECT chat_id, message_id FROM broadcast_messages WHERE broadcast_id = ?').all(Number(id));
  let deleted = 0, failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const started = Date.now();
    const results = await Promise.allSettled(rows.slice(i, i + BATCH).map(r => tgPatient('deleteMessage', { chat_id: r.chat_id, message_id: r.message_id })));
    for (const r of results) r.status === 'fulfilled' ? deleted++ : failed++;
    if (onProgress && i % (BATCH * 10) === 0) await onProgress(deleted, rows.length);
    const spent = Date.now() - started;
    if (spent < 1050) await sleep(1050 - spent);
  }
  sql('DELETE FROM broadcast_messages WHERE broadcast_id = ?').run(Number(id));
  return { deleted, failed, total: rows.length };
}

const deliveredCount = id => sql('SELECT COUNT(*) AS n FROM broadcast_messages WHERE broadcast_id = ?').get(Number(id)).n;

/** Каждые 15 секунд запускает наступившие отложенные рассылки. */
function startScheduler() {
  for (const b of active()) if (b.status === 'running') void run(b.id);
  setInterval(() => {
    for (const b of sql("SELECT id FROM broadcasts WHERE status = 'scheduled' AND scheduled_at <= ?").all(now())) void run(b.id);
  }, 15000).unref();
}

/**
 * Разбор кнопок рассылки. Каждая строка — ряд, кнопки в ряду разделены «|».
 * Формат кнопки: «Текст - https://ссылка» или «Текст - app[:wave|search|library]».
 * Премиум-эмодзи в начале текста кнопки становится её иконкой.
 */
function parseButtons(text, entities = []) {
  const rows = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    const row = [];
    let segStart = offset;
    for (const segment of line.split('|')) {
      const start = segStart;
      segStart += segment.length + 1;
      const sep = segment.lastIndexOf(' - ');
      if (sep < 0) throw Error(`Не понял кнопку «${segment.trim()}». Нужен формат «Текст - ссылка».`);
      let label = segment.slice(0, sep);
      const target = segment.slice(sep + 3).trim();
      const emoji = entities.find(e => e.type === 'custom_emoji' && e.offset >= start && e.offset + e.length <= start + sep);
      if (emoji) label = label.slice(0, emoji.offset - start) + label.slice(emoji.offset - start + emoji.length);
      label = label.trim();
      if (!label || label.length > 64) throw Error('Текст кнопки должен быть от 1 до 64 символов.');
      const button = { text: label };
      const app = target.match(/^app(?::(home|wave|search|library))?$/i);
      if (app) Object.assign(button, { kind: 'app', page: (app[1] || 'home').toLowerCase() });
      else {
        const url = normalizeUrl(target);
        if (!url) throw Error(`Ссылка «${target}» не подходит. Нужна https://…, t.me/… или app.`);
        Object.assign(button, { kind: 'url', url });
      }
      if (emoji) button.emoji = emoji.custom_emoji_id;
      row.push(button);
    }
    offset += line.length + 1;
    if (row.length > 8) throw Error('В одном ряду не больше 8 кнопок.');
    if (row.length) rows.push(row);
  }
  if (rows.flat().length > 30) throw Error('Слишком много кнопок.');
  return rows;
}

function normalizeUrl(value) {
  let raw = String(value || '').trim();
  if (/^t\.me\//i.test(raw)) raw = 'https://' + raw;
  if (/^tg:\/\/\w+/i.test(raw)) return raw.slice(0, 512);
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) && url.hostname.includes('.') ? url.href.slice(0, 512) : null;
  } catch { return null; }
}

/** «25.11 20:00», «25.11.2026 20:00», «20:00», «через 30м», «через 2ч», «сейчас». */
function parseWhen(text) {
  const value = text.trim().toLowerCase();
  if (['сейчас', 'now', '0'].includes(value)) return null;
  const rel = value.match(/^через\s+(\d{1,4})\s*(м|мин|минут|ч|час|часа|часов|д|дн|дней|дня)\.?$/);
  if (rel) {
    const n = Number(rel[1]), unit = rel[2][0];
    return now() + n * (unit === 'м' ? 60e3 : unit === 'ч' ? 3600e3 : 864e5);
  }
  const abs = value.match(/^(?:(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\s+)?(\d{1,2})[:.](\d{2})$/);
  if (!abs) throw Error('Не понял время. Примеры: «25.11 20:00», «20:00», «через 2ч», «сейчас».');
  const shifted = new Date(now() + config.tzOffset * 60e3);
  let year = abs[3] ? Number(abs[3].length === 2 ? '20' + abs[3] : abs[3]) : shifted.getUTCFullYear();
  const month = abs[2] ? Number(abs[2]) - 1 : shifted.getUTCMonth();
  const day = abs[1] ? Number(abs[1]) : shifted.getUTCDate();
  let ts = Date.UTC(year, month, day, Number(abs[4]), Number(abs[5])) - config.tzOffset * 60e3;
  if (!abs[1] && ts < now()) ts += 864e5;
  if (abs[1] && !abs[3] && ts < now() - 60e3) { year++; ts = Date.UTC(year, month, day, Number(abs[4]), Number(abs[5])) - config.tzOffset * 60e3; }
  if (!Number.isFinite(ts) || Number(abs[4]) > 23 || Number(abs[5]) > 59) throw Error('Некорректное время.');
  if (ts < now() - 60e3) throw Error('Это время уже прошло.');
  if (ts > now() + 60 * 864e5) throw Error('Можно запланировать не дальше чем на 60 дней.');
  return ts;
}

const summaryLine = b => `#${b.id} · ${fmtTime(b.created_at)} · ${{ done: '✅', running: '⏳', scheduled: '🕒', cancelled: '⏹' }[b.status] || '·'} ${b.sent}/${b.total}`;

module.exports = {
  AUDIENCES, AUDIENCE_ORDER, countAudience, create, get, recent, active, run, stop, deleteEverywhere, deliveredCount,
  startScheduler, parseButtons, parseWhen, normalizeUrl, statusText, fmtTime, summaryLine, plural,
};
