# Repository Guide

## Project and commands
- This is a Preact + TypeScript single-page app built with Vite and the PWA plugin. Read [README.md](README.md) for product behavior and deployment details.
- Use pnpm, not npm: the checked-in lockfile is `pnpm-lock.yaml`, and CI uses Node 20 with pnpm 10. The README's npm install/`package-lock.json` instructions are stale; do not generate or commit an npm lockfile.
- Common commands: `pnpm install --frozen-lockfile`, `pnpm run dev`, `pnpm run typecheck`, `pnpm run build`, and `pnpm run audit`.
- There is no test script or test suite currently. `dev` and `build` run `scripts/make-icons.mjs`; account for generated icon changes when using them.

## Architecture
- `src/main.tsx` mounts the app; `src/App.tsx` coordinates identity, navigation, contacts, inbox requests, and chat transitions.
- `src/pages.tsx`, `src/RequestDialog.tsx`, and `src/Chat.tsx` contain the main UI. Shared UI is in `src/ui.tsx`; global styling is in `src/style.css`.
- `src/identity.ts` handles browser identity keys and backups; `src/inbox.ts` handles authenticated contact discovery; `src/signaling.ts` multiplexes rendezvous networks; `src/room.ts` owns chat, calls, and file transfer.
- `src/store.ts` persists preferences and contacts in local storage; `src/config.ts` contains RTC configuration and message/file limits.

## Conventions and safety
- TypeScript is strict, including unused-local and unused-parameter checks. Use Preact hooks and JSX (`class`, not `className`); keep types explicit and follow nearby formatting. Styling uses the existing CSS classes and custom properties, not a component framework.
- Pair network/session setup with teardown: clean up listeners, timers, rooms, media tracks, and object URLs as appropriate. Preserve the explicit `leave`/`cancel` lifecycle APIs.
- Treat invite secrets and identity private keys as secrets. Invite secrets belong in the URL fragment; never move them into URLs sent to servers/signaling, or include them in logs. Identity backup files contain the private key.
- Preserve validation and limits for untrusted peer messages and files. Received files should remain opaque downloads; keep file-name sanitization, size checks, and SHA-256 integrity verification intact.
- TURN is optional; `.env.example` documents its settings. If configuring it, keep credentials out of source control. `VITE_*` values are embedded in the public client bundle and must not be treated as secrets.
- Avoid broad security/privacy claims unless the implementation supports them; verify changes against the relevant identity, signaling, and room code.
