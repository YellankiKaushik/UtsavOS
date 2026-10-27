import { describe, it, expect, vi } from "vitest";
import { checkOrigin, key, readBody, handle } from "@/application/http";
import { DomainError } from "@/domain/errors";
describe("HTTP security and safe errors", () => {
  it("rejects missing or forged origins and accepts exact origin", () => {
    vi.stubEnv("APP_BASE_URL", "https://planner.example");
    expect(() =>
      checkOrigin(
        new Request("https://planner.example/api", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrow("Request origin");
    expect(() =>
      checkOrigin(new Request("https://planner.example/api")),
    ).toThrow();
    expect(() =>
      checkOrigin(
        new Request("https://planner.example/api", {
          headers: { origin: "https://planner.example" },
        }),
      ),
    ).not.toThrow();
    vi.unstubAllEnvs();
  });
  it("requires UUID idempotency keys", () => {
    expect(() => key(new Request("https://example.com"))).toThrow();
    expect(
      key(
        new Request("https://example.com", {
          headers: {
            "Idempotency-Key": "11111111-1111-4111-8111-111111111111",
          },
        }),
      ),
    ).toContain("11111111");
  });
  it("rejects malformed and oversized bodies, including without content length", async () => {
    await expect(
      readBody(
        new Request("https://example.com", { method: "POST", body: "invalid" }),
      ),
    ).rejects.toThrow("Valid JSON");
    await expect(
      readBody(
        new Request("https://example.com", {
          method: "POST",
          body: "x".repeat(100001),
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("returns safe error envelope and logs no private exception details", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await handle(async () => {
      throw new Error("SECRET_API_KEY_AND_PRIVATE_PROMPT");
    });
    expect(r.status).toBe(500);
    expect(await r.text()).not.toContain("SECRET");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("SECRET");
    spy.mockRestore();
  });
  it("preserves version-conflict status", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      (
        await handle(async () => {
          throw new DomainError("VERSION_CONFLICT", "Reload", 409);
        })
      ).status,
    ).toBe(409);
    spy.mockRestore();
  });
});
