import { test, expect } from "@playwright/test";

test("unknown routes show a not-found view with a link home", async ({ page }) => {
  await page.goto("/totally-unknown-path");
  await expect(page.getByText(/page not found/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /create a one-time secret/i })).toBeVisible();
});

test("create and reveal pages set descriptive titles", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/create a one-time secret/i);
  await page.goto("/s/some-id#some-key");
  await expect(page).toHaveTitle(/reveal a one-time secret/i);
});

test("document declares a favicon", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
});

test("the expiry select shows a caret affordance", async ({ page }) => {
  await page.goto("/");
  const bg = await page
    .locator("select.select")
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).not.toBe("none");
});

test("the full one-time link (including the #key) is not clipped", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/secret message/i).fill("regression secret");
  await page.getByRole("button", { name: /encrypt \+ create link/i }).click();

  const field = page.getByLabel("One-time link");
  await expect(field).toBeVisible();
  const value = await field.inputValue();
  expect(value).toContain("#");
  // The control wraps rather than clipping: no hidden horizontal overflow.
  const clipped = await field.evaluate(
    (el: HTMLTextAreaElement) => el.scrollWidth > el.clientWidth + 1
  );
  expect(clipped).toBeFalsy();
});

test("the header and footer do not overflow on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  const headerOverflow = await page
    .locator("header.shell-header")
    .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  expect(headerOverflow).toBeFalsy();
  const footerOverflow = await page
    .locator("footer.shell-footer")
    .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  expect(footerOverflow).toBeFalsy();
});
