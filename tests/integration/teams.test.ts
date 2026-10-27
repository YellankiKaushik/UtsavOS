import { beforeAll, afterAll, beforeEach, it, expect } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { database, actor, A, B, C } from "../helpers/database";
let db: PGlite, wid: string, version: number, eid: string;
beforeAll(async () => {
  db = await database();
});
afterAll(async () => {
  await db?.close();
});
async function team(
  action: string,
  payload: unknown,
  workspace: string | null = wid,
  expected: number | null = version,
  key = crypto.randomUUID(),
) {
  const r = (
    await db.query<{
      r: {
        id: string;
        workspaceId: string;
        version: number;
        replayed?: boolean;
      };
    }>("select public.team_command($1,$2,$3::jsonb,$4,$5,'synthetic-team') r", [
      workspace,
      action,
      JSON.stringify(payload),
      expected,
      key,
    ])
  ).rows[0].r;
  version = r.version;
  return r;
}
async function eventCommand(
  action: string,
  payload: unknown,
  id: string | null = eid,
  expected: number | null = null,
) {
  return (
    await db.query<{ r: { id: string; version: number; snapshot: unknown } }>(
      "select public.event_command($1,$2,$3,$4::jsonb,$5,$6,'synthetic-team-event') r",
      [id, wid, action, JSON.stringify(payload), expected, crypto.randomUUID()],
    )
  ).rows[0].r;
}
const fields = {
  type: "wedding",
  title: "Synthetic team event",
  dateStatus: "tbd",
  startsAt: null,
  timeZone: "Asia/Kolkata",
  guestCount: 20,
  currency: "INR",
  budgetMinor: "1000000",
  preferences: "PRIVATE_PREFERENCES",
  status: "planning",
};
async function invite(role: string, email = "b@example.test") {
  await actor(db, A);
  const token = randomBytes(32).toString("hex");
  const result = await team("invite", {
    email,
    role,
    tokenHash: createHash("sha256").update(token).digest("hex"),
  });
  return { token, id: result.id };
}
async function join(role: string, user = B, email = "b@example.test") {
  const invitation = await invite(role, email);
  await actor(db, user);
  await team("accept", { token: invitation.token }, null, null);
  return invitation;
}
async function assign(
  user = B,
  flags = { canEdit: true, canApprove: false, canViewContacts: false },
) {
  await actor(db, A);
  await team("assign", {
    userId: user,
    eventId: eid,
    assigned: true,
    ...flags,
  });
}
async function overview() {
  return (
    await db.query<{ r: { items: Record<string, unknown>[] } }>(
      "select public.team_overview() r",
    )
  ).rows[0].r;
}
beforeEach(async () => {
  await actor(db, A);
  const w = await team(
    "create",
    { name: "Synthetic planning agency" },
    null,
    null,
  );
  wid = w.workspaceId;
  version = w.version;
  eid = (await eventCommand("create", fields, null)).id;
});
it("requires matching authenticated email and explicit one-time invite consent", async () => {
  const invitation = await invite("planner_member");
  await actor(db, C);
  await expect(
    team("accept", { token: invitation.token }, null, null),
  ).rejects.toThrow("NOT_FOUND");
  await actor(db, B);
  const key = crypto.randomUUID(),
    v = version;
  await team("accept", { token: invitation.token }, null, null, key);
  expect(
    (await team("accept", { token: invitation.token }, null, null, key))
      .replayed,
  ).toBe(true);
  await expect(
    team("accept", { token: invitation.token }, null, null),
  ).rejects.toThrow("INVITE_ALREADY_USED");
  expect(version).toBe(v + 1);
  await expect(
    db.query("select public.event_snapshot($1)", [eid]),
  ).rejects.toThrow("NOT_FOUND");
  expect(JSON.stringify(await overview())).not.toContain(invitation.token);
});
it("allows only assigned member edits and separately delegated approvals/contacts", async () => {
  await join("planner_member");
  await assign();
  await actor(db, B);
  expect(
    (await db.query("select public.event_snapshot($1) r", [eid])).rows,
  ).toHaveLength(1);
  const changed = await eventCommand(
    "put_task",
    {
      fields: {
        title: "Member task",
        status: "todo",
        priority: "normal",
        dueAt: null,
        dependencyIds: [],
        isLocked: false,
      },
    },
    eid,
    1,
  );
  expect(changed.version).toBe(2);
  await expect(
    eventCommand(
      "approve",
      { proposalId: A, selectedOperationIds: [] },
      eid,
      2,
    ),
  ).rejects.toThrow("NOT_FOUND");
  await expect(
    db.query("select public.guest_directory($1)", [eid]),
  ).rejects.toThrow("NOT_FOUND");
  expect(
    (await db.query("select * from public.guests where event_id=$1", [eid]))
      .rows,
  ).toEqual([]);
  await expect(eventCommand("create", fields, null)).rejects.toThrow(
    "NOT_FOUND",
  );
  await expect(
    eventCommand("update", { ...fields, status: "archived" }, eid, 2),
  ).rejects.toThrow("ACCESS_DENIED");
  await assign(B, { canEdit: true, canApprove: true, canViewContacts: true });
  await actor(db, B);
  expect(
    (await db.query("select public.guest_directory($1)", [eid])).rows,
  ).toHaveLength(1);
  const proposal = await eventCommand(
    "preview",
    {
      newGuestCount: 21,
      priceChanges: [],
      protectResourceIds: [],
      doNotExceedBudget: false,
    },
    eid,
    2,
  );
  const approved = await eventCommand(
    "approve",
    { proposalId: proposal.id, selectedOperationIds: ["guest-count"] },
    eid,
    2,
  );
  expect(approved.version).toBe(3);
});
it("provides viewers only restricted assigned summaries and no mutation/contact/audit access", async () => {
  await join("client_viewer");
  await assign(B, { canEdit: true, canApprove: true, canViewContacts: true });
  await actor(db, B);
  const result = JSON.stringify(await overview());
  expect(result).toContain("Synthetic team event");
  expect(result).not.toMatch(
    /PRIVATE_PREFERENCES|budgetMinor|token_hash|b@example/,
  );
  expect(
    (await db.query("select * from public.events where id=$1", [eid])).rows,
  ).toEqual([]);
  expect(
    (
      await db.query("select * from public.audit_events where event_id=$1", [
        eid,
      ])
    ).rows,
  ).toEqual([]);
  for (const sql of [
    "select public.event_snapshot($1)",
    "select public.guest_directory($1)",
    "select public.event_functions_snapshot($1)",
  ])
    await expect(db.query(sql, [eid])).rejects.toThrow("NOT_FOUND");
  await expect(eventCommand("put_task", {}, eid, 1)).rejects.toThrow(
    "NOT_FOUND",
  );
});
it("allows managers operational creation but keeps membership administration owner-only", async () => {
  await join("planner_manager");
  await actor(db, B);
  expect((await eventCommand("create", fields, null)).id).toBeTruthy();
  expect(
    (await db.query("select public.event_snapshot($1)", [eid])).rows,
  ).toHaveLength(1);
  await expect(
    team("invite", {
      email: "c@example.test",
      role: "planner_manager",
      tokenHash: "ab".repeat(32),
    }),
  ).rejects.toThrow("NOT_FOUND");
  await expect(
    team("member", { userId: A, role: "planner_manager", state: "revoked" }),
  ).rejects.toThrow("NOT_FOUND");
});
it("revokes immediately, removes assignments and prevents old invite or metadata escalation", async () => {
  const invitation = await join("planner_member");
  await assign();
  await actor(db, A);
  await expect(
    team("member", { userId: A, role: "planner_manager", state: "revoked" }),
  ).rejects.toThrow("NOT_FOUND");
  await team("member", { userId: B, role: "planner_member", state: "revoked" });
  await actor(db, B);
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({
      sub: B,
      user_metadata: { role: "owner", workspace_id: wid },
    }),
  ]);
  expect(
    (
      await db.query(
        "select * from public.event_assignments where event_id=$1",
        [eid],
      )
    ).rows,
  ).toEqual([]);
  await expect(
    db.query("select public.event_snapshot($1)", [eid]),
  ).rejects.toThrow("NOT_FOUND");
  await expect(
    team("accept", { token: invitation.token }, null, null),
  ).rejects.toThrow("INVITE_ALREADY_USED");
  await expect(
    db.exec(
      "select private.command_before_teams(null,null,'create','{}',null,null,'bypass')",
    ),
  ).rejects.toThrow("permission denied");
  await expect(
    db.exec("select private.guest_snapshot_before_teams(null)"),
  ).rejects.toThrow("permission denied");
});
it("guards workspace versions, invite expiry/revocation, direct writes and foreign assignments", async () => {
  const token = await invite("planner_member");
  await actor(db, A);
  await expect(
    team("revoke_invite", { id: token.id }, wid, version - 1),
  ).rejects.toThrow("VERSION_CONFLICT");
  await team("revoke_invite", { id: token.id });
  await actor(db, B);
  await expect(
    team("accept", { token: token.token }, null, null),
  ).rejects.toThrow("NOT_FOUND");
  await actor(db, A);
  await expect(
    team("assign", {
      userId: C,
      eventId: eid,
      assigned: true,
      canEdit: true,
      canApprove: true,
      canViewContacts: true,
    }),
  ).rejects.toThrow("NOT_FOUND");
  await expect(
    db.query(
      "update public.workspace_members set role='owner' where user_id=$1",
      [B],
    ),
  ).rejects.toThrow("permission denied");
  await actor(db, null, "anon");
  await expect(db.exec("select public.team_overview()")).rejects.toThrow(
    "permission denied",
  );
});
