import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { databaseError } from "./repository";
import { key, readBody } from "./http";
import { DomainError } from "@/domain/errors";
import { csvCell, lifecycleAction } from "@/domain/workspace-tools";
export async function eventDataRoute(
  request: Request,
  db: SupabaseClient,
  eventId: string,
  resource: string,
  requestId: string,
) {
  if (process.env.FEATURE_DATA_LIFECYCLE !== "true")
    throw new DomainError("NOT_FOUND", "Module not enabled", 404);
  if (resource === "export" && request.method === "GET") {
    const format = new URL(request.url).searchParams.get("format") ?? "json";
    if (!["json", "guests_csv"].includes(format))
      throw new DomainError("INVALID_INPUT", "Choose JSON or guest CSV", 400);
    const { data, error } = await db.rpc("event_export", {
      p_event_id: eventId,
    });
    if (error) databaseError(error);
    const content =
      format === "json"
        ? JSON.stringify(data, null, 2)
        : [
            [
              "Guest ID",
              "Household ID",
              "Display name",
              "Email",
              "Phone",
              "Notes",
            ]
              .map(csvCell)
              .join(","),
            ...data.guests.guests.map(
              (g: {
                id: string;
                householdId: string;
                displayName: string;
                email: string | null;
                phone: string | null;
                notes: string;
              }) =>
                [g.id, g.householdId, g.displayName, g.email, g.phone, g.notes]
                  .map(csvCell)
                  .join(","),
            ),
          ].join("\r\n");
    if (Buffer.byteLength(content) > 3_000_000)
      throw new DomainError(
        "EXPORT_LIMIT",
        "Export exceeds the 3 MB request limit. Download private originals individually and request an assisted export.",
        413,
      );
    return new Response(content, {
      headers: {
        "Content-Type":
          format === "json"
            ? "application/json; charset=utf-8"
            : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="utsavos-${eventId}.${format === "json" ? "json" : "csv"}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  }
  if (resource === "data-lifecycle") {
    if (request.method === "GET") {
      const r = await db.rpc("event_lifecycle_status", { p_event_id: eventId });
      if (r.error) databaseError(r.error);
      return r.data;
    }
    if (request.method === "POST") {
      const input = lifecycleAction.parse(await readBody(request));
      const idempotencyKey = key(request);
      if (input.action === "erase") {
        const status = await db.rpc("event_lifecycle_status", {
          p_event_id: eventId,
        });
        if (status.error) databaseError(status.error);
        if (status.data.state === "erased") {
          const replay = await db.rpc("event_lifecycle_command", {
            p_event_id: eventId,
            p_action: input.action,
            p_expected_version: input.expectedVersion,
            p_idempotency_key: idempotencyKey,
            p_request_id: requestId,
          });
          if (replay.error) databaseError(replay.error);
          return replay.data;
        }
        if (status.data.state !== "pending_cleanup")
          throw new DomainError(
            "RETENTION_REVIEW_REQUIRED",
            "This request requires retention review",
            422,
          );
        if (status.data.eventVersion !== input.expectedVersion)
          throw new DomainError(
            "VERSION_CONFLICT",
            "Reload the deletion request before continuing",
            409,
          );
        // Original deletion uses the owner's ordinary session and Storage RLS.
        const docs = await db
          .from("event_documents")
          .select("object_path")
          .eq("event_id", eventId);
        if (docs.error) databaseError(docs.error);
        for (let start = 0; start < (docs.data?.length ?? 0); start += 50) {
          const removed = await db.storage
            .from("utsavos-documents")
            .remove(
              docs.data!.slice(start, start + 50).map((d) => d.object_path),
            );
          if (removed.error)
            throw new DomainError(
              "CLEANUP_PENDING",
              "Original cleanup was not confirmed. Retry this deletion request.",
              503,
            );
        }
      }
      const r = await db.rpc("event_lifecycle_command", {
        p_event_id: eventId,
        p_action: input.action,
        p_expected_version: input.expectedVersion,
        p_idempotency_key: idempotencyKey,
        p_request_id: requestId,
      });
      if (r.error) databaseError(r.error);
      return r.data;
    }
  }
  throw new DomainError("NOT_FOUND", "Route not found", 404);
}
