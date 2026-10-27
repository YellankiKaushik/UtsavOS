import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { guestMutation } from "@/domain/guests";
import { DomainError } from "@/domain/errors";
import { key, readBody } from "./http";
import { databaseError } from "./repository";

export async function guestRoute(
  request: Request,
  db: SupabaseClient,
  eventId: string,
  requestId: string,
) {
  if (process.env.FEATURE_GUESTS !== "true")
    throw new DomainError("NOT_FOUND", "Module not enabled", 404);
  if (request.method === "GET") {
    const { data, error } = await db.rpc("guest_directory", {
      p_event_id: eventId,
    });
    if (error) databaseError(error);
    return data;
  }
  if (request.method !== "POST")
    throw new DomainError("NOT_FOUND", "Route not found", 404);
  const input = guestMutation.parse(await readBody(request));
  const { action, expectedVersion, ...payload } = input;
  const token =
    action === "invite" ? randomBytes(32).toString("hex") : undefined;
  const { data, error } = await db.rpc("guest_command", {
    p_event_id: eventId,
    p_action: action,
    p_payload: {
      ...payload,
      ...(token
        ? { tokenHash: createHash("sha256").update(token).digest("hex") }
        : {}),
    },
    p_expected_version: expectedVersion,
    p_idempotency_key: key(request),
    p_request_id: requestId,
  });
  if (error) databaseError(error);
  if (token && data?.replayed)
    throw new DomainError(
      "INVITE_ALREADY_CREATED",
      "Invitation codes are shown once. Revoke and issue a new invitation if the code was lost.",
      409,
    );
  return { ...data, ...(token ? { token } : {}) };
}
