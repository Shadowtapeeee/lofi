'use strict';

// Стартовое сообщение /start: текст с форматированием и премиум-эмодзи, медиа и набор кнопок.

const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const { getJson, setJson, getSetting, setSetting, deleteSetting } = require('../db');
const { tg } = require('./api');

const PAGES = { home: 'Главная', wave: 'Моя волна', search: 'Поиск', library: 'Медиатека' };
const STYLES = ['', 'primary', 'success', 'danger'];
const STYLE_NAMES = { '': 'обычный', primary: 'синий', success: 'зелёный', danger: 'красный' };

const DEFAULT_CARD = Object.freeze({
  text: 'Lo-fi — музыка под настроение.\n\nВключите «Мою волну»: она подстроится под ваш вкус и не закончится.',
  entities: [],
  media: { type: 'default' },
  buttons: [
    [{ text: 'Открыть Lo-fi', kind: 'app', page: 'home', style: 'primary' }],
    [{ text: 'Моя волна', kind: 'app', page: 'wave' }],
  ],
});

function getCard() {
  const saved = getJson('start_config', null) || {};
  return {
    text: typeof saved.text === 'string' ? saved.text : DEFAULT_CARD.text,
    entities: Array.isArray(saved.entities) ? saved.entities : (typeof saved.text === 'string' ? [] : DEFAULT_CARD.entities),
    media: saved.media?.type ? saved.media : DEFAULT_CARD.media,
    buttons: Array.isArray(saved.buttons) ? saved.buttons : structuredClone(DEFAULT_CARD.buttons),
  };
}
const saveCard = card => setJson('start_config', card);
const resetCard = () => { deleteSetting('start_config'); };

function appLink(params = {}) {
  const url = new URL(config.appUrl + '/');
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  return url.href;
}

/** Сериализует кнопку в InlineKeyboardButton. */
function toButton(button, { payload = {}, plain = false } = {}) {
  const result = { text: String(button.text || 'Открыть').slice(0, 64) };
  if (button.kind === 'url' && button.url) result.url = button.url;
  else result.web_app = { url: appLink({ page: button.page && button.page !== 'home' ? button.page : '', ...payload }) };
  if (!plain) {
    if (button.emoji) result.icon_custom_emoji_id = button.emoji;
    if (STYLES.includes(button.style) && button.style) result.style = button.style;
  }
  return result;
}
const markup = (rows, options) => ({ inline_keyboard: rows.map(row => row.map(b => toButton(b, options))).filter(row => row.length) });

function welcomeFile() {
  for (const name of ['welcome.png', 'welcome.jpg']) {
    const file = path.join(config.publicDir, 'media', name);
    if (fs.existsSync(file)) return { file, name };
  }
  return null;
}

/** Параметры deep link: /start t_123 — открыть трек, /start w — волну. */
function payloadParams(payload = '') {
  const track = payload.match(/^t_(\d{1,15})$/)?.[1];
  if (track) return { track };
  if (payload === 'w' || payload === 'wave') return { page: 'wave' };
  return {};
}

async function sendCard(chatId, { payload = '', card = getCard() } = {}) {
  const params = payloadParams(payload);
  const attempts = [{}, { plain: true }, { plain: true, noCustomEmoji: true }, { plain: true, noCustomEmoji: true, noMedia: true }];
  let lastError;
  for (const attempt of attempts) {
    try { return await deliver(chatId, card, params, attempt); }
    catch (error) {
      if (error.status !== 400) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

async function deliver(chatId, card, params, { plain = false, noCustomEmoji = false, noMedia = false }) {
  const entities = (card.entities || []).filter(e => !noCustomEmoji || e.type !== 'custom_emoji');
  const reply_markup = card.buttons?.length && config.appUrl ? markup(card.buttons, { payload: params, plain }) : undefined;
  const media = noMedia ? { type: 'none' } : card.media;
  const text = card.text || ' ';

  if (media.type === 'none' || (media.type === 'default' && !welcomeFile())) {
    return tg('sendMessage', { chat_id: chatId, text, entities, reply_markup, link_preview_options: { is_disabled: true } });
  }
  const captionFits = text.length <= 1024;
  const caption = captionFits ? { caption: text, caption_entities: entities } : {};
  const markupOnMedia = captionFits ? { reply_markup } : {};
  let sent;
  if (media.type === 'default') {
    const cached = getSetting('start_default_photo_v3');
    if (cached) sent = await tg('sendPhoto', { chat_id: chatId, photo: cached, ...caption, ...markupOnMedia });
    else {
      const { file, name } = welcomeFile();
      const form = new FormData();
      form.append('chat_id', String(chatId));
      if (captionFits) {
        form.append('caption', text);
        form.append('caption_entities', JSON.stringify(entities));
        if (reply_markup) form.append('reply_markup', JSON.stringify(reply_markup));
      }
      form.append('photo', new Blob([fs.readFileSync(file)], { type: name.endsWith('.png') ? 'image/png' : 'image/jpeg' }), name);
      sent = await tg('sendPhoto', form, { timeout: 30000 });
      if (sent?.photo?.length) setSetting('start_default_photo_v3', sent.photo.at(-1).file_id);
    }
  } else {
    const method = { photo: 'sendPhoto', video: 'sendVideo', animation: 'sendAnimation' }[media.type] || 'sendPhoto';
    sent = await tg(method, { chat_id: chatId, [media.type in { photo: 1, video: 1, animation: 1 } ? media.type : 'photo']: media.file_id, ...caption, ...markupOnMedia });
  }
  if (!captionFits) return tg('sendMessage', { chat_id: chatId, text, entities, reply_markup, link_preview_options: { is_disabled: true } });
  return sent;
}

function describeButton(button) {
  const action = button.kind === 'url' ? 'ссылка ' + button.url : 'Mini App → ' + (PAGES[button.page] || PAGES.home);
  return `${button.text} · ${action}${button.emoji ? ' · эмодзи' : ''}${button.style ? ' · ' + STYLE_NAMES[button.style] : ''}`;
}

module.exports = { getCard, saveCard, resetCard, sendCard, markup, toButton, appLink, describeButton, PAGES, STYLES, STYLE_NAMES, DEFAULT_CARD };
