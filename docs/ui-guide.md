# UI guide

This is the source of truth for how Privacy Chat looks and behaves. Agents and humans follow it for every visual change.

## Principles

1. **Calm and trustworthy.** A private tool should feel quiet: warm paper background, deep teal accent, one amber highlight. No gradients, no decoration for its own sake.
2. **Phone first.** Design at 360 to 390 px wide, then let it breathe on larger screens. The app is installed as a PWA, so it must feel native.
3. **One thing at a time.** Each screen has one primary action. Secondary actions are ghost buttons.
4. **Honest states.** Always design empty, loading, waiting, error and long-text states.
5. **Accessible by default.** Readable contrast, large touch targets, visible focus, labels on every control.

## Design tokens

All tokens are CSS variables in `:root` in `src/style.css`. Dark values are redefined in the `prefers-color-scheme: dark` block. Never use raw colours elsewhere (`npm run check:ui` enforces this).

| Token | Purpose |
| --- | --- |
| `--bg` | page background |
| `--surface` | cards, bars, incoming bubbles |
| `--ink` | main text |
| `--muted` | secondary text, hints, placeholders |
| `--accent`, `--accent-ink` | primary buttons, own bubbles, active tab; text on accent |
| `--warm` | focus ring, ID card edge, banners |
| `--line` | borders and dividers |
| `--danger` | destructive actions and errors |
| `--ok` | connected and online indicators |
| `--on-dark` | text on avatars |
| `--video-bg` | video letterbox |
| `--shadow` | all shadows |
| `--radius` | card radius (14px) |
| `--tap` | minimum touch target (2.75rem) |
| `--serif`, `--mono` | headings; IDs and debug text |

To add a colour: add the token to both light and dark blocks, document it in this table, then use it.

## Typography

- Body: system UI font, 16px. Never go below 16px in text inputs (iOS zooms the page otherwise).
- Headings (`h1`, `h2`): `--serif`, weight 600.
- IDs and debug output: `--mono`.
- Muted helper text: `.muted` (0.92rem).
- Fonts are system fonts only. External font files are blocked by the CSP.

## Layout

- `.app` is the page shell: max width 42rem, centred, 1rem side padding, safe-area aware.
- Normal screens: `header.top`, `main.page` (stack of `.card` sections), `nav.tabs` sticky at the bottom.
- The chat screen is different: `.app` contains `.chat` and the page is locked to the viewport height. Structure: `.chat-head`, `.chat-tools`, `.videos`, scrolling `.chat-body`, pinned `.chat-foot` with the composer. Only `.chat-body` scrolls.
- Use `100dvh`, never `100vh` (mobile browser bars).
- Respect `env(safe-area-inset-*)` on anything touching a screen edge.

## Component catalogue

| Component | Markup and class | Notes |
| --- | --- | --- |
| Card | `section.card` | one topic per card, `h2` title |
| ID card | `section.card.id-card` | `.eyebrow`, `.id-code` |
| Button | `button` | primary. Variants: `.ghost` (secondary), `.danger`, `.sm` (compact) |
| Action row | `.row` | wraps; inside `.list li` it becomes an auto-fit grid |
| Text input | `input` | min height `--tap`. IDs add `.mono` (auto uppercase) |
| List | `ul.list` with `li` | avatar, `.grow` text block, `.row` actions |
| Avatar | `Avatar` in `ui.tsx` | initial on a hue from the ID |
| Status | `p.status.on/.off` | dot plus sentence |
| Banner | `.banner`, `.banner.error` | global notices and dialing state |
| Toggle | `label.toggle` | label, hint, checkbox |
| Tab bar | `nav.tabs` with `.tab`, `.tab.active` | four tabs |
| Chat bubble | `ul.msgs li.mine/.theirs` | max 82% width |
| Install banner | `aside.install` | `src/install.css` |

If you need a new pattern, add it to this table in the same change.

## States to design for every screen

- Empty (no contacts, no messages), with a short helpful sentence
- Waiting (connecting, waiting for the other person)
- Error (use `.error` or `.banner.error`, say what to do next)
- Long content (names 32 characters, IDs, 4000-character messages, long file names)
- Disabled controls (reduced opacity, `cursor: not-allowed`, and a reason nearby)

## Accessibility requirements

- Text contrast at least 4.5:1 (large text 3:1) in light and dark.
- Touch targets at least 44px (`--tap`). Compact `.sm` buttons are only for secondary tools.
- Every input has a visible label or `aria-label`. Icons need text or `aria-label`.
- Status changes use `role='status'` or `aria-live`; errors use `role='alert'`.
- Never remove the focus ring. Everything works with a keyboard.
- Do not rely on colour alone (pair with text).
- Works at 200% text zoom without horizontal scrolling.

## Content voice

Short, plain and kind. Say what happened and what to do next. No jargon in normal screens (put technical detail under Debug info). Buttons start with a verb.

## Verification matrix

Every visual change is checked at all of these, in light and dark:

| Name | Size |
| --- | --- |
| phone-small | 360 x 640 |
| phone | 390 x 844 |
| tablet | 768 x 1024 |
| desktop | 1280 x 800 |

Screens: Home, Contacts, Profile, Help, Chat (empty and with many messages), install banner.

How: `npm run build`, `npx vite preview`, then `npm run ui:shots`. The script saves one image per size, scheme and screen into `ui-shots/`. Look at each image. If you cannot run a browser, say so and list exactly what you could not check.

## Common pitfalls

- Inline `style='...'` attributes are blocked by the CSP. Use classes, or a style object in JSX for truly dynamic values (see `Avatar`).
- `100vh` breaks on mobile. Use `100dvh`.
- Fixed or sticky bars need bottom padding or they cover content.
- Hidden-by-attribute elements need a CSS rule when you set `display` on them (see `.videos[hidden]`).
- Do not add a new font, icon font or image CDN.
- The service worker caches the app. After a deploy, test in a fresh private window.

## Definition of done for UI work

- [ ] `npm run build` passes (includes `npm run check:ui`)
- [ ] No raw colours, inline style attributes or `!important` added
- [ ] Checked the verification matrix in light and dark
- [ ] Empty, waiting, error and long-text states look right
- [ ] Touch targets, labels and focus are fine
- [ ] New patterns are added to the component catalogue
- [ ] Summary lists what was checked and what was not
