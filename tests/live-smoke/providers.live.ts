import { it, expect } from "vitest";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import {
  generatePlan,
  failureMetadata,
  failureUsage,
} from "@/infrastructure/ai/service";
import { aiConfig } from "@/infrastructure/config";
import { ProviderError } from "@/infrastructure/ai/types";
const event = {
  id: "synthetic-smoke",
  workspaceId: "synthetic-smoke",
  type: "birthday" as const,
  title: "Not sent to provider",
  dateStatus: "tbd" as const,
  startsAt: null,
  timeZone: "Asia/Kolkata",
  guestCount: 20,
  currency: "INR" as const,
  budgetMinor: "1000000",
  preferences: "",
  status: "planning" as const,
  version: 1,
  createdAt: "",
};
function record(provider: string, value: unknown) {
  mkdirSync(".runtime", { recursive: true });
  const file = ".runtime/live-provider-smoke.json";
  const existing = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : {};
  existing[provider] = value;
  writeFileSync(file, JSON.stringify(existing, null, 2) + "\n");
}
for (const provider of ["gemini", "openrouter"] as const)
  it(`REAL ${provider}: one bounded synthetic structured planning smoke`, async () => {
    const config = aiConfig();
    const started = Date.now();
    try {
      const result = await generatePlan(
        event,
        "A simple welcoming birthday. Keep the draft concise: two budget lines, three actionable tasks, two required vendor categories and two ideas. No business names or unverified factual claims.",
        { provider, noFallback: true },
      );
      expect(result.payload.eventType).toBe("birthday");
      expect(result.payload.tasks.length).toBeGreaterThan(0);
      expect(result.payload.budgetSuggestions.length).toBeGreaterThan(0);
      expect(result.payload.vendorRequirements.length).toBeGreaterThan(0);
      expect(result.payload.ideas.length).toBeGreaterThan(0);
      const safe = {
        status: "VERIFIED_STRUCTURED_SMOKE",
        requestedModel: result.requestedModel,
        actualModel: result.actualModel,
        provider: result.provider,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
        attemptCount: result.attemptCount,
        reportedCost: result.reportedCost,
        payload: result.payload,
      };
      record(provider, safe);
      console.info(JSON.stringify({ ...safe, payload: undefined }));
    } catch (error) {
      const safe = {
        ...failureMetadata(error),
        ...failureUsage(error),
        status: "FAILED",
        provider,
        requestedModel: config.models[provider] ?? null,
        code: error instanceof ProviderError ? error.code : "AI_UNAVAILABLE",
        category:
          error instanceof ProviderError
            ? error.category
            : "configuration-or-validation",
        validationStage:
          error instanceof ProviderError
            ? (error.validationStage ?? null)
            : null,
        latencyMs: Date.now() - started,
      };
      record(provider, safe);
      throw new Error(
        `Live ${provider} smoke failed: ${safe.code} (${safe.category}); see ignored .runtime/live-provider-smoke.json. No raw provider error or key is logged.`,
      );
    }
  });
