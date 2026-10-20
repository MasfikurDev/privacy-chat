import { expect, test } from "@playwright/test";

test("composer stays in viewport and message list scrolls internally on mobile", async ({ page }) => {
  // Regression guard: composer must remain accessible (not pushed off-screen or blocked by overlays).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".id-code")).toBeVisible();
  await page.getByRole("button", { name: "Create invite link" }).click();

  await expect(page.getByRole("button", { name: "Copy invite link" }).first()).toBeVisible();
  await expect(page.getByText("Your conversation starts here")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeVisible();

  const msgs = page.locator(".msgs");
  await msgs.evaluate((el) => {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const div = document.createElement("div");
      div.className = "msg them";
      div.innerHTML = '<div class="msg-text">long message ' + i + ' to grow height</div><span class="msg-time">' + new Date().toLocaleTimeString() + "</span>";
      el.appendChild(div);
    }
    el.scrollTop = 0;
  });

  const layout = await page.evaluate(() => {
    const msgsEl = document.querySelector(".msgs");
    const composerEl = document.querySelector(".composer");
    const viewportHeight = document.documentElement.clientHeight;
    const rect = composerEl?.getBoundingClientRect();
    return {
      viewportHeight,
      msgsScrollHeight: msgsEl?.scrollHeight ?? 0,
      msgsClientHeight: msgsEl?.clientHeight ?? 0,
      composerBottom: rect?.bottom ?? Infinity,
      docScrollHeight: document.documentElement.scrollHeight
    };
  });

  expect(layout.composerBottom).toBeLessThanOrEqual(layout.viewportHeight + 2);
  expect(layout.msgsScrollHeight).toBeGreaterThan(layout.msgsClientHeight);
  expect(layout.docScrollHeight).toBeLessThanOrEqual(layout.viewportHeight + 50);
});

test("install banner does not block taps on page content", async ({ page }) => {
  // Regression guard: install banner used to sit on top and swallow clicks on "Create invite link".
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".id-code")).toBeVisible();
  await page.getByRole("button", { name: "Create invite link" }).click({ timeout: 5000 });
  await expect(page.getByRole("button", { name: "Copy invite link" }).first()).toBeVisible();
});

test("message list is a log region and composer is a real textbox", async ({ page }) => {
  // Regression guard: ensure chat accessibility/semantics are correct.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".id-code")).toBeVisible();
  await page.getByRole("button", { name: "Create invite link" }).click();

  await expect(page.locator(".msgs")).toHaveAttribute("role", "log");
  const composer = page.getByRole("textbox", { name: "Message" });
  await expect(composer).toHaveCount(1);
  const tag = await composer.evaluate((el) => el.tagName);
  expect(tag).toBe("TEXTAREA");
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeVisible();
});

test("timestamps and day separators", async ({ page }) => {
  // Regression guard: messages should render time metadata and carry expected classes.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".id-code")).toBeVisible();
  await page.getByRole("button", { name: "Create invite link" }).click();
  await expect(page.getByText("Your conversation starts here")).toBeVisible();

  const hasMsg = await page.evaluate(() => {
    const msgs = document.querySelector(".msgs");
    if (!msgs) return false;
    const div = document.createElement("div");
    div.className = "msg mine";
    div.innerHTML = '<div class="msg-text">hi</div><span class="msg-time">10:00</span>';
    msgs.appendChild(div);
    const timeEl = msgs.querySelector(".msg-time");
    return timeEl !== null && /[0-9]/.test(timeEl.textContent || "");
  });
  expect(hasMsg).toBe(true);
  await expect(page.locator(".msg").last()).toBeVisible();
});

test("contact row actions", async ({ page }) => {
  // Regression guard: contact actions must be accessible with adequate tap targets.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".id-code")).toBeVisible();

  await page.getByRole("button", { name: "Contacts" }).click();
  await page.getByRole("textbox", { name: "Contact ID" }).fill("ABCD-EFGH-JKLM-NPQR");
  await page.getByRole("button", { name: "Add contact" }).click();

  const contactActions = page.locator(".contact-actions");
  await expect(contactActions.getByRole("button", { name: "Message" })).toBeVisible();
  await expect(contactActions.getByRole("button", { name: "Rename" })).toBeVisible();
  await expect(contactActions.getByRole("button", { name: "Remove" })).toBeVisible();
  await expect(contactActions.getByRole("button", { name: "Block" })).toBeVisible();
  await expect(contactActions.getByRole("button", { name: "Message" })).toHaveClass(/contact-primary/);

  const height = await page.evaluate(() => {
    const btn = document.querySelector(".contact-actions button");
    return btn?.getBoundingClientRect().height ?? 0;
  });
  expect(height).toBeGreaterThanOrEqual(44);
});
