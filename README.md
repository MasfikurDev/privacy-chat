# Privacy Chat

Peer-to-peer WebRTC chat, voice/video calls and file sharing (1-to-1). No accounts or application-owned signaling server; the app uses public third-party signaling networks and WebRTC.

## Requirements

- Node.js 22 or newer
- Corepack-enabled pnpm 10.34.7 (the version is pinned in `package.json`)

## Run locally

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm run dev
```

## Checks

```sh
corepack pnpm run typecheck
corepack pnpm run check:ui
corepack pnpm run build
corepack pnpm exec playwright install chromium
corepack pnpm run test:e2e
corepack pnpm run audit
```

The browser end-to-end suite runs locally against Vite. The real peer-to-peer test is skipped unless `RUN_REAL_P2P_E2E=1` is set, because it requires internet access to public signaling services and can take up to three minutes.

## How it works

- The invite link carries a random 128-bit secret in the URL fragment (`#...`), which browsers do not send in HTTP requests.
- Room identifiers and signaling passwords are derived from that secret; public signaling relays still observe connection metadata and derived room identifiers.
- Peers discover each other through public Nostr relays, BitTorrent trackers, and MQTT brokers, then establish WebRTC connections. WebRTC encrypts transport with DTLS.
- Chat, calls, and file transfer are peer-to-peer when a direct WebRTC path is available. A configured TURN server can relay media/data when direct connectivity fails.
- Files are transferred as opaque bytes, limited to 50 MiB, and checked with SHA-256 for integrity. Integrity checking does not prove who sent a file or that it is safe to open.

## Identity and privacy notes

- Your identity and contacts are stored in this browser's local storage. Clearing browser data can remove them.
- An exported identity backup contains the private key. Anyone with the backup can impersonate that identity; keep it secret.
- The public signaling networks are third-party services. This project does not operate its own chat server, but it is not network-anonymous: signaling providers and network peers may observe metadata such as IP addresses and connection timing.
- The optional `VITE_TURN_*` settings are embedded in the client bundle. Do not put long-lived or privileged secrets in them; use restricted, short-lived TURN credentials where possible.

## Optional TURN relay

Copy `.env.example` to `.env` and configure a TURN service for peers behind strict NATs or mobile networks. Without TURN, some peers may be unable to connect. Enabling relay-only mode can hide the peer's public IP from the other peer only if a working TURN server is configured; the TURN provider itself can observe relay traffic metadata.

## Deploy

Vercel or Cloudflare Pages can host the static build. Use `corepack pnpm run build` and publish `dist`. Vercel security headers are configured in `vercel.json`; Cloudflare Pages headers are configured in `public/_headers`.
