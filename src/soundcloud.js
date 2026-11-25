'use strict';

// Клиент каталога SoundCloud: поиск, метаданные, фильтр оригиналов и выбор потока.

const config = require('./config');
const { LRU, memo, lc, normQ, fetchRetry, statusError, httpError } = require('./util');
const { getSetting, setSetting, deleteSetting } = require('./db');

const SC_API = 'https://api-v2.soundcloud.com';

const cache = {
  lists: new LRU(200, 15 * 60e3),
  track: new LRU(5000, 60 * 60e3),
  playlist: new LRU(240, 30 * 60e3),
  resolve: new LRU(400, 60 * 60e3),
  related: new LRU(600, 60 * 60e3),
  user: new LRU(240, 30 * 60e3),
  userInfo: new LRU(240, 60 * 60e3),
};

async function scrapeClientId() {
  const response = await fetchRetry('https://soundcloud.com/', { headers: { accept: 'text/html' } });
  const page = await response.text();
  const scripts = [...page.matchAll(/<script[^>]+src="(https:\/\/[^"]*sndcdn\.com\/assets\/[^"]+\.js)"/g)].map(m => m[1]).reverse();
  for (const src of scripts.slice(0, 14)) {
    if (new URL(src).hostname !== 'a-v2.sndcdn.com') continue;
    try {
      const js = await (await fetchRetry(src, { redirect: 'error' }, 1, 5000)).text();
      const match = js.match(/[^\w]client_id\s*:\s*"([0-9a-zA-Z]{32})"/) || js.match(/client_id=([0-9a-zA-Z]{32})/);
      if (match) return match[1];
    } catch { /* следующий скрипт */ }
  }
  throw Error('Не удалось получить client_id SoundCloud');
}

const SC = {
  cid: config.scClientId || null,
  cidPromise: null,
  cidAt: 0,

  async clientId() {
    if (this.cid) return this.cid;
    const saved = getSetting('sc_client_id');
    if (saved) return (this.cid = saved);
    return this.refreshClientId();
  },

  refreshClientId() {
    this.cidPromise ??= scrapeClientId()
      .then(id => { this.cid = id; this.cidAt = Date.now(); setSetting('sc_client_id', id); return id; })
      .finally(() => { this.cidPromise = null; });
    return this.cidPromise;
  },

  async api(pathname, params = {}, canRetry = true) {
    const cid = await this.clientId();
    const url = new URL(pathname, SC_API);
    if (url.origin !== SC_API || url.username || url.password) throw Error('Неизвестный адрес API SoundCloud');
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    url.searchParams.set('client_id', cid);
    const response = await fetchRetry(url.href, { headers: { accept: 'application/json' }, redirect: 'error' });
    if ((response.status === 401 || response.status === 403) && canRetry && Date.now() - this.cidAt > 30e3 && !config.scClientId) {
      await response.body?.cancel().catch(() => {});
      this.cid = null;
      deleteSetting('sc_client_id');
      await this.refreshClientId();
      return this.api(pathname, params, false);
    }
    if (!response.ok) { await response.body?.cancel().catch(() => {}); throw statusError(response); }
    return response.json();
  },

  /**
   * Выдача поиска ('t' — треки, 'a' — альбомы) порциями по 50 (до 250): только воспроизводимое,
   * а с фильтром — только оригиналы без дублей. Страницы нарезаются локально и всегда полные.
   */
  async searchList(kind, q, need, originals) {
    const key = `${kind}|${originals ? 1 : 0}|${normQ(q)}`;
    let state = cache.lists.get(key);
    if (!state) cache.lists.set(key, state = { items: [], keys: new Map(), raw: 0, hidden: 0, done: false, pending: null });
    while (state.items.length < need && !state.done) {
      state.pending ??= this.fetchListPage(kind, q, state, originals).finally(() => { state.pending = null; });
      await state.pending;
    }
    return state;
  },

  async fetchListPage(kind, q, state, originals) {
    const params = { q, limit: 50, offset: state.raw, linked_partitioning: 1 };
    let result;
    if (kind === 't') result = await this.api('/search/tracks', params);
    else {
      try { result = await this.api('/search/albums', params); }
      catch { result = await this.api('/search/playlists', params); }
    }
    const collection = Array.isArray(result) ? result : (result.collection || []);
    state.raw += 50;
    if (!result.next_href || !collection.length || state.raw >= 250) state.done = true;
    for (const item of collection) {
      if (kind === 't') {
        if (item?.kind !== 'track') continue;
        cache.track.set(item.id, Promise.resolve(item));
        if (!isPlayable(item)) continue;
        if (originals && !isOriginalTrack(item)) { state.hidden++; continue; }
      } else {
        if (item?.kind !== 'playlist') continue;
        if (originals && !isOriginalAlbum(item)) { state.hidden++; continue; }
      }
      if (!originals) { state.items.push(item); continue; }
      const dupKey = kind === 't' ? trackDupKey(item) : albumDupKey(item);
      const index = state.keys.get(dupKey);
      if (index === undefined) { state.keys.set(dupKey, state.items.length); state.items.push(item); continue; }
      state.hidden++;
      if (officialScore(item) > officialScore(state.items[index])) state.items[index] = item;
    }
  },

  track(id, fresh = false) {
    if (fresh) cache.track.delete(Number(id));
    return memo(cache.track, Number(id), () => this.api(`/tracks/${Number(id)}`));
  },

  /** Догружает полные карточки треков (в альбомах SoundCloud отдаёт заглушки). */
  async tracks(stubs) {
    const details = new Map(), missing = [];
    for (const item of stubs) {
      const id = Number(item.id);
      const known = item.title && item.media ? item : await cache.track.get(id)?.catch(() => null);
      if (known) details.set(id, known);
      else missing.push(id);
    }
    for (let offset = 0; offset < missing.length; offset += 50) {
      const chunk = missing.slice(offset, offset + 50);
      try {
        const response = await this.api('/tracks', { ids: chunk.join(',') });
        for (const t of (Array.isArray(response) ? response : response.collection || [])) details.set(Number(t.id), t);
      } catch { /* ниже добираем по одному */ }
      const absent = chunk.filter(id => !details.has(id));
      for (let i = 0; i < absent.length; i += 6) {
        await Promise.all(absent.slice(i, i + 6).map(async id => { try { details.set(id, await this.track(id)); } catch {} }));
      }
    }
    for (const [id, t] of details) cache.track.set(id, Promise.resolve(t));
    return stubs.map(stub => details.get(Number(stub.id)) || stub);
  },

  playlist(id) {
    return memo(cache.playlist, Number(id), () => this.api('/playlists/' + Number(id)));
  },

  related(id, limit = 20) {
    return memo(cache.related, Number(id) + ':' + limit, async () => {
      const result = await this.api(`/tracks/${Number(id)}/related`, { limit });
      const items = (result.collection || []).filter(t => t?.kind === 'track');
      for (const t of items) cache.track.set(t.id, Promise.resolve(t));
      return items;
    });
  },

  userTracks(userId) {
    return memo(cache.user, Number(userId), async () => {
      const result = await this.api(`/users/${Number(userId)}/tracks`, { limit: 80, linked_partitioning: 1 });
      const items = (result.collection || []).filter(t => t?.kind === 'track');
      for (const t of items) cache.track.set(t.id, Promise.resolve(t));
      return items.filter(isPlayable);
    });
  },

  user(userId) {
    return memo(cache.userInfo, Number(userId), () => this.api('/users/' + Number(userId)));
  },

  async resolve(raw) {
    const url = await expandUrl(raw);
    return memo(cache.resolve, url, () => this.api('/resolve', { url }));
  },

  async streamUrl(transcoding, track) {
    const result = await this.api(transcoding.url, { track_authorization: track.track_authorization });
    if (!result?.url) throw Error('SoundCloud не отдал ссылку на поток');
    return result.url;
  },
};

// ── ссылки ──
const SC_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com', 'soundcloud.app.goo.gl']);
function soundcloudUrl(value) {
  let raw = String(value ?? '').trim().replace(/[)\].,!?]+$/, '');
  if (!raw) return null;
  if (!/^[a-z]+:\/\//i.test(raw)) raw = 'https://' + raw;
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || !SC_HOSTS.has(url.hostname) || url.port || url.username || url.password || url.pathname === '/') return null;
    url.protocol = 'https:';
    return url;
  } catch { return null; }
}

async function expandUrl(raw) {
  let url = soundcloudUrl(raw);
  if (!url) throw httpError(400, 'Неверная ссылка каталога');
  for (let i = 0; i < 4 && ['on.soundcloud.com', 'soundcloud.app.goo.gl'].includes(url.hostname); i++) {
    const response = await fetchRetry(url, { redirect: 'manual' }, 1, 6000);
    await response.body?.cancel().catch(() => {});
    const location = response.headers.get('location');
    if (!location || response.status < 300 || response.status >= 400) throw statusError(response);
    url = soundcloudUrl(new URL(location, url).href);
    if (!url) throw httpError(400, 'Некорректная короткая ссылка');
  }
  if (!['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'].includes(url.hostname)) throw httpError(400, 'Не удалось раскрыть ссылку');
  url.hostname = 'soundcloud.com';
  url.search = '';
  url.hash = '';
  return url.href.replace(/\/$/, '');
}

/** Безопасный адрес медиа SoundCloud: только https на их CDN, без порта и учётных данных. */
function isMediaHost(url) {
  try {
    const u = url instanceof URL ? url : new URL(url);
    return u.protocol === 'https:' && !u.port && !u.username && !u.password
      && /(?:^|\.)(?:sndcdn\.com|soundcloud\.cloud)$/.test(u.hostname);
  } catch { return false; }
}

// ── метаданные ──
function meta(t) {
  const publisher = t?.publisher_metadata?.artist;
  let artist = publisher || t?.user?.username || 'Неизвестный артист';
  let title = t?.title || 'Без названия';
  if (!publisher) {
    const m = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (m) { artist = m[1]; title = m[2]; }
  }
  return { artist: String(artist).trim(), title: String(title).trim(), dur: Math.round((t?.full_duration || t?.duration || 0) / 1000) };
}

function art(o, size = 't500x500') {
  const url = o?.artwork_url || (o?.kind === 'track' ? o?.user?.avatar_url : null);
  if (!url || /default_avatar/.test(url)) return null;
  return url.replace(/-(?:large|t\d+x\d+|crop|original|badge|small|tiny|mini)\.(?:jpe?g|png)$/i, `-${size}.jpg`);
}
function artUrl(o, size) {
  try {
    const url = new URL(art(o, size));
    return url.protocol === 'https:' && /\.sndcdn\.com$/.test(url.hostname) ? url.href : '';
  } catch { return ''; }
}

function yearOf(o) {
  const date = o?.release_date || o?.published_at || o?.display_date || o?.created_at;
  const year = date ? new Date(date).getFullYear() : 0;
  return year > 1990 ? year : '';
}

function fullTranscodings(t) {
  return (t?.media?.transcodings || []).filter(x => !x.snipped && x.url && x.format && !/encrypted/i.test(x.format.protocol || ''));
}

function isPlayable(t) {
  return !!t && t.kind === 'track' && t.policy !== 'BLOCK' && t.policy !== 'SNIP' && t.streamable !== false && fullTranscodings(t).length > 0;
}

// ── оригинал или пользовательский перезалив ──
// SoundCloud не помечает официальные релизы одним полем, поэтому решение складывается из признаков:
//  • сильные (сразу оригинал): ISRC/UPC от дистрибьютора, верифицированный автор, лейбл вместе с ℗;
//  • отбраковка: ускорения, ремиксы и каверы в названии, «канальный» ник, чужой артист в метаданных
//    или в названии вида «артист — трек», сборники и «фонк 2026»;
//  • одинаковые треки и альбомы от разных аккаунтов схлопываются, остаётся самый официальный.
const HARD_DERIV_RE = new RegExp([
  'sped[\\s-]*up', 'speed[\\s-]*up', 'slowed', 'reverb', 'nightcore', 'bass\\s*boost', '\\b8d\\b', 'type\\s*beat', 'karaoke',
  'tik\\s*tok', '\\b\\d+\\s*(?:hours?|hrs?)\\b', 're-?upload', 'snippet', '\\bleak', 'ускор', 'замедл', 'караоке', 'перезалив',
  'сниппет', 'слив', '\\(час\\)', '\\d+\\s*час', '\\sс\\s+тт(?:\\s|$)', 'из\\s+(?:тт|тик\\s*тока)',
].join('|'), 'i');
const SOFT_DERIV_RE = new RegExp([
  '\\bremix', '\\brmx\\b', 'mash[\\s-]*up', '\\bcover\\b', '\\bloop(?:ed)?\\b', '\\bextended\\b', '\\bedit\\b', '\\bbootleg',
  '\\bflip\\b', 'acapella', 'a\\s*cappella', '\\binstrumental', 'ремикс', 'кавер', 'минус', 'фонк', 'phonk', '\\blo-?fi\\b',
  '\\b(?:rock|piano|guitar|acoustic|orchestral|jazz|metal|8-?bit|rus|eng|russian|english)\\s+(?:version|ver\\.?)',
].join('|'), 'i');
const CHANNEL_RE = /\btunes\b|\bhq\b|lyrics|archive|\bleaks?\b|unreleased|re-?uploads?|fan\s*page|\bvault\b|slowed|sped\s*up|nightcore|\bremix(?:es)?\b|\bedits\b|playlist|перезалив|хиты|музыка\s+для|фонк|phonk/i;
const COMPILATION_RE = /сборник|compilation|playlist|плейлист|\bhits\b|хиты|best\s*of|лучшее|\btop\s*\d+|топ\s*\d+|для\s+(?:зала|машины|тренировок?|дрифта|сна|учёбы|учебы|работы)|\bvol\.?\s*\d/i;
const GENERIC_TITLE_RE = /^\s*(?:фонк|phonk|рэп|rap|музыка|music|бит|beat|трек|track|песня|song|хит|hit)(?:\s+(?:20\d\d|\d{1,2}))?\s*$/i;

/** «𝐒𝐩𝐞𝐝 𝐔𝐩» и прочие декоративные буквы → обычные, чтобы их не обходили проверкой. */
const plainText = s => String(s ?? '').normalize('NFKC');
const normName = s => lc(s).normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '');

function sameArtist(artist, ...names) {
  const parts = lc(artist).split(/\s*(?:,|&|\+|\/|;|\sx\s|\sи\s|\sfeat\.?\s|\sft\.?\s|\sand\s|\swith\s)\s*/).map(normName).filter(Boolean);
  const candidates = names.filter(Boolean).map(normName).filter(Boolean);
  return parts.some(p => candidates.some(n => p === n || (p.length >= 3 && n.length >= 3 && (n.includes(p) || p.includes(n)))));
}

function isOfficialTrack(t) {
  const pm = t?.publisher_metadata || {}, user = t?.user || {};
  return !!(pm.isrc || pm.upc_or_ean || user.verified || user.badges?.verified || (t.label_name && pm.p_line));
}

function isOriginalTrack(t) {
  const title = plainText(t.title), uname = plainText(t.user?.username), pmArtist = t.publisher_metadata?.artist;
  if (HARD_DERIV_RE.test(title)) return false;
  if (t.user?.verified || t.user?.badges?.verified) return true;
  const prefix = title.match(/^(.+?)\s+[-–—]\s+.+$/)?.[1];
  const foreignPrefix = !!prefix && !sameArtist(prefix, uname, pmArtist);
  if (isOfficialTrack(t)) return !foreignPrefix;
  if (SOFT_DERIV_RE.test(title) || COMPILATION_RE.test(title) || GENERIC_TITLE_RE.test(title)) return false;
  if (CHANNEL_RE.test(uname)) return false;
  if (pmArtist && !sameArtist(pmArtist, uname)) return false;
  if (foreignPrefix) return false;
  const by = title.match(/\bby\s+([^\s()[\]]+)/i);
  if (by && !sameArtist(by[1], uname, pmArtist)) return false;
  return true;
}

function isOriginalAlbum(p) {
  const user = p?.user || {};
  const title = plainText(p.title), uname = plainText(user.username);
  if (HARD_DERIV_RE.test(title)) return false;
  if (user.verified || user.badges?.verified || p.label_name) return true;
  if (SOFT_DERIV_RE.test(title) || COMPILATION_RE.test(title) || GENERIC_TITLE_RE.test(title)) return false;
  if (CHANNEL_RE.test(uname)) return false;
  const m = title.match(/^(.+?)\s+[-–—]\s+.+$/);
  if (m && !sameArtist(m[1], uname)) return false;
  return true;
}

const officialScore = x => (isOfficialTrack(x) || x?.user?.verified ? 1e12 : 0) + (x?.user?.followers_count || 0);
const DUP_NOISE_RE = /\s*[([](?:feat|ft|prod|with|explicit|clean|official|audio|video|lyrics?|remaster|cdq|hq)[^)\]]*[)\]]/gi;
function trackDupKey(t) {
  const m = meta(t);
  let title = plainText(m.title).replace(DUP_NOISE_RE, ' ');
  const pre = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (pre && sameArtist(pre[1], m.artist)) title = pre[2];
  return `${normName(m.artist)}|${normName(title)}`;
}
const albumDupKey = p => `${normName(plainText(p.title).replace(/^.+?\s+[-–—]\s+/, '').replace(DUP_NOISE_RE, ' '))}|${p.track_count || 0}`;

function canvasUrl(track) {
  const value = track.visuals?.visuals?.find(item => /\.mp4(?:\?|$)/i.test(item.visual_url || ''))?.visual_url || '';
  return isMediaHost(value) ? value : '';
}

/** Компактное представление трека для клиента. */
function trackView(track) {
  const { title: rawTitle, artist, dur } = meta(track);
  const title = lc(rawTitle).startsWith(lc(artist) + ' - ') ? rawTitle.slice(artist.length + 3) : rawTitle;
  const own = normQ(artist) === normQ(track.user?.username);
  return {
    id: String(track.id), title, artist, dur, available: isPlayable(track),
    artistId: own && track.user?.id ? String(track.user.id) : '',
    userId: track.user?.id ? String(track.user.id) : '',
    avatar: own ? artUrl({ artwork_url: track.user.avatar_url }, 't200x200') : '',
    artwork: artUrl(track, 't500x500'),
    canvas: canvasUrl(track),
    url: soundcloudUrl(track.permalink_url || '')?.href || '',
    album: track.publisher_metadata?.album_title || '',
    genre: String(track.genre || '').slice(0, 40),
    explicit: !!track.publisher_metadata?.explicit,
  };
}

function albumView(album) {
  const artist = album.publisher_metadata?.artist || album.user?.username || 'Исполнитель';
  return {
    id: String(album.id), title: album.title || 'Без названия', artist,
    artistId: album.user?.id && (!album.publisher_metadata?.artist || normQ(artist) === normQ(album.user.username)) ? String(album.user.id) : '',
    count: album.track_count || 0, year: yearOf(album), artwork: artUrl(album, 't500x500'),
    url: soundcloudUrl(album.permalink_url || '')?.href || '',
  };
}

const playables = (tracks, originals = false) => tracks.filter(t => isPlayable(t) && (!originals || isOriginalTrack(t))).map(trackView);

module.exports = {
  SC, cache, soundcloudUrl, expandUrl, isMediaHost, meta, art, artUrl, yearOf, fullTranscodings, isPlayable,
  isOriginalTrack, isOriginalAlbum, isOfficialTrack, sameArtist, normName, plainText, trackDupKey,
  HARD_DERIV_RE, trackView, albumView, playables,
};
