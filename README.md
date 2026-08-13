# Codex GPT Da Vinci Escape Room

An antique Leonardo da Vinci inspired escape-room web app with a three-layer cipher wheel, a MEGA-style encrypted vault, folder/key/password puzzles, and browser-local encryption.

## Features

- Responsive desktop and mobile React/Vite app
- Three-layer cipher wheel with alphabet, symbol, and glyph rings
- MEGA-style archive tree with encrypted files and folder paths
- Browser Web Crypto AES-GCM encryption/decryption flow
- Password chain: `R3LIQU4RY-72 -> VERITAS -> OCCULTA -> REVELATUR -> ARCHIVIST-72`
- Custom encrypted note forge
- `.mega` JSON export of encrypted archive payload metadata
- In-app MEGA cloud GUI for account login, browsing, upload, folder creation, rename, download, trash, and share links
- Supplied manuscript/cipher images used as theme references and local assets

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The local development build defaults to `http://127.0.0.1:5173` unless that port is already in use.

## Public Site

GitHub Pages deploys from `main` to:

```text
https://Ryetechv1.github.io/davinci-escape-room/
```

## Build

```bash
npm run build
```

## Notes

The puzzle archive is a local escape-room simulation. Its encryption and decryption happen in the browser with the Web Crypto API.

The MEGA tab uses the unofficial `megajs` browser SDK. MEGA credentials are used in memory for the current browser session and are not stored by the app.
