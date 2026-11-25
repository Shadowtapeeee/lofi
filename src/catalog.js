'use strict';

// Высокоуровневые выборки каталога для API: поиск, альбомы, артисты, подборки и поток.

const { LRU, memo, normQ, httpError } = require('./util');
const {
  SC, soundcloudUrl, isMediaHost, meta, fullTranscodings, isPlayable, trackView, albumView, playables, cache, artUrl,
} = require('./soundcloud');

const MOODS = Object.freeze([
  { id: 'focus', name: 'В потоке', note: 'Для концентрации', query: 'jazz lofi beats' },
  { id: 'rain', name: 'За окном дождь', note: 'Спокойный фон', query: 'rain lofi beats' },
  { id: 'night', name: 'Поздняя ночь', note: 'Тихий вечер', query: 'late night chillhop' },
  { id: 'drive', name: 'В дороге', note: 'Ровный темп', query: 'night drive synthwave' },
  { id: 'energy', name: 'Заряд', note: 'Для движения', query: 'energetic workout beats' },
  { id: 'sleep', name: 'Перед сном', note: 'Медленно и мягко', query: 'ambient sleep piano' },
]);

const GENRES = Object.freeze([
  { name: 'Lo-fi', query: 'lofi hip hop' }, { name: 'Рэп', query: 'русский рэп' }, { name: 'Фонк', query: 'phonk' },
  { name: 'Инди', query: 'indie' }, { name: 'Джаз', query: 'jazz' }, { name: 'Эмбиент', query: 'ambient' },
  { name: 'Хаус', query: 'deep house' }, { name: 'Поп', query: 'pop' },
]);

const PAGE = 12;

async function listTracks(q, kind, page, originals) {
  const url = soundcloudUrl(q);
  if (url) {
    const found = await SC.resolve(url.href);
    if (found?.kind === 'track' && isPlayable(found)) {
      cache.track.set(found.id, Promise.resolve(found));
      return { items: [trackView(found)], label: meta(found).title, kind: 't', more: false };
    }
    if (found?.kind === 'playlist') return albumTracks(found.id, page);
    if (found?.kind === 'user') {
      return { items: playables(await SC.userTracks(found.id), originals), label: found.username, kind: 't', more: false, artist: userView(found) };
    }
    return { items: [], kind: 't', more: false };
  }
  if (/^https?:\/\//i.test(q)) throw httpError(400, 'Вставьте ссылку на трек, альбом или артиста SoundCloud');
  if (kind === 'u') {
    const result = await SC.api('/search/users', { q, limit: PAGE + 1, offset: page * PAGE });
    const users = Array.isArray(result) ? result : result.collection || [];
    return { kind: 'u', more: users.length > PAGE, items: users.slice(0, PAGE).map(userView) };
  }
  const result = await SC.searchList(kind, q, (page + 1) * PAGE + 1, originals);
  const items = result.items.slice(page * PAGE, page * PAGE + PAGE).map(kind === 'a' ? albumView : trackView);
  return { items, kind, more: result.items.length > (page + 1) * PAGE, hidden: result.hidden };
}

function userView(user) {
  return {
    id: String(user.id), title: user.username || 'Артист',
    artwork: artUrl({ artwork_url: user.avatar_url }, 't500x500'),
    followers: user.followers_count || 0, verified: !!(user.verified || user.badges?.verified),
  };
}

async function albumTracks(id, page = 0) {
  const album = await SC.playlist(id);
  const start = page * 50;
  const all = album.tracks || [];
  const tracks = await SC.tracks(all.slice(start, start + 50));
  const items = tracks.map((t, i) => t.title ? trackView(t) : {
    id: String(t.id), title: 'Дорожка ' + (start + i + 1), artist: album.user?.username || '', available: false, dur: 0,
  });
  return { items, label: album.title, album: albumView(album), kind: 't', more: start + 50 < all.length };
}

async function artistView(name, id) {
  if (id) {
    const [user, tracks] = await Promise.all([SC.user(id), SC.userTracks(id)]);
    const view = userView(user);
    return { label: user.username, portrait: view.artwork, followers: view.followers, verified: view.verified,
      bio: String(user.description || '').slice(0, 900), items: tracks.map(trackView) };
  }
  const result = await SC.searchList('t', name, 60, false);
  const items = result.items.map(trackView).filter(t => normQ(t.artist) === normQ(name)
    || t.artist.split(/,\s+|\s+&\s+|\s+(?:feat\.?|ft\.?|x)\s+/i).some(a => normQ(a) === normQ(name)));
  return { label: name, items, portrait: items.find(t => t.avatar)?.avatar || items[0]?.artwork || '' };
}

async function moodView(id, page = 0) {
  const mood = MOODS.find(item => item.id === id);
  if (!mood) throw httpError(404, 'Подборка не найдена');
  const data = await listTracks(mood.query, 't', page, false);
  return { ...data, label: mood.name, note: mood.note };
}

const shelfCache = new LRU(8, 20 * 60e3);
const home = () => memo(shelfCache, 'home', async () => {
  const result = await SC.searchList('t', 'chillhop music', 13, false);
  return { items: result.items.slice(0, 12).map(trackView) };
});
const releases = () => memo(shelfCache, 'releases', async () => {
  const result = await SC.searchList('a', 'chillhop essentials', 10, false);
  return { items: result.items.slice(0, 10).map(albumView) };
});

// ── выбор потока ──
const bitrateOf = t => Number((t.preset || '').match(/(?:^|[_-])(64|96|128|160|192|256|320|1411)k?(?=[_-]|$)/)?.[1]) || (/mp3/.test(t.preset || '') ? 128 : 0);

function candidates(track, max) {
  const rank = t => bitrateOf(t) > max ? -bitrateOf(t) : bitrateOf(t);
  return fullTranscodings(track)
    .filter(t => ['progressive', 'hls'].includes(t.format.protocol) && /mpeg|mp4|aac|flac/i.test(t.format.mime_type || ''))
    .sort((a, b) => rank(b) - rank(a) || Number(b.format.protocol === 'progressive') - Number(a.format.protocol === 'progressive'));
}

const streamCache = new LRU(600, 120e3);
function playback(id, quality = 'high') {
  const max = quality === 'normal' ? 128 : 320;
  return memo(streamCache, id + ':' + max, async () => {
    const track = await SC.track(id);
    if (!isPlayable(track)) throw httpError(404, 'Этот трек недоступен для воспроизведения');
    const view = trackView(track);
    for (const transcoding of candidates(track, max)) {
      try {
        const url = new URL(await SC.streamUrl(transcoding, track));
        if (isMediaHost(url)) return { track: view, source: url.href, bitrate: bitrateOf(transcoding) || null, protocol: transcoding.format.protocol };
      } catch { /* следующий формат, затем виджет */ }
    }
    if (!view.url) throw httpError(404, 'Каталог не вернул доступный поток');
    return { track: view, source: '', protocol: 'widget' };
  });
}

module.exports = { MOODS, GENRES, listTracks, albumTracks, artistView, moodView, home, releases, playback, candidates, bitrateOf };
