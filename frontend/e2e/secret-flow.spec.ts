import { test, expect } from "@playwright/test";

test("full secret flow with one-time read and key staying client-side", async ({
  page,
  browser
}) => {
  const secretText = "burn-after-reading secret from e2e test";

  // Create a new secret via the UI.
  await page.goto("/");

  await page.getByLabel(/INPUT::SECRET_MESSAGE/i).fill(secretText);
  await page
    .getByRole("button", { name: /ENCRYPT \+ GENERATE LINK/i })
    .click();

  const urlInput = page.getByLabel("Secure URL");
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
      /This message has been permanently deleted from the server/i
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
    secondPage.getByText(/Message has been consumed or expired/i)
  ).toBeVisible();

  await readerContext.close();
  await secondContext.close();
});


