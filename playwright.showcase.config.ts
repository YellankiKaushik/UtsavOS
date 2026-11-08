import { defineConfig, devices } from "@playwright/test";

const origin = "http://127.0.0.1:4317";

export default defineConfig({
  testDir: "showcase/test/e2e",
  timeout: 45_000,
  workers: 1,
  outputDir: ".runtime/showcase-playwright",
  reporter: [
    ["list"],
    ["json", { outputFile: ".runtime/showcase-browser-results.json" }],
  ],
  use: {
    baseURL: origin,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "npm run showcase:serve -- --host 127.0.0.1 --port 4317 --strictPort",
    url: origin,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
});
