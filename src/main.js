'use strict';

const fs = require('node:fs');
const config = require('./config');
const db = require('./db');
const { createServer, reloadPublic } = require('./server');
const { runBot, stopBot } = require('./telegram/bot');

function main() {
  if (process.argv.includes('--init-db')) {
    db.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    db.db.close();
    return;
  }
  db.housekeeping();
  setInterval(() => { try { db.housekeeping(); } catch (error) { console.warn('Обслуживание БД:', error.message); } }, 6 * 3600e3).unref();

  const server = createServer();
  server.listen(config.port, config.host, () => {
    console.info(`Lo-fi ${config.version}: http://localhost:${config.port}`);
    if (config.token && config.appUrl) void runBot();
    else if (config.token) console.info('Бот не запущен: задайте APP_URL (публичный HTTPS-адрес Mini App).');
    else console.info('Режим браузера: задайте BOT_TOKEN и APP_URL, чтобы запустить Telegram-бота.');
  });

  if (process.argv.includes('--dev')) {
    let timer;
    fs.watch(config.publicDir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => { try { reloadPublic(); console.info('public/ перечитан'); } catch {} }, 120);
    });
  }

  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    stopBot();
    server.close(() => { db.db.close(); process.exit(0); });
    setTimeout(() => process.exit(0), 2500).unref();
  });
}

module.exports = { main };
