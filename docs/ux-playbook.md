# UX playbook for AI agents

This file exists so that UI work is predictable, consistent and fast. It complements `docs/ui-guide.md` (tokens, components, accessibility). Read both before touching any screen.

## 0. The six rules

1. **Reuse before you build.** Find the closest existing screen or component and copy its structure. A new pattern needs a reason.
2. **Tokens only.** No new colours, sizes, fonts, shadows or radii. Add a token if you truly need one.
3. **One primary action per screen or card.** Everything else is a ghost button or plain text.
4. **Phone first, one column.** Nothing wider than the screen, no horizontal scrolling, no side-by-side layouts under 600px.
5. **Look at it.** Run the screenshots and view them. If you did not look at it, it is not done.
6. **Product decisions belong to the human.** Never invent features, flows, names or policies (see section 8).

## 1. If you are asked to... do this

| Request | Do this | Never do this |
| --- | --- | --- |
| Add a button | `button` for the one primary action, `.ghost` for others, `.danger` for destructive. Label starts with a verb | Add a second primary button in the same card |
| Add a setting | Add a `Toggle` to the Privacy card on the Profile screen and save it in `store.ts` | Create a new page for one setting |
| Add a screen | Follow recipe A below | Add a router library or change URLs |
| Tell the user something | `.banner` for transient notices, inline `.error` or `.muted` text near the cause | `alert()`, toasts that vanish on their own, popups |
| Confirm a destructive action | `window.confirm` with one plain sentence (existing pattern) | A custom modal or dialog library |
| Show progress or waiting | A status sentence with `role='status'` (for example Looking for them...) | Full-screen spinners, skeleton screens |
| Show a long list | `ul.list` | Tables on phones, infinite scroll |
| Need an icon | Use a text label. If an SVG is essential, inline it, mark it `aria-hidden` and keep a text label | Icon fonts, emoji as icons, icon-only buttons |
| Need animation | None by default. If essential: 150ms or less, opacity or transform only, inside `@media (prefers-reduced-motion: no-preference)` | Bouncing, sliding drawers, parallax |
| Need a dialog, modal or drawer | Use a new screen state or inline expansion with `details` | Overlays that trap focus without a close path |
| Show a person | The `Avatar` component plus name | Uploaded photos (there is no server) |
| Support dark mode | Nothing extra. Tokens switch automatically | Separate dark-only styles outside the token block |
| Show an ID | Groups of four, uppercase, `.mono` | Lowercase, unspaced or truncated IDs |

## 2. Layout recipes (copy, then adapt text)

### A. Add a normal screen

1. Add the screen component to `src/pages.tsx`. Return a fragment of `section.card` blocks.
2. Add its name to the `Screen` type and the `TABS` array in `src/App.tsx` (keep tabs to four or fewer; if you need a fifth, ask the human).
3. Render it inside `main.page` in `App.tsx`.
4. Add its label to `tabs` in `scripts/ui-shots.mjs`.
5. Add a row to the component catalogue in `docs/ui-guide.md` if you introduced a new pattern.

Skeleton:

```tsx
export function Example() {
  return (
    <>
      <section class='card'>
        <h2>Title in sentence case</h2>
        <p class='muted'>One short sentence that explains it.</p>
        <button>Primary action</button>
      </section>
    </>
  );
}
```

### B. Card with a form

```tsx
<section class='card'>
  <h2>Add a contact</h2>
  <form class='stack' onSubmit={submit}>
    <input aria-label='Contact ID' placeholder='XXXX-XXXX-XXXX-XXXX' class='mono' />
    <input aria-label='Nickname' placeholder='Nickname (optional)' />
    <button>Add contact</button>
  </form>
  {error && <p class='error' role='alert'>{error}</p>}
</section>
```

Use `.stack` for inputs on their own lines. Use `.row` with a `.grow` input and one button for a single-field form.

### C. List row with avatar and actions

```tsx
<ul class='list'>
  <li>
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

The `.row` inside a list item becomes an auto-fit grid under the name on every screen size. Do not put more than four actions in one row.

### D. Empty state

One sentence in `.muted` telling the user what to do next, inside the same card the list will live in. Example: No contacts yet. Add one below, or save someone after you chat.

### E. Settings toggle

```tsx
<Toggle label='Appear online' hint='Lets people reach you while the app is open.' checked={on} onChange={setOn} />
```

Save to `store.ts` in the change handler. Never add a Save button for a toggle.

### F. Destructive action

Red outline button (`.danger`), always last in its row, `window.confirm` with the consequence stated in plain words, never the default focus.

## 3. Anti-patterns (reject on sight)

1. Hamburger menus, side drawers, floating action buttons. The tab bar is the navigation.
2. New colours, gradients, glassmorphism, neon, heavy shadows. The look is warm paper, teal and one amber accent.
3. Fixed pixel widths and heights for layout. Use rem, flex, grid and `max-width`.
4. Two-column layouts on phones, or tables that scroll sideways.
5. Text smaller than 0.85rem, or inputs under 16px (iOS zooms the page).
6. Placeholder text used as the only label.
7. Buttons under 44px tall for primary actions.
8. Emoji or decorative symbols in labels and headings.
9. ALL CAPS body text, centered paragraphs, justified text.
10. Custom scrollbars, custom checkboxes, custom select menus.
11. Layout that jumps when content loads. Reserve space or render a calm placeholder sentence.
12. Auto-playing sound, flashing, or anything that moves without a user action.
13. Dark patterns: guilt copy, fake urgency, hidden decline buttons.
14. Inline `style` attributes, `!important`, `100vh`, `position: fixed` without safe-area padding.
15. Adding a UI library, CSS framework, icon pack or font. The app has none by design.
16. Re-styling a component for one screen. Change the shared class or add a variant.

## 4. Expected behaviour of the main flows

Keep these working and consistent when you change UI.

- **First run.** The app creates the device ID by itself and shows Home. A card asks for a display name. Nothing blocks the user from continuing.
- **Contact by ID.** Type or paste an ID, press Connect. A banner shows Looking for them... with a Cancel button. Success opens the chat. Failure shows a plain explanation in a dismissible error banner (offline, declined, no answer).
- **Incoming request.** A Requests card appears on Home with the person's name and ID and four actions: Accept and save, Accept once, Decline, Block. The Home tab shows a count. Requests expire after two minutes.
- **Chat.** Header with Back, name and connection state. Tools row for calls. Messages scroll, the composer stays pinned at the bottom, and the newest message is always in view. Waiting and empty states have text.
- **Calls.** Voice and Video start a call. The other person sees a notice and joins with their own button. End call stops both sides.
- **Files.** Attach button next to the composer. Progress bar while sending. Received files appear as a download link with size. A failed integrity check is shown as discarded, never offered.
- **Install.** The install banner appears once per week at most, never inside a chat, and never after the app is installed.

## 5. Copy

| Instead of | Write |
| --- | --- |
| Error: peer not found | They do not seem to be online right now. |
| Invalid input | That ID does not look right. It has 16 letters and numbers. |
| Submit | Add contact |
| Success! | Saved |
| Are you sure? | Create a brand-new ID? Your current ID stops working. |
| Loading... | Looking for them... |

Rules: sentence case, plain words, say what happened and what to do next, no exclamation marks, no blame.

## 6. Cutting manual work

Things that are already automated. Do not do them by hand:

- App icons are generated at build time by `scripts/make-icons.mjs`. Never edit or commit PNG icons.
- The PWA manifest and service worker come from `vite.config.ts`. Never write a service worker or bump cache versions.
- UI rules are enforced by `npm run check:ui` inside `npm run build`.
- Screenshots come from `npm run ui:shots`. Do not take them by hand.
- Dark mode, spacing and colours come from tokens. Do not recompute them per screen.

Work in batches:

1. Make all your file changes first.
2. Run `npm run build` once. Fix everything it reports.
3. Run `npm run ui:shots` once and review every image.
4. Deploy once. Do not redeploy for each small tweak.

One change, one place:

| To change | Edit only |
| --- | --- |
| A colour | The token in both blocks of `:root` in `src/style.css` |
| Spacing between cards | `.page` gap in `src/style.css` |
| Button look | The `button` rule or one variant class |
| Tab names or order | `TABS` in `src/App.tsx` and `tabs` in `scripts/ui-shots.mjs` |
| Install banner | `src/install.tsx` and `src/install.css` |
| Security headers | `vercel.json` |

## 7. Self-review rubric

Look at the phone-small and phone screenshots first, then desktop. Ask:

1. Is there one obvious primary action?
2. Does any text touch the edge, overlap or get cut off?
3. Is there any horizontal scrolling?
4. Can I tap every control comfortably with a thumb?
5. Is the contrast fine in dark mode as well?
6. Does it look like the other screens (spacing, headings, buttons)?
7. What happens with a very long name, an empty list, an error and a slow connection?
8. Did I add anything the human did not ask for?

If any answer is no or unsure, fix it or say so in your summary.

## 8. Stop and ask the human

Ask before you:

- add, remove or rename a screen, tab, feature or setting
- change wording that makes a privacy or security promise
- change the palette, logo, app name or icon
- add a dependency, font, image or third-party service
- change the security headers or the way IDs or keys work
- make a trade-off between two reasonable designs

Do not ask about spacing, alignment, token usage or other things this playbook already decides.

## 9. Decisions already made (do not revisit)

- Navigation is a bottom tab bar with four tabs: Home, Contacts, Profile, Help.
- Palette: warm paper background, deep teal accent, amber highlight. Serif headings, system body font, monospace IDs.
- Primary buttons are pill shaped. Buttons inside list rows are rounded rectangles.
- IDs are shown in four groups of four, uppercase.
- The chat screen is locked to the viewport with a pinned composer.
- There are no accounts and no server, so do not design logins, cloud sync, profile photo uploads or push notifications.
- The debug panel stays inside the chat, collapsed.
