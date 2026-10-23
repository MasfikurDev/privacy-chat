import { expect, test } from '@playwright/test';

test('chats-first layout adapts to wide and narrow viewports', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('main').getByRole('heading', { name: 'Chats', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New chat' })).toBeVisible();

  let layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth
  }));
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByRole('textbox', { name: 'Their ID' })).toBeVisible();
  await page.getByRole('button', { name: 'Create invite' }).click();

  await expect(page.getByRole('button', { name: 'Copy invite link' })).toBeVisible();
  await expect(page.getByText('Your conversation starts here')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();

  layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    composerWidth: document.querySelector('.composer')?.getBoundingClientRect().width ?? 0
  }));
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.composerWidth).toBeGreaterThan(300);
});

test('contacts actions remain accessible and touch-sized on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Contacts' }).click();
  await page.getByRole('textbox', { name: 'Contact ID' }).fill('ABCD-EFGH-JKLM-NPQR');
  await page.getByRole('button', { name: 'Add contact' }).click();

  const contactActions = page.locator('.contact-actions');
  await expect(contactActions.getByRole('button', { name: 'Message' })).toBeVisible();
  await expect(contactActions.getByRole('button', { name: 'Rename' })).toBeVisible();
  await expect(contactActions.getByRole('button', { name: 'Remove' })).toBeVisible();
  await expect(contactActions.getByRole('button', { name: 'Block' })).toBeVisible();

  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    actionButtonHeight: document.querySelector('.contact-actions button')?.getBoundingClientRect().height ?? 0
  }));
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.actionButtonHeight).toBeGreaterThanOrEqual(44);
});
