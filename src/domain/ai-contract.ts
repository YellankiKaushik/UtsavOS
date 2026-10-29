import { z } from "zod";
import { budgetFields, eventType, instant, moneySchema } from "./contracts";
import { DomainError, invariant } from "./errors";
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
            quantity: z
              .number()
              .int()
              .min(0)
              .max(100000)
              .nullable()
              .describe(
                "Set null for fixed and per_guest pricing. Set an integer only for per_unit pricing; never put the guest count here.",
              ),
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
export type DraftValidationRule =
  | "event_type"
  | "duplicate_ids"
  | "unknown_dependency"
  | "dependency_cycle"
  | "tbd_date"
  | "deadline"
  | "unsupported_claim"
  | "pricing_quantity"
  | "money"
  | "schema"
  | "unknown";
export function draftValidationRule(error: unknown): DraftValidationRule {
  if (error instanceof z.ZodError) return "schema";
  if (!(error instanceof DomainError)) return "unknown";
  if (error.code === "UNKNOWN_DEPENDENCY") return "unknown_dependency";
  if (error.code === "DEPENDENCY_CYCLE") return "dependency_cycle";
  if (["BUDGET_OVERFLOW", "INVALID_MONEY"].includes(error.code)) return "money";
  const messages: Record<string, DraftValidationRule> = {
    "Duplicate draft identifiers": "duplicate_ids",
    "TBD events cannot receive fabricated dates": "tbd_date",
    "Planning deadline follows event": "deadline",
    "Unsupported external claim": "unsupported_claim",
    "Invalid pricing quantity": "pricing_quantity",
  };
  return (
    messages[error.message] ??
    (error.code === "AI_INVALID_OUTPUT" && error.message === "AI_INVALID_OUTPUT"
      ? "event_type"
      : "unknown")
  );
}
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
  invariant(
    draft.budgetSuggestions.every((b) =>
      b.pricingBasis === "per_unit" ? b.quantity !== null : b.quantity === null,
    ),
    "AI_INVALID_OUTPUT",
    "Invalid pricing quantity",
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
