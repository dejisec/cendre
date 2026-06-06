import { test, expect } from "@playwright/test";

test("full secret flow with one-time read and key staying client-side", async ({
  page,
  browser,
}) => {
  const secretText = "burn-after-reading secret from e2e test";

  // Create a new secret via the UI.
  await page.goto("/");

  await page.getByLabel(/secret message/i).fill(secretText);
  await page
    .getByRole("button", { name: /encrypt \+ create link/i })
    .click();

  const urlInput = page.getByLabel("One-time link");
  await expect(urlInput).toBeVisible();

  const fullUrl = await urlInput.inputValue();
  const parsed = new URL(fullUrl);
  const keyFragment = parsed.hash.slice(1);

  expect.soft(keyFragment.length).toBeGreaterThan(0);

  // Open the generated link in a separate browser context to simulate a
  // different user and assert that the key never appears in any network URL.
  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();

  let keySeenInNetwork = false;
  readerPage.on("request", (request) => {
    if (keyFragment && request.url().includes(keyFragment)) {
      keySeenInNetwork = true;
    }
  });

  await readerPage.goto(fullUrl);
  await readerPage.getByRole("button", { name: /reveal & burn/i }).click();

  await expect(
    readerPage.getByText(/this secret is now gone/i)
  ).toBeVisible();

  await expect(
    readerPage.locator("pre", { hasText: secretText })
  ).toBeVisible();

  expect(keySeenInNetwork).toBeFalsy();

  // A second visit should show the "gone / already read" state.
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();

  await secondPage.goto(fullUrl);
  await secondPage.getByRole("button", { name: /reveal & burn/i }).click();

  await expect(
    secondPage.getByText(/already been read or has expired/i)
  ).toBeVisible();

  await readerContext.close();
  await secondContext.close();
});
