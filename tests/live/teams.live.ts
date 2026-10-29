import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "node:crypto";
import { supabaseConfig } from "@/infrastructure/config";
it("LIVE teams: matching-email consent, assigned access, delegated approval and immediate revocation", async () => {
  expect(process.env.LIVE_STAGING_CONFIRMED).toBe("true");
  const { url, key } = supabaseConfig();
  expect(new URL(url!).hostname).toBe("upbwahlegwcwiladfwwd.supabase.co");
  const a = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    b = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  let userId = "",
    version: number;
  for (const [db, suffix] of [
    [a, "A"],
    [b, "B"],
  ] as const) {
    const r = await db.auth.signInWithPassword({
      email: process.env[`LIVE_USER_${suffix}_EMAIL`]!,
      password: process.env[`LIVE_USER_${suffix}_PASSWORD`]!,
    });
    expect(r.error?.code).toBeUndefined();
    if (suffix === "B") userId = r.data.user!.id;
  }
  async function team(
    db: typeof a,
    action: string,
    payload: unknown,
    wid: string | null = workspaceId,
  ) {
    const r = await db.rpc("team_command", {
      p_workspace_id: wid,
      p_action: action,
      p_payload: payload,
      p_expected_version: version ?? null,
      p_idempotency_key: crypto.randomUUID(),
      p_request_id: "live-teams",
    });
    expect(r.error?.code).toBeUndefined();
    version = r.data.version;
    return r.data;
  }
  const workspaceId = (
    await team(a, "create", { name: "SYNTHETIC LIVE AGENCY" }, null)
  ).workspaceId;
  const fields = {
    type: "wedding",
    title: "SYNTHETIC LIVE TEAM EVENT",
    dateStatus: "tbd",
    startsAt: null,
    timeZone: "Asia/Kolkata",
    guestCount: 20,
    currency: "INR",
    budgetMinor: "1000000",
    preferences: "",
    status: "planning",
  };
  const event = await a.rpc("event_command", {
    p_event_id: null,
    p_workspace_id: workspaceId,
    p_action: "create",
    p_payload: fields,
    p_expected_version: null,
    p_idempotency_key: crypto.randomUUID(),
    p_request_id: "live-team-event",
  });
  expect(event.error?.code).toBeUndefined();
  const eid = event.data.id;
  const token = randomBytes(32).toString("hex");
  await team(a, "invite", {
    email: process.env.LIVE_USER_B_EMAIL!,
    role: "planner_member",
    tokenHash: createHash("sha256").update(token).digest("hex"),
  });
  await team(b, "accept", { token }, null);
  expect(
    (await b.rpc("event_snapshot", { p_event_id: eid })).error?.message,
  ).toBe("NOT_FOUND");
  await team(a, "assign", {
    userId,
    eventId: eid,
    assigned: true,
    canEdit: true,
    canApprove: false,
    canViewContacts: false,
  });
  expect(
    (await b.rpc("event_snapshot", { p_event_id: eid })).error?.code,
  ).toBeUndefined();
  expect(
    (await b.rpc("guest_directory", { p_event_id: eid })).error?.message,
  ).toBe("NOT_FOUND");
  const approval = {
    p_event_id: eid,
    p_workspace_id: workspaceId,
    p_action: "approve",
    p_payload: { proposalId: crypto.randomUUID(), selectedOperationIds: [] },
    p_expected_version: 1,
    p_idempotency_key: crypto.randomUUID(),
    p_request_id: "live-team-approve",
  };
  expect((await b.rpc("event_command", approval)).error?.message).toBe(
    "NOT_FOUND",
  );
  await team(a, "assign", {
    userId,
    eventId: eid,
    assigned: true,
    canEdit: true,
    canApprove: true,
    canViewContacts: true,
  });
  const preview = await b.rpc("event_command", {
    ...approval,
    p_action: "preview",
    p_payload: {
      newGuestCount: 21,
      priceChanges: [],
      protectResourceIds: [],
      doNotExceedBudget: false,
    },
    p_idempotency_key: crypto.randomUUID(),
  });
  expect(preview.error?.code).toBeUndefined();
  const approved = await b.rpc("event_command", {
    ...approval,
    p_payload: {
      proposalId: preview.data.id,
      selectedOperationIds: ["guest-count"],
    },
    p_idempotency_key: crypto.randomUUID(),
  });
  expect(approved.error?.code).toBeUndefined();
  expect(approved.data.snapshot.event.guestCount).toBe(21);
  await team(a, "member", { userId, role: "planner_member", state: "revoked" });
  expect(
    (await b.rpc("event_snapshot", { p_event_id: eid })).error?.message,
  ).toBe("NOT_FOUND");
  expect((await b.from("events").select("id").eq("id", eid)).data).toEqual([]);
  for (const db of [a, b])
    expect((await db.auth.signOut()).error?.code).toBeUndefined();
});
