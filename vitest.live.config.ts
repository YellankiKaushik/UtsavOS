import { defineConfig } from "vitest/config";
import base from "./vitest.config.ts";
import { loadLiveEnvironment } from "./scripts/live-env.ts";
loadLiveEnvironment();
export default defineConfig({
  resolve: base.resolve,
  test: {
    ...base.test,
    include: ["tests/live/*.live.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
