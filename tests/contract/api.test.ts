import { beforeEach, describe, it, expect, vi } from "vitest";
import { DomainError } from "@/domain/errors";
const mocks = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn() }));
vi.mock("@/infrastructure/supabase/server", () => ({ session: mocks.session }));
import { POST, PATCH, GET } from "../../app/api/v1/[...segments]/route";
const id = "11111111-1111-4111-8111-111111111111";
const fields = {
  type: "wedding",
  title: "Synthetic API event",
  dateStatus: "tbd",
  startsAt: null,
  timeZone: "Asia/Kolkata",
  guestCount: 150,
  currency: "INR",
  budgetMinor: "50000000",
  preferences: "",
  status: "planning",
};
const snapshot = {
  event: {
    ...fields,
    id,
    workspaceId: id,
    version: 3,
    createdAt: "2026-10-26T12:00:00Z",
  },
  budgetItems: [],
  tasks: [],
  vendors: [],
};
function request(
  path: string,
  body: unknown,
  method = "POST",
  origin = "http://localhost:3000",
) {
  return new Request(`http://localhost:3000/api/v1/${path}`, {
    method,
    headers: {
      Origin: origin,
      "Idempotency-Key": id,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
function ctx(path: string) {
  return { params: Promise.resolve({ segments: path.split("/") }) };
}
beforeEach(() => {
  vi.stubEnv("FEATURE_EVENT_FUNCTIONS", "false");
  vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
  mocks.rpc.mockReset();
  mocks.session.mockReset();
  mocks.session.mockResolvedValue({
    db: { rpc: mocks.rpc },
    user: { id, email: "synthetic@example.test" },
  });
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "event_snapshot" ? snapshot : { id, version: 4, snapshot },
    error: null,
  }));
});
describe("API routing/contracts with controlled identity/database ports", () => {
  it("hides the P1 module by default and strictly validates enabled function writes", async () => {
    const path = `events/${id}/functions`;
    expect(
      (
        await GET(
          new Request(`http://localhost:3000/api/v1/${path}`),
          ctx(path),
        )
      ).status,
    ).toBe(404);
    vi.stubEnv("FEATURE_EVENT_FUNCTIONS", "true");
    const functionFields = {
      title: "Synthetic reception",
      startsAt: null,
      endsAt: null,
      timeZone: "Asia/Kolkata",
      status: "planned",
      notes: "",
    };
    expect(
      (
        await POST(
          request(path, { expectedVersion: 3, fields: functionFields }),
          ctx(path),
        )
      ).status,
    ).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "event_function_command",
      expect.objectContaining({
        p_action: "put",
        p_expected_version: 3,
        p_payload: { id: null, fields: functionFields },
      }),
    );
    const count = mocks.rpc.mock.calls.length;
    expect(
      (
        await POST(
          request(path, {
            expectedVersion: 3,
            fields: { ...functionFields, workspaceId: id },
          }),
          ctx(path),
        )
      ).status,
    ).toBe(400);
    // Snapshot authorization occurs, but no extra mutation reaches the database.
    expect(
      mocks.rpc.mock.calls
        .slice(count)
        .filter((c) => c[0] === "event_function_command"),
    ).toHaveLength(0);
  });
  it("creates using canonical flat and UI-nested DTOs with 201", async () => {
    for (const body of [
      { ...fields, workspaceId: id },
      { workspaceId: id, fields },
    ]) {
      const response = await POST(request("events", body), ctx("events"));
      expect(response.status).toBe(201);
      expect(mocks.rpc).toHaveBeenLastCalledWith(
        "event_command",
        expect.objectContaining({
          p_action: "create",
          p_workspace_id: id,
          p_payload: expect.objectContaining({ budgetMinor: "50000000" }),
        }),
      );
    }
  });
  it("rejects unexpected ownership flags and numeric money before writes", async () => {
    for (const body of [
      { ...fields, workspaceId: id, isAdmin: true },
      { ...fields, workspaceId: id, budgetMinor: 50000000 },
    ]) {
      const response = await POST(request("events", body), ctx("events"));
      expect(response.status).toBe(400);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects logged-out and cross-origin writes", async () => {
    mocks.session.mockRejectedValue(
      new DomainError("UNAUTHENTICATED", "Sign in", 401),
    );
    expect(
      (
        await POST(
          request("events", { workspaceId: id, fields }),
          ctx("events"),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await POST(
          request("events", {}, "POST", "https://evil.example"),
          ctx("events"),
        )
      ).status,
    ).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("supports partial metadata edits and canonical budget commands", async () => {
    const path = `events/${id}`;
    expect(
      (
        await PATCH(
          request(path, { expectedVersion: 3, title: "Updated" }, "PATCH"),
          ctx(path),
        )
      ).status,
    ).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "event_command",
      expect.objectContaining({
        p_action: "update",
        p_payload: expect.objectContaining({
          title: "Updated",
          guestCount: 150,
        }),
      }),
    );
    const budgetPath = `events/${id}/budget-items`;
    expect(
      (
        await POST(
          request(budgetPath, {
            expectedVersion: 3,
            title: "Catering",
            category: "catering",
            pricingBasis: "per_guest",
            unitPriceMinor: "85000",
          }),
          ctx(budgetPath),
        )
      ).status,
    ).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "event_command",
      expect.objectContaining({
        p_action: "put_budget",
        p_payload: expect.objectContaining({
          fields: expect.objectContaining({
            unitPriceMinor: "85000",
            sourceKind: "user_estimate",
          }),
        }),
      }),
    );
  });
  it("returns exact string totals and private cache headers", async () => {
    const path = `events/${id}/budget`,
      response = await GET(
        new Request(`http://localhost:3000/api/v1/${path}`),
        ctx(path),
      );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await response.json()).data.projectedMinor).toBe("0");
  });
});
