import { describe, it, expect } from "vitest";
import { diagnoseFailure } from "@/infrastructure/ai/diagnostic";
describe("redacted provider diagnostics", () => {
  for (const [status, category] of [
    [401, "authentication"],
    [403, "authorization"],
    [404, "model_access"],
    [402, "quota"],
    [429, "rate_limit"],
    [422, "unsupported_parameters"],
  ] as const)
    it(`distinguishes HTTP ${status}`, () =>
      expect(diagnoseFailure({}, status).category).toBe(category));
  for (const [code, category] of [
    ["ENOTFOUND", "dns"],
    ["CERT_HAS_EXPIRED", "tls"],
    ["ECONNRESET", "network"],
    ["UND_ERR_CONNECT_TIMEOUT", "timeout"],
  ])
    it(`classifies nested ${code} without retaining raw errors`, () => {
      const result = diagnoseFailure({
        message: "PRIVATE_KEY_VALUE",
        cause: { code, message: "PRIVATE_HOST" },
      });
      expect(result.category).toBe(category);
      expect(JSON.stringify(result)).not.toMatch(/PRIVATE/);
    });
  it("recognizes allowed Google reasons while discarding arbitrary metadata", () => {
    expect(
      diagnoseFailure({
        error: {
          code: 403,
          details: [
            { reason: "API_KEY_SERVICE_BLOCKED", metadata: { key: "PRIVATE" } },
          ],
        },
      }),
    ).toMatchObject({
      category: "authorization",
      reason: "API_KEY_SERVICE_BLOCKED",
    });
    expect(
      diagnoseFailure({
        error: { code: 403, details: [{ reason: "PRIVATE" }] },
      }).reason,
    ).toBeNull();
  });
});
