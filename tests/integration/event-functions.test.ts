import { beforeAll, afterAll, beforeEach, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { functionFields } from "@/domain/event-functions";
const A = "11111111-1111-4111-8111-111111111111",
  B = "22222222-2222-4222-8222-222222222222";
let db: PGlite, w: string, eid: string, v: number;
const fields = {
  title: "Synthetic ceremony",
  startsAt: "2027-01-01T12:00:00Z",
  endsAt: "2027-01-01T14:00:00Z",
  timeZone: "Asia/Kolkata",
  status: "planned",
  notes: "Synthetic function",
};
async function actor(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function core(action: string, payload: unknown, id = eid) {
  const r = await db.query<{
    r: { id: string; version: number; proposal?: { id: string } };
  }>("select public.event_command($1,$2,$3,$4::jsonb,$5,$6,$7) r", [
    id,
    w,
    action,
    JSON.stringify(payload),
    v,
    crypto.randomUUID(),
    "synthetic-functions",
  ]);
  v = r.rows[0].r.version;
  return r.rows[0].r;
}
async function fn(
  action: string,
  payload: unknown,
  key = crypto.randomUUID(),
  version = v,
  eventId = eid,
) {
  const r = await db.query<{
    r: {
      id: string;
      version: number;
      replayed?: boolean;
      functions: {
        eventVersion: number;
        items: {
          id: string;
          timeZone: string;
          resources: { tasks: string[] };
        }[];
      };
    };
  }>("select public.event_function_command($1,$2,$3::jsonb,$4,$5,$6) r", [
    eventId,
    action,
    JSON.stringify(payload),
    version,
    key,
    "synthetic-functions",
  ]);
  v = r.rows[0].r.version;
  return r.rows[0].r;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${A}'),('${B}');`,
  );
  for (const f of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await actor(A);
  w = (
    await db.query<{ id: string }>(
      "select public.create_personal_workspace() id",
    )
  ).rows[0].id;
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await actor(A);
  v = 1;
  eid = (
    await core(
      "create",
      {
        type: "wedding",
        title: "Synthetic P1 event",
        dateStatus: "tbd",
        startsAt: null,
        timeZone: "Asia/Kolkata",
        guestCount: 20,
        currency: "INR",
        budgetMinor: "1000000",
        status: "planning",
        preferences: "",
      },
      "00000000-0000-4000-8000-000000000001",
    )
  ).id;
});
it("persists independent schedules, time zones and statuses", async () => {
  const a = await fn("put", { fields });
  const b = await fn("put", {
    fields: {
      ...fields,
      title: "Reception",
      timeZone: "Europe/London",
      status: "active",
    },
  });
  expect(b.functions.items).toHaveLength(2);
  expect(b.functions.eventVersion).toBe(3);
  const result = await fn("put", {
    id: a.id,
    fields: { ...fields, title: "Updated ceremony", status: "completed" },
  });
  expect(result.version).toBe(4);
  expect(result.functions.items.map((f) => f.timeZone).sort()).toEqual([
    "Asia/Kolkata",
    "Europe/London",
  ]);
});
it("allows undecided schedules but rejects invalid ranges and zones in schema and SQL", async () => {
  expect(
    functionFields.safeParse({ ...fields, startsAt: null, endsAt: null })
      .success,
  ).toBe(true);
  expect(
    functionFields.safeParse({ ...fields, endsAt: "2026-01-01T00:00:00Z" })
      .success,
  ).toBe(false);
  await expect(
    fn("put", { fields: { ...fields, endsAt: "2026-01-01T00:00:00Z" } }),
  ).rejects.toThrow("check constraint");
  await expect(
    fn("put", { fields: { ...fields, timeZone: "Invented/Zone" } }),
  ).rejects.toThrow("INVALID_TIME_ZONE");
  expect(
    (
      await db.query<{ version: number }>(
        "select version from public.events where id=$1",
        [eid],
      )
    ).rows[0].version,
  ).toBe(1);
});
it("replays identical writes once and rejects changed intent or stale versions", async () => {
  const key = crypto.randomUUID(),
    base = v;
  const a = await fn("put", { fields }, key, base);
  expect((await fn("put", { fields }, key, base)).replayed).toBe(true);
  await expect(
    fn("put", { fields: { ...fields, title: "Different" } }, key, base),
  ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
  await expect(
    fn("put", { id: a.id, fields }, crypto.randomUUID(), base),
  ).rejects.toThrow("VERSION_CONFLICT");
  expect(
    (
      await db.query(
        "select id from public.audit_events where event_id=$1 and action='function_put'",
        [eid],
      )
    ).rows,
  ).toHaveLength(1);
});
it("denies tenant B reads, snapshot RPC, writes and mutation RPC", async () => {
  await fn("put", { fields });
  await actor(B);
  expect(
    (
      await db.query(
        "select id from public.event_functions where event_id=$1",
        [eid],
      )
    ).rows,
  ).toHaveLength(0);
  await expect(
    db.query("select public.event_functions_snapshot($1)", [eid]),
  ).rejects.toThrow("NOT_FOUND");
  await expect(fn("put", { fields })).rejects.toThrow("NOT_FOUND");
  await expect(db.exec("delete from public.event_functions")).rejects.toThrow(
    "permission denied",
  );
});
it("denies anonymous access and direct table writes for the owner", async () => {
  await expect(db.exec("delete from public.event_functions")).rejects.toThrow(
    "permission denied",
  );
  await db.exec("reset role;set role anon");
  await expect(
    db.query("select public.event_functions_snapshot($1)", [eid]),
  ).rejects.toThrow("permission denied");
});
it("links tasks without duplication; unlink and archive preserve immutable audit", async () => {
  const task = await core("put_task", {
    fields: {
      title: "Arrange chairs",
      status: "todo",
      priority: "normal",
      dueAt: null,
      dependencyIds: [],
    },
  });
  const f = await fn("put", { fields });
  await fn("link", {
    id: f.id,
    kind: "task",
    resourceId: task.id,
    assigned: true,
  });
  expect(
    (
      await db.query<{ r: { items: { resources: { tasks: string[] } }[] } }>(
        "select public.event_functions_snapshot($1) r",
        [eid],
      )
    ).rows[0].r.items[0].resources.tasks,
  ).toEqual([task.id]);
  const old = v;
  await expect(fn("archive", { id: f.id })).rejects.toThrow("FUNCTION_IN_USE");
  expect(v).toBe(old);
  await fn("link", {
    id: f.id,
    kind: "task",
    resourceId: task.id,
    assigned: false,
  });
  expect((await fn("archive", { id: f.id })).functions.items).toHaveLength(0);
  expect(
    (await db.query("select id from public.tasks where event_id=$1", [eid]))
      .rows,
  ).toHaveLength(1);
});
it("rejects cross-event function/resource swaps with no partial links", async () => {
  const f = await fn("put", { fields });
  const first = eid;
  const second = await core("create", {
    type: "birthday",
    title: "Other event",
    dateStatus: "tbd",
    timeZone: "Asia/Kolkata",
    guestCount: 10,
    currency: "INR",
    budgetMinor: "100000",
    status: "planning",
  });
  const task = await core(
    "put_task",
    {
      fields: {
        title: "Other task",
        status: "todo",
        priority: "normal",
        dueAt: null,
        dependencyIds: [],
      },
    },
    second.id,
  );
  await expect(
    fn(
      "link",
      { id: f.id, kind: "task", resourceId: task.id, assigned: true },
      crypto.randomUUID(),
      3,
      first,
    ),
  ).rejects.toThrow("VERSION_CONFLICT");
  const current = (
    await db.query<{ version: number }>(
      "select version from public.events where id=$1",
      [first],
    )
  ).rows[0].version;
  await expect(
    fn(
      "link",
      { id: f.id, kind: "task", resourceId: task.id, assigned: true },
      crypto.randomUUID(),
      current,
      first,
    ),
  ).rejects.toThrow("RESOURCE_UNAVAILABLE");
  await expect(
    fn("put", { id: f.id, fields }, crypto.randomUUID(), v, second.id),
  ).rejects.toThrow("NOT_FOUND");
});
it("preserves locked prices and exact event totals when assigning expenses", async () => {
  const budget = await core("put_budget", {
    fields: {
      title: "Catering",
      category: "catering",
      pricingBasis: "per_guest",
      unitPriceMinor: "1000",
      quantity: null,
      sourceKind: "user_estimate",
      isLocked: true,
    },
  });
  const f = await fn("put", { fields });
  await expect(
    fn("link", {
      id: f.id,
      kind: "budget",
      resourceId: budget.id,
      assigned: true,
    }),
  ).rejects.toThrow("RESOURCE_UNAVAILABLE");
  const snapshot = (
    await db.query<{ r: { budgetItems: { unitPriceMinor: string }[] } }>(
      "select public.event_snapshot($1) r",
      [eid],
    )
  ).rows[0].r;
  expect(snapshot.budgetItems[0].unitPriceMinor).toBe("1000");
});
it("links owned expenses/vendors, preserves links through P0 edits, and retains historical archived references", async () => {
  const budgetFields = {
    title: "Catering",
    category: "catering",
    pricingBasis: "fixed",
    unitPriceMinor: "1000",
    quantity: null,
    sourceKind: "user_estimate",
    isLocked: false,
  };
  const b = await core("put_budget", { fields: budgetFields });
  const vendor = await core("put_vendor", {
    fields: {
      title: "Caterer",
      category: "catering",
      status: "needed",
      isLocked: false,
    },
  });
  const f = await fn("put", { fields });
  await fn("link", {
    id: f.id,
    kind: "budget",
    resourceId: b.id,
    assigned: true,
  });
  await fn("link", {
    id: f.id,
    kind: "vendor",
    resourceId: vendor.id,
    assigned: true,
  });
  await core("put_budget", {
    id: b.id,
    fields: { ...budgetFields, unitPriceMinor: "2000" },
  });
  expect(
    (
      await db.query<{ event_function_id: string }>(
        "select event_function_id from public.budget_items where id=$1",
        [b.id],
      )
    ).rows[0].event_function_id,
  ).toBe(f.id);
  await fn("link", {
    id: f.id,
    kind: "vendor",
    resourceId: vendor.id,
    assigned: false,
  });
  await core("delete_budget", { id: b.id });
  expect((await fn("archive", { id: f.id })).functions.items).toHaveLength(0);
  expect(
    (
      await db.query<{ event_function_id: string; unit_price_minor: number }>(
        "select event_function_id,unit_price_minor from public.budget_items where id=$1",
        [b.id],
      )
    ).rows[0],
  ).toMatchObject({ event_function_id: f.id, unit_price_minor: 2000 });
});
it("invalidates existing P0 proposals when a function changes the event version", async () => {
  const preview = await core("preview", { newGuestCount: 21 });
  const old = v;
  await fn("put", { fields });
  await expect(
    db.query(
      "select public.event_command($1,null,'approve',$2::jsonb,$3,$4,'synthetic')",
      [
        eid,
        JSON.stringify({
          proposalId: preview.proposal!.id,
          selectedOperationIds: ["guest-count"],
        }),
        old,
        crypto.randomUUID(),
      ],
    ),
  ).rejects.toThrow("VERSION_CONFLICT");
});
