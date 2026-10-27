import { beforeAll, afterAll, beforeEach, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { database, actor, event, A, B } from "../helpers/database";
import { financeMutation } from "@/domain/vendor-finance";
let db: PGlite, eid: string, version: number, vendor: string, workspace: string;
beforeAll(async () => {
  db = await database();
});
afterAll(async () => {
  await db?.close();
});
async function command(
  action: string,
  payload: unknown,
  expected = version,
  key = crypto.randomUUID(),
) {
  const r = (
    await db.query<{ r: { id: string; version: number; replayed?: boolean } }>(
      "select public.vendor_finance_command($1,$2,$3::jsonb,$4,$5,'synthetic-finance') r",
      [eid, action, JSON.stringify(payload), expected, key],
    )
  ).rows[0].r;
  version = r.version;
  return r;
}
async function snapshot() {
  return (
    await db.query<{
      r: {
        eventVersion: number;
        summary: {
          committedMinor: string;
          invoicedMinor: string;
          paidMinor: string;
        };
        quotes: unknown[];
        payments: { state: string }[];
      };
    }>("select public.vendor_finance($1) r", [eid])
  ).rows[0].r;
}
const quotation = (vendorRequirementId: string, totalMinor = "1000000") => ({
  id: null,
  vendorRequirementId,
  supplierName: "Synthetic supplier",
  reference: "QUOTE-1",
  totalMinor,
  expiresOn: null,
  notes: "PRIVATE_QUOTATION_NOTES",
});
async function committed(amount = "1000000") {
  const q = (await command("quote", quotation(vendor, amount))).id;
  const c = (
    await command("commit", {
      quoteId: q,
      depositDueMinor: "200000",
      confirmed: true,
    })
  ).id;
  return { q, c };
}
async function invoiced(amount = "1000000") {
  const f = await committed();
  const i = (
    await command("invoice", {
      commitmentId: f.c,
      reference: "INV-1",
      amountMinor: amount,
      issuedOn: "2026-10-01",
      dueOn: null,
    })
  ).id;
  return { ...f, i };
}
const payment = (
  invoiceId: string,
  amountMinor = "500000",
  reference = "BANK-1",
) => ({
  invoiceId,
  amountMinor,
  reference: `${eid}:${reference.trim()}`,
  paidOn: "2026-10-01",
  method: "bank_transfer",
  confirmed: true,
});
beforeEach(async () => {
  const e = await event(db);
  eid = e.id;
  version = e.version;
  workspace = e.workspace;
  const r = (
    await db.query<{ r: { id: string; version: number } }>(
      "select public.event_command($1,$2,'put_vendor',$3::jsonb,$4,$5,'finance-vendor') r",
      [
        eid,
        workspace,
        JSON.stringify({
          fields: {
            title: "Synthetic photographer",
            category: "photography",
            status: "needed",
            notes: "",
            quoteSource: null,
            isLocked: false,
            estimatedCostMinor: null,
            dueAt: null,
          },
        }),
        version,
        crypto.randomUUID(),
      ],
    )
  ).rows[0].r;
  vendor = r.id;
  version = r.version;
});
it("keeps quote, commitment, deposit, invoice and payment totals distinct and exact", async () => {
  const { i } = await invoiced();
  await command("payment", payment(i, "499999"));
  await command("payment", payment(i, "1", "BANK-2"));
  expect((await snapshot()).summary).toEqual({
    committedMinor: "1000000",
    invoicedMinor: "1000000",
    paidMinor: "500000",
  });
  const state = (
    await db.query<{
      r: { budgetItems: unknown[]; event: { guestCount: number } };
    }>("select public.event_snapshot($1) r", [eid])
  ).rows[0].r;
  expect(state.budgetItems).toEqual([]);
  expect(state.event.guestCount).toBe(150);
  const audit = (
    await db.query(
      "select safe_diff from public.audit_events where event_id=$1 and action like 'finance_%'",
      [eid],
    )
  ).rows;
  expect(JSON.stringify(audit)).not.toMatch(
    /PRIVATE_QUOTATION_NOTES|BANK-1|Synthetic supplier/,
  );
});
it("rejects over-invoicing, overpayment, duplicate references and rolls back versions", async () => {
  const { c, i } = await invoiced("500000"),
    before = version;
  await expect(
    command("invoice", {
      commitmentId: c,
      reference: "INV-2",
      amountMinor: "500001",
      issuedOn: "2026-10-01",
      dueOn: null,
    }),
  ).rejects.toThrow("COMMITMENT_EXCEEDED");
  await expect(
    command("invoice", {
      commitmentId: c,
      reference: " inv-1 ",
      amountMinor: "1",
      issuedOn: "2026-10-01",
      dueOn: null,
    }),
  ).rejects.toThrow("DUPLICATE_REFERENCE");
  expect((await snapshot()).eventVersion).toBe(before);
  await command("payment", payment(i, "400000"));
  const after = version;
  await expect(
    command("payment", payment(i, "100001", "BANK-2")),
  ).rejects.toThrow("OVERPAYMENT");
  await expect(command("payment", payment(i, "1", " bank-1 "))).rejects.toThrow(
    "DUPLICATE_REFERENCE",
  );
  expect((await snapshot()).eventVersion).toBe(after);
  expect((await snapshot()).summary.paidMinor).toBe("400000");
});
it("protects active commitments against quote corrections and ordinary P0 unlock/delete", async () => {
  const { q, c } = await committed();
  await expect(
    command("quote", { ...quotation(vendor, "1"), id: q }),
  ).rejects.toThrow("PROTECTED_RESOURCE");
  await expect(command("withdraw_quote", { id: q })).rejects.toThrow(
    "PROTECTED_RESOURCE",
  );
  for (const [action, payload] of [
    ["put_vendor", { id: vendor, fields: { isLocked: false } }],
    ["delete_vendor", { id: vendor }],
  ] as const)
    await expect(
      db.query(
        "select public.event_command($1,$2,$3,$4::jsonb,$5,$6,'finance-protection')",
        [
          eid,
          workspace,
          action,
          JSON.stringify(payload),
          version,
          crypto.randomUUID(),
        ],
      ),
    ).rejects.toThrow("PROTECTED_RESOURCE");
  const second = (
    await command("quote", { ...quotation(vendor), reference: "QUOTE-2" })
  ).id;
  await expect(
    command("commit", {
      quoteId: second,
      depositDueMinor: "0",
      confirmed: true,
    }),
  ).rejects.toThrow("PROTECTED_RESOURCE");
  await command("cancel_commitment", {
    id: c,
    reason: "Cancelled before invoicing",
  });
  expect((await snapshot()).summary.committedMinor).toBe("0");
});
it("preserves correction history and requires reverse/void before cancelling", async () => {
  const { c, i } = await invoiced();
  const p = (await command("payment", payment(i))).id;
  await expect(
    command("void_invoice", { id: i, reason: "Correction" }),
  ).rejects.toThrow("FINANCIAL_RECORD_IN_USE");
  await expect(
    command("cancel_commitment", { id: c, reason: "Correction" }),
  ).rejects.toThrow("FINANCIAL_RECORD_IN_USE");
  await command("reverse_payment", {
    id: p,
    reason: "Duplicate external bookkeeping entry",
  });
  await command("void_invoice", {
    id: i,
    reason: "Supplier issued replacement",
  });
  await command("cancel_commitment", {
    id: c,
    reason: "Supplier commitment cancelled",
  });
  const s = await snapshot();
  expect(s.summary).toEqual({
    committedMinor: "0",
    invoicedMinor: "0",
    paidMinor: "0",
  });
  expect(s.payments).toHaveLength(1);
  expect(s.payments[0].state).toBe("reversed");
  await expect(
    command("reverse_payment", { id: p, reason: "Second reversal" }),
  ).rejects.toThrow("NOT_FOUND");
});
it("replays a payment once and rejects changed payload or stale event versions", async () => {
  const { i } = await invoiced(),
    key = crypto.randomUUID(),
    before = version,
    p = payment(i);
  const first = await command("payment", p, before, key),
    retry = await command("payment", p, before, key);
  expect(retry.id).toBe(first.id);
  expect(retry.replayed).toBe(true);
  expect((await snapshot()).payments).toHaveLength(1);
  await expect(
    command("payment", { ...p, amountMinor: "1" }, before, key),
  ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
  await expect(
    command("payment", payment(i, "1", "BANK-2"), before),
  ).rejects.toThrow("VERSION_CONFLICT");
});
it("denies foreign scope, direct writes, anonymous RPC and unassigned finance access", async () => {
  const { i } = await invoiced();
  await actor(db, B);
  await expect(snapshot()).rejects.toThrow("NOT_FOUND");
  await expect(command("payment", payment(i))).rejects.toThrow("NOT_FOUND");
  expect(
    (
      await db.query("select * from public.vendor_invoices where event_id=$1", [
        eid,
      ])
    ).rows,
  ).toEqual([]);
  await actor(db, A);
  await expect(command("quote", quotation(B))).rejects.toThrow("NOT_FOUND");
  await expect(
    db.query("update public.vendor_invoices set amount_minor=1 where id=$1", [
      i,
    ]),
  ).rejects.toThrow("permission denied");
  await actor(db, null, "anon");
  await expect(snapshot()).rejects.toThrow("permission denied");
});
it("requires explicit confirmation and valid positive canonical money and correction reasons", async () => {
  const q = (await command("quote", quotation(vendor))).id;
  await expect(
    command("commit", { quoteId: q, depositDueMinor: "0", confirmed: false }),
  ).rejects.toThrow("INVALID_INPUT");
  await expect(
    command("commit", {
      quoteId: q,
      depositDueMinor: "1000001",
      confirmed: true,
    }),
  ).rejects.toThrow("INVALID_MONEY");
  expect(
    financeMutation.safeParse({
      action: "payment",
      expectedVersion: version,
      ...payment(A),
      amountMinor: 1,
    }).success,
  ).toBe(false);
  expect(
    financeMutation.safeParse({
      action: "payment",
      expectedVersion: version,
      ...payment(A),
      amountMinor: "00",
    }).success,
  ).toBe(false);
  expect(
    financeMutation.safeParse({
      action: "invoice",
      expectedVersion: version,
      commitmentId: A,
      reference: "I",
      amountMinor: "1",
      issuedOn: "2026-10-02",
      dueOn: "2026-10-01",
    }).success,
  ).toBe(false);
  await expect(
    command("quote", quotation(vendor, "9000000000001")),
  ).rejects.toThrow(/check constraint/);
});
