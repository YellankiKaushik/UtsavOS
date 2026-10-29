import { afterAll, beforeAll, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { database, event, actor, A, B } from "../helpers/database";
import { createBillingStore } from "../../src/infrastructure/billing-store";
import {
  ingestBillingDelivery,
  reconcileBilling,
} from "../../src/application/billing";
import {
  subscriptionAccess,
  type BillingStore,
} from "../../src/domain/billing";
let db: PGlite, store: BillingStore, workspace: string;
const snapshot = (status = "active") => ({
  customerId: "cus_synthetic",
  subscriptionId: "sub_synthetic",
  priceId: "price_synthetic",
  status,
  periodEnd: "2099-01-01T00:00:00Z",
  testMode: true,
});
beforeAll(async () => {
  db = await database();
  workspace = (await event(db)).workspace;
  await db.exec("reset role");
  await db.query(
    "insert into private.billing_bindings(workspace_id,customer_id,subscription_id) values($1,'cus_synthetic','sub_synthetic')",
    [workspace],
  );
  await db.exec(
    "insert into private.billing_prices values('price_synthetic','professional',150,30,25,300000000)",
  );
  store = createBillingStore(db);
  await actor(db, null, "service_role");
}, 60000);
afterAll(async () => db?.close());
const enqueue = (id: string) =>
  store.enqueue(id, "a".repeat(64), "sub_synthetic", true);
it("refuses unsigned, oversized, unverified or live deliveries before durable writes", async () => {
  let calls = 0;
  const verify = () => {
    calls++;
    return {
      eventId: "evt_verified",
      subscriptionId: "sub_synthetic",
      testMode: true,
    };
  };
  await expect(
    ingestBillingDelivery(new Uint8Array([1]), null, verify, store),
  ).rejects.toThrow();
  await expect(
    ingestBillingDelivery(new Uint8Array(262145), "sig", verify, store),
  ).rejects.toThrow();
  expect(calls).toBe(0);
  await expect(
    ingestBillingDelivery(
      new Uint8Array([1]),
      "sig",
      () => {
        throw Error("bad signature");
      },
      store,
    ),
  ).rejects.toThrow();
  await expect(
    ingestBillingDelivery(
      new Uint8Array([1]),
      "sig",
      () => ({ ...verify(), testMode: false }),
      store,
    ),
  ).rejects.toThrow();
  const raw = new TextEncoder().encode('{ "synthetic": true }');
  await ingestBillingDelivery(
    raw,
    "synthetic-signature",
    (bytes, sig) => {
      expect(bytes).toBe(raw);
      expect(sig).toBe("synthetic-signature");
      return verify();
    },
    store,
  );
  expect(await enqueue("evt_verified").catch(() => "conflict")).toBe(
    "conflict",
  );
});
it("deduplicates durably, rejects mutated receipts and unknown bindings", async () => {
  expect(await enqueue("evt_dedupe")).toBe("queued");
  expect(await enqueue("evt_dedupe")).toBe("queued");
  await expect(
    store.enqueue("evt_dedupe", "b".repeat(64), "sub_synthetic", true),
  ).rejects.toThrow("BILLING_RECEIPT_CONFLICT");
  await expect(
    store.enqueue("evt_unknown", "a".repeat(64), "sub_other", true),
  ).rejects.toThrow("BILLING_UNBOUND");
});
it("serializes retrieval and reconciles an old delivery to the current state", async () => {
  await enqueue("evt_new");
  await enqueue("evt_old");
  const c = await store.claim("evt_new");
  expect(c).not.toBeNull();
  expect(await store.claim("evt_old")).toBeNull();
  await store.complete("evt_new", c!, snapshot() as never);
  expect(
    await reconcileBilling("evt_old", store, async () => snapshot("canceled")),
  ).toBe("applied");
  await db.exec("reset role");
  const r = (
    await db.query<{ state: string }>(
      "select state from private.workspace_entitlements where workspace_id=$1",
      [workspace],
    )
  ).rows[0];
  expect(r.state).toBe("suspended");
  await actor(db, null, "service_role");
  expect(await enqueue("evt_old")).toBe("applied");
  expect(await store.claim("evt_old")).toBeNull();
});
it("rejects stale leases and cross-customer snapshots, then permits bounded retry", async () => {
  await enqueue("evt_stale");
  const old = await store.claim("evt_stale");
  await db.exec("reset role");
  await db.exec(
    "update private.billing_bindings set lease_until=now()-interval '1 second'",
  );
  await actor(db, null, "service_role");
  const fresh = await store.claim("evt_stale");
  expect(fresh?.epoch).not.toBe(old?.epoch);
  await expect(
    store.complete("evt_stale", old!, snapshot() as never),
  ).rejects.toThrow("BILLING_STALE_LEASE");
  await expect(
    store.complete("evt_stale", fresh!, {
      ...snapshot(),
      customerId: "cus_other",
    } as never),
  ).rejects.toThrow("BILLING_INVALID_SNAPSHOT");
  await store.retry("evt_stale", fresh!, "invalid_snapshot");
  expect(await store.claim("evt_stale")).toBeNull();
});
it("bounds failed work and exposes no ordinary-user entitlement writes", async () => {
  await enqueue("evt_retry");
  for (let i = 0; i < 5; i++) {
    const c = await store.claim("evt_retry");
    expect(c).not.toBeNull();
    await store.retry("evt_retry", c!, "provider_unavailable");
    await db.exec("reset role");
    await db.exec(
      "update private.billing_receipts set retry_at=now()-interval '1 second' where event_id='evt_retry'",
    );
    await actor(db, null, "service_role");
  }
  expect(await store.claim("evt_retry")).toBeNull();
  for (const user of [A, B]) {
    await actor(db, user);
    await expect(
      db.query(
        "select private.billing_enqueue('attacker',$1,'sub_synthetic',true)",
        ["a".repeat(64)],
      ),
    ).rejects.toThrow("permission denied");
    await expect(
      db.exec("select * from private.billing_receipts"),
    ).rejects.toThrow("permission denied");
  }
  await actor(db, null, "service_role");
});
it("grants only known active/trialing snapshots with a short expiration and conservative suspension", async () => {
  await enqueue("evt_active");
  await reconcileBilling("evt_active", store, async () => snapshot("trialing"));
  await db.exec("reset role");
  const r = (
    await db.query<{ plan: string; ttl: number }>(
      "select plan,extract(epoch from(valid_until-now()))::integer ttl from private.workspace_entitlements where workspace_id=$1",
      [workspace],
    )
  ).rows[0];
  expect(r.plan).toBe("professional");
  expect(r.ttl).toBeGreaterThan(86000);
  expect(r.ttl).toBeLessThanOrEqual(86400);
  await actor(db, null, "service_role");
  for (const status of [
    "incomplete",
    "incomplete_expired",
    "past_due",
    "canceled",
    "unpaid",
    "paused",
  ] as const)
    expect(subscriptionAccess(status, "2099-01-01T00:00:00Z", Date.now())).toBe(
      false,
    );
  expect(subscriptionAccess("active", "2000-01-01T00:00:00Z", Date.now())).toBe(
    false,
  );
});
