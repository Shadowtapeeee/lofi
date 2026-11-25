'use strict';

const config = require('../config');
const { sleep } = require('../util');

const bot = { username: '', id: '' };

async function tg(method, data = {}, { signal, timeout = 20000 } = {}) {
  if (!config.token) throw Error('BOT_TOKEN не задан');
  const multipart = data instanceof FormData;
  const response = await fetch(`https://api.telegram.org/bot${config.token}/${method}`, {
    method: 'POST',
    headers: multipart ? {} : { 'content-type': 'application/json' },
    body: multipart ? data : JSON.stringify(data),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout),
  });
  let result;
  try { result = await response.json(); }
  catch { throw Object.assign(Error(`${method}: HTTP ${response.status}`), { status: response.status }); }
  if (!result.ok) {
    throw Object.assign(Error(`${method}: ${result.description || 'ошибка Telegram API'}`), {
      status: result.error_code || response.status, retryAfter: result.parameters?.retry_after, description: result.description || '',
    });
  }
  return result.result;
}

/** Вызов с ожиданием при 429 (для рассылок и массовых операций). */
async function tgPatient(method, data, tries = 4) {
  for (let attempt = 0; ; attempt++) {
    try { return await tg(method, data); }
    catch (error) {
      if (error.status === 429 && attempt < tries) { await sleep((error.retryAfter || 1) * 1000 + 250); continue; }
      throw error;
    }
  }
}

async function downloadFile(fileId, maxBytes = 65536) {
  const file = await tg('getFile', { file_id: fileId });
  if (!file.file_path || (file.file_size && file.file_size > maxBytes)) throw Error('Файл слишком большой');
  const response = await fetch(`https://api.telegram.org/file/bot${config.token}/${file.file_path}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('Не удалось скачать файл');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) throw Error('Файл слишком большой');
  return buffer;
}

const send = (chatId, text, extra = {}) => tg('sendMessage', { chat_id: chatId, text, link_preview_options: { is_disabled: true }, ...extra });
const inline = rows => ({ inline_keyboard: rows.filter(row => row?.length) });
const cb = (text, data) => ({ text, callback_data: data });

module.exports = { tg, tgPatient, downloadFile, send, inline, cb, bot };
