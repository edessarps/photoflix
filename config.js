// =====================
// Configuration globale
// =====================

// ID client OAuth 2.0 (Web)
const GOOGLE_CLIENT_ID =
  "240084222867-jtrid9bq2ihr05ma51htuis5tkueinsg.apps.googleusercontent.com";

// ⚠️ On reste en mode "token client-side"
// => pas de client_secret exposé
const USE_LIVE_API = true;

// Scopes nécessaires
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/photoslibrary.readonly",
  "openid",
  "email",
];

// Métadonnées de ton projet (pour info seulement, pas utilisées côté front)
const OAUTH_METADATA = {
  project_id: "elaborate-helix-468502-u6",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  redirect_uris: ["https://edessarps.github.io/auth/google/callback"],
  javascript_origins: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://edessarps.github.io",
  ],
};
