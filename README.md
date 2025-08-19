# Photosflix — Web (sans Flutter)

Version web statique (HTML/CSS/JS) avec look *Netflix* pour parcourir des **albums** et lancer un **diaporama**.
- **Mode démo** (par défaut) : données factices (picsum.photos).
- **Mode live** (optionnel) : connexion Google et appels **Google Photos Library API** (lecture seule).

## Lancer en local
1. Téléchargez/ouvrez le dossier puis servez-le avec un petit serveur HTTP (obligatoire pour les modules ES) :
   ```bash
   # Python 3
   python -m http.server 5500
   # ou
   npx serve . -p 5500
   ```
2. Ouvrez `http://localhost:5500/mnt/data/photosflix-web/` (selon l'endroit où vous servez les fichiers).

## Activer Google Photos (optionnel)
1. Créez un **OAuth 2.0 Client ID (Web)** dans Google Cloud Console et **activez** *Photos Library API*.
2. Dans `config.js` :
   ```js
   export const GOOGLE_CLIENT_ID = 'VOTRE_CLIENT_ID.apps.googleusercontent.com';
   export const USE_LIVE_API = true;
   ```
3. Dans l’**OAuth consent screen**, ajoutez votre **Authorized JavaScript origin** (ex: `http://localhost:5500`).

## Fonctionnalités
- Page d’accueil : **Hero** + **carrousels** (Albums, Ma liste, Reprendre).
- **Ma liste** et **Reprise** (dernière photo vue) stockées en `localStorage`.
- **Lecteur** plein écran : lecture auto, précédent/suivant, barre de progression, raccourcis ← / → / Esc.
- **Recherche** sur les titres d’albums (filtrage instantané).

## Détails techniques
- Auth web via **Google Identity Services** (token model).
- Albums : `GET https://photoslibrary.googleapis.com/v1/albums` (pagination).
- Photos d’un album : `POST https://photoslibrary.googleapis.com/v1/mediaItems:search` avec `{ albumId }`.
- Les URLs d’image utilisent `baseUrl` + paramètres de taille (ex: `=w1920-h1080`).

> Limitations de l’API : hors album, `mediaItems.search` renvoie surtout les médias **créés par l’app**. Lister un album et en **chercher le contenu par `albumId`** est la méthode recommandée.
