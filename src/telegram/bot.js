'use strict';

// Long polling и маршрутизация обновлений Telegram.

const config = require('../config');
const db = require('../db');
const { sleep } = require('../util');
const { tg, send, bot } = require('./api');
const start = require('./start');
const admin = require('./admin');
const broadcast = require('./broadcast');
const { soundcloudUrl } = require('../soundcloud');

const polling = new AbortController();

const USER_HELP = 'Отправьте название трека или ссылку SoundCloud, и я открою её в Lo-fi. /start — главное меню.';
const ADMIN_HELP = [
  'Команды администратора:',
  '/admin — панель управления',
  '/stats — статистика',
  '/broadcast — новая рассылка',
  '/user <ID или @username> — карточка пользователя',
  '/lyrics <ссылка> — свой синхронизированный текст',
  '/cancel — отменить ввод',
].join('\n');

async function handleUpdate(update) {
  if (update.my_chat_member) {
    const m = update.my_chat_member;
    if (m.chat?.type === 'private') {
      db.touchUser(m.from, { via: 'none' });
      db.setBlocked(m.from.id, m.new_chat_member?.status === 'kicked');
    }
    return;
  }
  if (update.callback_query) {
    const query = update.callback_query;
    if (query.message?.chat?.type === 'private') db.touchUser(query.from, { via: 'bot' });
    if (db.isBanned(query.from.id)) return tg('answerCallbackQuery', { callback_query_id: query.id }).catch(() => {});
    if ((query.data || '').startsWith('a:')) return admin.onCallback(query);
    return tg('answerCallbackQuery', { callback_query_id: query.id }).catch(() => {});
  }

  const message = update.message;
  if (message?.chat?.type !== 'private' || !message.from || message.from.is_bot) return;
  const uid = String(message.from.id), chatId = message.chat.id;
  const command = (message.text || '').match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  const name = command?.[1]?.toLowerCase();
  const args = command?.[2]?.trim() || '';

  if (name === 'start') {
    const source = args.match(/^src_([\w-]{1,48})$/)?.[1] || '';
    db.touchUser(message.from, { via: 'bot', started: true, source });
  } else db.touchUser(message.from, { via: 'bot' });
  if (db.isBanned(uid)) return;

  if (name === 'start') return start.sendCard(chatId, { payload: args });
  const isAdmin = db.isAdmin(uid);
  if (name === 'help') return send(chatId, isAdmin ? USER_HELP + '\n\n' + ADMIN_HELP : USER_HELP);
  if (isAdmin && name && await admin.onCommand(message, name, args)) return;
  if (isAdmin && !command && admin.hasPending(uid) && await admin.onInput(message)) return;

  // Обычный текст: открыть поиск или ссылку прямо в Mini App.
  const text = (message.text || '').trim();
  if (!command && text && config.appUrl) {
    const isLink = !!soundcloudUrl(text.split(/\s+/).find(part => soundcloudUrl(part)) || '');
    const query = isLink ? text.split(/\s+/).find(part => soundcloudUrl(part)) : text.slice(0, 200);
    return send(chatId, isLink ? 'Открыть в Lo-fi:' : `Найти «${query}» в Lo-fi:`, {
      reply_markup: { inline_keyboard: [[{ text: isLink ? 'Открыть' : 'Найти', web_app: { url: start.appLink({ q: query }) } }]] },
    });
  }
}

async function runBot() {
  let offset = Math.max(0, Number(db.getSetting('tg_offset', '0')) || 0);
  let ready = false, delay = 1000;
  while (!polling.signal.aborted) {
    try {
      if (!ready) {
        const me = await tg('getMe', {}, { signal: polling.signal });
        Object.assign(bot, { username: me.username, id: String(me.id) });
        await tg('deleteWebhook', { drop_pending_updates: false }, { signal: polling.signal });
        await tg('setMyCommands', { commands: [{ command: 'start', description: 'Открыть Lo-fi' }, { command: 'help', description: 'Помощь' }] }).catch(() => {});
        for (const id of config.owners) {
          await tg('setMyCommands', {
            scope: { type: 'chat', chat_id: Number(id) },
            commands: [
              { command: 'start', description: 'Открыть Lo-fi' }, { command: 'admin', description: 'Панель управления' },
              { command: 'stats', description: 'Статистика' }, { command: 'broadcast', description: 'Новая рассылка' },
              { command: 'help', description: 'Все команды' },
            ],
          }).catch(() => {});
        }
        ready = true;
        console.info('Telegram: @' + me.username);
        broadcast.startScheduler();
      }
      const updates = await tg('getUpdates', { timeout: 25, offset, allowed_updates: ['message', 'callback_query', 'my_chat_member'] },
        { signal: polling.signal, timeout: 35000 });
      delay = 1000;
      for (const update of updates) {
        if (polling.signal.aborted) return;
        try { await handleUpdate(update); }
        catch (error) {
          console.warn('Telegram update:', error.message);
          const from = update.message?.from;
          if (from && db.isAdmin(from.id)) await send(update.message.chat.id, 'Не удалось выполнить действие: ' + (error.description || error.message)).catch(() => {});
        }
        offset = update.update_id + 1;
        db.setSetting('tg_offset', String(offset));
      }
    } catch (error) {
      if (polling.signal.aborted) break;
      console.warn('Telegram:', error.message);
      await sleep(error.retryAfter ? 1000 * error.retryAfter : delay);
      delay = Math.min(delay * 2, 30000);
    }
  }
}

module.exports = { runBot, stopBot: () => polling.abort() };
