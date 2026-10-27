import { defineConfig } from "vitest/config";
import { loadLiveEnvironment } from "./scripts/live-env.ts";
import base from "./vitest.config.ts";
loadLiveEnvironment();
// A comparable corpus is exactly one transport attempt per case, with no rerouting.
process.env.AI_PROVIDER_MAX_RETRIES = "0";
process.env.AI_PROVIDER_FALLBACK = "none";
export default defineConfig({
  resolve: base.resolve,
  test: {
    ...base.test,
    include: ["tests/live-corpus/*.live.ts"],
    testTimeout: 60000,
  },
});
