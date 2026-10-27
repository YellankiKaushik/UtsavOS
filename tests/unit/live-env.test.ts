import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadLiveEnvironment } from "../../scripts/live-env.ts";
it("respects process overrides and merges staging files without printing credentials", () => {
  const dir = resolve(".runtime", `env-fixture-${crypto.randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, ".env"),
    "AI_PROVIDER_PRIMARY=gemini\nAI_REQUEST_TIMEOUT_MS=20000\n",
  );
  writeFileSync(
    resolve(dir, ".env.live.local"),
    "AI_PROVIDER_PRIMARY=openrouter\n",
  );
  const target: Record<string, string | undefined> = {
    AI_REQUEST_TIMEOUT_MS: "45000",
  };
  loadLiveEnvironment(target, dir);
  expect(target.AI_PROVIDER_PRIMARY).toBe("openrouter");
  expect(target.AI_REQUEST_TIMEOUT_MS).toBe("45000");
});
