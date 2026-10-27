import { defineConfig, devices } from "@playwright/test";
import { loadLiveEnvironment } from "./scripts/live-env.ts";
loadLiveEnvironment();
export default defineConfig({
  testDir: "tests/live-e2e",
  outputDir: "test-results-live",
  timeout: 120000,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/live", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:3005",
    trace: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run start -- --port 3005",
    url: "http://localhost:3005/api/health/live",
    reuseExistingServer: false,
    timeout: 60000,
    env: { APP_BASE_URL: "http://localhost:3005" },
  },
});
