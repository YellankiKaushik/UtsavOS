import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { financeMutation } from "@/domain/vendor-finance";
import { DomainError } from "@/domain/errors";
import { key, readBody } from "./http";
import { databaseError } from "./repository";
export async function financeRoute(
  request: Request,
  db: SupabaseClient,
  eventId: string,
  requestId: string,
) {
  if (process.env.FEATURE_VENDOR_FINANCE !== "true")
    throw new DomainError("NOT_FOUND", "Module not enabled", 404);
  if (request.method === "GET") {
    const r = await db.rpc("vendor_finance", { p_event_id: eventId });
    if (r.error) databaseError(r.error);
    return r.data;
  }
  if (request.method !== "POST")
    throw new DomainError("NOT_FOUND", "Route not found", 404);
  const { action, expectedVersion, ...payload } = financeMutation.parse(
    await readBody(request),
  );
  const r = await db.rpc("vendor_finance_command", {
    p_event_id: eventId,
    p_action: action,
    p_payload: payload,
    p_expected_version: expectedVersion,
    p_idempotency_key: key(request),
    p_request_id: requestId,
  });
  if (r.error) databaseError(r.error);
  return r.data;
}
