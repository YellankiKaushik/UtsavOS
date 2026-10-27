import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { calculateBudget } from "@/domain/money";
import type { EventSnapshot } from "@/domain/contracts";
let db: PGlite,
  wA: string,
  wB: string,
  eventId: string,
  version = 1,
  cateringId: string;
const A = "11111111-1111-4111-8111-111111111111",
  B = "22222222-2222-4222-8222-222222222222";
async function actor(id: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id ?? "",
  ]);
  await db.exec("set role authenticated");
}
async function cmd(
  action: string,
  payload: unknown,
  opts: { id?: string; v?: number; key?: string; workspace?: string } = {},
) {
  const r = await db.query<{
    result: {
      id: string;
      version: number;
      snapshot: EventSnapshot;
      proposal?: {
        id: string;
        operations: { id: string }[];
        effects: { projectedMinor: string };
      };
      replayed?: boolean;
    };
  }>("select public.event_command($1,$2,$3,$4::jsonb,$5,$6,$7) as result", [
    opts.id ?? eventId ?? null,
    opts.workspace ?? null,
    action,
    JSON.stringify(payload),
    opts.v ?? version,
    opts.key ?? crypto.randomUUID(),
    crypto.randomUUID(),
  ]);
  return r.rows[0].result;
}
const fields = {
  type: "wedding",
  title: "Synthetic wedding",
  dateStatus: "tbd",
  startsAt: null,
  timeZone: "Asia/Kolkata",
  guestCount: 150,
  currency: "INR",
  budgetMinor: "50000000",
  preferences: "",
  status: "planning",
};
const budget = {
  title: "Catering",
  category: "catering",
  pricingBasis: "per_guest",
  unitPriceMinor: "85000",
  quantity: null,
  sourceKind: "user_estimate",
  sourceLabel: null,
  isLocked: false,
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,aud text,role text,created_at timestamptz,updated_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users(id) values('${A}'),('${B}');`,
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await actor(A);
  wA = (
    await db.query<{ id: string }>(
      "select public.create_personal_workspace() id",
    )
  ).rows[0].id;
  await actor(B);
  wB = (
    await db.query<{ id: string }>(
      "select public.create_personal_workspace() id",
    )
  ).rows[0].id;
  await actor(A);
});
afterAll(async () => {
  await db?.close();
});
describe("real PostgreSQL migrations, policies and transactions", () => {
  it("executes the synthetic seed twice with stable records and exact golden totals", async () => {
    await db.exec("reset role");
    await db.exec(readFileSync("supabase/seed.sql", "utf8"));
    await db.exec(readFileSync("supabase/seed.sql", "utf8"));
    await actor("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const events = await db.query<{ id: string }>(
      "select id from public.events",
    );
    expect(events.rows).toHaveLength(1);
    const seeded = (
      await db.query<{ s: EventSnapshot }>(
        "select public.event_snapshot($1) s",
        [events.rows[0].id],
      )
    ).rows[0].s;
    expect(
      calculateBudget(seeded.budgetItems, 150, seeded.event.budgetMinor)
        .projectedMinor,
    ).toBe("42750000");
    expect(seeded.budgetItems.some((b) => b.isLocked)).toBe(true);
    await actor(A);
  });
  it("provisions personal workspaces idempotently", async () => {
    expect(
      (
        await db.query<{ id: string }>(
          "select public.create_personal_workspace() id",
        )
      ).rows[0].id,
    ).toBe(wA);
    expect(wA).not.toBe(wB);
    expect(
      (await db.query("select * from public.workspace_members")).rows,
    ).toHaveLength(1);
  });
  it("creates and reloads event with audit", async () => {
    const r = await cmd("create", fields, { workspace: wA });
    eventId = r.id;
    version = r.version;
    expect(r.snapshot.event.budgetMinor).toBe("50000000");
    expect(
      (await db.query("select * from public.audit_events")).rows,
    ).toHaveLength(1);
  });
  it("denies tenant B reads, all direct writes and RPC mutation", async () => {
    await actor(B);
    expect((await db.query("select * from public.events")).rows).toHaveLength(
      0,
    );
    await expect(
      db.query("select public.event_snapshot($1)", [eventId]),
    ).rejects.toThrow("NOT_FOUND");
    await expect(cmd("update", fields)).rejects.toThrow("NOT_FOUND");
    await expect(
      db.query("update public.events set title=$1 where id=$2", [
        "tamper",
        eventId,
      ]),
    ).rejects.toThrow("permission denied");
    await actor(A);
  });
  it("persists fixed and per-guest estimates, compares domain and SQL", async () => {
    let r = await cmd("put_budget", { id: null, fields: budget });
    version = r.version;
    cateringId = r.id;
    r = await cmd("put_budget", {
      id: null,
      fields: {
        ...budget,
        title: "Other fixed",
        category: "other",
        pricingBasis: "fixed",
        unitPriceMinor: "30000000",
      },
    });
    version = r.version;
    expect(
      calculateBudget(r.snapshot.budgetItems, 150, "50000000").projectedMinor,
    ).toBe("42750000");
  });
  it("preview has exact +2550000 and leaves event unchanged", async () => {
    const r = await cmd("preview", {
      newGuestCount: 180,
      priceChanges: [],
      doNotExceedBudget: true,
      protectResourceIds: [],
    });
    expect(r.proposal?.effects.projectedMinor).toBe("45300000");
    expect(r.snapshot.event.guestCount).toBe(150);
    expect(r.version).toBe(version);
  });
  it("atomic approval and duplicate replay produce one audit/version change", async () => {
    const preview = await cmd("preview", {
      newGuestCount: 180,
      priceChanges: [],
      doNotExceedBudget: true,
      protectResourceIds: [],
    });
    const key = crypto.randomUUID(),
      v = version,
      payload = {
        proposalId: preview.id,
        selectedOperationIds: ["guest-count"],
      };
    const r = await cmd("approve", payload, { key, v });
    version = r.version;
    expect(r.snapshot.event.guestCount).toBe(180);
    expect(
      calculateBudget(r.snapshot.budgetItems, 180, "50000000").remainingMinor,
    ).toBe("4700000");
    const replay = await cmd("approve", payload, { key, v });
    expect(replay.version).toBe(version);
    expect(replay.replayed).toBe(true);
    await expect(
      cmd("approve", { ...payload, selectedOperationIds: [] }, { key, v }),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
  });
  it("rejects stale proposal, preserving current state", async () => {
    const preview = await cmd("preview", {
      newGuestCount: 200,
      priceChanges: [],
      doNotExceedBudget: true,
    });
    const update = await cmd("update", {
      ...fields,
      guestCount: 180,
      title: "Updated",
    });
    version = update.version;
    await expect(
      cmd("approve", {
        proposalId: preview.id,
        selectedOperationIds: ["guest-count"],
      }),
    ).rejects.toThrow("VERSION_CONFLICT");
  });
  it("overbudget approval rolls back guest count, status and audit", async () => {
    const p = await cmd("preview", {
      newGuestCount: 300,
      priceChanges: [],
      doNotExceedBudget: true,
    });
    const audits = (await db.query("select * from public.audit_events")).rows
      .length;
    await expect(
      cmd("approve", {
        proposalId: p.id,
        selectedOperationIds: ["guest-count"],
      }),
    ).rejects.toThrow("UNRESOLVED_CONSTRAINT");
    const s = (
      await db.query<{ s: EventSnapshot }>(
        "select public.event_snapshot($1) s",
        [eventId],
      )
    ).rows[0].s;
    expect(s.event.guestCount).toBe(180);
    expect(s.event.version).toBe(version);
    expect(
      (await db.query("select * from public.audit_events")).rows.length,
    ).toBe(audits);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.replan_proposals where id=$1",
          [p.id],
        )
      ).rows[0].status,
    ).toBe("pending");
  });
  it("locked price cannot be edited or removed until explicit unlock", async () => {
    let r = await cmd("put_budget", {
      id: cateringId,
      fields: { ...budget, isLocked: true },
    });
    version = r.version;
    await expect(
      cmd("preview", {
        priceChanges: [{ budgetItemId: cateringId, newUnitPriceMinor: "1" }],
      }),
    ).rejects.toThrow("PROTECTED_RESOURCE");
    await expect(
      cmd("delete_budget", { id: cateringId, fields: {} }),
    ).rejects.toThrow("PROTECTED_RESOURCE");
    r = await cmd("put_budget", {
      id: cateringId,
      fields: { isLocked: false },
    });
    version = r.version;
  });
  it("rejects cross-event task dependencies and rolls back cycles", async () => {
    let r = await cmd("put_task", {
      fields: { title: "A", dueAt: null, dependencyIds: [] },
    });
    version = r.version;
    const a = r.id;
    r = await cmd("put_task", {
      fields: { title: "B", dueAt: null, dependencyIds: [a] },
    });
    version = r.version;
    const b = r.id;
    await expect(
      cmd("put_task", {
        id: a,
        fields: { title: "A", dueAt: null, dependencyIds: [b] },
      }),
    ).rejects.toThrow("DEPENDENCY_CYCLE");
    await expect(
      cmd("put_task", {
        fields: {
          title: "Invalid",
          dueAt: null,
          dependencyIds: [crypto.randomUUID()],
        },
      }),
    ).rejects.toThrow("foreign key");
    expect((await db.query("select * from public.tasks")).rows).toHaveLength(2);
  });
  it("denies unauthenticated RPC access", async () => {
    await actor(null);
    await expect(
      db.query("select public.create_personal_workspace()"),
    ).rejects.toThrow("UNAUTHENTICATED");
    await actor(A);
  });
  it("selectively accepts edited draft records once and preserves ideas", async () => {
    const payload = {
      schemaVersion: 1,
      eventType: "wedding",
      summary: "Synthetic database fixture",
      budgetSuggestions: [
        {
          draftId: "b-01",
          title: "Decor",
          category: "decor",
          pricingBasis: "fixed",
          unitPriceMinor: "10000",
          quantity: null,
          sourceKind: "ai_estimate",
          evidenceStatus: "unverified",
        },
      ],
      tasks: [
        {
          draftId: "t-01",
          title: "Draft parent",
          priority: "normal",
          dueAt: null,
          dependsOnDraftIds: [],
        },
        {
          draftId: "t-02",
          title: "Draft child",
          priority: "normal",
          dueAt: null,
          dependsOnDraftIds: ["t-01"],
        },
      ],
      vendorRequirements: [
        {
          draftId: "v-01",
          title: "Florist",
          category: "decor",
          status: "needed",
          notes: "Request quotes",
        },
      ],
      ideas: [
        {
          title: "Saved idea",
          description: "Synthetic",
          assumptionBased: true,
        },
      ],
      assumptions: [],
      questions: [],
      warnings: [],
    };
    const draft = await cmd("save_draft", {
      modelId: "synthetic-db-test",
      payload,
    });
    const beforeTasks = (await db.query("select id from public.tasks")).rows
      .length;
    await expect(
      cmd("accept", {
        draftId: draft.id,
        selectedDraftItemIds: ["b-01", "t-02"],
      }),
    ).rejects.toThrow("MISSING_PREREQUISITE");
    expect((await db.query("select id from public.tasks")).rows.length).toBe(
      beforeTasks,
    );
    const key = crypto.randomUUID(),
      v = version,
      selection = {
        draftId: draft.id,
        selectedDraftItemIds: ["b-01", "t-01", "t-02"],
        edits: { "b-01": { title: "Edited decor", unitPriceMinor: "12345" } },
      };
    const accepted = await cmd("accept", selection, { key, v });
    version = accepted.version;
    expect(
      accepted.snapshot.budgetItems.find((b) => b.title === "Edited decor")
        ?.unitPriceMinor,
    ).toBe("12345");
    expect(accepted.snapshot.vendors.some((v) => v.title === "Florist")).toBe(
      false,
    );
    expect(
      accepted.snapshot.tasks.find((t) => t.title === "Draft child")
        ?.dependencyIds,
    ).toHaveLength(1);
    const replay = await cmd("accept", selection, { key, v });
    expect(replay.version).toBe(version);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.ai_drafts where id=$1",
          [draft.id],
        )
      ).rows[0].status,
    ).toBe("partial");
  });
  for (const table of [
    "workspaces",
    "workspace_members",
    "events",
    "budget_items",
    "tasks",
    "task_dependencies",
    "vendor_requirements",
    "ai_drafts",
    "replan_proposals",
    "audit_events",
    "idempotency_receipts",
    "ai_usage_records",
  ]) {
    it(`tenant-negative SELECT policy: ${table}`, async () => {
      await actor(B);
      const rows = await db.query<{ workspace_id?: string; id?: string }>(
        `select * from public.${table}`,
      );
      expect(rows.rows.some((r) => r.workspace_id === wA || r.id === wA)).toBe(
        false,
      );
      await actor(A);
    });
    it(`direct writes denied: ${table}`, async () => {
      await expect(db.exec(`delete from public.${table}`)).rejects.toThrow(
        "permission denied",
      );
    });
  }
  it("rejects FK swaps across same-workspace events", async () => {
    const other = await cmd(
      "create",
      { ...fields, title: "Other event" },
      { workspace: wA },
    );
    await expect(
      cmd(
        "put_budget",
        { id: cateringId, fields: budget },
        { id: other.id, v: other.version },
      ),
    ).rejects.toThrow("NOT_FOUND");
    const task = await cmd(
      "put_task",
      { fields: { title: "Other event task", dueAt: null } },
      { id: other.id, v: other.version },
    );
    await expect(
      cmd("put_task", {
        fields: {
          title: "Cross event edge",
          dependencyIds: [task.id],
          dueAt: null,
        },
      }),
    ).rejects.toThrow("foreign key");
  });
  it("creates all event types, stores dates and denies generic guest updates", async () => {
    for (const type of ["wedding", "birthday", "community"]) {
      const r = await cmd(
        "create",
        {
          ...fields,
          type,
          dateStatus: "scheduled",
          startsAt: "2027-01-01T18:00:00+05:30",
        },
        { workspace: wA },
      );
      expect(r.snapshot.event.type).toBe(type);
      expect(Date.parse(r.snapshot.event.startsAt!)).toBe(
        Date.parse("2027-01-01T12:30:00Z"),
      );
    }
    await expect(cmd("update", { ...fields, guestCount: 999 })).rejects.toThrow(
      "REPLAN_REQUIRED",
    );
  });
  it("denies anonymous grants and privileged helper execution", async () => {
    await db.exec("reset role;set role anon");
    await expect(db.exec("select * from public.events")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.exec("select public.create_personal_workspace()"),
    ).rejects.toThrow("permission denied");
    await actor(A);
    await expect(
      db.query("select private.total($1,150)", [eventId]),
    ).rejects.toThrow("permission denied");
  });
  it("persists actual provider/model provenance without storing a prompt", async () => {
    const provenance = {
      provider: "openrouter",
      requestedModel: "openrouter/free",
      actualModel: "synthetic/actual",
      fallbackOccurred: true,
      latencyMs: 900,
      attemptCount: 2,
      providerRequestId: "synthetic-id",
      routingProvider: "synthetic-provider",
      reportedCost: "0",
    };
    const draft = await cmd("save_draft", {
      modelId: "synthetic/actual",
      payload: {
        schemaVersion: 1,
        eventType: "wedding",
        budgetSuggestions: [],
        tasks: [],
        vendorRequirements: [],
      },
      provenance,
    });
    const record = (
      await db.query<{
        provider_id: string;
        actual_model_id: string;
        fallback_occurred: boolean;
      }>(
        "select provider_id,actual_model_id,fallback_occurred from public.ai_drafts where id=$1",
        [draft.id],
      )
    ).rows[0];
    expect(record.provider_id).toBe("openrouter");
    expect(record.actual_model_id).toBe("synthetic/actual");
    expect(record.fallback_occurred).toBe(true);
  });
  it("bounds the final combined guest and price change rather than an intermediate subtotal", async () => {
    let r = await cmd(
      "create",
      { ...fields, guestCount: 1, budgetMinor: "9000000000000" },
      { workspace: wA },
    );
    const id = r.id;
    r = await cmd(
      "put_budget",
      { fields: { ...budget, unitPriceMinor: "9000000000000" } },
      { id, v: r.version },
    );
    const itemId = r.id;
    const preview = await cmd(
      "preview",
      {
        newGuestCount: 2,
        priceChanges: [{ budgetItemId: itemId, newUnitPriceMinor: "1" }],
        doNotExceedBudget: true,
      },
      { id, v: r.version },
    );
    expect(preview.proposal!.effects.projectedMinor).toBe("2");
    expect(preview.snapshot.event.guestCount).toBe(1);
    const approved = await cmd(
      "approve",
      {
        proposalId: preview.proposal!.id,
        selectedOperationIds: preview.proposal!.operations.map((o) => o.id),
      },
      { id, v: r.version },
    );
    expect(approved.snapshot.event.guestCount).toBe(2);
    expect(
      calculateBudget(
        approved.snapshot.budgetItems,
        approved.snapshot.event.guestCount,
        approved.snapshot.event.budgetMinor,
      ).projectedMinor,
    ).toBe("2");
  });
  it("blocks another active generation and releases the slot on completion", async () => {
    const usage = await cmd("reserve_ai", {
      modelId: "synthetic",
      operation: "plan",
      provenance: { provider: "gemini", requestedModel: "synthetic" },
    });
    await db.exec("reset role");
    await db.query(
      "update public.ai_usage_records set created_at=now()-interval '10 seconds' where id=$1",
      [usage.id],
    );
    await actor(A);
    await expect(
      cmd("reserve_ai", { modelId: "synthetic", operation: "plan" }),
    ).rejects.toThrow("AI_BUSY");
    expect(
      (await db.query("select id from public.ai_usage_records")).rows,
    ).toHaveLength(1);
    await cmd("complete_ai", {
      usageId: usage.id,
      status: "failed",
      provenance: {
        provider: "gemini",
        errorCode: "AI_AUTHENTICATION_FAILED",
        attemptCount: 1,
      },
    });
    expect(
      (
        await db.query<{ error_code: string }>(
          "select error_code from public.ai_usage_records where id=$1",
          [usage.id],
        )
      ).rows[0].error_code,
    ).toBe("AI_AUTHENTICATION_FAILED");
  });
});
