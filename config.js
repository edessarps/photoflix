// config.js
// IMPORTANT : ne JAMAIS mettre le client_secret côté front
export const GOOGLE_CLIENT_ID =
  "240084222867-jtrid9bq2ihr05ma51htuis5tkueinsg.apps.googleusercontent.com";

export const USE_LIVE_API = true;

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/photoslibrary.readonly",
  "openid",
  "email",
];

// (Facultatif, informatif uniquement — PAS utilisé côté front)
export const OAUTH_METADATA = {
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
