import { defineConfig } from '@playwright/test';

const deployedBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const localBaseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: deployedBaseURL || localBaseURL,
    browserName: 'chromium',
    channel: 'chromium',
    headless: process.env.PLAYWRIGHT_HEADED !== '1',
    launchOptions: {
      slowMo: Number.parseInt(process.env.PLAYWRIGHT_SLOWMO_MS || '0', 10)
    }
  },
  webServer: deployedBaseURL
    ? undefined
    : {
        command: 'node scripts/make-icons.mjs && corepack pnpm exec vite --host 127.0.0.1 --port 4173 --strictPort',
        url: localBaseURL,
        reuseExistingServer: !process.env.CI
      }
});