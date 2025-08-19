import { GOOGLE_CLIENT_ID, USE_LIVE_API } from './config.js';
import { initAuth, signIn, signOut, isLive, listAlbums, listAlbumItems, demoAlbums, demoAlbumItems } from './photosApi.js';

const q = (sel) => document.querySelector(sel);
const heroEl = q('#hero');
const albumsRow = q('#albumsRow');
const myListRow = q('#myListRow');
const continueRow = q('#continueRow');
const demoNote = q('#demoNote');
const signinBtn = q('#signinBtn');
const signoutBtn = q('#signoutBtn');
const searchInput = q('#searchInput');

let state = {
  albums: [],
  myList: new Set(JSON.parse(localStorage.getItem('photosflix_mylist') || '[]')),
  resumes: JSON.parse(localStorage.getItem('photosflix_resumes') || '{}'), // { [albumId]: index }
};

function saveMyList() { localStorage.setItem('photosflix_mylist', JSON.stringify([...state.myList])); }
function saveResumes() { localStorage.setItem('photosflix_resumes', JSON.stringify(state.resumes)); }

function fmtSub(a) { return a.itemCount ? `${a.itemCount} photos` : ''; }

function mkCard(a) {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="thumb">
      <img alt="${a.title}" loading="lazy" src="${a.coverUrl}=w400-h225-c"/>
      <div class="play">▶</div>
    </div>
    <div class="title">${a.title}</div>
    <div class="sub">${fmtSub(a)}</div>
    <div class="actions">
      <button class="icon-btn ${state.myList.has(a.id) ? 'active':''}" data-action="toggleList">+ Ma liste</button>
      <button class="icon-btn" data-action="open">Lire</button>
    </div>
  `;
  el.querySelector('[data-action="toggleList"]').addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.myList.has(a.id)) state.myList.delete(a.id); else state.myList.add(a.id);
    saveMyList();
    render();
  });
  el.querySelector('[data-action="open"]').addEventListener('click', () => openPlayer(a));
  el.querySelector('.thumb').addEventListener('click', () => openPlayer(a));
  return el;
}

function renderHero(a) {
  if (!a) { heroEl.classList.add('hidden'); return; }
  heroEl.classList.remove('hidden');
  heroEl.innerHTML = `
    <img src="${a.coverUrl}=w1920-h1080" alt="${a.title}" />
    <div class="overlay"></div>
    <div class="content">
      <div>
        <div class="title">${a.title}</div>
        <div class="meta">${fmtSub(a)}</div>
      </div>
      <button class="btn" id="heroPlay">Lire</button>
      <button class="btn btn-ghost" id="heroAdd">${state.myList.has(a.id)?'Dans ma liste':'Ma liste'}</button>
    </div>
  `;
  q('#heroPlay').onclick = () => openPlayer(a);
  q('#heroAdd').onclick = () => { 
    if (state.myList.has(a.id)) state.myList.delete(a.id); else state.myList.add(a.id);
    saveMyList(); render();
  };
}

function renderRows() {
  albumsRow.innerHTML = '';
  const filtered = state.albums.filter(a => a.title.toLowerCase().includes((searchInput.value||'').toLowerCase()));
  filtered.forEach(a => albumsRow.appendChild(mkCard(a)));

  // My list
  const inList = filtered.filter(a => state.myList.has(a.id));
  q('#mylist').classList.toggle('hidden', inList.length === 0);
  myListRow.innerHTML = '';
  inList.forEach(a => myListRow.appendChild(mkCard(a)));

  // Continue watching (albums with resume < itemCount - 1)
  const cont = filtered.filter(a => (state.resumes[a.id] ?? 0) > 0);
  q('#continue').classList.toggle('hidden', cont.length === 0);
  continueRow.innerHTML = '';
  cont.forEach(a => continueRow.appendChild(mkCard(a)));
}

function render() {
  renderHero(state.albums[0]);
  renderRows();
  demoNote.style.display = isLive() ? 'none' : 'block';
}

let albumCache = new Map(); // albumId -> items[]

/* ---------------- Player ---------------- */
const playerEl = q('#player');
const playerImg = q('#playerImage');
const playerClose = q('#playerClose');
const prevBtn = q('#prevBtn');
const nextBtn = q('#nextBtn');
const playPauseBtn = q('#playPauseBtn');
const playerProgress = q('#playerProgress');

let playing = true;
let current = { album: null, items: [], index: 0 };
let timer = null;

function updateProgress() {
  if (!current.items.length) return;
  playerProgress.style.width = `${((current.index + 1) / current.items.length) * 100}%`;
}

function showFrame() {
  if (!current.items.length) return;
  const it = current.items[current.index];
  const url = `${it.baseUrl}=w1920-h1080`;
  playerImg.src = url;
  updateProgress();
}

function step(delta) {
  if (!current.items.length) return;
  current.index = (current.index + delta + current.items.length) % current.items.length;
  state.resumes[current.album.id] = current.index; // save resume
  saveResumes();
  showFrame();
}

function ensureTimer() {
  clearInterval(timer);
  if (playing) {
    timer = setInterval(() => step(+1), 2000);
  }
}

async function openPlayer(album) {
  current.album = album;
  current.index = state.resumes[album.id] || 0;
  if (!albumCache.has(album.id)) {
    const items = isLive() ? await listAlbumItems(album.id) : await demoAlbumItems(album.id);
    albumCache.set(album.id, items);
  }
  current.items = albumCache.get(album.id);
  showFrame();
  playerEl.classList.remove('hidden');
  playing = true; ensureTimer();
}

function closePlayer() {
  playerEl.classList.add('hidden');
  clearInterval(timer);
}

playerClose.addEventListener('click', closePlayer);
prevBtn.addEventListener('click', () => step(-1));
nextBtn.addEventListener('click', () => step(+1));
playPauseBtn.addEventListener('click', () => { playing = !playing; playPauseBtn.textContent = playing ? 'Pause' : 'Lire'; ensureTimer(); });
document.addEventListener('keydown', (e) => {
  if (playerEl.classList.contains('hidden')) return;
  if (e.key === 'Escape') closePlayer();
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(+1);
});

/* ---------------- Boot ---------------- */
initAuth();

signinBtn.addEventListener('click', async () => {
  if (!isLive()) { alert('Active USE_LIVE_API dans config.js'); return; }
  signinBtn.disabled = true;
  try {
    await signIn();
    signoutBtn.hidden = false; signinBtn.hidden = true;
    state.albums = await listAlbums();
    render();
  } catch (e) {
    alert('Connexion échouée : ' + e.message);
  } finally {
    signinBtn.disabled = false;
  }
});

signoutBtn.addEventListener('click', () => {
  signOut();
  signoutBtn.hidden = true; signinBtn.hidden = false;
  state.albums = demoAlbums();
  render();
});

searchInput.addEventListener('input', () => render());

// First render with demo data
state.albums = demoAlbums();
render();
