import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: ".runtime/browser-results.json" }],
  ],
  use: { baseURL: "http://localhost:3002", trace: "retain-on-failure" },
  webServer: [
    {
      command: "npm run start -- --port 3002",
      url: "http://localhost:3002/api/health/live",
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        SUPABASE_URL: "",
        SUPABASE_PUBLISHABLE_KEY: "",
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        GEMINI_API_KEY: "",
        OPENROUTER_API_KEY: "",
        APP_BASE_URL: "http://localhost:3002",
      },
    },
    {
      command: "npx vite --config vite.ui.config.ts",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
