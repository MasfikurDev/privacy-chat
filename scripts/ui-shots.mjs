// Takes screenshots of every screen across phone, tablet and desktop sizes in light and dark mode.
// Usage:  node scripts/ui-shots.mjs [baseUrl] [outDir]
// Needs:  npm i -D playwright && npx playwright install chromium
//         and the app running, e.g. `npm run build && npx vite preview` (default http://localhost:4173).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const base = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3] ?? 'ui-shots';
mkdirSync(out, { recursive: true });

const viewports = [
  ['phone-small', 360, 640],
  ['phone', 390, 844],
  ['tablet', 768, 1024],
  ['desktop', 1280, 800]
];
const schemes = ['light', 'dark'];
const tabs = ['Home', 'Contacts', 'Profile', 'Help'];
const chatUrl = `${base}/#aaaaaaaaaaaaaaaaaaaaaa`; // any hash value opens the private-room screen

const browser = await chromium.launch();
for (const colorScheme of schemes) {
  for (const [name, width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme });
    const page = await context.newPage();
    await page.goto(base);
    for (const tab of tabs) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await page.screenshot({ path: `${out}/${name}-${colorScheme}-${tab.toLowerCase()}.png`, fullPage: true });
    }
    await page.goto('about:blank'); // force a fresh load so the hash is read
    await page.goto(chatUrl);
    await page.screenshot({ path: `${out}/${name}-${colorScheme}-chat.png` });
    await context.close();
  }
}
await browser.close();
console.log(`Saved screenshots to ${out}/`);
