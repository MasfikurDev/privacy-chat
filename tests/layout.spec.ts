import { expect, test } from '@playwright/test';

test('home and contacts adapt to wide and narrow layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('.id-code')).toBeVisible();

  const homeColumns = await page.locator('.page-home').evaluate((element) => {
    return getComputedStyle(element).gridTemplateColumns.split(' ').length;
  });
  expect(homeColumns).toBe(2);

  await page.setViewportSize({ width: 375, height: 812 });
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

test('chat room keeps its composer and message canvas usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.id-code')).toBeVisible();
  await page.getByRole('button', { name: 'Create invite link' }).click();

  await expect(page.getByRole('button', { name: 'Copy invite link' })).toBeVisible();
  await expect(page.getByText('Your conversation starts here')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeVisible();

  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    composerWidth: document.querySelector('.composer')?.getBoundingClientRect().width ?? 0
  }));
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.composerWidth).toBeGreaterThan(300);
});
