// app.js
import { initAuth, signIn, signOut, isLive, listAlbums, demoAlbums } from "./photosApi.js";

const signinBtn = document.getElementById("signinBtn");
const signoutBtn = document.getElementById("signoutBtn");
const albumsPre = document.getElementById("albums"); // <pre id="albums"> dans la page
const FORCE_CONSENT = new URL(location.href).searchParams.get("forceConsent") === "1";

function logUi(msg) {
  if (albumsPre) albumsPre.textContent = (albumsPre.textContent || "") + msg + "\n";
  console.log(msg);
}

async function onSignedIn() {
  try {
    const albums = await listAlbums();
    logUi("Albums chargés: " + albums.length);
    if (albumsPre) albumsPre.textContent = JSON.stringify(albums.slice(0, 5), null, 2);
  } catch (e) {
    console.error(e);
  }
}

function wireUi() {
  signinBtn?.addEventListener("click", async () => {
    await signIn({ forceConsent: FORCE_CONSENT });
    await onSignedIn();
  });
  signoutBtn?.addEventListener("click", () => {
    signOut();
    logUi("Déconnecté.");
  });

  // auto–init demo vs live
  if (!isLive()) {
    const demo = demoAlbums();
    if (albumsPre) albumsPre.textContent = JSON.stringify(demo.slice(0, 5), null, 2);
  }
}

initAuth();
wireUi();
