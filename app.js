import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, USE_LIVE_API } from "./config.js";

let accessToken = null;

// Initialisation Google Identity Services
function initGoogleLogin() {
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
  });

  document
    .getElementById("loginBtn")
    .addEventListener("click", () => startOAuthFlow());
}

// Démarrage du flux OAuth
function startOAuthFlow() {
  const forceConsent = window.location.search.includes("forceConsent=1");

  google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES.join(" "),
    prompt: forceConsent ? "consent" : "",
    callback: (resp) => {
      if (resp.access_token) {
        accessToken = resp.access_token;
        console.log("TOKEN:", resp);
        fetchAlbums();
      } else {
        alert("Impossible d’obtenir un access_token");
      }
    },
  }).requestAccessToken();
}

// Callback Identity Services
function handleCredentialResponse(response) {
  console.log("[Photosflix] ID token reçu :", response.credential);
}

// Appel à l’API Google Photos
async function fetchAlbums() {
  if (!accessToken) return;

  try {
    const resp = await fetch(
      "https://photoslibrary.googleapis.com/v1/albums?pageSize=5",
      {
        headers: { Authorization: "Bearer " + accessToken },
      }
    );

    if (!resp.ok) {
      const err = await resp.json();
      console.error("ALBUMS ERROR:", err);
      alert(
        `Connexion échouée : HTTP ${resp.status} — scopes insuffisants.\n\n` +
          `• Retire l’accès à l’app dans https://myaccount.google.com/permissions\n` +
          `• Recharge avec ?forceConsent=1`
      );
      return;
    }

    const data = await resp.json();
    console.log("ALBUMS:", data);
    document.getElementById("albums").textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    console.error("Erreur API", e);
  }
}

// Au chargement
window.onload = initGoogleLogin;
