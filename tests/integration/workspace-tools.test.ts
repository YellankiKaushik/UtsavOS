import { beforeEach, afterEach, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { database, actor, event, A, B } from "../helpers/database";
import {
  csvCell,
  lifecycleAction,
  type LifecycleStatus,
  type WorkspaceDashboard,
} from "@/domain/workspace-tools";
let db: PGlite, eid: string, wid: string, version: number;
beforeEach(async () => {
  db = await database({ storage: true });
  const e = await event(db);
  eid = e.id;
  wid = e.workspace;
  version = e.version;
});
afterEach(async () => {
  await db?.close();
});
async function lifecycle(
  action: string,
  key = crypto.randomUUID(),
  expected = version,
) {
  const r = (
    await db.query<{ r: LifecycleStatus }>(
      "select public.event_lifecycle_command($1,$2,$3,$4,'synthetic-lifecycle') r",
      [eid, action, expected, key],
    )
  ).rows[0].r;
  version = r.eventVersion;
  return r;
}
async function dashboard() {
  return (
    await db.query<{ r: WorkspaceDashboard }>(
      "select public.workspace_dashboard($1) r",
      [wid],
    )
  ).rows[0].r;
}
async function limits(values = "1,0,1,0", expires = "now()+interval '1 day'") {
  await db.exec("reset role");
  await db.query(
    `insert into private.workspace_entitlements(workspace_id,plan,state,valid_until,event_limit,ai_daily_limit,member_limit,storage_limit_bytes) values($1,'professional','active',${expires},${values})`,
    [wid],
  );
  await actor(db, A);
}
async function fresh() {
  return event(db);
}
it("reports owner usage without contact data and denies cross tenant/anonymous access and self upgrades", async () => {
  const d = await dashboard();
  expect(d.usage.activeEvents).toBe(1);
  expect(d.limits.aiAttemptsPerUtcDay).toBe(20);
  expect(d.billingAvailable).toBe(false);
  expect(JSON.stringify(d)).not.toContain("email");
  await expect(
    db.query("update private.workspace_entitlements set event_limit=1000"),
  ).rejects.toThrow("permission denied");
  await actor(db, B);
  await expect(dashboard()).rejects.toThrow("NOT_FOUND");
  await actor(db, null, "anon");
  await expect(dashboard()).rejects.toThrow("permission denied");
});
it("enforces event, AI and storage entitlements inside guarded RPCs; expiry falls back safely", async () => {
  await limits();
  expect((await dashboard()).limits.activeEvents).toBe(1);
  await expect(fresh()).rejects.toThrow("ENTITLEMENT_LIMIT");
  await expect(
    db.query(
      "select public.event_command($1,null,'reserve_ai',$2,1,$3,'quota')",
      [
        eid,
        JSON.stringify({ modelId: "synthetic", operation: "plan" }),
        crypto.randomUUID(),
      ],
    ),
  ).rejects.toThrow("RATE_LIMITED");
  await expect(
    db.query("select public.document_command($1,'prepare',$2,1,$3,'quota')", [
      eid,
      JSON.stringify({
        filename: "a.txt",
        mediaType: "text/plain",
        byteSize: 1,
      }),
      crypto.randomUUID(),
    ]),
  ).rejects.toThrow("ITEM_LIMIT");
  await db.exec("reset role");
  await db.query(
    "update private.workspace_entitlements set valid_until=now()-interval '1 second' where workspace_id=$1",
    [wid],
  );
  await actor(db, A);
  expect((await dashboard()).limits.activeEvents).toBe(100);
  await expect(fresh()).resolves.toBeTruthy();
});
it("exports owner operational data without invite capabilities and denies another tenant", async () => {
  const data = (
    await db.query<{ r: Record<string, unknown> }>(
      "select public.event_export($1) r",
      [eid],
    )
  ).rows[0].r;
  expect(data).toHaveProperty("planning");
  expect(data).toHaveProperty("finance");
  expect(data.guests).not.toHaveProperty("invitations");
  await actor(db, B);
  await expect(
    db.query("select public.event_export($1)", [eid]),
  ).rejects.toThrow("NOT_FOUND");
});
it("freezes writes, erases eligible operational data and replays exactly once", async () => {
  const key = crypto.randomUUID();
  expect((await lifecycle("request_deletion", key)).state).toBe(
    "pending_cleanup",
  );
  expect((await lifecycle("request_deletion", key, 1)).eventVersion).toBe(2);
  await expect(
    db.query(
      "select public.event_command($1,null,'put_task',$2,2,$3,'frozen')",
      [
        eid,
        JSON.stringify({
          id: null,
          fields: {
            title: "late task",
            status: "todo",
            priority: "normal",
            isLocked: false,
          },
        }),
        crypto.randomUUID(),
      ],
    ),
  ).rejects.toThrow("DATA_LIFECYCLE_HOLD");
  const eraseKey = crypto.randomUUID();
  expect((await lifecycle("erase", eraseKey)).state).toBe("erased");
  expect((await lifecycle("erase", eraseKey, 2)).eventVersion).toBe(3);
  const snapshot = (
    await db.query<{
      r: { event: { title: string; version: number }; tasks: unknown[] };
    }>("select public.event_snapshot($1) r", [eid])
  ).rows[0].r;
  expect(snapshot.event.title).toBe("Deleted celebration");
  expect(snapshot.event.version).toBe(3);
  expect(snapshot.tasks).toEqual([]);
  expect(
    (
      await db.query(
        "select id from public.idempotency_receipts where response_ref->>'eventId'=$1",
        [eid],
      )
    ).rows,
  ).toEqual([]);
});
it("revokes a live invitation when deletion starts and leaves another tenant untouched", async () => {
  const token = "b".repeat(64);
  await db.exec("reset role");
  await db.query(
    "insert into public.guest_households(id,workspace_id,event_id,name) values($1,$2,$3,'PRIVATE_HOUSEHOLD')",
    [B, wid, eid],
  );
  await db.query(
    "insert into public.guests(id,workspace_id,event_id,household_id,display_name,email) values($1,$2,$3,$1,'PRIVATE_GUEST','guest@example.test')",
    [B, wid, eid],
  );
  await db.query(
    "insert into private.guest_invites(workspace_id,event_id,household_id,token_hash,guest_ids,function_ids,include_event,expires_at) values($1,$2,$3,sha256(convert_to($4,'UTF8')),array[$3::uuid],array[]::uuid[],true,now()+interval '1 day')",
    [wid, eid, B, token],
  );
  await actor(db, B);
  const other = await event(db, B);
  await actor(db, A);
  expect(
    (await db.query("select public.rsvp_view($1) r", [token])).rows,
  ).toHaveLength(1);
  await lifecycle("request_deletion");
  await expect(
    db.query("select public.rsvp_view($1)", [token]),
  ).rejects.toThrow("NOT_FOUND");
  await lifecycle("erase");
  expect(
    (await db.query("select id from public.guests where event_id=$1", [eid]))
      .rows,
  ).toEqual([]);
  await actor(db, B);
  expect(
    (
      await db.query<{ r: { event: { id: string } } }>(
        "select public.event_snapshot($1) r",
        [other.id],
      )
    ).rows[0].r.event.id,
  ).toBe(other.id);
});
it("requires actual Storage absence before erasure and denies late uploads", async () => {
  const prepared = (
    await db.query<{ r: { id: string } }>(
      "select public.document_command($1,'prepare',$2,1,$3,'doc') r",
      [
        eid,
        JSON.stringify({
          filename: "synthetic.txt",
          mediaType: "text/plain",
          byteSize: 4,
        }),
        crypto.randomUUID(),
      ],
    )
  ).rows[0].r;
  const path = (
    await db.query<{ object_path: string }>(
      "select object_path from public.event_documents where id=$1",
      [prepared.id],
    )
  ).rows[0].object_path;
  await db.query(
    'insert into storage.objects(bucket_id,name,metadata) values(\'utsavos-documents\',$1,\'{"size":4,"mimetype":"text/plain"}\')',
    [path],
  );
  version = 2;
  await lifecycle("request_deletion");
  await expect(lifecycle("erase")).rejects.toThrow("DOCUMENT_NOT_READY");
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name) values('utsavos-documents',$1)",
      [path + "other"],
    ),
  ).rejects.toThrow("row-level security");
  await db.query("delete from storage.objects where name=$1", [path]);
  expect((await lifecycle("erase")).state).toBe("erased");
  expect(
    (
      await db.query(
        "select id from public.event_documents where event_id=$1",
        [eid],
      )
    ).rows,
  ).toEqual([]);
});
it("keeps financial evidence on retention hold rather than claiming erasure", async () => {
  await db.exec("reset role");
  await db.query(
    "insert into public.vendor_requirements(id,workspace_id,event_id,title,category,status) values($1,$2,$3,'Synthetic vendor','other','needed')",
    [B, wid, eid],
  );
  await db.query(
    "insert into public.vendor_quotes(id,workspace_id,event_id,vendor_requirement_id,supplier_name,reference,total_minor) values($1,$2,$3,$1,'Synthetic supplier','Q-1',100)",
    [B, wid, eid],
  );
  await db.query(
    "insert into public.vendor_commitments(workspace_id,event_id,quote_id,total_minor) values($1,$2,$3,100)",
    [wid, eid, B],
  );
  await actor(db, A);
  expect((await lifecycle("request_deletion")).state).toBe("retention_review");
  await expect(lifecycle("erase")).rejects.toThrow("RETENTION_REVIEW_REQUIRED");
  expect(
    (
      await db.query(
        "select id from public.vendor_commitments where event_id=$1",
        [eid],
      )
    ).rows,
  ).toHaveLength(1);
});
it("requires explicit lifecycle consent and escapes dangerous CSV values", () => {
  expect(
    lifecycleAction.safeParse({
      action: "erase",
      expectedVersion: 1,
      confirmed: false,
    }).success,
  ).toBe(false);
  for (const text of ["=CMD()", " +1", "\t@SUM(1)", "-10", "\rformula"])
    expect(csvCell(text).startsWith("\"'")).toBe(true);
  expect(csvCell('a,"b"')).toBe('"a,""b"""');
});
it("persists an idempotent self account review request without falsely completing or disclosing another user's request", async () => {
  const a = (
    await db.query<{ r: { id: string; state: string; completed: boolean } }>(
      "select public.account_data_request('request') r",
    )
  ).rows[0].r;
  expect(a.state).toBe("pending_review");
  expect(a.completed).toBe(false);
  expect(
    (
      await db.query<{ r: { id: string } }>(
        "select public.account_data_request('request') r",
      )
    ).rows[0].r.id,
  ).toBe(a.id);
  await actor(db, B);
  expect(
    (
      await db.query<{ r: { id: string | null } }>(
        "select public.account_data_request('status') r",
      )
    ).rows[0].r.id,
  ).toBeNull();
  await actor(db, A);
  expect(
    (
      await db.query<{ r: { state: string } }>(
        "select public.account_data_request('cancel') r",
      )
    ).rows[0].r.state,
  ).toBe("cancelled");
});
