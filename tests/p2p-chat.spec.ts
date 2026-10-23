import { expect, test } from '@playwright/test';

const ID_FORMAT = /^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){3}$/;

test('peers have unique IDs, connect through an invite, and exchange messages', async ({ browser }) => {
  test.skip(
    process.env.RUN_REAL_P2P_E2E !== '1',
    'requires outbound internet access to the public signaling services'
  );
  test.setTimeout(180_000);

  const peerA = await browser.newContext();
  const peerB = await browser.newContext();

  try {
    const pageA = await peerA.newPage();
    const pageB = await peerB.newPage();

    await Promise.all([pageA.goto('/'), pageB.goto('/')]);

    await pageA.getByRole('button', { name: 'Settings' }).click();
    await pageB.getByRole('button', { name: 'Settings' }).click();

    const idA = pageA.locator('.id-code');
    const idB = pageB.locator('.id-code');
    await expect(idA).toHaveText(ID_FORMAT);
    await expect(idB).toHaveText(ID_FORMAT);

    const peerAId = await idA.innerText();
    const peerBId = await idB.innerText();
    expect(peerAId).not.toBe(peerBId);

    await pageA.reload();
    await pageA.getByRole('button', { name: 'Settings' }).click();
    await expect(pageA.locator('.id-code')).toHaveText(peerAId);
    await pageB.reload();
    await pageB.getByRole('button', { name: 'Settings' }).click();
    await expect(pageB.locator('.id-code')).toHaveText(peerBId);

    await pageA.getByRole('button', { name: 'Chats' }).click();
    await pageA.getByRole('button', { name: 'New chat' }).click();
    await pageA.getByRole('button', { name: 'Create invite' }).click();
    await expect(pageA.getByRole('button', { name: 'Copy invite link' })).toBeVisible();

    const inviteUrl = pageA.url();
    expect(new URL(inviteUrl).hash.length > 1, 'invite secret should be present in the URL fragment').toBe(true);

    await pageB.goto('about:blank');
    await pageB.goto(inviteUrl);
    await expect(pageB.getByRole('button', { name: 'Copy invite link' })).toBeVisible();

    await expect(pageA.getByRole('status').filter({ hasText: 'Connected' })).toBeVisible({ timeout: 120_000 });
    await expect(pageB.getByRole('status').filter({ hasText: 'Connected' })).toBeVisible({ timeout: 120_000 });

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const messageAToB = `peer-a-to-b-${suffix}`;
    const messageBToA = `peer-b-to-a-${suffix}`;

    await pageA.getByRole('textbox', { name: 'Message' }).fill(messageAToB);
    await pageA.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(pageB.getByText(messageAToB, { exact: true })).toBeVisible({ timeout: 30_000 });

    await pageB.getByRole('textbox', { name: 'Message' }).fill(messageBToA);
    await pageB.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(pageA.getByText(messageBToA, { exact: true })).toBeVisible({ timeout: 30_000 });
  } finally {
    await Promise.all([peerA.close(), peerB.close()]);
  }
});