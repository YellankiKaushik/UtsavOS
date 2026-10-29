import { afterEach, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eventDataRoute } from "@/application/workspace-tools-http";
import { POST } from "../../app/api/billing/webhook/route";
afterEach(() => vi.unstubAllEnvs());
it("keeps subscription webhooks unavailable without any entitlement mutation", async () => {
  const response = POST();
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("BILLING_NOT_CONFIGURED");
});
it("rejects a stale deletion before contacting Storage", async () => {
  vi.stubEnv("FEATURE_DATA_LIFECYCLE", "true");
  const remove = vi.fn(),
    db = {
      rpc: vi.fn().mockResolvedValue({
        data: { state: "pending_cleanup", eventVersion: 3 },
        error: null,
      }),
      storage: { from: () => ({ remove }) },
    } as unknown as SupabaseClient;
  const request = new Request(
    "https://example.test/api/v1/events/a/data-lifecycle",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        action: "erase",
        expectedVersion: 2,
        confirmed: true,
      }),
    },
  );
  await expect(
    eventDataRoute(request, db, "a", "data-lifecycle", "synthetic"),
  ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  expect(remove).not.toHaveBeenCalled();
});
