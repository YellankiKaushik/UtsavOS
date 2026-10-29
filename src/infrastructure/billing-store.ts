import type {
  BillingClaim,
  BillingStore,
  SubscriptionSnapshot,
} from "../domain/billing";
// Dedicated worker connection only. Never construct this with a browser/client
// connection or deploy a service-role secret to the ordinary web application.
export interface BillingSql {
  query<T>(sql: string, values: unknown[]): Promise<{ rows: T[] }>;
}
export function createBillingStore(db: BillingSql): BillingStore {
  return {
    async enqueue(e, d, s, test) {
      return (
        await db.query<{ r: string }>(
          "select private.billing_enqueue($1,$2,$3,$4) r",
          [e, d, s, test],
        )
      ).rows[0].r;
    },
    async claim(e) {
      return (
        await db.query<{ r: BillingClaim | null }>(
          "select private.billing_claim($1) r",
          [e],
        )
      ).rows[0].r;
    },
    async complete(e, c, s: SubscriptionSnapshot) {
      await db.query("select private.billing_complete($1,$2,$3,$4::jsonb)", [
        e,
        c.lease,
        c.epoch,
        JSON.stringify(s),
      ]);
    },
    async retry(e, c, code) {
      await db.query("select private.billing_retry($1,$2,$3,$4)", [
        e,
        c.lease,
        c.epoch,
        code,
      ]);
    },
  };
}
