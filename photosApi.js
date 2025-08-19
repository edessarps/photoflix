import { GOOGLE_CLIENT_ID, USE_LIVE_API } from './config.js';

let token = null;
let tokenExp = 0;
let tokenClient = null;

export function isLive() { return USE_LIVE_API; }

export function initAuth() {
  if (!USE_LIVE_API) return;
  window.addEventListener('load', () => {
    if (!window.google || !google.accounts || !google.accounts.oauth2) return;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/photoslibrary.readonly openid email',
      callback: (resp) => {
        if (resp && resp.access_token) {
          token = resp.access_token;
          tokenExp = Date.now() + 55 * 60 * 1000; // 55 min
          document.dispatchEvent(new CustomEvent('photos:authed'));
        }
      },
    });
  });
}

export function signIn() {
  if (!USE_LIVE_API) return Promise.reject(new Error('Live API disabled'));
  return new Promise((resolve) => {
    tokenClient.requestAccessToken({ prompt: 'consent' });
    const onAuthed = () => { document.removeEventListener('photos:authed', onAuthed); resolve(); };
    document.addEventListener('photos:authed', onAuthed);
  });
}

export function signOut() {
  token = null; tokenExp = 0;
  if (window.google?.accounts?.oauth2?.revoke) {
    // Revoke last token (best effort)
    try { google.accounts.oauth2.revoke(token, () => {}); } catch (_) {}
  }
}

async function ensureToken() {
  if (!USE_LIVE_API) throw new Error('Live API disabled');
  if (token && Date.now() < tokenExp) return token;
  await signIn();
  return token;
}

async function gFetch(url, opts={}) {
  const t = await ensureToken();
  const res = await fetch(url, {
    ...opts,
    headers: { ...(opts.headers||{}), Authorization: `Bearer ${t}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} — ${body}`);
  }
  return res.json();
}

export async function listAlbums() {
  if (!USE_LIVE_API) throw new Error('Live API disabled');
  const out = [];
  let pageToken = null;
  do {
    const qs = new URLSearchParams({ pageSize: '50', ...(pageToken?{pageToken}:{}) });
    const data = await gFetch(`https://photoslibrary.googleapis.com/v1/albums?${qs}`);
    for (const a of (data.albums || [])) {
      out.push({
        id: a.id,
        title: a.title || 'Album',
        itemCount: Number(a.mediaItemsCount || 0),
        coverUrl: a.coverPhotoBaseUrl || '',
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}

export async function listAlbumItems(albumId) {
  if (!USE_LIVE_API) throw new Error('Live API disabled');
  const items = [];
  let pageToken = null;
  do {
    const body = { albumId, pageSize: 100, ...(pageToken?{pageToken}:{}) };
    const data = await gFetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    for (const m of (data.mediaItems || [])) {
      const meta = m.mediaMetadata || {};
      items.push({
        id: m.id,
        albumId,
        baseUrl: m.baseUrl,
        mimeType: m.mimeType || 'image/jpeg',
        width: Number(meta.width || 0),
        height: Number(meta.height || 0),
        creationTime: meta.creationTime || null,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

/* ---------- DEMO DATA (offline / sans login) ---------- */
function seedUrl(seed, w=1200, h=675) { return `https://picsum.photos/seed/${seed}/${w}/${h}`; }

export function demoAlbums() {
  const now = Date.now();
  const albums = [
    { id: 'leonie', title: 'Naissance de Léonie', itemCount: 300, coverUrl: seedUrl(1025) },
    { id: 'vac2024', title: 'Vacances Été 2024', itemCount: 180, coverUrl: seedUrl(1003) },
    { id: 'we', title: 'Week-ends en famille', itemCount: 120, coverUrl: seedUrl(1033) },
    { id: 'famille', title: 'Moments en famille', itemCount: 240, coverUrl: seedUrl(1012) },
    { id: 'sport', title: 'Activités sportives', itemCount: 90, coverUrl: seedUrl(1044) },
    { id: 'misc', title: 'Souvenirs divers', itemCount: 60, coverUrl: seedUrl(1051) },
  ];
  return albums;
}

export async function demoAlbumItems(albumId) {
  const albums = demoAlbums();
  const album = albums.find(a => a.id === albumId) || { itemCount: 60 };
  const items = Array.from({length: album.itemCount}).map((_, i) => ({
    id: `${albumId}_${i}`,
    albumId,
    baseUrl: seedUrl(2000 + i + albumId.length),
    mimeType: 'image/jpeg',
    width: 1600,
    height: 900,
    creationTime: null,
  }));
  return items;
}
