# UX playbook for AI agents

Purpose: make UI work predictable, fast and consistent, so agents do not invent odd layouts, new design styles or busywork. This complements `docs/ui-guide.md` (tokens and component catalogue). Read both before any UI change.

## 0. The six rules

1. **Reuse before you build.** Find the closest existing screen or component and copy its structure.
2. **Tokens only.** No new colours, font sizes, shadows or radii. Use what is in `:root`.
3. **One primary action per card or screen.** Everything else is a ghost button.
4. **Phone first, one column.** Nothing may be wider than the screen. No horizontal scrolling, ever.
5. **Look at it.** Take screenshots and review them. If you did not look, it is not done.
6. **Product questions go to the human.** Do not invent features, flows or policies.

## 1. If asked to... do this

| Request | Do | Do not |
| --- | --- | --- |
| Add a button | Use `button` (primary), `.ghost` or `.danger`. Label starts with a verb. | New colours, icon-only buttons, two primary buttons in one card |
| Add a setting | Add a `Toggle` in the Privacy card in Profile, persist it in `store.ts` | A new page or a modal |
| Add a screen | Follow recipe A below | A hamburger menu, a fifth tab without asking |
| Tell the user something | `.banner` for short global notices, inline `.error` or `.muted` text near the control | `alert()`, toast libraries |
| Confirm a destructive action | `window.confirm` with one plain sentence (existing pattern) | Custom modal dialogs |
| Show loading or waiting | An inline status sentence with `role='status'`, for example Looking for them... | Full-screen spinners, skeleton screens |
| Show a list | `ul.list` with avatar, name and action row | Tables on phones |
| Add an icon | Prefer text. If needed, a small inline SVG component with `aria-hidden` and a text label next to it | Icon fonts, emoji as icons, external icon packs |
| Animate something | Nothing by default. If essential: 150ms or less, opacity or transform only, inside `@media (prefers-reduced-motion: no-preference)` | Bouncing, sliding panels, parallax |
| Support dark mode | It is automatic through tokens | Separate dark-only rules with raw colours |
| Show a person | The `Avatar` component | Uploaded pictures (there is no server) |
| Expand extra detail | `details` and `summary` (see Debug info) | Accordions built from scratch |

## 2. Layout recipes (copy these)

### A. Add a normal screen

1. Add a component in `src/pages.tsx` that returns a fragment of `section.card` blocks. It renders inside `main.page`.
2. Add its key and label to the `Screen` type and the `TABS` array in `src/App.tsx`, and render it in the `main` block. Keep at most four to five tabs. Ask the human before adding more.
3. Add its label to the `tabs` list in `scripts/ui-shots.mjs`.
4. Add any new component pattern to the catalogue in `docs/ui-guide.md`.

Skeleton:

```tsx
export function Example() {
  return (
    <>
      <section class='card'>
        <h2>Title in two or three words</h2>
        <p class='muted'>One sentence that explains it.</p>
        <button>Primary action</button>
      </section>
    </>
  );
}
```

### B. A card with a form

```tsx
<section class='card'>
  <h2>Add a contact</h2>
  <form class='stack' onSubmit={submit}>
    <input aria-label='Contact ID' placeholder='XXXX-XXXX-XXXX-XXXX' class='mono' />
    <button>Add contact</button>
  </form>
  {error && <p class='error' role='alert'>{error}</p>}
</section>
```

Single line forms (one input and one button) use `class='row'` with `class='grow'` on the input.

### C. A list row with actions

```tsx
<ul class='list'>
  <li key={id}>
    <Avatar id={id} label={name} />
    <div class='grow'>
      <strong>{name}</strong>
      <span class='muted mono'>{formatId(id)}</span>
    </div>
    <div class='row'>
      <button>Message</button>
      <button class='ghost'>Rename</button>
      <button class='danger'>Block</button>
    </div>
  </li>
</ul>
```

The action row takes its own line under the name and lays buttons out in a grid. Keep it to four buttons or fewer.

### D. Empty state

One sentence inside the card that says what is missing and how to fix it:

```tsx
{items.length === 0 && <p class='muted'>No contacts yet. Add one below, or save someone after you chat.</p>}
```

### E. Settings toggle

Use the `Toggle` component in `pages.tsx`: label, one hint sentence, checkbox. Persist through `store.ts` and update state in `App.tsx`.

### F. Destructive action

Use `class='danger'` on the button and `window.confirm` that says what will be lost, for example: Create a brand-new ID? Your current ID stops working.

## 3. Anti-patterns (reject on sight)

1. A new colour, gradient or shadow that is not a token.
2. Inline style attributes. The CSP blocks them and the build fails.
3. Fixed pixel widths on containers. Use max-width and flexible layouts.
4. Text under 16px in inputs (iOS zooms the page).
5. Placeholder text used instead of a label.
6. Buttons under 44px tall for primary actions.
7. Two columns on a 360px screen.
8. Modals, drawers, popovers, tooltips that hide required information.
9. Hamburger menus. Navigation is the bottom tab bar.
10. Emoji or images as icons, decorative illustrations, stock photos.
11. Autoplaying sound or video. Calls start only on a user tap.
12. Layout shift: content that jumps when something loads. Reserve space or use inline status text.
13. Custom scrollbars, custom select or checkbox widgets, custom focus rings.
14. Removing or hiding the focus outline.
15. Using colour alone to show a state. Pair it with words.
16. Using `100vh`. Use `100dvh`.
17. Adding a UI library or CSS framework. The app is small on purpose.
18. Editing generated files (icons in `public/`).
19. Changing the bottom tab bar order or the primary colour without being asked.
20. Designing for accounts, logins, push notifications or cloud storage. This app has none.

## 4. User flows and expected behaviour

| Flow | What the user sees | Failure behaviour |
| --- | --- | --- |
| First run | Home with their new ID card and a prompt to pick a display name | Setup error card explaining that a modern browser over HTTPS is needed |
| Contact by ID | Enter ID, Connect. Banner shows Looking for them, then Waiting for them to accept | Banner error: They do not seem to be online right now, They declined, or They did not respond. Nothing is lost |
| Incoming request | Card in Requests with Accept and save, Accept once, Decline, Block. Tab shows a count | Requests expire after two minutes and disappear |
| Invite link | Create invite link opens the chat with a Copy invite link button | Status stays on Waiting until the other person opens it |
| Chat | Header with name and status, pinned message box, messages scroll above it | Send is disabled until connected |
| Call | Voice call or Video call buttons. The other person sees a join hint | Inline error text if the microphone or camera is denied |
| File | Attach button, progress bar, download link after an integrity check | Inline error for files over 50 MB, or a failed integrity check message |
| Install | Install banner on Home when the browser offers it, with Not now | Hidden for a week after dismissal, never shown inside a chat |

When you change a flow, update this table.

## 5. Copy

| Instead of | Write |
| --- | --- |
| Error: connection failed | They do not seem to be online right now. |
| Submit | Add contact |
| Are you sure? | Create a brand-new ID? Your current ID stops working. |
| Authenticating peer | Waiting for them to accept... |
| Invalid input | That ID does not look right. It has 16 letters and numbers. |
| Click here | Copy invite link |

Rules: say what happened and what to do next, in short sentences, without jargon or blame. Buttons start with a verb. Technical detail belongs under Debug info.

## 6. Cutting manual work

Automated already, so do not do these by hand:

- App icons are generated at build time by `scripts/make-icons.mjs`. Never edit or commit the PNGs.
- The web manifest and service worker come from `vite.config.ts`. Do not write them by hand or bump cache versions.
- `npm run check:ui` runs inside `npm run build` and catches inline styles, raw colours, external URLs and missing alt text.
- `npm run ui:shots` takes every screenshot you need.

Working rules that save time:

- Change a token once in `:root` instead of editing many rules.
- Make all file changes first, then build once. Do not redeploy for each small tweak.
- Run the screenshots before you deploy, not after.
- Re-send only the files you changed when uploading through the v0 tools.

Recipes:

- **Add a design token:** add it to the light block and the dark block of `:root`, add a row to the token table in `docs/ui-guide.md`, then use it.
- **Add a button variant:** add one class next to the existing `button.ghost` rules, document it in the catalogue, and use it in at least one screen.
- **Add a setting:** a getter and setter in `store.ts`, state in `App.tsx`, a `Toggle` in the Privacy card, and a line in Help if users need to know.

## 7. Self-review rubric

Look at the screenshots and answer yes to all:

1. Is there exactly one obvious primary action on each screen?
2. Does anything touch the screen edge without padding, or scroll sideways?
3. Is any text smaller than the body text, other than helper text and IDs?
4. Can you tell what every control does without reading code?
5. Are the empty, waiting and error states designed, not blank?
6. Does dark mode look as deliberate as light mode?
7. At 360px, do long names, IDs and messages wrap without breaking the layout?
8. Do the sticky bars (tab bar, composer, install banner) ever cover content you need?
9. Does it match the rest of the app, as if the same person built it?

## 8. Stop and ask the human when

- a change adds, removes or reorders a main tab
- you want a new colour, font or visual style
- a flow needs a server, an account, or a new permission
- the change touches security copy, ID or key handling, or the CSP
- two rules in these docs conflict
- you cannot verify the change in a real browser (say exactly what you could not check)

## 9. Decisions already made (do not revisit)

- Navigation is a bottom tab bar with four tabs: Home, Contacts, Profile, Help.
- Palette: warm paper background, deep teal accent, amber highlight, defined in tokens.
- Headings use the serif token, body uses the system font. No web fonts.
- Buttons are pill shaped, except buttons inside list rows, which are rounded rectangles.
- IDs are shown uppercase in groups of four, in the mono font.
- The chat screen locks to the viewport height. Only the message area scrolls and the composer stays pinned.
- No accounts, no server, no analytics.
