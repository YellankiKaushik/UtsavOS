import { z } from "zod";
export const subscriptionStatus = z.enum([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);
export const subscriptionSnapshot = z
  .object({
    customerId: z.string().min(1).max(200),
    subscriptionId: z.string().min(1).max(200),
    priceId: z.string().min(1).max(200),
    status: subscriptionStatus,
    periodEnd: z.iso.datetime({ offset: true }),
    testMode: z.literal(true),
  })
  .strict();
export type SubscriptionSnapshot = z.infer<typeof subscriptionSnapshot>;
export type BillingClaim = {
  lease: string;
  epoch: string;
  subscriptionId: string;
};
export interface BillingStore {
  enqueue(
    eventId: string,
    digest: string,
    subscriptionId: string,
    testMode: true,
  ): Promise<string>;
  claim(eventId: string): Promise<BillingClaim | null>;
  complete(
    eventId: string,
    claim: BillingClaim,
    snapshot: SubscriptionSnapshot,
  ): Promise<void>;
  retry(
    eventId: string,
    claim: BillingClaim,
    code: "provider_unavailable" | "invalid_snapshot" | "worker_failure",
  ): Promise<void>;
}
export function subscriptionAccess(
  status: z.infer<typeof subscriptionStatus>,
  periodEnd: string,
  now: number,
) {
  return (
    (status === "active" || status === "trialing") &&
    Number.isFinite(Date.parse(periodEnd)) &&
    Date.parse(periodEnd) > now
  );
}
