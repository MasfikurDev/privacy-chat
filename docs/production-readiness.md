# Production readiness and release process

This project is a browser-based peer-to-peer communication app. A successful static build is not proof that real-world peer connections, privacy properties, or browser permissions work correctly.

## Release stages

### 1. Change preparation
- Make changes on a short-lived branch; do not commit directly to `main`.
- Keep each pull request focused and explain the user-visible behavior, risk, and test evidence.
- Update user-facing help/privacy wording when behavior or data handling changes.
- Never commit credentials, private identity backups, real user data, or generated build output.

### 2. Pull-request gates
A pull request must have the GitHub Actions check **Typecheck, build, and browser tests** passing before merge. The CI job runs:
- frozen pnpm install on Node.js 22
- TypeScript typecheck
- UI/CSP guard
- production build
- Playwright Chromium end-to-end tests
- dependency audit, failing on high-severity findings

Investigate every failure; do not bypass checks to ship. The audit currently uses a high-severity threshold, so moderate findings may not fail CI. Review and record moderate findings instead of treating a green run as a clean bill of health.

### 3. Preview verification
For each release candidate, open the Vercel preview URL and verify:
- app loads without console errors or CSP violations
- identity creation and display-name save
- create invite link, open it in a separate browser profile/device, and join the room
- text message delivery in both directions
- microphone/camera permission, call connect, mute, hang up, and retry
- file transfer success, rejection of oversized files, and integrity-failure handling where testable
- refresh/reconnect behavior and mobile viewport usability

Use two independent browser contexts or devices for peer-to-peer checks. A single-browser smoke test cannot prove P2P behavior. The public-network P2P test is opt-in and is not covered by the ordinary CI pass unless it is explicitly run and its result recorded.

### 4. Security and privacy release review
Before calling a release production-ready, confirm:
- threat model and security claims match the actual implementation
- identity private keys and exported backups are handled safely
- invite secrets are not logged or sent in HTTP requests; review URL-fragment handling and referrer behavior
- signaling/STUN/TURN providers, IP exposure, metadata, and fallback relay behavior are explained accurately
- TURN credentials are short-lived/restricted; no privileged secrets are embedded in `VITE_*` variables
- file-size limits and untrusted-file warnings are clear
- CSP and other security headers are verified on the deployed response, not just in configuration
- dependency audit findings are reviewed, with unresolved findings documented and risk-accepted explicitly

Do not claim anonymity or end-to-end guarantees beyond what the implementation and tests establish.

### 5. Production release
- Merge only after required checks pass and the release review is complete.
- Vercel should deploy production from `main`; feature branches should produce previews only.
- Confirm the production deployment is `READY` and points to the merge commit on `main`.
- Run a short production smoke test for page load, identity setup, invite creation, and a controlled two-device connection.
- Record the deployed commit SHA, smoke-test outcome, known issues, and rollback target in the release notes or pull request.

### 6. Rollback and incident handling
- If the release breaks a core flow or exposes a security issue, stop promotion and roll back to the last known-good Vercel production deployment.
- Re-test the production alias after rollback; a rollback is not complete until the public site is verified.
- Open a follow-up issue/PR with reproduction steps, impact, fix, and regression test.
- For a suspected vulnerability, avoid posting exploit details publicly before coordinating a fix.

## GitHub repository settings to configure

In **Settings → Rules → Rulesets** (or branch protection for `main`), configure:
- protect `main`; require changes to arrive through a pull request
- require the **Typecheck, build, and browser tests** status check
- require the branch to be up to date before merging if the team can support the extra CI runs
- block force pushes and branch deletion
- require conversation resolution
- do not require an approval count that makes solo-maintainer releases impossible; use an independent reviewer when available

These repository settings must be enabled in GitHub; workflow YAML alone cannot enforce them.

## Readiness status
A release is not fully production-ready until cross-device P2P flows and the security/privacy review above have been completed. CI passing proves only the checks that actually ran.
