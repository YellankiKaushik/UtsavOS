import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/live-public",
  outputDir: "test-results-live-public",
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: ".runtime/live-public-results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3004",
    trace: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run start -- --port 3004",
    url: "http://localhost:3004/api/health/live",
    reuseExistingServer: false,
    env: { APP_BASE_URL: "http://localhost:3004" },
  },
});
