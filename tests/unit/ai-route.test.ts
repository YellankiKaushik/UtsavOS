import { it, expect, vi, afterEach } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/infrastructure/supabase/server", () => ({
  session: async () => ({
    user: { id: "11111111-1111-4111-8111-111111111111" },
    db: { rpc },
  }),
}));
import { POST } from "../../app/api/v1/[...segments]/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("rejects disabled generation before reserving quota or contacting a provider", async () => {
  vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
  vi.stubEnv("FEATURE_AI_GENERATION", "false");
  rpc.mockResolvedValue({
    data: {
      event: { id: "22222222-2222-4222-8222-222222222222", version: 1 },
      budgetItems: [],
      tasks: [],
      vendors: [],
    },
    error: null,
  });
  const eid = "22222222-2222-4222-8222-222222222222",
    request = new Request(
      `http://localhost:3000/api/v1/events/${eid}/ai-drafts`,
      {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          expectedVersion: 1,
          preferences: "Synthetic",
          clientRequestId: crypto.randomUUID(),
        }),
      },
    );
  const response = await POST(request, {
    params: Promise.resolve({ segments: ["events", eid, "ai-drafts"] }),
  });
  expect(response.status).toBe(503);
  expect((await response.json()).error.code).toBe("AI_UNAVAILABLE");
  expect(
    rpc.mock.calls.every((call) => call[1]?.p_action !== "reserve_ai"),
  ).toBe(true);
});
