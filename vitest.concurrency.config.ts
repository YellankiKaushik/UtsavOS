import { defineConfig } from "vitest/config";
import base from "./vitest.config.ts";
export default defineConfig({
  resolve: base.resolve,
  test: {
    ...base.test,
    include: ["tests/concurrency/*.native.ts"],
    hookTimeout: 60000,
    testTimeout: 20000,
  },
});
