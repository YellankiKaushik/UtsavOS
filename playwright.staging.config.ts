import { defineConfig, devices } from "@playwright/test";
import { loadLiveEnvironment } from "./scripts/live-env.ts";
loadLiveEnvironment();
const url = process.env.LIVE_PREVIEW_URL;
if (
  process.env.LIVE_STAGING_CONFIRMED !== "true" ||
  !url ||
  !/^https:\/\/utsavos-[a-z0-9]+-kaushik-yellanki-project\.vercel\.app$/.test(
    url,
  )
)
  throw new Error(
    "A verified isolated UtsavOS Preview and LIVE_STAGING_CONFIRMED are required.",
  );
for (const name of [
  "LIVE_USER_A_EMAIL",
  "LIVE_USER_A_PASSWORD",
  "LIVE_USER_B_EMAIL",
  "LIVE_USER_B_PASSWORD",
])
  if (!process.env[name])
    throw new Error(`Missing ignored staging configuration: ${name}`);
export default defineConfig({
  testDir: "tests/staging-e2e",
  outputDir: "test-results-staging",
  workers: 1,
  retries: 0,
  timeout: 120000,
  reporter: [
    ["list"],
    ["json", { outputFile: ".runtime/release-20261028/staging-browser.json" }],
  ],
  use: {
    baseURL: url,
    trace: "off",
    screenshot: "off",
    video: "off",
    ...devices["Desktop Chrome"],
  },
});
