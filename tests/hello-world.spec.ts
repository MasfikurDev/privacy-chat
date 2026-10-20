import { expect, test } from '@playwright/test';

test('the app opens successfully', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle('Privacy Chat');
});