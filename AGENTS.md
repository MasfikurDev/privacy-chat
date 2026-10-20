# Agent guide for Privacy Chat

Privacy Chat is a peer-to-peer web app: 1-to-1 chat, voice/video calls and file sharing straight between two browsers. There is no backend. It ships as an installable PWA built with Preact, TypeScript and Vite, deployed to Vercel.

Read this file fully before changing anything. For any visual change you must also read `docs/ui-guide.md`.

## Commands

- `npm install` : install dependencies
- `npm run dev` : local dev server (generates icons first)
- `npm run build` : icons, UI checks, type check, production build. This must pass.
- `npm run check:ui` : only the static UI rules (CSP, tokens, accessibility basics)
- `npm run ui:shots` : screenshots of every screen (needs Playwright, see the script header)

## Repository map

- `src/App.tsx` : app shell, screens, tab bar, contact and request handling
- `src/pages.tsx` : Home, Contacts, Profile and Help screens
- `src/Chat.tsx` : the chat screen (messages, calls, files)
- `src/install.tsx` : install-app banner
- `src/ui.tsx` : small shared components (Avatar)
- `src/style.css`, `src/install.css` : all styling; design tokens live in `:root`
- `src/room.ts` : private-room sessions over WebRTC (Trystero), chat, calls, files
- `src/inbox.ts` : contacting someone by ID (challenge-response, then a private room)
- `src/identity.ts`, `src/store.ts` : device key and ID, local storage
- `src/signaling.ts`, `src/config.ts` : relays, ICE servers, limits
- `scripts/` : icon generator, UI checks, screenshot tool
- `vercel.json` : security headers. `vite.config.ts` : PWA manifest

## Rules that must never be broken

1. Keep the strict Content-Security-Policy in `vercel.json`: same-origin scripts and styles only, no inline scripts, no inline style attributes, no external fonts, images or CDNs. Network access is limited to WebSocket signaling relays and WebRTC.
2. Never send the invite secret (the URL fragment) or private keys anywhere. Never log them.
3. Render peer-supplied text only through JSX. Never use innerHTML. Treat file names and sizes from peers as untrusted.
4. Changes to `identity.ts`, `inbox.ts` or `room.ts` are security-sensitive. Keep the change small and explain the reasoning in your summary.
5. Do not add analytics, trackers, remote logging or third-party scripts.
6. Do not weaken or bypass `scripts/check-ui.mjs`. If a rule is wrong, fix the rule and explain why.

## Working on the UI (required procedure)

1. **Read** `docs/ui-guide.md`. Reuse existing tokens, classes and patterns before inventing new ones.
2. **Plan** the change in a few lines: which screens, which states (empty, loading, error, long text), which breakpoints.
3. **Implement** with tokens only. Raw colours belong in `:root`. Use the `--tap` size for touch targets. No inline style attributes, no `!important`.
4. **Verify** in a real browser, not by reading code:
   - run `npm run build` (must pass), then `npx vite preview` and `npm run ui:shots`
   - open the screenshots for phone-small (360), phone (390), tablet (768) and desktop (1280), in light and dark
   - check the chat screen with long messages, an empty list and a narrow phone
5. **Check** the list in `docs/ui-guide.md` under Definition of done, and paste the result in your summary or pull request.
6. **Report** what changed, which screens you looked at, and anything you could not verify.

## Deploying

Pushes to the connected Git repository deploy on Vercel. When working through the v0 chat, update files with the v0 tools and trigger a deploy, then confirm the build is READY and test the result. Do not describe something as working until you have seen it work.

## Style notes for code

- TypeScript strict mode, no unused variables or parameters.
- Prefer single-quoted attributes in TSX and avoid backslashes where possible. This keeps file-upload tool calls simple.
- Keep components small and props explicit. State lives in `App.tsx` or the screen that owns it.
