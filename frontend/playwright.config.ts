import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.CENDRE_E2E_BASE_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});


