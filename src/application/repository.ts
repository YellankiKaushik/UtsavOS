import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventSnapshot, Proposal } from "@/domain/contracts";
import { DomainError } from "@/domain/errors";
export function databaseError(error: {
  message: string;
  code?: string;
}): never {
  const known = [
    "NOT_FOUND",
    "UNAUTHENTICATED",
    "ACCESS_DENIED",
    "VERSION_CONFLICT",
    "IDEMPOTENCY_CONFLICT",
    "PROTECTED_RESOURCE",
    "DEPENDENCY_CYCLE",
    "PROPOSAL_EXPIRED",
    "INVALID_OPERATIONS",
    "INVALID_SELECTION",
    "MISSING_PREREQUISITE",
    "BUDGET_OVERFLOW",
    "UNRESOLVED_CONSTRAINT",
    "RATE_LIMITED",
    "NO_CHANGE",
    "REPLAN_REQUIRED",
    "INVALID_INPUT",
    "INVALID_MONEY",
    "UNSUPPORTED_OPERATION",
    "ITEM_LIMIT",
    "TASK_LIMIT",
    "INVALID_TIME_ZONE",
    "AI_INVALID_OUTPUT",
    "AI_BUSY",
    "FUNCTION_IN_USE",
    "RESOURCE_UNAVAILABLE",
    "HOUSEHOLD_IN_USE",
    "INVITE_ALREADY_USED",
    "QUOTE_EXPIRED",
    "FINANCIAL_RECORD_IN_USE",
    "COMMITMENT_EXCEEDED",
    "DUPLICATE_REFERENCE",
    "OVERPAYMENT",
  ];
  const code =
    known.find((c) => error.message === c) ||
    (/^(22|23)/.test(error.code ?? "") ? "INVALID_INPUT" : "DB_UNAVAILABLE");
  const status =
    code === "NOT_FOUND"
      ? 404
      : code === "UNAUTHENTICATED"
        ? 401
        : ["VERSION_CONFLICT", "IDEMPOTENCY_CONFLICT"].includes(code)
          ? 409
          : ["RATE_LIMITED", "AI_BUSY"].includes(code)
            ? 429
            : code === "DB_UNAVAILABLE"
              ? 503
              : 422;
  throw new DomainError(
    code,
    code === "DB_UNAVAILABLE"
      ? "The database is unavailable. No save was confirmed."
      : code.replaceAll("_", " ").toLowerCase(),
    status,
  );
}
export async function snapshot(
  db: SupabaseClient,
  id: string,
): Promise<EventSnapshot> {
  const { data, error } = await db.rpc("event_snapshot", { p_event_id: id });
  if (error) databaseError(error);
  return data as EventSnapshot;
}
export async function command(
  db: SupabaseClient,
  opts: {
    eventId?: string;
    workspaceId?: string;
    action: string;
    payload: unknown;
    expectedVersion?: number;
    key: string;
    requestId: string;
  },
): Promise<{
  id: string;
  eventId: string;
  version: number;
  snapshot: EventSnapshot;
  proposal?: Proposal;
}> {
  const { data, error } = await db.rpc("event_command", {
    p_event_id: opts.eventId ?? null,
    p_workspace_id: opts.workspaceId ?? null,
    p_action: opts.action,
    p_payload: opts.payload,
    p_expected_version: opts.expectedVersion ?? null,
    p_idempotency_key: opts.key,
    p_request_id: opts.requestId,
  });
  if (error) databaseError(error);
  return data;
}
