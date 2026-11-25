'use strict';

// Тексты песен: свои LRC администратора, LRC из описания трека, LRCLIB, NetEase и lyrics.ovh.
// Поддерживается расширенный LRC с таймкодами слов <mm:ss.xx>.

const { LRU, memo, normQ, fetchRetry, statusError } = require('./util');
const { sql, now } = require('./db');
const { SC, trackView, plainText } = require('./soundcloud');

const TIME = String.raw`(\d{1,3}):([0-5]?\d)(?:[.:](\d{1,3}))?`;
const LINE_MARK = new RegExp(String.raw`\[${TIME}\]`, 'g');
const WORD_MARK = new RegExp(String.raw`<${TIME}>`, 'g');
const CREDIT_RE = /^\s*(?:作词|作曲|编曲|制作人|混音|母带|词|曲|lyrics?\s+by|written\s+by|composed\s+by)\s*[:：]/i;

const toMs = (min, sec, frac = '') => (Number(min) * 60 + Number(sec)) * 1000 + Number(String(frac).padEnd(3, '0').slice(0, 3) || 0);

function parseLrc(raw) {
  const text = String(raw || '').slice(0, 200000);
  const offset = Number(text.match(/\[offset:\s*([+-]?\d+)\]/i)?.[1] || 0);
  const lines = [];
  for (const source of text.split(/\r?\n/)) {
    const marks = [...source.matchAll(LINE_MARK)];
    if (!marks.length || marks[0].index > 2) continue;
    const last = marks.at(-1);
    const body = source.slice(last.index + last[0].length);
    const wordMarks = [...body.matchAll(WORD_MARK)];
    const clean = body.replace(WORD_MARK, '').replace(/\s+/g, ' ').trim();
    if (CREDIT_RE.test(clean)) continue;
    let words = null;
    if (wordMarks.length >= 2 && marks.length === 1) {
      words = [];
      const lead = body.slice(0, wordMarks[0].index).replace(/\s+/g, ' ');
      if (lead.trim()) words.push({ time: Math.max(0, toMs(marks[0][1], marks[0][2], marks[0][3]) + offset), text: lead });
      wordMarks.forEach((mark, i) => {
        const end = i + 1 < wordMarks.length ? wordMarks[i + 1].index : body.length;
        const piece = body.slice(mark.index + mark[0].length, end).replace(/\s+/g, ' ');
        if (piece.trim()) words.push({ time: Math.max(0, toMs(mark[1], mark[2], mark[3]) + offset), text: piece });
      });
      if (words.length < 1) words = null;
    }
    for (const mark of marks) {
      const line = { time: Math.max(0, toMs(mark[1], mark[2], mark[3]) + offset), text: clean };
      if (words) line.words = words;
      lines.push(line);
    }
  }
  lines.sort((a, b) => a.time - b.time);
  const unique = lines.filter((line, i) => !i || line.time !== lines[i - 1].time || line.text !== lines[i - 1].text);
  while (unique.length && !unique[0].text && unique.length > 1 && !unique[1].text) unique.shift();
  return unique.slice(0, 800);
}

function result(timed, plain, source) {
  const lines = parseLrc(timed);
  if (lines.filter(l => l.text).length >= 2) return { type: 'synced', lines, words: lines.some(l => l.words), source };
  const text = String(plain || '').replace(/\r/g, '').trim();
  if (text) return { type: 'plain', lines: text.split('\n').map(s => s.trim()).slice(0, 600), source };
  return null;
}

// ── сопоставление названий ──
const key = value => normQ(plainText(value)).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const NOISE_RE = /\s*[([](?:feat|ft|prod|with|official|audio|video|lyrics?|lyric\s+video|explicit|clean|remaster(?:ed)?|hq|cdq|visuali[sz]er|mv|clip|клип|премьера|prem)[^)\]]*[)\]]/gi;
function cleanTitle(title) {
  return plainText(title).replace(NOISE_RE, '')
    .replace(/\s+(?:feat|ft)\.?\s+.+$/i, '').replace(/\s+prod\.?\s+(?:by\s+)?.+$/i, '')
    .replace(/["«»“”]/g, '').replace(/\s+/g, ' ').trim();
}
const primaryArtist = artist => plainText(artist).split(/\s*(?:,|&|\+|\/|\sx\s|\sfeat\.?\s|\sft\.?\s|\sи\s|\sand\s)\s*/i)[0].trim();
function similar(a, b) {
  const x = key(a), y = key(b);
  if (!x || !y) return false;
  return x === y || (Math.min(x.length, y.length) >= 3 && (x.includes(y) || y.includes(x)));
}

async function getJson(url, params = {}) {
  const target = new URL(url);
  for (const [k, v] of Object.entries(params)) if (v !== '' && v !== undefined) target.searchParams.set(k, v);
  const response = await fetchRetry(target, { headers: { accept: 'application/json' } }, 1, 5000);
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    if (response.status === 404) return null;
    throw statusError(response);
  }
  return response.json();
}

async function fromLrclib(track) {
  const title = cleanTitle(track.title), artist = primaryArtist(track.artist);
  const variants = [[track.artist, track.title], [artist, title]].filter((v, i, all) => all.findIndex(x => x[0] === v[0] && x[1] === v[1]) === i);
  for (const [a, t] of variants) {
    const item = await getJson('https://lrclib.net/api/get', { artist_name: a, track_name: t, duration: track.dur || '' }).catch(() => null);
    if (item?.syncedLyrics) return result(item.syncedLyrics, item.plainLyrics, 'LRCLIB');
    if (item?.instrumental) return { type: 'instrumental', source: 'LRCLIB' };
  }
  const hits = await getJson('https://lrclib.net/api/search', { q: `${artist} ${title}` }) || [];
  const matches = hits.filter(h => similar(h.trackName, title) && (similar(h.artistName, artist) || similar(h.artistName, track.artist))
    && (!track.dur || Math.abs(h.duration - track.dur) <= 6))
    .sort((a, b) => Number(!!b.syncedLyrics) - Number(!!a.syncedLyrics) || Math.abs(a.duration - track.dur) - Math.abs(b.duration - track.dur));
  const best = matches[0];
  if (!best) return null;
  if (best.instrumental) return { type: 'instrumental', source: 'LRCLIB' };
  return result(best.syncedLyrics, best.plainLyrics, 'LRCLIB');
}

async function fromNetEase(track) {
  const title = cleanTitle(track.title), artist = primaryArtist(track.artist);
  const found = await getJson('https://music.163.com/api/search/get', { s: `${artist} ${title}`, type: 1, limit: 12 });
  const hit = found?.result?.songs?.find(song => similar(song.name, title)
    && song.artists?.some(a => similar(a.name, artist)) && (!track.dur || Math.abs(song.duration / 1000 - track.dur) <= 5));
  if (!hit) return null;
  const record = await getJson('https://music.163.com/api/song/lyric', { id: hit.id, lv: 1, kv: 1 });
  return result(record?.lrc?.lyric, null, 'NetEase');
}

async function fromOvh(track) {
  const data = await getJson('https://api.lyrics.ovh/v1/' + encodeURIComponent(primaryArtist(track.artist)) + '/' + encodeURIComponent(cleanTitle(track.title)));
  return result(null, data?.lyrics, 'lyrics.ovh');
}

const memory = new LRU(600, 30 * 60e3);

function readStored(id) {
  const row = sql('SELECT data, ts FROM lyrics_cache WHERE track_id = ?').get(id);
  if (!row) return null;
  try {
    const data = JSON.parse(row.data);
    const ttl = data.type === 'none' ? 3 * 864e5 : 30 * 864e5;
    return now() - row.ts < ttl ? data : null;
  } catch { return null; }
}
const store = (id, data) => sql('INSERT INTO lyrics_cache VALUES (?, ?, ?) ON CONFLICT(track_id) DO UPDATE SET data = excluded.data, ts = excluded.ts')
  .run(id, JSON.stringify(data), now());

async function lookup(id) {
  const raw = await SC.track(id);
  const embedded = result(raw.description, null, 'Описание трека');
  if (embedded?.type === 'synced' && embedded.lines.filter(l => l.text).length >= 4) return embedded;
  const track = trackView(raw);
  const settled = await Promise.allSettled([fromLrclib(track), fromNetEase(track)]);
  const records = settled.map(s => s.value).filter(Boolean);
  const best = records.find(r => r.type === 'synced' && r.words) || records.find(r => r.type === 'synced') || records.find(r => r.type === 'instrumental') || records[0];
  if (best) return best;
  const plain = await fromOvh(track).catch(error => { if (settled.every(s => s.status === 'rejected')) throw error; return null; });
  return plain || { type: 'none' };
}

function getLyrics(id) {
  id = String(id);
  const override = sql('SELECT lrc FROM lyrics WHERE track_id = ?').get(id);
  if (override) {
    const parsed = result(override.lrc, null, 'Lo-fi');
    if (parsed) return Promise.resolve(parsed);
  }
  return memo(memory, id, async () => {
    const stored = readStored(id);
    if (stored) return stored;
    const data = await lookup(id);
    store(id, data);
    return data;
  });
}

function setOverride(id, lrc) {
  sql('INSERT INTO lyrics VALUES (?, ?) ON CONFLICT(track_id) DO UPDATE SET lrc = excluded.lrc').run(String(id), lrc);
  memory.delete(String(id));
}
function removeOverride(id) {
  sql('DELETE FROM lyrics WHERE track_id = ?').run(String(id));
  sql('DELETE FROM lyrics_cache WHERE track_id = ?').run(String(id));
  memory.delete(String(id));
}
function clearCache() {
  sql('DELETE FROM lyrics_cache').run();
  memory.clear();
}
const overrideCount = () => sql('SELECT COUNT(*) AS n FROM lyrics').get().n;

module.exports = { parseLrc, getLyrics, setOverride, removeOverride, clearCache, overrideCount };
