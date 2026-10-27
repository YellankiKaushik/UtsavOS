import "server-only";
import { randomBytes, createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { teamMutation } from "@/domain/teams";
import { DomainError } from "@/domain/errors";
import { key, readBody } from "./http";
import { databaseError } from "./repository";
export async function teamRoute(
  request: Request,
  db: SupabaseClient,
  requestId: string,
) {
  if (process.env.FEATURE_TEAMS !== "true")
    throw new DomainError("NOT_FOUND", "Module not enabled", 404);
  if (request.method === "GET") {
    const { data, error } = await db.rpc("team_overview");
    if (error) databaseError(error);
    return data;
  }
  if (request.method !== "POST")
    throw new DomainError("NOT_FOUND", "Route not found", 404);
  const input = teamMutation.parse(await readBody(request));
  const { action, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest };
  const workspaceId = payload.workspaceId ?? null,
    expectedVersion = payload.expectedVersion ?? null;
  delete payload.workspaceId;
  delete payload.expectedVersion;
  const token =
    action === "invite" ? randomBytes(32).toString("hex") : undefined;
  if (token)
    payload.tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await db.rpc("team_command", {
    p_workspace_id: workspaceId,
    p_action: action,
    p_payload: payload,
    p_expected_version: expectedVersion,
    p_idempotency_key: key(request),
    p_request_id: requestId,
  });
  if (error) databaseError(error);
  if (token && data?.replayed)
    throw new DomainError(
      "INVITE_ALREADY_CREATED",
      "Invitation codes are shown once. Revoke and reissue if the code was lost.",
      409,
    );
  return { ...data, ...(token ? { token } : {}) };
}
