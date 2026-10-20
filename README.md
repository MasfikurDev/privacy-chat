# Privacy Chat

Peer-to-peer WebRTC chat, voice/video calls and file sharing (1-to-1). No accounts, no server of its own.

## Run locally
    npm install
    npm run dev

## How it works
- The invite link carries a random 128-bit secret in the URL fragment (`#...`), which browsers never send to servers.
- Room id and signaling password are derived from that secret, so public relays only see hashes.
- Peers find each other over Nostr relays, BitTorrent trackers and MQTT at the same time, then talk directly over WebRTC (encrypted with DTLS).
- Chat, files (with SHA-256 integrity checks) and calls all go peer-to-peer.

## Optional TURN relay
Copy `.env.example` to `.env` and fill in a TURN server so peers behind strict networks can connect.
Anything prefixed `VITE_` is public in the built bundle.

## Deploy
Vercel (or Cloudflare Pages): build command `npm run build`, output directory `dist`.
`vercel.json` sets the security headers on Vercel; `public/_headers` does the same on Cloudflare Pages.

## First commit
Run `npm install` once and commit the generated `package-lock.json` (CI uses `npm ci`).
