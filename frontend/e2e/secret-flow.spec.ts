import { test, expect } from "@playwright/test";

test("full secret flow with one-time read and key staying client-side", async ({
  page,
  browser
}) => {
  const secretText = "burn-after-reading secret from e2e test";

  // Create a new secret via the UI.
  await page.goto("/");

  await page.getByLabel("Secret message").fill(secretText);
  await page.getByRole("button", { name: "Create one-time link" }).click();

  const urlInput = page.getByLabel("One-time secret URL");
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

  await expect(
    readerPage.getByText(
      "This secret has been decrypted. It will not be available again."
    )
  ).toBeVisible();

  await expect(
    readerPage.locator("pre", { hasText: secretText })
  ).toBeVisible();

  expect(keySeenInNetwork).toBeFalsy();

  // A second visit should show the "expired / already read" state.
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();

  await secondPage.goto(fullUrl);

  await expect(
    secondPage.getByText(
      "This secret has already been read or has expired. It is no longer available."
    )
  ).toBeVisible();

  await readerContext.close();
  await secondContext.close();
});


