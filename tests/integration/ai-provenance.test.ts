import { it, expect } from "vitest";
import { database, event, A, B } from "../helpers/database";
it("persists only allowlisted provider failure diagnostics, never raw error content", async () => {
  const db = await database();
  try {
    for (const valid of [true, false]) {
      const e = await event(db, valid ? A : B);
      const reservation = (
        await db.query<{ r: { id: string } }>(
          "select public.event_command($1,null,'reserve_ai',$2,1,$3,'diagnostics-reserve') r",
          [
            e.id,
            JSON.stringify({ modelId: "synthetic/free", operation: "plan" }),
            crypto.randomUUID(),
          ],
        )
      ).rows[0].r;
      await db.query(
        "select public.event_command($1,null,'complete_ai',$2,null,$3,'diagnostics-complete')",
        [
          e.id,
          JSON.stringify({
            usageId: reservation.id,
            status: "failed",
            provenance: {
              provider: "openrouter",
              failureCategory: valid
                ? "unavailable"
                : "untrusted error message",
              providerStatus: valid ? 503 : 999,
              validationStage: valid ? "semantic" : "untrusted",
              validationRule: valid ? "duplicate_ids" : "untrusted",
              finishReason: valid ? "stop" : "untrusted",
              rawError: "must not persist",
              prompt: "must not persist",
            },
          }),
          crypto.randomUUID(),
        ],
      );
      const saved = (
        await db.query<{ usage_metadata: unknown }>(
          "select usage_metadata from public.ai_usage_records where id=$1",
          [reservation.id],
        )
      ).rows[0].usage_metadata;
      expect(saved).toEqual(
        valid
          ? {
              failureCategory: "unavailable",
              providerStatus: 503,
              validationStage: "semantic",
              validationRule: "duplicate_ids",
              finishReason: "stop",
            }
          : {},
      );
    }
  } finally {
    await db.close();
  }
});
it("records explicit v2 prompt provenance and preserves legacy v1 when absent", async () => {
  const db = await database();
  try {
    const e = await event(db);
    const payload = {
      schemaVersion: 1,
      eventType: "wedding",
      summary: "Synthetic provenance fixture",
      budgetSuggestions: [],
      tasks: [],
      vendorRequirements: [],
      ideas: [],
      assumptions: [],
      questions: [],
      warnings: [],
    };
    for (const promptVersion of ["event-plan.v2", undefined]) {
      const result = (
        await db.query<{ r: { id: string } }>(
          "select public.event_command($1,null,'save_draft',$2,1,$3,'prompt-provenance') r",
          [
            e.id,
            JSON.stringify({
              modelId: "synthetic/free",
              payload,
              provenance: {
                provider: "openrouter",
                requestedModel: "synthetic/free",
                actualModel: "synthetic/free",
                promptVersion,
                attemptCount: 1,
                latencyMs: 1,
              },
            }),
            crypto.randomUUID(),
          ],
        )
      ).rows[0].r;
      expect(
        (
          await db.query<{ prompt_version: string }>(
            "select prompt_version from public.ai_drafts where id=$1",
            [result.id],
          )
        ).rows[0].prompt_version,
      ).toBe(promptVersion ?? "event-plan.v1");
    }
  } finally {
    await db.close();
  }
});
