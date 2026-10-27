import { beforeAll, afterAll, describe, it, expect } from "vitest";
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import { createServer } from "node:net";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import type { EventSnapshot } from "@/domain/contracts";
import { calculateBudget } from "@/domain/money";
import { createHash, randomBytes } from "node:crypto";
const A = "11111111-1111-4111-8111-111111111111",
  B = "22222222-2222-4222-8222-222222222222";
let server: EmbeddedPostgres,
  admin: Client,
  port: number,
  password: string,
  engineVersion = "",
  primedEventId = "";
const clients: Client[] = [];
const results: { scenario: string; passed: boolean }[] = [];
async function freePort() {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const addr = s.address();
  if (!addr || typeof addr === "string") throw new Error("No TCP port");
  const p = addr.port;
  await new Promise<void>((r, e) => s.close((err) => (err ? e(err) : r())));
  return p;
}
async function session(actor: string) {
  const c = new Client({
    host: "127.0.0.1",
    port,
    user: "postgres",
    password,
    database: "postgres",
  });
  await c.connect();
  await c.query("select set_config('request.jwt.claim.sub',$1,false)", [actor]);
  await c.query("set role authenticated");
  clients.push(c);
  return c;
}
async function command(
  c: Client,
  action: string,
  payload: unknown,
  eventId: string | null = null,
  version: number | null = null,
  workspaceId: string | null = null,
  key = crypto.randomUUID(),
) {
  const r = await c.query<{
    result: {
      id: string;
      version: number;
      replayed?: boolean;
      snapshot: EventSnapshot;
      proposal?: { id: string };
    };
  }>("select public.event_command($1,$2,$3,$4::jsonb,$5,$6,$7) result", [
    eventId,
    workspaceId,
    action,
    JSON.stringify(payload),
    version,
    key,
    crypto.randomUUID(),
  ]);
  return r.rows[0].result;
}
const fields = {
  type: "wedding",
  title: "Synthetic native concurrency event",
  dateStatus: "tbd",
  startsAt: null,
  timeZone: "Asia/Kolkata",
  guestCount: 150,
  currency: "INR",
  budgetMinor: "50000000",
  preferences: "",
  status: "planning",
};
const catering = {
  title: "Catering",
  category: "catering",
  pricingBasis: "per_guest",
  unitPriceMinor: "85000",
  quantity: null,
  sourceKind: "user_estimate",
  isLocked: false,
};
async function fixture() {
  const c = await session(A),
    w = (
      await c.query<{ id: string }>(
        "select public.create_personal_workspace() id",
      )
    ).rows[0].id;
  let r = await command(c, "create", fields, null, null, w);
  const eventId = r.id;
  r = await command(c, "put_budget", { fields: catering }, eventId, r.version);
  const budgetId = r.id;
  r = await command(
    c,
    "put_budget",
    {
      fields: {
        ...catering,
        title: "Other fixed",
        category: "other",
        pricingBasis: "fixed",
        unitPriceMinor: "30000000",
      },
    },
    eventId,
    r.version,
  );
  return { c, w, eventId, version: r.version, budgetId };
}
beforeAll(async () => {
  port = await freePort();
  password = crypto.randomUUID();
  const dir = resolve(".runtime", `native-postgres-${crypto.randomUUID()}`),
    root = resolve(".runtime");
  const rel = relative(root, dir);
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`))
    throw new Error("Unsafe test directory");
  mkdirSync(root, { recursive: true });
  server = new EmbeddedPostgres({
    databaseDir: dir,
    port,
    user: "postgres",
    password,
    authMethod: "scram-sha-256",
    persistent: true,
    createPostgresUser: false,
    postgresFlags: ["-h", "127.0.0.1", "-c", "log_statement=none"],
    onLog: () => {},
    onError: () => {},
  });
  await server.initialise();
  await server.start();
  admin = new Client({
    host: "127.0.0.1",
    port,
    user: "postgres",
    password,
    database: "postgres",
  });
  await admin.connect();
  await admin.query(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${A}'),('${B}');`,
  );
  for (const f of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (f.includes("ai_provider_provenance")) {
      // Keep a pooled session that has already executed the original SQL RPC.
      await admin.query("select set_config('request.jwt.claim.sub',$1,false)", [
        A,
      ]);
      const w = (
        await admin.query("select public.create_personal_workspace() id")
      ).rows[0].id;
      primedEventId = (await command(admin, "create", fields, null, null, w))
        .id;
    }
    await admin.query(readFileSync(`supabase/migrations/${f}`, "utf8"));
  }
  engineVersion = (await admin.query<{ version: string }>("select version()"))
    .rows[0].version;
  console.info(
    JSON.stringify({
      runtime: "native-postgresql",
      version: engineVersion,
      connectionMode: "independent TCP sessions",
      listen: "loopback only",
    }),
  );
});
afterAll(async () => {
  await Promise.allSettled(clients.map((c) => c.end()));
  await admin?.end().catch(() => {});
  await server?.stop();
  mkdirSync(".runtime", { recursive: true });
  writeFileSync(
    ".runtime/concurrency-summary.json",
    JSON.stringify(
      {
        version: engineVersion,
        scenarios: results,
        note: "Native PostgreSQL with synthetic auth roles; not hosted Supabase/Auth verification.",
      },
      null,
      2,
    ) + "\n",
  );
});
describe("genuine parallel PostgreSQL transactions", () => {
  it("upgrades an already-used public RPC to the provenance wrapper", async () => {
    const r = await command(
      admin,
      "save_draft",
      {
        modelId: "synthetic/upgrade",
        payload: {
          schemaVersion: 1,
          eventType: "wedding",
          budgetSuggestions: [],
          tasks: [],
          vendorRequirements: [],
        },
        provenance: {
          provider: "openrouter",
          requestedModel: "openrouter/free",
          actualModel: "synthetic/upgrade",
          attemptCount: 1,
        },
      },
      primedEventId,
      1,
    );
    const row = (
      await admin.query(
        "select provider_id,actual_model_id from public.ai_drafts where id=$1",
        [r.id],
      )
    ).rows[0];
    expect(row.provider_id).toBe("openrouter");
    expect(row.actual_model_id).toBe("synthetic/upgrade");
    results.push({
      scenario: "pooled RPC upgrade resolves provenance wrapper",
      passed: true,
    });
  });
  it("distinct users can commit independent events concurrently", async () => {
    const a = await session(A),
      b = await session(B),
      [wa, wb] = await Promise.all([
        a.query("select public.create_personal_workspace() id"),
        b.query("select public.create_personal_workspace() id"),
      ]);
    const rows = await Promise.all([
      command(a, "create", fields, null, null, wa.rows[0].id),
      command(
        b,
        "create",
        { ...fields, title: "User B event" },
        null,
        null,
        wb.rows[0].id,
      ),
    ]);
    expect(rows[0].id).not.toBe(rows[1].id);
    results.push({ scenario: "independent tenants", passed: true });
  });
  it("two same-version edits yield one commit and one version conflict", async () => {
    const f = await fixture(),
      other = await session(A);
    const settled = await Promise.allSettled([
      command(
        f.c,
        "update",
        { ...fields, title: "Writer 1" },
        f.eventId,
        f.version,
      ),
      command(
        other,
        "update",
        { ...fields, title: "Writer 2" },
        f.eventId,
        f.version,
      ),
    ]);
    expect(settled.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(settled.filter((x) => x.status === "rejected")).toHaveLength(1);
    expect(
      (settled.find((x) => x.status === "rejected") as PromiseRejectedResult)
        .reason.message,
    ).toContain("VERSION_CONFLICT");
    results.push({ scenario: "same-event optimistic race", passed: true });
  });
  it("simultaneous identical approvals replay once with one audit and version", async () => {
    const f = await fixture(),
      other = await session(A),
      p = await command(
        f.c,
        "preview",
        { newGuestCount: 180, priceChanges: [], doNotExceedBudget: true },
        f.eventId,
        f.version,
      ),
      key = crypto.randomUUID(),
      body = { proposalId: p.id, selectedOperationIds: ["guest-count"] };
    const [a, b] = await Promise.all([
      command(f.c, "approve", body, f.eventId, f.version, null, key),
      command(other, "approve", body, f.eventId, f.version, null, key),
    ]);
    expect(a.version).toBe(f.version + 1);
    expect(b.version).toBe(a.version);
    expect([a.replayed, b.replayed].filter(Boolean)).toHaveLength(1);
    expect(
      calculateBudget(a.snapshot.budgetItems, 180, "50000000").remainingMinor,
    ).toBe("4700000");
    expect(
      (
        await f.c.query(
          "select id from public.audit_events where event_id=$1 and action=$2",
          [f.eventId, "approve"],
        )
      ).rowCount,
    ).toBe(1);
    results.push({ scenario: "duplicate concurrent approval", passed: true });
  });
  it("different approval keys cannot apply one proposal twice", async () => {
    const f = await fixture(),
      other = await session(A),
      p = await command(
        f.c,
        "preview",
        { newGuestCount: 180 },
        f.eventId,
        f.version,
      );
    const body = { proposalId: p.id, selectedOperationIds: ["guest-count"] },
      s = await Promise.allSettled([
        command(f.c, "approve", body, f.eventId, f.version),
        command(other, "approve", body, f.eventId, f.version),
      ]);
    expect(s.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(s.filter((r) => r.status === "rejected")).toHaveLength(1);
    results.push({
      scenario: "different-key concurrent approval",
      passed: true,
    });
  });
  it("stale approval waits on a real row lock then rejects the newer version", async () => {
    const f = await fixture(),
      other = await session(A),
      p = await command(
        f.c,
        "preview",
        { newGuestCount: 180 },
        f.eventId,
        f.version,
      );
    await f.c.query("begin");
    await command(
      f.c,
      "update",
      { ...fields, title: "Committed while approval waits" },
      f.eventId,
      f.version,
    );
    const pending = command(
      other,
      "approve",
      { proposalId: p.id, selectedOperationIds: ["guest-count"] },
      f.eventId,
      f.version,
    );
    const assertion = expect(pending).rejects.toThrow("VERSION_CONFLICT");
    await f.c.query("commit");
    await assertion;
    results.push({ scenario: "stale approval behind row lock", passed: true });
  });
  it("failed approval rolls back all effects, proposal status and audit", async () => {
    const f = await fixture(),
      p = await command(
        f.c,
        "preview",
        { newGuestCount: 300, doNotExceedBudget: true },
        f.eventId,
        f.version,
      );
    await expect(
      command(
        f.c,
        "approve",
        { proposalId: p.id, selectedOperationIds: ["guest-count"] },
        f.eventId,
        f.version,
      ),
    ).rejects.toThrow("UNRESOLVED_CONSTRAINT");
    const s = (
      await f.c.query<{ s: EventSnapshot }>(
        "select public.event_snapshot($1) s",
        [f.eventId],
      )
    ).rows[0].s;
    expect(s.event.version).toBe(f.version);
    expect(s.event.guestCount).toBe(150);
    expect(
      (
        await f.c.query(
          "select status from public.replan_proposals where id=$1",
          [p.id],
        )
      ).rows[0].status,
    ).toBe("pending");
    results.push({ scenario: "real transactional rollback", passed: true });
  });
  it("parallel budget changes preserve exact financial invariants and locks", async () => {
    const f = await fixture(),
      other = await session(A);
    const s = await Promise.allSettled([
      command(
        f.c,
        "put_budget",
        {
          id: f.budgetId,
          fields: { ...catering, unitPriceMinor: "90000", isLocked: true },
        },
        f.eventId,
        f.version,
      ),
      command(
        other,
        "put_budget",
        { id: f.budgetId, fields: { ...catering, unitPriceMinor: "95000" } },
        f.eventId,
        f.version,
      ),
    ]);
    expect(s.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    let r = (
      s.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<
        Awaited<ReturnType<typeof command>>
      >
    ).value;
    if (!r.snapshot.budgetItems.find((b) => b.id === f.budgetId)?.isLocked)
      r = await command(
        f.c,
        "put_budget",
        {
          id: f.budgetId,
          fields: {
            ...catering,
            unitPriceMinor: r.snapshot.budgetItems.find(
              (b) => b.id === f.budgetId,
            )!.unitPriceMinor,
            isLocked: true,
          },
        },
        f.eventId,
        r.version,
      );
    await expect(
      command(
        other,
        "put_budget",
        { id: f.budgetId, fields: catering },
        f.eventId,
        r.version,
      ),
    ).rejects.toThrow("PROTECTED_RESOURCE");
    expect(
      BigInt(
        calculateBudget(r.snapshot.budgetItems, 150, "50000000").projectedMinor,
      ),
    ).toBeGreaterThan(0n);
    results.push({
      scenario: "budget edit race and protected price",
      passed: true,
    });
  });
  it("concurrent selected draft acceptance inserts only once", async () => {
    const f = await fixture(),
      other = await session(A),
      draft = await command(
        f.c,
        "save_draft",
        {
          modelId: "synthetic",
          payload: {
            schemaVersion: 1,
            eventType: "wedding",
            budgetSuggestions: [],
            tasks: [
              {
                draftId: "t-01",
                title: "Only once",
                priority: "normal",
                dueAt: null,
                dependsOnDraftIds: [],
              },
            ],
            vendorRequirements: [],
          },
        },
        f.eventId,
        f.version,
      ),
      key = crypto.randomUUID(),
      body = { draftId: draft.id, selectedDraftItemIds: ["t-01"] };
    const rows = await Promise.all([
      command(f.c, "accept", body, f.eventId, f.version, null, key),
      command(other, "accept", body, f.eventId, f.version, null, key),
    ]);
    expect(rows[0].version).toBe(rows[1].version);
    expect(
      (
        await f.c.query("select id from public.tasks where event_id=$1", [
          f.eventId,
        ])
      ).rowCount,
    ).toBe(1);
    results.push({ scenario: "duplicate draft acceptance race", passed: true });
  });
  it("cross-tenant attempts fail while the authorized owner commits", async () => {
    const f = await fixture(),
      b = await session(B),
      s = await Promise.allSettled([
        command(
          f.c,
          "update",
          { ...fields, title: "Owner edit" },
          f.eventId,
          f.version,
        ),
        command(
          b,
          "update",
          { ...fields, title: "Attacker edit" },
          f.eventId,
          f.version,
        ),
      ]);
    expect(s[0].status).toBe("fulfilled");
    expect(s[1].status).toBe("rejected");
    expect(
      (await b.query("select id from public.events where id=$1", [f.eventId]))
        .rowCount,
    ).toBe(0);
    results.push({
      scenario: "cross-tenant denial during owner edit",
      passed: true,
    });
  });
});
it("serializes concurrent AI reservations across event rows", async () => {
  const first = await fixture(),
    second = await fixture(),
    c2 = await session(A),
    s = await Promise.allSettled([
      command(
        first.c,
        "reserve_ai",
        { modelId: "synthetic", operation: "plan" },
        first.eventId,
        first.version,
      ),
      command(
        c2,
        "reserve_ai",
        { modelId: "synthetic", operation: "plan" },
        second.eventId,
        second.version,
      ),
    ]);
  expect(s.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(s.filter((r) => r.status === "rejected")).toHaveLength(1);
  results.push({
    scenario: "concurrent generation reservation cap",
    passed: true,
  });
});
async function functionCommand(
  c: Client,
  id: string,
  version: number,
  key = crypto.randomUUID(),
) {
  const r = await c.query<{
    r: { id: string; version: number; replayed?: boolean };
  }>(
    "select public.event_function_command($1,'put',$2::jsonb,$3,$4,'synthetic-native-function') r",
    [
      id,
      JSON.stringify({
        fields: {
          title: "Synthetic function",
          startsAt: null,
          endsAt: null,
          timeZone: "Asia/Kolkata",
          status: "planned",
          notes: "",
        },
      }),
      version,
      key,
    ],
  );
  return r.rows[0].r;
}
it("serializes P1 function mutations against P0 event edits", async () => {
  const f = await fixture(),
    c2 = await session(A);
  const r = await Promise.allSettled([
    functionCommand(f.c, f.eventId, f.version),
    command(
      c2,
      "update",
      { ...fields, title: "Concurrent P0 edit" },
      f.eventId,
      f.version,
    ),
  ]);
  expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(r.filter((x) => x.status === "rejected")).toHaveLength(1);
  expect(
    (
      await f.c.query("select version from public.events where id=$1", [
        f.eventId,
      ])
    ).rows[0].version,
  ).toBe(f.version + 1);
  results.push({ scenario: "P1/P0 shared version race", passed: true });
});
it("replays concurrent identical function creation with one function/audit", async () => {
  const f = await fixture(),
    c2 = await session(A),
    key = crypto.randomUUID();
  const r = await Promise.all([
    functionCommand(f.c, f.eventId, f.version, key),
    functionCommand(c2, f.eventId, f.version, key),
  ]);
  expect(r[0].id).toBe(r[1].id);
  expect(r.filter((x) => x.replayed)).toHaveLength(1);
  expect(
    (
      await f.c.query(
        "select id from public.event_functions where event_id=$1",
        [f.eventId],
      )
    ).rows,
  ).toHaveLength(1);
  expect(
    (
      await f.c.query(
        "select id from public.audit_events where event_id=$1 and action='function_put'",
        [f.eventId],
      )
    ).rows,
  ).toHaveLength(1);
  results.push({
    scenario: "P1 duplicate function creation replay",
    passed: true,
  });
});

async function guestFixture() {
  const f = await fixture();
  async function mutate(action: string, payload: unknown) {
    const r = (
      await f.c.query(
        "select public.guest_command($1,$2,$3::jsonb,$4,$5,'native-guests') r",
        [
          f.eventId,
          action,
          JSON.stringify(payload),
          f.version,
          crypto.randomUUID(),
        ],
      )
    ).rows[0].r;
    f.version = r.version;
    return r.id as string;
  }
  const household = await mutate("household", {
    fields: { name: "Synthetic household" },
  });
  const guest = await mutate("guest", {
    fields: { householdId: household, displayName: "Synthetic invitee" },
  });
  const token = randomBytes(32).toString("hex");
  await mutate("invite", {
    householdId: household,
    guestIds: [guest],
    functionIds: [],
    includeEvent: true,
    expiresInHours: 1,
    tokenHash: createHash("sha256").update(token).digest("hex"),
  });
  const anonymous = async () => {
    const c = await session(A);
    await c.query("reset role; set role anon");
    return c;
  };
  const answers = JSON.stringify([
    { guestId: guest, functionId: null, status: "accepted" },
  ]);
  return { ...f, mutate, guest, token, anonymous, answers };
}
it("replays concurrent anonymous replies with one audit and one event version", async () => {
  const f = await guestFixture(),
    a = await f.anonymous(),
    b = await f.anonymous(),
    key = crypto.randomUUID();
  const replies = await Promise.all(
    [a, b].map((c) =>
      c.query("select public.rsvp_respond($1,$2::jsonb,$3) r", [
        f.token,
        f.answers,
        key,
      ]),
    ),
  );
  expect(replies.filter((r) => r.rows[0].r.replayed)).toHaveLength(1);
  expect(
    (
      await f.c.query("select version from public.events where id=$1", [
        f.eventId,
      ])
    ).rows[0].version,
  ).toBe(f.version + 1);
  expect(
    (
      await f.c.query(
        "select id from public.audit_events where event_id=$1 and action='guest_rsvp'",
        [f.eventId],
      )
    ).rows,
  ).toHaveLength(1);
  results.push({ scenario: "anonymous RSVP duplicate replay", passed: true });
});
it("rejects an RSVP waiting behind a concurrent guest archive", async () => {
  const f = await guestFixture(),
    anonymous = await f.anonymous();
  const pid = (await anonymous.query("select pg_backend_pid() pid")).rows[0]
    .pid;
  await f.c.query("begin");
  try {
    await f.mutate("attendance", {
      guestId: f.guest,
      functionId: null,
      status: "pending",
    });
    const waiting = anonymous
      .query("select public.rsvp_respond($1,$2::jsonb,$3)", [
        f.token,
        f.answers,
        crypto.randomUUID(),
      ])
      .then(
        () => "unexpected success",
        (e) => e.message as string,
      );
    let blocked = false;
    for (let i = 0; i < 100; i++) {
      blocked = (
        await admin.query(
          "select wait_event_type='Lock' blocked from pg_stat_activity where pid=$1",
          [pid],
        )
      ).rows[0]?.blocked;
      if (blocked) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(blocked).toBe(true);
    await f.mutate("archive_guest", { id: f.guest });
    await f.c.query("commit");
    expect(await waiting).toContain("NOT_FOUND");
    expect(
      (
        await f.c.query(
          "select id from public.audit_events where event_id=$1 and action='guest_rsvp'",
          [f.eventId],
        )
      ).rows,
    ).toHaveLength(0);
  } finally {
    await f.c.query("rollback");
  }
  results.push({
    scenario: "RSVP waits for host archive then revalidates",
    passed: true,
  });
});
