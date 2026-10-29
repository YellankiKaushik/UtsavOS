import { it, expect } from "vitest";
import { credentialFormat } from "@/infrastructure/ai/credential-format";
it("distinguishes syntax recognition from arbitrary nonempty configuration without exposing the input", () => {
  expect(credentialFormat("gemini", "")).toBe("not-configured");
  expect(credentialFormat("gemini", "configured-but-not-a-google-key")).toBe(
    "unrecognized",
  );
  expect(credentialFormat("gemini", "AIza" + "x".repeat(35))).toBe(
    "recognized",
  );
  expect(credentialFormat("openrouter", "sk-or-v1-" + "a".repeat(64))).toBe(
    "recognized",
  );
  expect(credentialFormat("gemini", "sk-or-v1-" + "a".repeat(64))).toBe(
    "unrecognized",
  );
});
