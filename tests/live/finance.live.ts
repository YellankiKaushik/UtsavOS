import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/infrastructure/config";
it("LIVE finance: distinct exact totals, payment bounds, protected commitment and corrections", async () => {
  expect(process.env.LIVE_STAGING_CONFIRMED).toBe("true");
  const { url, key } = supabaseConfig();
  expect(new URL(url!).hostname).toBe("upbwahlegwcwiladfwwd.supabase.co");
  const a = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    b = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  for (const [db, suffix] of [
    [a, "A"],
    [b, "B"],
  ] as const)
    expect(
      (
        await db.auth.signInWithPassword({
          email: process.env[`LIVE_USER_${suffix}_EMAIL`]!,
          password: process.env[`LIVE_USER_${suffix}_PASSWORD`]!,
        })
      ).error?.code,
    ).toBeUndefined();
  const workspace = await a.rpc("create_personal_workspace");
  expect(workspace.error?.code).toBeUndefined();
  let version: number;
  const created = await a.rpc("event_command", {
    p_event_id: null,
    p_workspace_id: workspace.data,
    p_action: "create",
    p_payload: {
      type: "community",
      title: "SYNTHETIC LIVE FINANCE",
      dateStatus: "tbd",
      startsAt: null,
      timeZone: "Asia/Kolkata",
      guestCount: 20,
      currency: "INR",
      budgetMinor: "1000000",
      preferences: "",
      status: "planning",
    },
    p_expected_version: null,
    p_idempotency_key: crypto.randomUUID(),
    p_request_id: "live-finance",
  });
  expect(created.error?.code).toBeUndefined();
  const eid = created.data.id;
  version = created.data.version;
  const vendor = await a.rpc("event_command", {
    p_event_id: eid,
    p_workspace_id: workspace.data,
    p_action: "put_vendor",
    p_payload: {
      fields: {
        title: "Synthetic supplier requirement",
        category: "other",
        status: "needed",
        notes: "",
        quoteSource: null,
        isLocked: false,
        estimatedCostMinor: null,
        dueAt: null,
      },
    },
    p_expected_version: version,
    p_idempotency_key: crypto.randomUUID(),
    p_request_id: "live-finance",
  });
  expect(vendor.error?.code).toBeUndefined();
  version = vendor.data.version;
  const args = (
    action: string,
    payload: unknown,
    expected = version,
    idem = crypto.randomUUID(),
  ) => ({
    p_event_id: eid,
    p_action: action,
    p_payload: payload,
    p_expected_version: expected,
    p_idempotency_key: idem,
    p_request_id: "live-finance",
  });
  async function command(action: string, payload: unknown) {
    const r = await a.rpc("vendor_finance_command", args(action, payload));
    expect(r.error?.code).toBeUndefined();
    version = r.data.version;
    return r.data.id as string;
  }
  const quote = await command("quote", {
    vendorRequirementId: vendor.data.id,
    supplierName: "Synthetic supplier",
    reference: "Q-1",
    totalMinor: "1000000",
    expiresOn: null,
    notes: "Synthetic bookkeeping only",
  });
  const commitment = await command("commit", {
    quoteId: quote,
    depositDueMinor: "200000",
    confirmed: true,
  });
  const invoice = await command("invoice", {
    commitmentId: commitment,
    reference: "INV-1",
    amountMinor: "500000",
    issuedOn: "2026-10-01",
    dueOn: null,
  });
  const p = await command("payment", {
    invoiceId: invoice,
    reference: crypto.randomUUID(),
    amountMinor: "200000",
    paidOn: "2026-10-01",
    method: "cash",
    confirmed: true,
  });
  const read = await a.rpc("vendor_finance", { p_event_id: eid });
  expect(read.error?.code).toBeUndefined();
  expect(read.data.summary).toEqual({
    committedMinor: "1000000",
    invoicedMinor: "500000",
    paidMinor: "200000",
  });
  expect(
    (
      await a.rpc(
        "vendor_finance_command",
        args("payment", {
          invoiceId: invoice,
          reference: crypto.randomUUID(),
          amountMinor: "300001",
          paidOn: "2026-10-01",
          method: "cash",
          confirmed: true,
        }),
      )
    ).error?.message,
  ).toBe("OVERPAYMENT");
  expect(
    (await b.rpc("vendor_finance", { p_event_id: eid })).error?.message,
  ).toBe("NOT_FOUND");
  expect(
    (await b.from("vendor_payment_records").select("id").eq("event_id", eid))
      .data,
  ).toEqual([]);
  const unlock = await a.rpc("event_command", {
    p_event_id: eid,
    p_workspace_id: workspace.data,
    p_action: "put_vendor",
    p_payload: { id: vendor.data.id, fields: { isLocked: false } },
    p_expected_version: version,
    p_idempotency_key: crypto.randomUUID(),
    p_request_id: "live-finance",
  });
  expect(unlock.error?.message).toBe("PROTECTED_RESOURCE");
  await command("reverse_payment", {
    id: p,
    reason: "Synthetic verification correction",
  });
  await command("void_invoice", {
    id: invoice,
    reason: "Synthetic verification correction",
  });
  await command("cancel_commitment", {
    id: commitment,
    reason: "Synthetic verification complete",
  });
  expect(
    (await a.rpc("vendor_finance", { p_event_id: eid })).data.summary,
  ).toEqual({ committedMinor: "0", invoicedMinor: "0", paidMinor: "0" });
  for (const db of [a, b])
    expect((await db.auth.signOut()).error?.code).toBeUndefined();
});
