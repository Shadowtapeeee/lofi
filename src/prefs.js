'use strict';

// Единая схема настроек. Клиент получает её как ES-модуль /js/schema.js,
// сервер проверяет по ней всё, что приходит от клиента.

const config = require('./config');

const CHOICES = Object.freeze({
  theme: ['system', 'dark', 'light'],
  quality: ['high', 'normal'],
  lyricSize: ['s', 'm', 'l', 'xl'],
  playerBg: ['cover', 'wave', 'plain'],
  motion: ['full', 'reduced'],
  textScale: ['s', 'm', 'l'],
  waveMood: ['any', 'calm', 'energetic', 'happy', 'sad'],
  waveActivity: ['any', 'wake', 'work', 'workout', 'sleep', 'drive'],
  waveCharacter: ['default', 'favorite', 'discover', 'popular'],
});

const FLAGS = Object.freeze({
  glass: true, dynamicColor: true, autoplay: true, gapless: true, crossfade: false, normalize: false,
  originals: config.originalsByDefault, lyricBlur: true, lyricFollow: true, canvas: true, visualizer: true, haptics: true,
});

const RANGES = Object.freeze({
  volume: [0, 100, 80],
  crossfadeSec: [2, 12, 6],
  lyricOffset: [-5000, 5000, 0],
});

const TASTE = ['often', 'normal', 'rare', 'never'];

const DEFAULTS = Object.freeze({
  ...Object.fromEntries(Object.entries(CHOICES).map(([key, values]) => [key, values[0]])),
  ...FLAGS,
  ...Object.fromEntries(Object.entries(RANGES).map(([key, [, , value]]) => [key, value])),
  taste: {},
});

function cleanPrefs(value) {
  const prefs = { ...DEFAULTS, taste: {} };
  if (!value || typeof value !== 'object') return prefs;
  for (const [key, values] of Object.entries(CHOICES)) if (values.includes(value[key])) prefs[key] = value[key];
  for (const key of Object.keys(FLAGS)) if (typeof value[key] === 'boolean') prefs[key] = value[key];
  for (const [key, [min, max]] of Object.entries(RANGES)) {
    if (Number.isFinite(value[key])) prefs[key] = Math.round(Math.min(max, Math.max(min, value[key])));
  }
  if (value.taste && typeof value.taste === 'object') {
    prefs.taste = Object.fromEntries(Object.entries(value.taste)
      .filter(([artist, level]) => artist.length > 0 && artist.length <= 140 && TASTE.includes(level) && level !== 'normal')
      .slice(-80));
  }
  return prefs;
}

const schemaModule = () => [
  '// Сгенерировано сервером из src/prefs.js',
  'export const CHOICES = ' + JSON.stringify(CHOICES) + ';',
  'export const DEFAULTS = ' + JSON.stringify(DEFAULTS) + ';',
  'export const RANGES = ' + JSON.stringify(RANGES) + ';',
  'export const TASTE = ' + JSON.stringify(TASTE) + ';',
  '',
].join('\n');

module.exports = { CHOICES, FLAGS, RANGES, TASTE, DEFAULTS, cleanPrefs, schemaModule };
