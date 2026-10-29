import { createHash } from "node:crypto";
import { z } from "zod";
import { subscriptionSnapshot, type BillingStore } from "../domain/billing";
const delivery = z
  .object({
    eventId: z.string().min(1).max(200),
    subscriptionId: z.string().min(1).max(200),
    testMode: z.literal(true),
  })
  .strict();
// Inject the official provider SDK verifier AFTER account provisioning. It must
// verify signature/freshness on the exact bytes before returning this envelope.
// A JSON parser, bearer token or body hash is not a signature verifier.
export type BillingVerifier = (
  raw: Uint8Array,
  signature: string,
) => unknown | Promise<unknown>;
export async function ingestBillingDelivery(
  raw: Uint8Array,
  signature: string | null,
  verify: BillingVerifier,
  store: BillingStore,
) {
  if (!signature || raw.byteLength === 0 || raw.byteLength > 262144)
    throw new Error("BILLING_INVALID_DELIVERY");
  const envelope = delivery.parse(await verify(raw, signature));
  const digest = createHash("sha256").update(raw).digest("hex");
  return store.enqueue(envelope.eventId, digest, envelope.subscriptionId, true);
}
// Retrieve AFTER the durable subscription claim. Even an old webhook reconciles
// the current subscription; event delivery order cannot roll back access.
export async function reconcileBilling(
  eventId: string,
  store: BillingStore,
  retrieve: (subscriptionId: string) => Promise<unknown>,
) {
  const claim = await store.claim(eventId);
  if (!claim) return "deferred";
  let raw: unknown;
  try {
    raw = await retrieve(claim.subscriptionId);
  } catch {
    await store.retry(eventId, claim, "provider_unavailable");
    return "retry";
  }
  const parsed = subscriptionSnapshot.safeParse(raw);
  if (!parsed.success || parsed.data.subscriptionId !== claim.subscriptionId) {
    await store.retry(eventId, claim, "invalid_snapshot");
    return "retry";
  }
  try {
    await store.complete(eventId, claim, parsed.data);
  } catch {
    await store.retry(eventId, claim, "worker_failure");
    return "retry";
  }
  return "applied";
}
