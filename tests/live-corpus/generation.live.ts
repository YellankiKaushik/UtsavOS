import { it, expect } from "vitest";
import { generatePlan } from "@/infrastructure/ai/service";
import { aiConfig, type ProviderId } from "@/infrastructure/config";
for (const type of ["wedding", "birthday", "community"] as const)
  for (const budgetMinor of ["100000", "50000000"])
    for (const guestCount of [0, 500])
      for (const dateStatus of ["tbd", "scheduled"] as const) {
        it(`LIVE corpus ${type}/${budgetMinor}/${guestCount}/${dateStatus}`, async () => {
          const provider = (process.env.LIVE_AI_PROVIDER ||
            "gemini") as ProviderId;
          if (!["gemini", "openrouter"].includes(provider))
            throw new Error("LIVE_AI_PROVIDER must be gemini or openrouter.");
          if (!aiConfig().keys[provider] || !aiConfig().models[provider])
            throw new Error(
              "Full live corpus requires authorized provider credentials/model. No synthetic provider response is substituted.",
            );
          const result = await generatePlan(
            {
              id: "synthetic-live-corpus",
              workspaceId: "synthetic-live-corpus",
              type,
              title: "Excluded synthetic title",
              dateStatus,
              startsAt: dateStatus === "tbd" ? null : "2027-12-12T12:00:00Z",
              timeZone: "Asia/Kolkata",
              guestCount,
              currency: "INR",
              budgetMinor,
              preferences: "",
              status: "planning",
              version: 1,
              createdAt: "",
            },
            "Simple welcoming celebration with accessible logistics. Costs are unverified estimates. No personal details.",
            { provider, noFallback: true },
          );
          expect(result.payload.eventType).toBe(type);
          console.info(
            JSON.stringify({
              operation: "live-evaluation",
              schemaVersion: 1,
              promptVersion: "event-plan.v1",
              model: result.model,
              provider: result.provider,
              requestedModel: result.requestedModel,
              actualModel: result.actualModel,
              type,
              budgetMinor,
              guestCount,
              dateStatus,
              inputTokens: result.inputTokens,
              outputTokens: result.outputTokens,
              outcome: "valid",
            }),
          );
        });
      }
