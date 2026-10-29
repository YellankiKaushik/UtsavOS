import { defineConfig, devices } from "@playwright/test";
import { loadLiveEnvironment } from "./scripts/live-env.ts";
loadLiveEnvironment();
const url = process.env.LIVE_PREVIEW_URL;
const evidenceDir =
  process.env.LIVE_EVIDENCE_DIR ?? ".runtime/release-20261028";
if (!/^\.runtime\/[a-zA-Z0-9_-]+$/.test(evidenceDir))
  throw new Error(
    "Live evidence must stay in a single ignored runtime directory",
  );
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
  timeout: 180000,
  expect: { timeout: 20000 },
  reporter: [
    ["list"],
    ["json", { outputFile: `${evidenceDir}/staging-browser.json` }],
  ],
  use: {
    baseURL: url,
    actionTimeout: 20000,
    navigationTimeout: 30000,
    trace: "off",
    screenshot: "off",
    video: "off",
    ...devices["Desktop Chrome"],
  },
});
