import { z } from "zod";
import { budgetFields, eventType, instant, moneySchema } from "./contracts";
import { invariant } from "./errors";
import { assertDag } from "./tasks";
import { calculateBudget } from "./money";
const short = z.string().trim().min(1).max(500);
const draftId = z.string().regex(/^[btv]-[a-zA-Z0-9_-]{1,40}$/);
export const draftSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventType,
    summary: short,
    budgetSuggestions: z
      .array(
        z
          .object({
            draftId,
            title: z.string().min(1).max(140),
            category: z.string().min(1).max(80),
            pricingBasis: z.enum(["fixed", "per_guest", "per_unit"]),
            unitPriceMinor: moneySchema,
            quantity: z.number().int().min(0).max(100000).nullable(),
            sourceKind: z.literal("ai_estimate"),
            evidenceStatus: z.literal("unverified"),
            reason: short,
          })
          .strict(),
      )
      .max(12),
    tasks: z
      .array(
        z
          .object({
            draftId,
            title: z.string().min(1).max(200),
            dueAt: instant.nullable(),
            relativeTiming: short,
            priority: z.enum(["low", "normal", "high"]),
            dependsOnDraftIds: z.array(draftId).max(25),
          })
          .strict(),
      )
      .max(25),
    vendorRequirements: z
      .array(
        z
          .object({
            draftId,
            title: z.string().min(1).max(140),
            category: z.string().min(1).max(80),
            status: z.literal("needed"),
            notes: short,
          })
          .strict(),
      )
      .max(12),
    ideas: z
      .array(
        z
          .object({
            title: short,
            description: short,
            assumptionBased: z.literal(true),
          })
          .strict(),
      )
      .max(10),
    assumptions: z.array(short).max(10),
    questions: z.array(short).max(10),
    warnings: z.array(short).max(10),
  })
  .strict();
export type PlanDraft = z.infer<typeof draftSchema>;
export function validateDraft(
  raw: unknown,
  context: {
    type: string;
    dateStatus: string;
    startsAt: string | null;
    guestCount: number;
    budgetMinor: string;
  },
) {
  const draft = draftSchema.parse(raw);
  invariant(draft.eventType === context.type, "AI_INVALID_OUTPUT");
  const ids = [
    ...draft.budgetSuggestions,
    ...draft.tasks,
    ...draft.vendorRequirements,
  ].map((x) => x.draftId);
  invariant(
    new Set(ids).size === ids.length,
    "AI_INVALID_OUTPUT",
    "Duplicate draft identifiers",
  );
  assertDag(
    draft.tasks.map((t) => ({
      id: t.draftId,
      dependencyIds: t.dependsOnDraftIds,
    })),
  );
  for (const task of draft.tasks) {
    invariant(
      context.dateStatus !== "tbd" || task.dueAt === null,
      "AI_INVALID_OUTPUT",
      "TBD events cannot receive fabricated dates",
    );
    invariant(
      !task.dueAt ||
        !context.startsAt ||
        new Date(task.dueAt) <= new Date(context.startsAt),
      "AI_INVALID_OUTPUT",
      "Planning deadline follows event",
    );
  }
  // Guard simple unsupported claims; human review is still required for factual usefulness.
  invariant(
    !/https?:\/\/|guaranteed availability|booking confirmed|payment completed|verified vendor/i.test(
      JSON.stringify(draft),
    ),
    "AI_INVALID_OUTPUT",
    "Unsupported external claim",
  );
  const items = draft.budgetSuggestions.map((b) => ({
    ...budgetFields.parse({
      title: b.title,
      category: b.category,
      pricingBasis: b.pricingBasis,
      unitPriceMinor: b.unitPriceMinor,
      quantity: b.quantity,
      sourceKind: b.sourceKind,
      sourceLabel: "AI assumption — confirm",
      isLocked: false,
    }),
    id: b.draftId,
    state: "active" as const,
  }));
  const budget = calculateBudget(
    items,
    context.guestCount,
    context.budgetMinor,
  );
  return { draft, budget, needsReview: budget.overBudget };
}
export const explanationSchema = z
  .object({
    explanation: short,
    suggestions: z.array(short).max(5),
    questions: z.array(short).max(5),
  })
  .strict();
