import { it, expect } from "vitest";
import { database, event } from "../helpers/database";
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
