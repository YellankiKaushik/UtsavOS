import { it, expect } from "vitest";
import { validateDraft, draftValidationRule } from "@/domain/ai-contract";
import { DomainError } from "@/domain/errors";
it("rejects per-guest manual quantities and reports only an allowlisted rule", () => {
  const draft = {
    schemaVersion: 1,
    eventType: "wedding",
    summary: "Synthetic draft",
    budgetSuggestions: [
      {
        draftId: "b-1",
        title: "Catering",
        category: "catering",
        pricingBasis: "per_guest",
        unitPriceMinor: "85000",
        quantity: 150,
        sourceKind: "ai_estimate",
        evidenceStatus: "unverified",
        reason: "Confirm the estimate",
      },
    ],
    tasks: [],
    vendorRequirements: [],
    ideas: [],
    assumptions: [],
    questions: [],
    warnings: [],
  };
  const error = (() => {
    try {
      validateDraft(draft, {
        type: "wedding",
        dateStatus: "tbd",
        startsAt: null,
        guestCount: 150,
        budgetMinor: "50000000",
      });
    } catch (e) {
      return e;
    }
  })();
  expect(draftValidationRule(error)).toBe("pricing_quantity");
  expect(
    draftValidationRule(new DomainError("AI_INVALID_OUTPUT", "PRIVATE_TEXT")),
  ).toBe("unknown");
  expect(draftValidationRule(new DomainError("UNKNOWN_DEPENDENCY"))).toBe(
    "unknown_dependency",
  );
});
