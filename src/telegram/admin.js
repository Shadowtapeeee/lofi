'use strict';

// Админ-панель бота: статистика, пользователи, стартовое сообщение с редактором кнопок,
// рассылки, тексты песен, кеш, настройки бота и администраторы.

const config = require('../config');
const db = require('../db');
const { sql, now, isAdmin, isOwner } = db;
const { html, plural, formatBytes } = require('../util');
const { tg, send, inline, cb, downloadFile, bot } = require('./api');
const start = require('./start');
const bc = require('./broadcast');
const audioCache = require('../audio-cache');
const lyrics = require('../lyrics');
const { SC, soundcloudUrl, trackView } = require('../soundcloud');

const sessions = new Map();
const session = uid => {
  let s = sessions.get(uid);
  if (!s) sessions.set(uid, s = { wait: null, draft: null });
  return s;
};
const startedAt = Date.now();

const back = (to = 'a:home', label = '← Назад') => [cb(label, to)];
const cancelRow = to => [cb('Отмена', to)];
const n = value => Number(value || 0).toLocaleString('ru-RU');

async function show(ctx, text, rows) {
  const payload = { text, parse_mode: 'HTML', reply_markup: inline(rows), link_preview_options: { is_disabled: true } };
  if (ctx.messageId) {
    try {
      await tg('editMessageText', { chat_id: ctx.chatId, message_id: ctx.messageId, ...payload });
      return;
    } catch (error) {
      if (/not modified/i.test(error.description || '')) return;
      if (error.status !== 400) throw error;
    }
  }
  const sent = await tg('sendMessage', { chat_id: ctx.chatId, ...payload });
  ctx.messageId = sent.message_id;
}

async function ask(ctx, wait, text, cancelTo) {
  await show(ctx, text, [cancelRow(cancelTo)]);
  session(ctx.uid).wait = { ...wait, panel: ctx.messageId, cancelTo };
}

// ── главное меню ──
function count(query, ...args) { return sql(query).get(...args).n; }

async function home(ctx) {
  const day = 864e5, t = now();
  const text = [
    '<b>Lo-fi · панель управления</b>',
    '',
    `Пользователей: <b>${n(count('SELECT COUNT(*) AS n FROM users'))}</b> · новых за сутки ${n(count('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', t - day))}`,
    `Открывали приложение за сутки: ${n(count('SELECT COUNT(*) AS n FROM users WHERE app_seen_at >= ?', t - day))}`,
    `Прослушиваний за сутки: ${n(count("SELECT COUNT(*) AS n FROM events WHERE kind = 'play' AND ts >= ?", t - day))}`,
    `Кеш треков: ${html(audioCache.summary().text)}`,
  ].join('\n');
  const rows = [
    [cb('📊 Статистика', 'a:stats'), cb('👥 Пользователи', 'a:users')],
    [cb('✉️ Стартовое сообщение', 'a:st')],
    [cb('📣 Рассылки', 'a:bc'), cb('🎤 Тексты песен', 'a:ly')],
    [cb('🗄 Кеш', 'a:cache'), cb('⚙️ Бот', 'a:bot')],
  ];
  if (isOwner(ctx.uid)) rows.push([cb('👮 Администраторы', 'a:adm')]);
  await show(ctx, text, rows);
}

// ── статистика ──
async function stats(ctx) {
  const day = 864e5, t = now();
  const plays7 = count("SELECT COUNT(*) AS n FROM events WHERE kind = 'play' AND ts >= ?", t - 7 * day);
  const skips7 = count("SELECT COUNT(*) AS n FROM events WHERE kind = 'skip' AND ts >= ?", t - 7 * day);
  const wave7 = count("SELECT COUNT(*) AS n FROM events WHERE kind = 'play' AND source = 'wave' AND ts >= ?", t - 7 * day);
  const top = sql("SELECT title, artist, COUNT(*) AS n FROM events WHERE kind = 'play' AND ts >= ? GROUP BY track_id ORDER BY n DESC LIMIT 7").all(t - 7 * day);
  const artists = sql("SELECT artist, COUNT(*) AS n FROM events WHERE kind = 'play' AND ts >= ? AND artist != '' GROUP BY artist ORDER BY n DESC LIMIT 5").all(t - 7 * day);
  const sources = sql("SELECT source, COUNT(*) AS n FROM users WHERE source != '' GROUP BY source ORDER BY n DESC LIMIT 5").all();
  const mem = process.memoryUsage().rss;
  const up = Math.round((Date.now() - startedAt) / 3600e3);
  const lines = [
    '<b>📊 Статистика</b>',
    '',
    '<b>Аудитория</b>',
    `Всего: ${n(count('SELECT COUNT(*) AS n FROM users'))} · запускали бота: ${n(count('SELECT COUNT(*) AS n FROM users WHERE bot_seen_at IS NOT NULL'))}`,
    `Новые: сутки ${n(count('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', t - day))} · неделя ${n(count('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', t - 7 * day))} · месяц ${n(count('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', t - 30 * day))}`,
    `В приложении: сутки ${n(count('SELECT COUNT(*) AS n FROM users WHERE app_seen_at >= ?', t - day))} · неделя ${n(count('SELECT COUNT(*) AS n FROM users WHERE app_seen_at >= ?', t - 7 * day))} · месяц ${n(count('SELECT COUNT(*) AS n FROM users WHERE app_seen_at >= ?', t - 30 * day))}`,
    `Заблокировали бота: ${n(count('SELECT COUNT(*) AS n FROM users WHERE blocked = 1'))} · в бане: ${n(count('SELECT COUNT(*) AS n FROM users WHERE banned = 1'))}`,
    '',
    '<b>Прослушивания за 7 дней</b>',
    `Запусков: ${n(plays7)} · из «Моей волны»: ${plays7 ? Math.round(wave7 / plays7 * 100) : 0}%`,
    `Пропусков: ${plays7 ? Math.round(skips7 / plays7 * 100) : 0}% · лайков: ${n(count("SELECT COUNT(*) AS n FROM events WHERE kind = 'like' AND ts >= ?", t - 7 * day))}`,
  ];
  if (top.length) lines.push('', '<b>Топ треков недели</b>', ...top.map((r, i) => `${i + 1}. ${html(r.artist)} — ${html(r.title)} · ${n(r.n)}`));
  if (artists.length) lines.push('', '<b>Топ артистов</b>', artists.map(r => `${html(r.artist)} (${n(r.n)})`).join(', '));
  if (sources.length) lines.push('', '<b>Источники</b> (/start src_…)', sources.map(r => `${html(r.source)}: ${n(r.n)}`).join(' · '));
  lines.push('', `<b>Сервер</b>: ${up} ч без перезапуска · память ${formatBytes(mem)}`, `Кеш треков: ${html(audioCache.summary().text)}`);
  await show(ctx, lines.join('\n'), [[cb('🔄 Обновить', 'a:stats')], back()]);
}

// ── пользователи ──
async function users(ctx) {
  const last = sql('SELECT * FROM users ORDER BY created_at DESC LIMIT 6').all();
  const text = [
    '<b>👥 Пользователи</b>',
    '',
    `Всего: ${n(count('SELECT COUNT(*) AS n FROM users'))} · Premium: ${n(count('SELECT COUNT(*) AS n FROM users WHERE premium = 1'))}`,
    '',
    '<b>Новые</b>',
    ...last.map(u => `• ${userName(u)} · <code>${u.id}</code>`),
    '',
    'Найти можно по ID, @username или пересланному сообщению.',
  ].join('\n');
  await show(ctx, text, [[cb('🔎 Найти', 'a:us:find'), cb('⬇️ Экспорт CSV', 'a:us:csv')], back()]);
}

const userName = u => html([u.first_name, u.last_name].filter(Boolean).join(' ') || 'Без имени') + (u.username ? ' @' + html(u.username) : '');
const date = ts => ts ? bc.fmtTime(ts) : '—';

async function userCard(ctx, id) {
  const u = db.getUser(id);
  if (!u) return show(ctx, 'Пользователь не найден.', [back('a:users')]);
  const plays = count("SELECT COUNT(*) AS n FROM events WHERE uid = ? AND kind = 'play'", u.id);
  const favs = count("SELECT COUNT(*) AS n FROM library WHERE uid = ? AND kind = 'favorite'", u.id);
  const status = u.banned ? '🚫 в бане' : u.blocked ? '⛔️ заблокировал бота' : '✅ активен';
  const text = [
    `<b>${userName(u)}</b>`,
    `ID: <code>${u.id}</code>${u.premium ? ' · ⭐️ Premium' : ''}${u.lang ? ' · ' + html(u.lang) : ''}`,
    `Статус: ${status}${isAdmin(u.id) ? ' · администратор' : ''}`,
    '',
    `Впервые: ${date(u.created_at)}`,
    `Бот: ${date(u.bot_seen_at)} · приложение: ${date(u.app_seen_at)}`,
    `Прослушиваний: ${n(plays)} · в избранном: ${n(favs)}`,
    u.source ? `Источник: ${html(u.source)}` : '',
  ].filter(line => line !== '').join('\n');
  await show(ctx, text, [
    [cb(u.banned ? '✅ Разбанить' : '🚫 Забанить', `a:uc:${u.id}:ban`), cb('✉️ Написать', `a:uc:${u.id}:msg`)],
    back('a:users'),
  ]);
}

async function exportUsers(ctx) {
  const rows = sql('SELECT * FROM users ORDER BY created_at').all();
  const head = ['id', 'username', 'first_name', 'last_name', 'lang', 'premium', 'created', 'bot_seen', 'app_seen', 'blocked', 'banned', 'source'];
  const iso = ts => ts ? new Date(ts).toISOString() : '';
  const cell = v => /[",\n;]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  const csv = '﻿' + [head.join(','), ...rows.map(u => [u.id, u.username, u.first_name, u.last_name, u.lang, u.premium, iso(u.created_at),
    iso(u.bot_seen_at), iso(u.app_seen_at), u.blocked, u.banned, u.source].map(cell).join(','))].join('\n');
  const form = new FormData();
  form.append('chat_id', String(ctx.chatId));
  form.append('caption', `Пользователи Lo-fi: ${rows.length}`);
  form.append('document', new Blob([csv], { type: 'text/csv' }), `lofi-users-${new Date().toISOString().slice(0, 10)}.csv`);
  await tg('sendDocument', form, { timeout: 60000 });
}

// ── стартовое сообщение ──
async function startScreen(ctx) {
  const card = start.getCard();
  const media = { default: 'стандартная обложка', none: 'без медиа', photo: 'фото', video: 'видео', animation: 'GIF' }[card.media.type] || card.media.type;
  const premium = card.entities.filter(e => e.type === 'custom_emoji').length;
  const text = [
    '<b>✉️ Стартовое сообщение</b>',
    'Его получает каждый, кто отправляет /start.',
    '',
    '<b>Текст</b>' + (premium ? ` · премиум-эмодзи: ${premium}` : ''),
    `<blockquote expandable>${html(card.text.slice(0, 700))}${card.text.length > 700 ? '…' : ''}</blockquote>`,
    `<b>Медиа:</b> ${media}`,
    `<b>Кнопки:</b> ${card.buttons.flat().length ? '' : 'нет'}`,
    ...card.buttons.map((row, r) => `${r + 1}. ` + row.map(b => html(b.text)).join(' │ ')),
    card.media.type !== 'none' && card.text.length > 1024 ? '\n⚠️ Текст длиннее 1024 символов: он придёт отдельным сообщением после медиа.' : '',
  ].filter(Boolean).join('\n');
  await show(ctx, text, [
    [cb('✏️ Текст', 'a:st:text'), cb('🖼 Медиа', 'a:st:media')],
    [cb('🔘 Кнопки', 'a:sb')],
    [cb('👁 Предпросмотр', 'a:st:prev'), cb('♻️ Сбросить', 'a:st:reset')],
    back(),
  ]);
}

async function buttonsScreen(ctx) {
  const card = start.getCard();
  const rows = card.buttons.flatMap((row, r) => [row.map((b, c) => cb(`${b.emoji ? '✦ ' : ''}${b.text}`, `a:sb:${r}.${c}`))]);
  const text = [
    '<b>🔘 Кнопки стартового сообщения</b>',
    '',
    'Нажмите на кнопку, чтобы изменить текст, действие, премиум-эмодзи, цвет или положение. Ряды повторяют раскладку в сообщении.',
    card.buttons.length ? '' : '\nКнопок пока нет.',
  ].join('\n');
  await show(ctx, text, [...rows, [cb('➕ Добавить кнопку', 'a:sb:add')], back('a:st', '← К сообщению')]);
}

function buttonAt(card, pos) {
  const [r, c] = String(pos).split('.').map(Number);
  const button = card.buttons[r]?.[c];
  return button ? { button, r, c } : null;
}

async function buttonCard(ctx, pos) {
  const card = start.getCard();
  const found = buttonAt(card, pos);
  if (!found) return buttonsScreen(ctx);
  const { button: b } = found;
  const action = b.kind === 'url' ? `ссылка ${html(b.url)}` : `открыть Mini App · ${start.PAGES[b.page] || start.PAGES.home}`;
  const text = [
    `<b>Кнопка «${html(b.text)}»</b>`,
    '',
    `Действие: ${action}`,
    `Премиум-эмодзи: ${b.emoji ? '<tg-emoji emoji-id="' + html(b.emoji) + '">⭐️</tg-emoji>' : 'нет'}`,
    `Цвет: ${start.STYLE_NAMES[b.style || '']}`,
    '',
    'Цвет и эмодзи на кнопке поддерживают свежие версии Telegram. Если клиент их не умеет, кнопка будет обычной.',
  ].join('\n');
  await show(ctx, text, [
    [cb('✏️ Текст', `a:sbt:${pos}`), cb('🔗 Действие', `a:sba:${pos}`)],
    [cb('😀 Эмодзи', `a:sbe:${pos}`), cb('🎨 Цвет: ' + start.STYLE_NAMES[b.style || ''], `a:sbs:${pos}`)],
    [cb('⬆️', `a:sbm:${pos}:u`), cb('⬇️', `a:sbm:${pos}:d`), cb('⬅️', `a:sbm:${pos}:l`), cb('➡️', `a:sbm:${pos}:r`)],
    [cb('🗑 Удалить', `a:sbd:${pos}`)],
    back('a:sb', '← К кнопкам'),
  ]);
}

function locate(rows, target) {
  for (let r = 0; r < rows.length; r++) {
    const c = rows[r].indexOf(target);
    if (c >= 0) return `${r}.${c}`;
  }
  return null;
}

function moveButton(card, pos, dir) {
  const found = buttonAt(card, pos);
  if (!found) return pos;
  const { button, r, c } = found;
  const rows = card.buttons;
  if (dir === 'l' && c > 0) [rows[r][c - 1], rows[r][c]] = [rows[r][c], rows[r][c - 1]];
  else if (dir === 'r' && c < rows[r].length - 1) [rows[r][c + 1], rows[r][c]] = [rows[r][c], rows[r][c + 1]];
  else if (dir === 'u' || dir === 'd') {
    rows[r].splice(c, 1);
    const target = dir === 'u' ? r - 1 : r + 1;
    if (rows[target] && rows[target].length < 8) rows[target].push(button);
    else if (dir === 'u') rows.splice(Math.max(0, r), 0, [button]);
    else rows.splice(r + 1, 0, [button]);
  }
  card.buttons = rows.filter(row => row.length);
  return locate(card.buttons, button);
}

/** Текст кнопки и премиум-эмодзи из сообщения: первый custom_emoji становится иконкой. */
function labelFrom(message) {
  const text = message.text || '';
  const emoji = (message.entities || []).find(e => e.type === 'custom_emoji');
  let label = text;
  if (emoji) label = text.slice(0, emoji.offset) + text.slice(emoji.offset + emoji.length);
  label = label.replace(/\s+/g, ' ').trim();
  return { label, emoji: emoji?.custom_emoji_id || '' };
}

// ── рассылки ──
async function broadcastsScreen(ctx) {
  const list = bc.active();
  const reach = bc.countAudience('all');
  const text = [
    '<b>📣 Рассылки</b>',
    '',
    `Можно отправить: <b>${n(reach)}</b> ${plural(reach, 'пользователю', 'пользователям', 'пользователям')}`,
    'Бот копирует ваше сообщение целиком: текст с форматированием, премиум-эмодзи, фото, видео, GIF, документ или голосовое.',
    list.length ? '\n<b>Сейчас</b>\n' + list.map(b => bc.summaryLine(b)).join('\n') : '',
  ].join('\n');
  await show(ctx, text, [
    [cb('📝 Новая рассылка', 'a:bc:new')],
    ...list.map(b => [cb(`${b.status === 'scheduled' ? '🕒' : '⏳'} #${b.id} · подробнее`, `a:bh:${b.id}`)]),
    [cb('📜 История', 'a:bc:hist')],
    back(),
  ]);
}

async function draftScreen(ctx) {
  const draft = session(ctx.uid).draft;
  if (!draft) return broadcastsScreen(ctx);
  const o = draft.options;
  const reach = bc.countAudience(o.audience);
  const text = [
    '<b>📝 Черновик рассылки</b>',
    '',
    `Аудитория: <b>${html(bc.AUDIENCES[o.audience])}</b> · ${n(reach)} чел.`,
    `Кнопки: ${o.buttons.length ? '\n' + o.buttons.map(row => '   ' + row.map(b => html(b.text)).join(' │ ')).join('\n') : 'нет'}`,
    `Отправка: ${o.at ? bc.fmtTime(o.at) : 'сразу'}`,
    `Без звука: ${o.silent ? 'да' : 'нет'} · защита от пересылки: ${o.protect ? 'да' : 'нет'} · закрепить: ${o.pin ? 'да' : 'нет'}`,
    '',
    'Проверьте сообщение кнопкой «Предпросмотр»: копия придёт сюда.',
  ].join('\n');
  const mark = v => v ? ' ✓' : '';
  await show(ctx, text, [
    [cb('👥 ' + bc.AUDIENCES[o.audience], 'a:bd:aud')],
    [cb('🔘 Кнопки', 'a:bd:btn'), cb('🕒 Время', 'a:bd:time')],
    [cb('🔕 Без звука' + mark(o.silent), 'a:bd:silent'), cb('🛡 Защита' + mark(o.protect), 'a:bd:protect'), cb('📌 Закреп' + mark(o.pin), 'a:bd:pin')],
    [cb('👁 Предпросмотр', 'a:bd:prev')],
    [cb(o.at ? '🕒 Запланировать' : '🚀 Отправить', 'a:bd:go'), cb('🗑 Удалить черновик', 'a:bd:drop')],
  ]);
}

async function historyScreen(ctx) {
  const list = bc.recent(10);
  await show(ctx, '<b>📜 История рассылок</b>\n\n' + (list.length ? list.map(b => bc.summaryLine(b)).join('\n') : 'Рассылок ещё не было.'), [
    ...list.map(b => [cb(bc.summaryLine(b), `a:bh:${b.id}`)]),
    back('a:bc'),
  ]);
}

async function broadcastCard(ctx, id) {
  const b = bc.get(id);
  if (!b) return historyScreen(ctx);
  const delivered = bc.deliveredCount(id);
  const rows = [];
  if (['running', 'scheduled'].includes(b.status)) rows.push([cb('⏹ Остановить', `a:bh:${id}:stop`)]);
  if (delivered && Date.now() - (b.started_at || b.created_at) < 47 * 3600e3) rows.push([cb(`🗑 Удалить у получателей (${n(delivered)})`, `a:bh:${id}:del`)]);
  rows.push([cb('🔁 Повторить как черновик', `a:bh:${id}:dup`)], [cb('🔄 Обновить', `a:bh:${id}`)], back('a:bc:hist'));
  await show(ctx, bc.statusText(b), rows);
}

// ── тексты песен ──
async function lyricsScreen(ctx) {
  await show(ctx, [
    '<b>🎤 Тексты песен</b>',
    '',
    `Своих синхронизированных текстов: ${n(lyrics.overrideCount())}`,
    'Пришлите ссылку на трек, затем LRC с таймкодами вида [00:12.34]. Поддерживается расширенный LRC с таймкодами слов &lt;00:12.34&gt;.',
  ].join('\n'), [
    [cb('➕ Добавить или заменить', 'a:ly:add'), cb('🗑 Удалить свой', 'a:ly:del')],
    [cb('🧹 Сбросить кеш найденных текстов', 'a:ly:flush')],
    back(),
  ]);
}

async function resolveTrack(input) {
  const value = String(input || '').trim();
  if (/^\d{1,15}$/.test(value)) return SC.track(value);
  if (!soundcloudUrl(value)) return null;
  const found = await SC.resolve(value);
  return found?.kind === 'track' ? found : null;
}

// ── кеш ──
async function cacheScreen(ctx) {
  const s = audioCache.summary();
  await show(ctx, [
    '<b>🗄 Кеш</b>',
    '',
    `Треки: ${html(s.text)}`,
    `Отдано из кеша: ${n(s.hits)} · скачано за сеанс: ${n(s.downloads)} · ошибок: ${n(s.errors)}`,
    `Очередь загрузки: ${s.queue} · сейчас качается: ${s.active}`,
    audioCache.enabled() ? '' : '\nКеш выключен: AUDIO_CACHE_MB=0.',
  ].join('\n'), [
    [cb('🧹 Очистить кеш треков', 'a:ca:clear')],
    [cb('🔄 Обновить', 'a:cache')],
    back(),
  ]);
}

// ── настройки бота ──
async function botScreen(ctx) {
  await show(ctx, [
    '<b>⚙️ Бот</b>',
    '',
    `@${html(bot.username || '—')} · Bot API`,
    'Кнопка меню открывает Mini App из поля ввода. Описание видно в пустом чате до /start.',
  ].join('\n'), [
    [cb('📱 Кнопка меню', 'a:bt:menu'), cb('↩️ Меню по умолчанию', 'a:bt:menureset')],
    [cb('📝 Описание', 'a:bt:desc'), cb('🏷 Короткое описание', 'a:bt:short')],
    back(),
  ]);
}

// ── администраторы ──
async function adminsScreen(ctx) {
  const extra = db.listAdmins();
  await show(ctx, [
    '<b>👮 Администраторы</b>',
    '',
    'Владельцы (ADMIN_IDS): ' + ([...config.owners].map(id => `<code>${id}</code>`).join(', ') || '—'),
    'Добавленные: ' + (extra.length ? extra.map(a => `<code>${a.id}</code>`).join(', ') : 'нет'),
    '',
    'Добавленные администраторы видят панель, но не управляют этим списком.',
  ].join('\n'), [
    ...extra.map(a => [cb(`✖️ Убрать ${a.id}`, `a:ad:rm:${a.id}`)]),
    [cb('➕ Добавить', 'a:ad:add')],
    back(),
  ]);
}

// ── обработка нажатий ──
async function onCallback(query) {
  const uid = String(query.from.id);
  const chat = query.message?.chat;
  const allowed = chat?.type === 'private' && isAdmin(uid);
  if (!allowed) return tg('answerCallbackQuery', { callback_query_id: query.id, text: 'Доступ закрыт' }).catch(() => {});
  const ctx = { uid, chatId: chat.id, messageId: query.message.message_id };
  const toast = text => tg('answerCallbackQuery', { callback_query_id: query.id, text, show_alert: false }).catch(() => {});
  const parts = (query.data || '').split(':').slice(1);
  const [screen, arg, extra] = parts;
  const s = session(uid);
  if (!['bd'].includes(screen)) s.wait = null;
  let answered = false;
  const answer = async text => { answered = true; await toast(text); };

  try {
    switch (screen) {
      case 'home': await home(ctx); break;
      case 'stats': await stats(ctx); break;
      case 'users':
        await users(ctx); break;
      case 'us':
        if (arg === 'find') await ask(ctx, { type: 'user_find' }, 'Пришлите ID, @username или перешлите сообщение пользователя.', 'a:users');
        if (arg === 'csv') { await answer('Готовлю файл…'); await exportUsers(ctx); }
        break;
      case 'uc': {
        const u = db.getUser(arg);
        if (extra === 'ban' && u) {
          if (isAdmin(u.id)) { await answer('Администратора нельзя забанить'); break; }
          db.setBanned(u.id, !u.banned);
          await answer(u.banned ? 'Разбанен' : 'Забанен');
        }
        if (extra === 'msg' && u) { await ask(ctx, { type: 'user_msg', target: u.id }, `Пришлите сообщение для ${userName(u)}. Бот скопирует его как есть.`, `a:uc:${u.id}`); break; }
        await userCard(ctx, arg);
        break;
      }
      case 'st':
        if (!arg) await startScreen(ctx);
        else if (arg === 'text') await ask(ctx, { type: 'start_text' }, 'Пришлите новый текст. Жирный, курсив, ссылки, спойлеры, цитаты и <b>премиум-эмодзи</b> сохранятся. До 4096 символов (с медиа подпись — до 1024).', 'a:st');
        else if (arg === 'media') await ask(ctx, { type: 'start_media' }, 'Пришлите фото, видео или GIF. Слово «нет» — без медиа, «стандарт» — обложка Lo-fi.', 'a:st');
        else if (arg === 'prev') { await answer('Отправляю предпросмотр'); await start.sendCard(ctx.chatId); ctx.messageId = null; await startScreen(ctx); }
        else if (arg === 'reset') await show(ctx, 'Вернуть стандартные текст, медиа и кнопки?', [[cb('Да, вернуть', 'a:st:reset!'), cb('Отмена', 'a:st')]]);
        else if (arg === 'reset!') { start.resetCard(); await answer('Сброшено'); await startScreen(ctx); }
        break;
      case 'sb':
        if (!arg) await buttonsScreen(ctx);
        else if (arg === 'add') await ask(ctx, { type: 'btn_new' }, 'Пришлите текст новой кнопки (до 64 символов). Премиум-эмодзи в тексте станет иконкой кнопки.', 'a:sb');
        else await buttonCard(ctx, arg);
        break;
      case 'sbt': await ask(ctx, { type: 'btn_text', pos: arg }, 'Пришлите новый текст кнопки. Премиум-эмодзи в тексте станет иконкой.', `a:sb:${arg}`); break;
      case 'sba': await ask(ctx, { type: 'btn_action', pos: arg }, 'Пришлите ссылку (https://… или t.me/…) либо раздел приложения: «главная», «волна», «поиск», «медиатека».', `a:sb:${arg}`); break;
      case 'sbe': await ask(ctx, { type: 'btn_emoji', pos: arg }, 'Пришлите один премиум-эмодзи. Слово «нет» уберёт иконку.\n\nПремиум-эмодзи на кнопках работают, если у владельца бота есть Telegram Premium.', `a:sb:${arg}`); break;
      case 'sbs': {
        const card = start.getCard();
        const found = buttonAt(card, arg);
        if (found) {
          const i = start.STYLES.indexOf(found.button.style || '');
          found.button.style = start.STYLES[(i + 1) % start.STYLES.length];
          if (!found.button.style) delete found.button.style;
          start.saveCard(card);
        }
        await buttonCard(ctx, arg);
        break;
      }
      case 'sbm': {
        const card = start.getCard();
        const pos = moveButton(card, arg, extra);
        start.saveCard(card);
        await buttonCard(ctx, pos || arg);
        break;
      }
      case 'sbd': {
        const card = start.getCard();
        const found = buttonAt(card, arg);
        if (found) { card.buttons[found.r].splice(found.c, 1); card.buttons = card.buttons.filter(row => row.length); start.saveCard(card); await answer('Кнопка удалена'); }
        await buttonsScreen(ctx);
        break;
      }
      case 'bc':
        if (!arg) await broadcastsScreen(ctx);
        else if (arg === 'new') await ask(ctx, { type: 'bc_message' }, 'Пришлите сообщение для рассылки: текст, фото, видео, GIF, документ или голосовое. Форматирование и премиум-эмодзи сохранятся.\n\nАльбомы из нескольких фото не поддерживаются: бот скопирует только одно.', 'a:bc');
        else if (arg === 'hist') await historyScreen(ctx);
        break;
      case 'bd': {
        const draft = s.draft;
        if (!draft) { await broadcastsScreen(ctx); break; }
        s.wait = null;
        const o = draft.options;
        if (arg === 'aud') o.audience = bc.AUDIENCE_ORDER[(bc.AUDIENCE_ORDER.indexOf(o.audience) + 1) % bc.AUDIENCE_ORDER.length];
        if (arg === 'silent') o.silent = !o.silent;
        if (arg === 'protect') o.protect = !o.protect;
        if (arg === 'pin') o.pin = !o.pin;
        if (arg === 'btn') { await ask(ctx, { type: 'bc_buttons' }, 'Пришлите кнопки, по строке на ряд. Кнопки в ряду разделяйте « | ».\n\n<code>Открыть Lo-fi - app\nМоя волна - app:wave | Канал - https://t.me/channel</code>\n\nПремиум-эмодзи в начале текста станет иконкой кнопки. Слово «нет» уберёт кнопки.', 'a:bd'); break; }
        if (arg === 'time') { await ask(ctx, { type: 'bc_time' }, `Когда отправить? Например «25.11 20:00», «20:00», «через 2ч» или «сейчас». Время по UTC${config.tzOffset >= 0 ? '+' : '−'}${Math.abs(config.tzOffset / 60)}.`, 'a:bd'); break; }
        if (arg === 'prev') {
          await answer('Отправляю копию');
          await tg('copyMessage', { chat_id: ctx.chatId, from_chat_id: draft.chat, message_id: draft.message,
            reply_markup: o.buttons.length ? { inline_keyboard: o.buttons.map(row => row.map(b => start.toButton(b))) } : undefined }).catch(error =>
            tg('copyMessage', { chat_id: ctx.chatId, from_chat_id: draft.chat, message_id: draft.message,
              reply_markup: o.buttons.length ? { inline_keyboard: o.buttons.map(row => row.map(b => start.toButton(b, { plain: true }))) } : undefined }).catch(() => { throw error; }));
          ctx.messageId = null;
        }
        if (arg === 'go') {
          const reach = bc.countAudience(o.audience);
          if (!reach) { await answer('В этой аудитории никого нет'); break; }
          await show(ctx, `${o.at ? 'Запланировать на ' + bc.fmtTime(o.at) : 'Отправить сейчас'} для <b>${n(reach)}</b> ${plural(reach, 'пользователя', 'пользователей', 'пользователей')}?`,
            [[cb('✅ Да', 'a:bd:go!'), cb('Назад', 'a:bd')]]);
          break;
        }
        if (arg === 'go!') {
          const id = bc.create(draft, uid, ctx.chatId, ctx.messageId);
          s.draft = null;
          await answer(o.at ? 'Запланировано' : 'Рассылка запущена');
          await show(ctx, bc.statusText(bc.get(id)), [[cb('⏹ Остановить', `a:bh:${id}:stop`)], [cb('← Рассылки', 'a:bc')]]);
          break;
        }
        if (arg === 'drop') { s.draft = null; await answer('Черновик удалён'); await broadcastsScreen(ctx); break; }
        await draftScreen(ctx);
        break;
      }
      case 'bh': {
        if (extra === 'stop') { await answer(bc.stop(arg) ? 'Останавливаю' : 'Уже не идёт'); }
        if (extra === 'dup') {
          const b = bc.get(arg);
          if (b) { s.draft = { chat: b.source_chat, message: b.source_message, options: { ...b.options, at: null } }; await draftScreen(ctx); break; }
        }
        if (extra === 'del') {
          await answer('Удаляю…');
          const result = await bc.deleteEverywhere(arg, (done, total) => show(ctx, `Удаляю сообщения рассылки #${arg}: ${n(done)} из ${n(total)}…`, []));
          await show(ctx, `Рассылка #${arg}: удалено ${n(result.deleted)} из ${n(result.total)}.${result.failed ? ` Не удалось: ${n(result.failed)} (старше 48 часов или чат недоступен).` : ''}`, [back(`a:bh:${arg}`)]);
          break;
        }
        await broadcastCard(ctx, arg);
        break;
      }
      case 'ly':
        if (!arg) await lyricsScreen(ctx);
        if (arg === 'add') await ask(ctx, { type: 'lyrics_track' }, 'Пришлите ссылку на трек SoundCloud или его ID.', 'a:ly');
        if (arg === 'del') await ask(ctx, { type: 'lyrics_del' }, 'Пришлите ссылку на трек или ID, для которого нужно удалить свой текст.', 'a:ly');
        if (arg === 'flush') { lyrics.clearCache(); await answer('Кеш текстов сброшен'); await lyricsScreen(ctx); }
        break;
      case 'cache': await cacheScreen(ctx); break;
      case 'ca':
        if (arg === 'clear') await show(ctx, 'Удалить все скачанные треки с диска?', [[cb('Да, очистить', 'a:ca:clear!'), cb('Отмена', 'a:cache')]]);
        if (arg === 'clear!') { audioCache.clear(); await answer('Кеш очищен'); await cacheScreen(ctx); }
        break;
      case 'bot':
        await botScreen(ctx); break;
      case 'bt':
        if (arg === 'menu') await ask(ctx, { type: 'menu_text' }, 'Пришлите текст кнопки меню (до 32 символов), например «Lo-fi».', 'a:bot');
        if (arg === 'menureset') { await tg('setChatMenuButton', { menu_button: { type: 'default' } }); await answer('Кнопка меню сброшена'); await botScreen(ctx); }
        if (arg === 'desc') await ask(ctx, { type: 'bot_desc' }, 'Пришлите описание бота (до 512 символов). Его видно в пустом чате. «нет» — очистить.', 'a:bot');
        if (arg === 'short') await ask(ctx, { type: 'bot_short' }, 'Пришлите короткое описание (до 120 символов) для профиля бота. «нет» — очистить.', 'a:bot');
        break;
      case 'adm':
        if (!isOwner(uid)) { await answer('Только для владельцев'); break; }
        await adminsScreen(ctx); break;
      case 'ad':
        if (!isOwner(uid)) { await answer('Только для владельцев'); break; }
        if (arg === 'add') await ask(ctx, { type: 'admin_add' }, 'Пришлите числовой ID пользователя или перешлите его сообщение.', 'a:adm');
        if (arg === 'rm') { db.removeAdmin(extra); await answer('Удалён'); await adminsScreen(ctx); }
        break;
      default: await home(ctx);
    }
  } catch (error) {
    console.warn('Админ-панель:', error.message);
    if (!answered) await answer('Не получилось: ' + (error.description || error.message).slice(0, 150));
    return;
  }
  if (!answered) await toast();
}

// ── ввод от администратора ──
async function onInput(message) {
  const uid = String(message.from.id);
  const s = session(uid);
  const wait = s.wait;
  if (!wait) return false;
  const ctx = { uid, chatId: message.chat.id, messageId: null };
  const text = (message.text || message.caption || '').trim();
  const word = text.toLowerCase();
  const fail = async problem => {
    const sent = await send(ctx.chatId, problem, { reply_markup: inline([cancelRow(wait.cancelTo || 'a:home')]) });
    wait.panel = sent.message_id;
    return true;
  };
  // Удаляем старую панель, чтобы новая появилась под сообщением администратора.
  if (wait.panel) tg('deleteMessage', { chat_id: ctx.chatId, message_id: wait.panel }).catch(() => {});

  try {
    switch (wait.type) {
      case 'start_text': {
        if (!text) return fail('Нужен текст. Попробуйте ещё раз.');
        const card = start.getCard();
        card.text = message.text ?? message.caption ?? '';
        card.entities = message.entities || message.caption_entities || [];
        start.saveCard(card);
        s.wait = null;
        await startScreen(ctx);
        break;
      }
      case 'start_media': {
        const card = start.getCard();
        if (message.photo) card.media = { type: 'photo', file_id: message.photo.at(-1).file_id };
        else if (message.animation) card.media = { type: 'animation', file_id: message.animation.file_id };
        else if (message.video) card.media = { type: 'video', file_id: message.video.file_id };
        else if (word === 'нет') card.media = { type: 'none' };
        else if (word === 'стандарт') card.media = { type: 'default' };
        else return fail('Пришлите фото, видео, GIF или слово «нет» / «стандарт».');
        start.saveCard(card);
        s.wait = null;
        await startScreen(ctx);
        break;
      }
      case 'btn_new':
      case 'btn_text': {
        const { label, emoji } = labelFrom(message);
        if (!label || label.length > 64 || /\n/.test(message.text || '')) return fail('Текст кнопки — одна строка до 64 символов.');
        const card = start.getCard();
        let pos = wait.pos;
        if (wait.type === 'btn_new') {
          if (card.buttons.flat().length >= 30) return fail('Не больше 30 кнопок.');
          card.buttons.push([{ text: label, kind: 'app', page: 'home', ...(emoji ? { emoji } : {}) }]);
          pos = `${card.buttons.length - 1}.0`;
        } else {
          const found = buttonAt(card, pos);
          if (!found) break;
          found.button.text = label;
          if (emoji) found.button.emoji = emoji;
        }
        start.saveCard(card);
        s.wait = null;
        await buttonCard(ctx, pos);
        break;
      }
      case 'btn_action': {
        const card = start.getCard();
        const found = buttonAt(card, wait.pos);
        if (!found) break;
        const page = { 'главная': 'home', 'волна': 'wave', 'моя волна': 'wave', 'поиск': 'search', 'медиатека': 'library' }[word];
        if (page) { Object.assign(found.button, { kind: 'app', page }); delete found.button.url; }
        else {
          const url = bc.normalizeUrl(text);
          if (!url) return fail('Нужна ссылка https://…, t.me/… или раздел: главная, волна, поиск, медиатека.');
          Object.assign(found.button, { kind: 'url', url });
          delete found.button.page;
        }
        start.saveCard(card);
        s.wait = null;
        await buttonCard(ctx, wait.pos);
        break;
      }
      case 'btn_emoji': {
        const card = start.getCard();
        const found = buttonAt(card, wait.pos);
        if (!found) break;
        const id = (message.entities || []).find(e => e.type === 'custom_emoji')?.custom_emoji_id
          || (message.sticker?.type === 'custom_emoji' ? message.sticker.custom_emoji_id : '');
        if (word === 'нет') delete found.button.emoji;
        else if (id) found.button.emoji = id;
        else return fail('Это не премиум-эмодзи. Пришлите эмодзи из набора (с Telegram Premium) или «нет».');
        start.saveCard(card);
        s.wait = null;
        await buttonCard(ctx, wait.pos);
        break;
      }
      case 'bc_message': {
        if (message.media_group_id) await send(ctx.chatId, 'Это альбом: в рассылку попадёт только это сообщение.');
        if (message.poll || message.dice || message.location && !message.venue) return fail('Такое сообщение нельзя разослать. Пришлите текст или медиа.');
        s.draft = { chat: message.chat.id, message: message.message_id, options: { audience: 'all', buttons: [], silent: false, protect: false, pin: false, at: null } };
        s.wait = null;
        await draftScreen(ctx);
        break;
      }
      case 'bc_buttons': {
        if (!s.draft) break;
        try { s.draft.options.buttons = word === 'нет' ? [] : bc.parseButtons(message.text || '', message.entities || []); }
        catch (error) { return fail(error.message); }
        s.wait = null;
        await draftScreen(ctx);
        break;
      }
      case 'bc_time': {
        if (!s.draft) break;
        try { s.draft.options.at = bc.parseWhen(text); }
        catch (error) { return fail(error.message); }
        s.wait = null;
        await draftScreen(ctx);
        break;
      }
      case 'user_find': {
        let u;
        const forwarded = message.forward_origin?.type === 'user' ? message.forward_origin.sender_user?.id : null;
        if (forwarded) u = db.getUser(forwarded);
        else if (/^\d{1,15}$/.test(text)) u = db.getUser(text);
        else if (/^@?\w{3,32}$/.test(text)) u = sql('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(text.replace(/^@/, ''));
        if (!u) return fail('Не нашёл. Пользователь должен хотя бы раз написать боту или открыть приложение.');
        s.wait = null;
        await userCard(ctx, u.id);
        break;
      }
      case 'user_msg': {
        try {
          await tg('copyMessage', { chat_id: wait.target, from_chat_id: message.chat.id, message_id: message.message_id });
          await send(ctx.chatId, 'Доставлено.');
        } catch (error) {
          if (error.status === 403) db.setBlocked(wait.target, true);
          await send(ctx.chatId, 'Не доставлено: ' + (error.description || error.message));
        }
        s.wait = null;
        await userCard(ctx, wait.target);
        break;
      }
      case 'lyrics_track':
      case 'lyrics_del': {
        const track = await resolveTrack(text).catch(() => null);
        if (!track) return fail('Не нашёл трек. Пришлите ссылку SoundCloud на трек или его ID.');
        const view = trackView(track);
        if (wait.type === 'lyrics_del') {
          lyrics.removeOverride(view.id);
          s.wait = null;
          await send(ctx.chatId, `Свой текст для «${view.title}» удалён.`);
          await lyricsScreen(ctx);
          break;
        }
        await ask(ctx, { type: 'lyrics_lrc', track: view.id }, `Трек: <b>${html(view.artist)} — ${html(view.title)}</b>\n\nПришлите текст LRC или файл .lrc до 64 КБ. «сброс» — удалить свой текст.`, 'a:ly');
        break;
      }
      case 'lyrics_lrc': {
        let raw = message.text || '';
        if (message.document) {
          try { raw = (await downloadFile(message.document.file_id, 65536)).toString('utf8'); }
          catch (error) { return fail(error.message); }
        }
        if (raw.trim().toLowerCase() === 'сброс') lyrics.removeOverride(wait.track);
        else if (raw.length > 65536 || lyrics.parseLrc(raw).filter(l => l.text).length < 2) return fail('Нужен LRC с таймкодами [00:12.34] (не меньше двух строк) или файл до 64 КБ.');
        else lyrics.setOverride(wait.track, raw);
        s.wait = null;
        await send(ctx.chatId, 'Сохранено. Текст появится в караоке при следующем открытии трека.');
        await lyricsScreen(ctx);
        break;
      }
      case 'menu_text': {
        if (!text || text.length > 32) return fail('До 32 символов.');
        if (!config.appUrl) return fail('Сначала задайте APP_URL.');
        await tg('setChatMenuButton', { menu_button: { type: 'web_app', text, web_app: { url: config.appUrl + '/' } } });
        s.wait = null;
        await send(ctx.chatId, 'Кнопка меню обновлена.');
        await botScreen(ctx);
        break;
      }
      case 'bot_desc':
      case 'bot_short': {
        const limit = wait.type === 'bot_desc' ? 512 : 120;
        const value = word === 'нет' ? '' : text;
        if (value.length > limit) return fail(`До ${limit} символов.`);
        await tg(wait.type === 'bot_desc' ? 'setMyDescription' : 'setMyShortDescription', wait.type === 'bot_desc' ? { description: value } : { short_description: value });
        s.wait = null;
        await send(ctx.chatId, 'Сохранено.');
        await botScreen(ctx);
        break;
      }
      case 'admin_add': {
        if (!isOwner(uid)) break;
        const id = message.forward_origin?.type === 'user' ? String(message.forward_origin.sender_user.id) : /^\d{1,15}$/.test(text) ? text : '';
        if (!id) return fail('Нужен числовой ID или пересланное сообщение пользователя.');
        db.addAdmin(id, uid);
        s.wait = null;
        await adminsScreen(ctx);
        break;
      }
      default: return false;
    }
  } catch (error) {
    console.warn('Админ-ввод:', error.message);
    await send(ctx.chatId, 'Не получилось: ' + (error.description || error.message));
  }
  return true;
}

async function onCommand(message, command, args) {
  const uid = String(message.from.id);
  const ctx = { uid, chatId: message.chat.id, messageId: null };
  const s = session(uid);
  switch (command) {
    case 'admin': case 'cancel': s.wait = null; await home(ctx); return true;
    case 'stats': await stats(ctx); return true;
    case 'broadcast': await ask(ctx, { type: 'bc_message' }, 'Пришлите сообщение для рассылки. Форматирование и премиум-эмодзи сохранятся.', 'a:bc'); return true;
    case 'user': {
      if (!args) { await users(ctx); return true; }
      const value = args.trim().replace(/^@/, '');
      const u = /^\d+$/.test(value) ? db.getUser(value) : sql('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(value);
      if (u) await userCard(ctx, u.id); else await send(ctx.chatId, 'Не нашёл пользователя.');
      return true;
    }
    case 'lyrics': {
      if (!args) { await lyricsScreen(ctx); return true; }
      const track = await resolveTrack(args).catch(() => null);
      if (!track) { await send(ctx.chatId, 'Формат: /lyrics <ссылка на трек или ID>.'); return true; }
      const view = trackView(track);
      await ask(ctx, { type: 'lyrics_lrc', track: view.id }, `Трек: <b>${html(view.artist)} — ${html(view.title)}</b>\n\nПришлите текст LRC или файл .lrc до 64 КБ. «сброс» — удалить свой текст.`, 'a:ly');
      return true;
    }
    default: return false;
  }
}

const hasPending = uid => !!sessions.get(String(uid))?.wait;

module.exports = { onCallback, onInput, onCommand, hasPending };
