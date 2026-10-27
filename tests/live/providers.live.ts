import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { generatePlan } from "@/infrastructure/gemini";
import { calculateBudget } from "@/domain/money";
import type { EventSnapshot } from "@/domain/contracts";
import { supabaseConfig, aiConfig } from "@/infrastructure/config";
function required(name: string) {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `Live verification requires ${name}. Configure credentials securely; do not paste them into chat.`,
    );
  return value;
}
describe("LIVE provider release gate — requires explicit isolated staging credentials", () => {
  it("verifies real Supabase Auth, persistence, RLS, atomic approval and replay", async () => {
    const settings = supabaseConfig();
    if (!settings.configured)
      throw new Error(
        "Configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or their NEXT_PUBLIC aliases).",
      );
    const url = settings.url!,
      key = settings.key!;
    const a = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
      b = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    for (const [client, suffix] of [
      [a, "A"],
      [b, "B"],
    ] as const) {
      const { error } = await client.auth.signInWithPassword({
        email: required(`LIVE_USER_${suffix}_EMAIL`),
        password: required(`LIVE_USER_${suffix}_PASSWORD`),
      });
      expect(error).toBeNull();
    }
    const { data: workspace, error } = await a.rpc("create_personal_workspace");
    expect(error).toBeNull();
    async function cmd(
      action: string,
      payload: unknown,
      id: string | null = null,
      v: number | null = null,
      idem = crypto.randomUUID(),
    ) {
      const { data, error } = await a.rpc("event_command", {
        p_event_id: id,
        p_workspace_id: workspace,
        p_action: action,
        p_payload: payload,
        p_expected_version: v,
        p_idempotency_key: idem,
        p_request_id: crypto.randomUUID(),
      });
      if (error) throw error;
      return data as { id: string; version: number; snapshot: EventSnapshot };
    }
    let result = await cmd("create", {
      type: "wedding",
      title: `SYNTHETIC LIVE VERIFICATION ${new Date().toISOString()}`,
      dateStatus: "tbd",
      startsAt: null,
      timeZone: "Asia/Kolkata",
      guestCount: 150,
      currency: "INR",
      budgetMinor: "50000000",
    });
    const eventId = result.id;
    for (const [title, basis, amount] of [
      ["Catering", "per_guest", "85000"],
      ["Other fixed", "fixed", "30000000"],
    ])
      result = await cmd(
        "put_budget",
        {
          fields: {
            title,
            category: title === "Catering" ? "catering" : "other",
            pricingBasis: basis,
            unitPriceMinor: amount,
            quantity: null,
            sourceKind: "user_estimate",
            isLocked: false,
          },
        },
        eventId,
        result.version,
      );
    const { data: read, error: readError } = await a.rpc("event_snapshot", {
      p_event_id: eventId,
    });
    expect(readError).toBeNull();
    expect(
      calculateBudget(read.budgetItems, 150, "50000000").projectedMinor,
    ).toBe("42750000");
    const denied = await b.rpc("event_snapshot", { p_event_id: eventId });
    expect(denied.error?.message).toContain("NOT_FOUND");
    expect(
      (await b.from("events").select("id").eq("id", eventId)).data,
    ).toEqual([]);
    const proposal = await cmd(
        "preview",
        {
          newGuestCount: 180,
          priceChanges: [],
          doNotExceedBudget: true,
          protectResourceIds: [],
        },
        eventId,
        result.version,
      ),
      version = result.version,
      idem = crypto.randomUUID(),
      payload = {
        proposalId: proposal.id,
        selectedOperationIds: ["guest-count"],
      };
    result = await cmd("approve", payload, eventId, version, idem);
    expect(result.snapshot.event.guestCount).toBe(180);
    expect(
      calculateBudget(result.snapshot.budgetItems, 180, "50000000")
        .remainingMinor,
    ).toBe("4700000");
    expect(
      (await cmd("approve", payload, eventId, version, idem)).version,
    ).toBe(result.version);
    await a.auth.signOut();
    await b.auth.signOut();
  });
  for (const type of ["wedding", "birthday", "community"] as const)
    it(`verifies REAL Gemini structured generation: ${type}`, async () => {
      required("GEMINI_API_KEY");
      if (!aiConfig().models.gemini)
        throw new Error(
          "Configure GEMINI_MODEL_ID or its GEMINI_MODEL_DEFAULT alias.",
        );
      const result = await generatePlan(
        {
          id: "synthetic-live",
          workspaceId: "synthetic-live",
          type,
          title: "Excluded synthetic title",
          dateStatus: "tbd",
          startsAt: null,
          timeZone: "Asia/Kolkata",
          guestCount: 150,
          currency: "INR",
          budgetMinor: "50000000",
          preferences: "",
          status: "planning",
          version: 1,
          createdAt: "",
        },
        "Simple, welcoming, accessible; no personal details.",
      );
      expect(result.payload.eventType).toBe(type);
      expect(result.requestedModel).toBe(aiConfig().models.gemini);
    });
});
