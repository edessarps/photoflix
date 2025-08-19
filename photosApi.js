// photosApi.js
import { GOOGLE_CLIENT_ID, USE_LIVE_API } from './config.js';

let token = null;
let tokenExp = 0;
let tokenClient = null;

// 👇 Pratique pour déboguer depuis la console
// window.accessToken contiendra toujours le token courant
window.accessToken = null;

export function isLive() { return USE_LIVE_API; }

export function initAuth() {
  if (!USE_LIVE_API) return;

  window.addEventListener('load', () => {
    if (!window.google || !google.accounts?.oauth2) {
      console.warn('[Photosflix] Google Identity Services non chargé');
      return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/photoslibrary.readonly openid https://www.googleapis.com/auth/userinfo.email',
      callback: async (resp) => {
        // -------- DIAGNOSTIC PATCH --------
        console.log('[Photosflix] TOKEN reçu:', resp);
        try {
          const info = await fetch(
            'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + resp.access_token
          ).then(r => r.json());
          console.log('[Photosflix] SCOPES du token:', info.scope);
        } catch (e) {
          console.warn('[Photosflix] Impossible de lire tokeninfo:', e);
        }
        // ----------------------------------

        if (resp && resp.access_token) {
          token = resp.access_token;
          window.accessToken = token;         // <— visible en console
          tokenExp = Date.now() + 55 * 60 * 1000; // ~55 min
          document.dispatchEvent(new CustomEvent('photos:authed'));
        }
      },
    });
  });
}

export function signIn({ forceConsent = false } = {}) {
  if (!USE_LIVE_API) return Promise.reject(new Error('Live API disabled'));
  return new Promise((resolve) => {
    // forceConsent=true → prompt: 'consent' pour redemander les scopes
    tokenClient.requestAccessToken({ prompt: forceConsent ? 'consent' : '' });
    const onAuthed = () => {
      document.removeEventListener('photos:authed', onAuthed);
      resolve();
    };
    document.addEventListener('photos:authed', onAuthed);
  });
}

export function signOut() {
  // Best effort : révoquer côté Google puis nettoyer local
  if (window.google?.accounts?.oauth2?.revoke && token) {
    try { google.accounts.oauth2.revoke(token, () => {}); } catch (_) {}
  }
  token = null;
  tokenExp = 0;
  window.accessToken = null;
}

async function ensureToken({forceFresh=false} = {}) {
  if (!USE_LIVE_API) throw new Error('Live API disabled');

  const stillValid = token && Date.now() < tokenExp;
  if (stillValid && !forceFresh) return token;

  // Force un nouveau token et un re-consent explicite
  await signIn({ forceConsent: true });
  return token;
}

async function gFetch(url, opts = {}) {
  // <- forceFresh: true le temps du diagnostic
  const t = await ensureToken({ forceFresh: true });

  // DIAGNOSTIC: montre les scopes du token utilisé pour CET appel
  try {
    const info = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + t).then(r => r.json());
    console.log('[Photosflix] TOKEN USED SCOPES:', info.scope);
  } catch (e) {
    console.warn('[Photosflix] tokeninfo check failed:', e);
  }

  const res = await fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${t}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[Photosflix] HTTP error', res.status, body);
    if (res.status === 403 && /insufficient/i.test(body)) {
      alert('Connexion échouée : HTTP 403 — scopes insuffisants.\n' +
            '• Retire l’accès à l’app : https://myaccount.google.com/permissions\n' +
            '• Recharge la page et reconnecte-toi (photoslibrary.readonly).');
    }
    const err = new Error(`HTTP ${res.status}`);
    try { err.details = JSON.parse(body); } catch { err.details = { error: { message: body } }; }
    throw err;
  }
  return res.json();
}

/* ---------------- API Google Photos (LIVE) ---------------- */

export async function listAlbums() {
  if (!USE_LIVE_API) throw new Error('Live API disabled');
  const out = [];
  let pageToken = null;
  do {
    const qs = new URLSearchParams({ pageSize: '50', ...(pageToken ? { pageToken } : {}) });
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
    const body = { albumId, pageSize: 100, ...(pageToken ? { pageToken } : {}) };
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
function seedUrl(seed, w = 1200, h = 675) { return `https://picsum.photos/seed/${seed}/${w}/${h}`; }

export function demoAlbums() {
  return [
    { id: 'leonie',  title: 'Naissance de Léonie', itemCount: 300, coverUrl: seedUrl(1025) },
    { id: 'vac2024', title: 'Vacances Été 2024',   itemCount: 180, coverUrl: seedUrl(1003) },
    { id: 'we',      title: 'Week-ends en famille', itemCount: 120, coverUrl: seedUrl(1033) },
    { id: 'famille', title: 'Moments en famille',   itemCount: 240, coverUrl: seedUrl(1012) },
    { id: 'sport',   title: 'Activités sportives',  itemCount: 90,  coverUrl: seedUrl(1044) },
    { id: 'misc',    title: 'Souvenirs divers',     itemCount: 60,  coverUrl: seedUrl(1051) },
  ];
}

export async function demoAlbumItems(albumId) {
  const albums = demoAlbums();
  const album = albums.find(a => a.id === albumId) || { itemCount: 60 };
  return Array.from({ length: album.itemCount }).map((_, i) => ({
    id: `${albumId}_${i}`,
    albumId,
    baseUrl: seedUrl(2000 + i + albumId.length),
    mimeType: 'image/jpeg',
    width: 1600,
    height: 900,
    creationTime: null,
  }));
}
