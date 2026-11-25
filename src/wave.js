'use strict';

// «Моя волна»: бесконечный персональный поток. Зерна — лайки сессии, избранное и история,
// кандидаты — похожие треки SoundCloud, поиск под занятие и настроение, треки любимых артистов.
// Дальше фильтр (дизлайки, повторы, ускорения) и скоринг с учётом вкуса и характера волны.

const { SC, isPlayable, trackView, trackDupKey, meta, HARD_DERIV_RE, normName } = require('./soundcloud');
const { library } = require('./db');
const { shuffle } = require('./util');

const MOOD_RE = {
  calm: /chill|lo-?fi|ambient|acoustic|soft|sleep|jazz|piano|calm|relax|downtempo|chillhop|chillwave|dream|bossa|спокой|медлен/i,
  energetic: /phonk|drill|trap|edm|house|techno|dnb|drum|bass|rock|hard|workout|hype|rage|dubstep|electro|energ|бодр|gym/i,
  happy: /happy|summer|dance|pop|funk|disco|sunny|feel ?good|groove|tropical|upbeat|летн|весел|солнц/i,
  sad: /sad|melanch|emo|lonely|heartbreak|broken|cry|грус|печал|dark|depress|alone|одинок|slow/i,
};
const OPPOSITE = { calm: 'energetic', energetic: 'calm', happy: 'sad', sad: 'happy' };
const ACTIVITY = {
  wake: { mood: 'happy', query: 'morning chill pop' },
  work: { mood: 'calm', query: 'focus lofi beats' },
  workout: { mood: 'energetic', query: 'workout energetic beats' },
  sleep: { mood: 'calm', query: 'sleep ambient piano' },
  drive: { mood: 'energetic', query: 'night drive synthwave' },
};
const MOOD_QUERY = { calm: 'chill lofi beats', energetic: 'energetic beats', happy: 'feel good summer', sad: 'sad indie' };
const COLD = ['lofi hip hop beats', 'chillhop', 'chill indie', 'jazzhop', 'chill r&b'];

const ids = (value, max) => Array.isArray(value) ? [...new Set(value.map(String).filter(id => /^\d{1,15}$/.test(id)))].slice(0, max) : [];
const names = (value, max) => Array.isArray(value) ? value.map(v => String(v).slice(0, 140)).filter(Boolean).slice(0, max) : [];
const refs = (value, max) => Array.isArray(value) ? value.filter(v => v && /^\d{1,15}$/.test(String(v.id))).slice(0, max)
  .map(v => ({ id: String(v.id), artist: String(v.artist || '').slice(0, 140), userId: /^\d{1,15}$/.test(String(v.userId || '')) ? String(v.userId) : '' })) : [];

function pickWeighted(pool, count) {
  const chosen = [], left = [...pool];
  while (chosen.length < count && left.length) {
    const total = left.reduce((sum, item) => sum + item.w, 0);
    let roll = Math.random() * total, index = 0;
    for (; index < left.length - 1; index++) { roll -= left[index].w; if (roll <= 0) break; }
    chosen.push(left.splice(index, 1)[0]);
  }
  return chosen;
}

function moodOf(track) {
  const text = `${track.genre || ''} ${track.tag_list || ''} ${track.title || ''}`;
  return Object.fromEntries(Object.entries(MOOD_RE).map(([mood, re]) => [mood, re.test(text)]));
}

async function waveBatch(uid, body = {}) {
  const character = ['favorite', 'discover', 'popular'].includes(body.character) ? body.character : 'default';
  const activity = ACTIVITY[body.activity] ? body.activity : '';
  const mood = MOOD_RE[body.mood] ? body.mood : (activity ? ACTIVITY[activity].mood : '');
  const count = Math.min(20, Math.max(4, Number(body.count) || 10));
  const seedId = ids([body.seed], 1)[0] || '';
  const liked = ids(body.liked, 24);
  const played = new Set(ids(body.played, 400));
  const skipped = names(body.skipped, 40).map(normName);
  const taste = body.taste && typeof body.taste === 'object' ? body.taste : {};

  let favorites, recent, dislikes;
  if (uid) {
    favorites = library(uid, 'favorite', 120).map(t => ({ id: t.id, artist: t.artist, userId: t.userId || t.artistId || '' }));
    recent = library(uid, 'recent', 60).map(t => ({ id: t.id, artist: t.artist, userId: t.userId || t.artistId || '' }));
    dislikes = new Set(library(uid, 'dislike', 1000).map(t => t.id));
  } else {
    favorites = refs(body.favorites, 120);
    recent = refs(body.recent, 60);
    dislikes = new Set(ids(body.dislikes, 1000));
  }
  for (const id of ids(body.dislikes, 1000)) dislikes.add(id);
  for (const item of recent.slice(0, 25)) played.add(item.id);

  const tasteOf = artist => taste[artist] || 'normal';
  const known = new Set([...favorites, ...recent].map(t => normName(t.artist)).filter(Boolean));
  const likedArtists = new Set();

  // ── зерна ──
  const pool = [];
  if (seedId) pool.push({ id: seedId, w: 14 });
  liked.forEach((id, i) => pool.push({ id, w: 7 / (1 + i / 8) }));
  favorites.slice(0, 80).forEach((t, i) => { if (tasteOf(t.artist) !== 'never') pool.push({ id: t.id, w: 3 / (1 + i / 15) * (tasteOf(t.artist) === 'often' ? 2 : tasteOf(t.artist) === 'rare' ? .4 : 1) }); });
  recent.slice(0, 40).forEach((t, i) => { if (tasteOf(t.artist) !== 'never') pool.push({ id: t.id, w: 2 / (1 + i / 10) }); });
  const unique = [...new Map(pool.map(s => [s.id, s])).values()];
  const seeds = seedId ? [unique[0], ...pickWeighted(unique.slice(1), 2)] : pickWeighted(unique, 4);

  // ── кандидаты ──
  const candidates = new Map();
  const add = (track, hits, from) => {
    if (track?.kind !== 'track') return;
    const entry = candidates.get(track.id) || { track, hits: 0, from: new Set() };
    entry.hits += hits;
    entry.from.add(from);
    candidates.set(track.id, entry);
  };
  const related = await Promise.allSettled(seeds.map(seed => SC.related(seed.id, 25)));
  related.forEach((r, i) => { if (r.status === 'fulfilled') for (const t of r.value) add(t, seeds[i].w > 6 ? 1.6 : 1, 'related'); });

  const anchors = await Promise.allSettled([seedId, ...liked.slice(0, 10)].filter(Boolean).map(id => SC.track(id)));
  for (const r of anchors) if (r.status === 'fulfilled') likedArtists.add(normName(meta(r.value).artist));

  if (character === 'favorite') {
    const artists = [...new Map(favorites.filter(f => f.userId && tasteOf(f.artist) !== 'never').map(f => [f.userId, f])).values()];
    const picks = shuffle(artists).slice(0, 2);
    const lists = await Promise.allSettled(picks.map(a => SC.userTracks(a.userId)));
    for (const r of lists) if (r.status === 'fulfilled') for (const t of shuffle(r.value).slice(0, 12)) add(t, .9, 'artist');
    const favIds = shuffle(favorites).slice(0, 3).map(f => f.id).filter(id => !played.has(id));
    const favTracks = await Promise.allSettled(favIds.map(id => SC.track(id)));
    for (const r of favTracks) if (r.status === 'fulfilled') add(r.value, 1.2, 'favorite');
  }

  const steer = activity ? ACTIVITY[activity].query : mood ? MOOD_QUERY[mood] : '';
  if (steer || candidates.size < 24) {
    const query = steer || COLD[Math.floor(Math.random() * COLD.length)];
    try {
      const list = await SC.searchList('t', query, 60, false);
      for (const t of shuffle(list.items).slice(0, steer && candidates.size >= 24 ? 18 : 40)) add(t, steer ? .7 : .8, 'search');
    } catch { /* остаёмся на похожих */ }
  }

  // ── фильтр и скоринг ──
  // Если волна запущена от ускоренного трека — такие версии не отбрасываем.
  const seedDerivative = !!seedId && anchors[0]?.status === 'fulfilled' && HARD_DERIV_RE.test(String(anchors[0].value.title || '').normalize('NFKC'));
  const dupKeys = new Set();
  const scored = [];
  for (const { track, hits, from } of candidates.values()) {
    const id = String(track.id);
    if (played.has(id) || dislikes.has(id) || !isPlayable(track)) continue;
    const ms = track.full_duration || track.duration || 0;
    if (ms < 50e3 || ms > 15 * 60e3) continue;
    if (!seedDerivative && HARD_DERIV_RE.test(String(track.title || '').normalize('NFKC'))) continue;
    const { artist } = meta(track);
    const level = tasteOf(artist);
    if (level === 'never') continue;
    const dup = trackDupKey(track);
    if (dupKeys.has(dup)) continue;
    dupKeys.add(dup);
    const artistKey = normName(artist);
    const plays = track.playback_count || 0;
    let score = Math.log2(1 + hits) * 1.4 + Math.random() * 1.1;
    if (level === 'often') score += 1.2;
    if (level === 'rare') score -= 1.2;
    score -= Math.min(3, skipped.filter(s => s === artistKey).length * 1.4);
    if (likedArtists.has(artistKey)) score += .6;
    const isKnown = known.has(artistKey);
    if (character === 'favorite') score += isKnown ? 1 : 0;
    else if (character === 'discover') score += (isKnown ? -1.6 : .5) + (plays < 50000 ? .4 : 0);
    else if (character === 'popular') score += Math.log10(plays + 10) * .35;
    else score += Math.log10(plays + 10) * .1;
    if (mood) {
      const moods = moodOf(track);
      if (moods[mood]) score += 1.3;
      if (moods[OPPOSITE[mood]]) score -= .7;
    }
    if (from.has('favorite')) score -= .3;
    scored.push({ track, score, artistKey });
  }
  scored.sort((a, b) => b.score - a.score);

  const perArtist = new Map(), picked = [];
  for (const item of scored) {
    if (picked.length >= count) break;
    const n = perArtist.get(item.artistKey) || 0;
    if (n >= 2) continue;
    if (picked.at(-1)?.artistKey === item.artistKey) continue;
    perArtist.set(item.artistKey, n + 1);
    picked.push(item);
  }
  if (picked.length < count) {
    for (const item of scored) {
      if (picked.length >= count) break;
      if (!picked.includes(item)) picked.push(item);
    }
  }
  return { items: picked.map(p => trackView(p.track)), seeds: seeds.length, mood, character };
}

module.exports = { waveBatch };
