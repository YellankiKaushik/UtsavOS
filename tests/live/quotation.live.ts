import { it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import {
  generateStructured,
  generationMetadata,
} from "../../src/infrastructure/ai/service";
import {
  quotationExtraction,
  quotationSourceSpans,
  validateQuotationSources,
} from "../../src/domain/documents";
it.skipIf(process.env.LIVE_VERIFY_QUOTATION !== "true")(
  "LIVE quotation: exact synthetic source evidence with no fallback",
  async () => {
    const pages = [
      {
        page: 1,
        text: "Supplier: Synthetic Caterer\nReference: Q-TEST-001\nTotal: INR 85000.00\nExpires: 2026-11-30",
      },
    ];
    const result = await generateStructured(
      quotationExtraction,
      { pages, sourceSpans: quotationSourceSpans(pages) },
      { purpose: "quotation", noFallback: true },
    );
    validateQuotationSources(result.payload, pages);
    expect(result.payload.fields.totalMinor.value).toBe("8500000");
    expect(result.payload.fields.supplierName.value).toBe("Synthetic Caterer");
    writeFileSync(
      ".runtime/live-quotation-smoke.json",
      JSON.stringify(
        {
          status: "PASSED",
          syntheticOnly: true,
          sourceSpansValidated: true,
          ...generationMetadata(result),
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
        null,
        2,
      ),
    );
  },
);
