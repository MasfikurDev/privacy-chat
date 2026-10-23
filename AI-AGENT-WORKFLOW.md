# How to work on this project: process and UI/UX techniques for AI agents

This file describes the working method that produced a stable result on Privacy Chat (a peer-to-peer chat PWA). Follow it so your changes are small, verified, consistent with the rest of the app, and easy for the next agent to build on.

It complements `AGENTS.md` (rules and commands), `docs/ui-guide.md` (design tokens and components) and `docs/ux-playbook.md` (decision rules and recipes). If this file and those disagree, ask the human.

---

## 1. Principles

1. **Verify, do not assume.** Something is working only when you have seen it work: a passing build, a screenshot you looked at, a response from the live site. Say plainly what you could not check.
2. **Read before you write.** Look at the current state of the project before changing it. Other people and agents edit the same project.
3. **One source of truth.** Find where the real code lives (usually the Git repository) and work from that. Never assume your copy is the latest.
4. **Smallest change that solves the problem.** Reuse existing patterns, tokens and components. Do not redesign what was not asked.
5. **Fix causes, not symptoms.** Form a hypothesis from evidence, test it, then change one thing at a time.
6. **Be honest.** Report mistakes, uncertainty and unfinished parts directly and early.

---

## 2. The work loop

### Step 1. Orient (5 minutes, never skip)

- Read `AGENTS.md`, then the docs for the area you will touch.
- List the files that exist now. Open the ones you will change and the ones next to them.
- Check where deployments come from (Git, a tool, manual upload) and what is live right now. Compare the live site with the code you are looking at.
- Look for changes you did not make: new files, new components, different values. Understand them before you build on top of them.

### Step 2. Plan (a few lines)

Write down:
- what the user actually needs (not just the literal request)
- which screens, files and states are affected
- what could go wrong, and how you will check it
- any decision that belongs to the human (see section 6)

If the request is ambiguous and the choice matters, ask one short question. Otherwise state your assumption and proceed.

### Step 3. Implement

- Change tokens or shared classes instead of adding one-off styles.
- Keep each file change complete and consistent. Do not leave half-finished code behind.
- Make all file changes first, then build once. Avoid a deploy for every small tweak.
- When uploading through a tool that replaces whole files, send only the files you changed, and only after reading their current contents.

### Step 4. Verify

- Run the full build. Read the failure output; do not guess.
- Look at the result in a real browser at the sizes in section 5.
- Test the unhappy paths: empty, waiting, error, long text, denied permission, offline.
- After deploying, check the live result (see section 7).

### Step 5. Report

Keep it short and lead with the outcome:
- what changed and where
- what you checked and how
- what you did not check, and why
- what the human should do next

---

## 3. Working in a shared project (lessons learned)

These came from real mistakes on this project.

- **Whole-file uploads can erase other people's work.** Before replacing a file, fetch its current content and compare it with what you expect. If it differs, merge instead of overwriting.
- **Two copies drift.** A tool-side copy (for example a chat workspace) and the Git repository can diverge. The production site may be built from Git, not from your upload. Always confirm which commit or deployment is live before saying your change is live.
- **Check the live artifacts, not just the build status.** A READY deployment can still be an older or different version. Fetch the real manifest, page or file and confirm it matches what you shipped.
- **Do not deploy around the team's flow.** If the project uses Git deployments, make your change reviewable in Git, even if that means handing over a patch or a zip.
- **Generated files stay generated.** Icons, lockfiles and build output are not hand-edited. Add them to `.gitignore` if they are build products.
- **Never claim more than you saw.** "The build passed" and "it works on a phone" are different statements.

---

## 4. UI/UX techniques that work

### 4.1 Design direction

- Pick one calm, consistent direction and stick to it. Here: warm paper background, deep teal accent, one amber highlight, serif headings, system body font.
- Express the direction through **design tokens** (CSS variables) and nothing else. Light and dark values are defined once, in `:root`.
- No decoration for its own sake: no gradients, illustrations, emoji icons or animation unless the task needs them.

### 4.2 Mobile first, one column

- Design at 360 to 390 px wide first. Let larger screens add whitespace, not new layouts.
- Nothing wider than the screen. No horizontal scrolling.
- Use `100dvh`, never `100vh`. Respect `env(safe-area-inset-*)` on anything touching a screen edge.
- Sticky or fixed bars (tab bar, composer, banners) must never cover content the user needs.

### 4.3 Structure and hierarchy

- One primary action per card or screen. Secondary actions are ghost buttons. Destructive actions are clearly marked and confirmed.
- One topic per card, a short title, one sentence of help, then the control.
- Group related actions in a row or grid. Keep the number of buttons per row small (four or fewer).
- Put technical detail behind a `details` element (for example Debug info), not in the main flow.

### 4.4 The chat screen pattern

A messaging screen has a fixed structure, and only one part scrolls:

1. header (back, name, status)
2. tools row (calls)
3. optional video area
4. scrolling message area (grows, auto-scrolls to the newest message)
5. pinned composer at the bottom (attach, text box, send)

Lock the screen to the viewport height so the composer never scrolls away. Without this the user has to scroll the page just to type.

### 4.5 List rows with actions

On phones a row with an avatar, a name and four buttons cannot sit on one line. Put the actions on their own full-width line below the name, in an auto-fit grid. Use the same layout on desktop so the screens look the same everywhere. Inside these rows use rounded-rectangle buttons so wrapped labels do not turn into odd ovals.

### 4.6 States are part of the design

Design every state, not just the happy path:

| State | Approach |
| --- | --- |
| Empty | One sentence saying what is missing and how to fix it |
| Waiting | Inline status text, not a full-screen spinner |
| Error | Plain words, what happened, what to do next, in the nearest place |
| Long content | Wrap and clamp; test with 32-character names, long IDs, 4000-character messages |
| Disabled | Reduced opacity, `not-allowed` cursor, and a reason nearby |

### 4.7 Accessibility basics

- Contrast at least 4.5:1 for text (3:1 for large text), in light and dark.
- Touch targets at least 44 px for primary actions.
- Every input has a visible label or `aria-label`. Placeholders are not labels.
- Status changes use `role='status'`; errors use `role='alert'`.
- Never remove the focus ring. Everything works with a keyboard.
- Do not use colour alone to show a state.
- Text inputs are at least 16 px so iOS does not zoom the page.

### 4.8 Copy

- Say what happened and what to do next, in short sentences. No jargon, no blame.
- Buttons start with a verb: Copy invite link, Add contact.
- Prefer plain words: "They do not seem to be online right now" beats "Connection failed".

### 4.9 Things to avoid

Modals and pop-ups that hide required information, sound that plays without a tap, hamburger menus, custom scrollbars or form widgets, new fonts or UI libraries, fixed pixel widths, text under 16 px in inputs, two columns on a phone, layout that jumps while loading, and any colour that is not a token. If you think one of these is truly needed, ask the human first.

---

## 5. How to verify UI

### 5.1 Size and theme matrix

Check every visual change at all of these, in light and dark:

| Name | Size |
| --- | --- |
| phone-small | 360 x 640 |
| phone | 390 x 844 |
| tablet | 768 x 1024 |
| desktop | 1280 x 800 |

Screens: Home, Contacts, Profile, Help, Chat (empty and with many messages), install banner.

### 5.2 Taking screenshots

Preferred: build the app, run `npx vite preview`, then run `npm run ui:shots` (needs Playwright). Look at every image.

If you cannot run the real app, build a **static mock**: write plain HTML with the same markup and class names as the components, link the real stylesheet, serve the folder with a local web server, and screenshot it with Playwright. This catches most layout bugs quickly and cheaply. Its limits: it duplicates markup, so it can drift from the real components, and it does not test behaviour. Say so in your report.

Tips:
- Start the local web server in the same command that uses it; background processes may not survive between commands.
- Full-page screenshots show sticky bars floating mid-page. That is an artefact, not a bug.
- Combine several screenshots into one contact sheet so you can compare phone and desktop, light and dark side by side.

### 5.3 What to look for

1. Is there one obvious primary action?
2. Does anything touch the screen edge without padding, or scroll sideways?
3. Do long names, IDs and messages wrap cleanly at 360 px?
4. Do buttons wrap into odd shapes?
5. Do sticky elements cover content?
6. Does dark mode look as deliberate as light mode?
7. Does it look like the rest of the app?

### 5.4 Automated guardrails

`npm run check:ui` runs inside `npm run build`. It fails the build on inline style attributes, raw colours outside `:root`, `!important`, external URLs, missing image alt text and unsafe HTML injection. When a rule fails, fix the code. Change a rule only if the rule is wrong, and explain why.

---

## 6. Stop and ask the human when

- a change adds, removes or reorders a main tab
- you want a new colour, font or visual style
- a flow needs a server, an account or a new permission
- the change touches the Content-Security-Policy, ID or key handling, or security wording
- two documented rules conflict
- you find unexpected changes by someone else that affect your work
- you cannot verify the change in a real browser

---

## 7. Deploying and confirming it is live

1. Confirm the build passes locally or in CI. Read the log if it fails.
2. Deploy through the project's normal path (Git). Do not bypass it.
3. Find out which deployment is production and what commit it came from.
4. Fetch real files from the live site (page, manifest, stylesheet) and confirm they match what you shipped.
5. Test in a fresh private window, because the service worker caches the app.
6. Report the live address, the commit or deployment, and what you tested.

---

## 8. Debugging method (worked well for the peer-to-peer connection)

1. **Make the problem visible.** Add a small debug panel or log with the facts you need (connection states, relay counts, errors) before guessing.
2. **Separate layers.** Is it discovery (signaling), the connection (ICE), or the app logic? Prove each layer on its own.
3. **Change one thing at a time**, and record what each change showed.
4. **Test where the user is.** A cloud test browser may fail for reasons a real device does not. Treat disagreement between environments as a clue and ask the user for a real-device log.
5. **Keep evidence.** Quote the exact log lines that support a conclusion, and say what they do not prove.
6. **Remove or hide debug output** from the main flow once the problem is solved (collapse it under a details element).

---

## 9. Communication style

- Lead with the answer or the outcome. No filler.
- Keep messages short enough to read on a phone. Use a short list when the content is a list.
- Separate what you did, what you verified and what is still open.
- When you were wrong, say so, say what you will change, and move on.
- Ask at most one question at a time, and only when the answer changes what you do.

---

## 10. Checklists

### Before you change anything
- [ ] Read `AGENTS.md` and the relevant docs
- [ ] Listed current files and checked what is live
- [ ] Looked for changes made by others
- [ ] Wrote a short plan

### Before you hand off
- [ ] `npm run build` passes (includes `npm run check:ui`)
- [ ] No raw colours, inline styles or `!important` added
- [ ] Checked the size and theme matrix with real screenshots
- [ ] Empty, waiting, error and long-text states checked
- [ ] New patterns added to the docs
- [ ] Summary lists what was checked and what was not

### After deploying
- [ ] Confirmed which deployment and commit are live
- [ ] Fetched live files and compared them with what you shipped
- [ ] Tested in a private window

---

## 11. Mistakes to avoid (from this project)

1. Uploading whole files without reading their current contents first.
2. Deploying from a side channel while the real site was built from Git.
3. Calling the UI fixed from mock screenshots alone, before seeing the live site.
4. Trusting a READY build status instead of checking the live files.
5. Adding behaviour the playbook forbids (for example a modal with sound) without asking.
6. Leaving build output (`dev-dist/`) and generated icons in the repository.
7. Hand-copying large file contents into tool calls, which invites typos. Prefer small, targeted changes.


---

## 12. Privacy Chat project-specific verification

Use this checklist when working on the current Privacy Chat repository. It supplements the general workflow above; it does not replace `AGENTS.md`, the UI guide, or the UX playbook. Re-check the repository's current scripts and workflow files before relying on any finding below, because they can change.

### 12.1 CI and dependency consistency

- [ ] Keep the pnpm version declared in `package.json` (`packageManager`) consistent with the version configured in `.github/workflows/ci.yml`. Avoid declaring conflicting versions in multiple places.
- [ ] Use one package manager and its committed lockfile consistently for install, build, type-check, and audit jobs. Do not run `npm audit` in a pnpm-only checkout without the npm lockfile it requires; use the repository's supported audit command and lockfile instead.
- [ ] Verify CI from a fresh checkout and inspect the complete failure log. A green install/build job does not mean the audit or test jobs passed.
- [ ] Keep `AGENTS.md` and README setup/test commands aligned with the scripts that actually exist in `package.json`.

### 12.2 Test coverage and browser verification

- [ ] Run the available type-check, build, UI checks, and relevant unit/e2e tests.
- [ ] Run Playwright tests in CI where practical. Keep tests that require real external peers, public relays, or successful internet P2P connectivity separate or explicitly opt-in so normal CI remains deterministic.
- [ ] For UI changes, follow the size/theme matrix and screenshot process in section 5; inspect the screenshots instead of treating screenshot generation as proof.
- [ ] For WebRTC/P2P changes, distinguish discovery/signaling, ICE connectivity, and application/session logic. Capture the relevant states and logs, and test on a real device when a cloud browser may behave differently.

### 12.3 Security and privacy review

- [ ] Treat identity keys, conversation secrets, invitation links, and URL fragments as sensitive. Do not log or expose secret material in diagnostics, screenshots, analytics, or error reports.
- [ ] Review private-key persistence and backup/restore paths, including the consequences of storing key material in browser storage accessible to same-origin JavaScript. Consider the impact of any XSS vulnerability before changing storage or key-handling code.
- [ ] Review what signaling/discovery services can observe, including connection metadata and potential IP exposure. Do not describe the app as eliminating third-party trust or metadata exposure merely because chat traffic is peer-to-peer.
- [ ] Test malformed or oversized peer messages and files, repeated connection attempts, disconnect/reconnect paths, and cleanup of timers, streams, tracks, data channels, and object URLs. Check that resource limits and file-integrity checks still apply.
- [ ] Treat changes to identity, key handling, invitations, cryptographic verification, CSP/security headers, or privacy/security claims as human-review changes under section 6.

### 12.4 Release confidence

- [ ] Report build status, automated test status, real-browser/device verification, and live-deployment verification as separate claims.
- [ ] Do not call the application production-ready based on a successful build alone. State which security, interoperability, and privacy checks remain incomplete.
- [ ] Follow section 7 to identify the deployed commit, verify the live artifacts, and test in a fresh private window to account for service-worker caching.
