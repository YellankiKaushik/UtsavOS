import { z } from "zod";
import { session } from "@/infrastructure/supabase/server";
import { command, databaseError, snapshot } from "@/application/repository";
import { checkOrigin, handle, key, readBody } from "@/application/http";
import {
  budgetFields,
  changeSchema,
  eventFields,
  taskFields,
  vendorFields,
  uuid,
  moneySchema,
} from "@/domain/contracts";
import { calculateBudget } from "@/domain/money";
import { previewReplan } from "@/domain/replan";
import { DomainError } from "@/domain/errors";
import {
  generatePlan,
  explainImpact,
  generationMetadata,
  failureMetadata,
  failureUsage,
} from "@/infrastructure/ai/service";
import { aiConfig } from "@/infrastructure/config";
import { functionMutation, functionLink } from "@/domain/event-functions";
import type { Json } from "@/generated/database.types";
import { guestRoute } from "@/application/guest-http";
import { teamRoute } from "@/application/team-http";
import { financeRoute } from "@/application/finance-http";
import { documentRoute } from "@/application/document-http";
import { eventDataRoute } from "@/application/workspace-tools-http";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ segments: string[] }> };
const version = z.number().int().min(1);
const versioned = (fields: z.ZodType) =>
  z.object({ expectedVersion: version, fields }).strict();
async function route(request: Request, ctx: Context) {
  return handle(
    async (requestId) => {
      const s = (await ctx.params).segments,
        method = request.method;
      if (method !== "GET") checkOrigin(request);
      const { db, user } = await session();
      const path = s.join("/");
      if (path === "me" && method === "GET") {
        const providerSettings = aiConfig();
        const { data: workspaces, error } = await db
          .from("workspaces")
          .select("id,name,kind");
        if (error) databaseError(error);
        const { data: usage, error: usageError } = await db
          .from("ai_usage_records")
          .select("id,operation,status,input_tokens,output_tokens,created_at")
          .order("created_at", { ascending: false })
          .limit(20);
        if (usageError) databaseError(usageError);
        let workspaceItems = workspaces ?? [];
        if (process.env.FEATURE_TEAMS === "true") {
          const memberships = await db
            .from("workspace_members")
            .select("workspace_id,role,state")
            .eq("user_id", user.id)
            .eq("state", "active");
          if (memberships.error) databaseError(memberships.error);
          workspaceItems = workspaceItems.map((w) => ({
            ...w,
            canCreate: memberships.data.some(
              (m) =>
                m.workspace_id === w.id &&
                ["owner", "planner_manager"].includes(m.role),
            ),
          }));
        }
        return {
          user: {
            id: user.id,
            email: user.email,
            displayName:
              typeof user.user_metadata?.display_name === "string"
                ? user.user_metadata.display_name
                : null,
          },
          workspaces: workspaceItems,
          usage,
          aiConfigured:
            providerSettings.enabled &&
            !!(
              providerSettings.keys[providerSettings.primary] &&
              providerSettings.models[providerSettings.primary]
            ),
          aiProviderPrimary: providerSettings.primary,
          aiProviderFallback: providerSettings.fallback,
          features: {
            workspaceDashboard:
              process.env.FEATURE_WORKSPACE_DASHBOARD === "true",
            dataLifecycle: process.env.FEATURE_DATA_LIFECYCLE === "true",
            documents: process.env.FEATURE_DOCUMENTS === "true",
            vendorFinance: process.env.FEATURE_VENDOR_FINANCE === "true",
            teams: process.env.FEATURE_TEAMS === "true",
            guests: process.env.FEATURE_GUESTS === "true",
            eventFunctions: process.env.FEATURE_EVENT_FUNCTIONS === "true",
          },
        };
      }
      if (path === "team") return teamRoute(request, db, requestId);
      if (path === "account/data-request" && ["GET", "POST"].includes(method)) {
        if (process.env.FEATURE_DATA_LIFECYCLE !== "true")
          throw new DomainError("NOT_FOUND", "Module not enabled", 404);
        let action = "status";
        if (method === "POST") {
          const input = z
            .object({
              action: z.enum(["request", "cancel"]),
              confirmed: z.literal(true),
            })
            .strict()
            .parse(await readBody(request));
          key(request);
          action = input.action;
        }
        const result = await db.rpc("account_data_request", {
          p_action: action,
        });
        if (result.error) databaseError(result.error);
        return result.data;
      }
      if (
        s[0] === "workspaces" &&
        s[2] === "dashboard" &&
        s.length === 3 &&
        method === "GET"
      ) {
        if (process.env.FEATURE_WORKSPACE_DASHBOARD !== "true")
          throw new DomainError("NOT_FOUND", "Module not enabled", 404);
        const result = await db.rpc("workspace_dashboard", {
          p_workspace_id: uuid.parse(s[1]),
        });
        if (result.error) databaseError(result.error);
        return result.data;
      }
      if (path === "workspaces/personal" && method === "POST") {
        key(request);
        const { data, error } = await db.rpc("create_personal_workspace");
        if (error) databaseError(error);
        return { id: data };
      }
      if (s[0] !== "events")
        throw new DomainError("NOT_FOUND", "Route not found", 404);
      if (s.length === 1) {
        if (method === "GET") {
          const url = new URL(request.url),
            limit = z.coerce
              .number()
              .int()
              .min(1)
              .max(50)
              .parse(url.searchParams.get("limit") ?? 20);
          let query = db
            .from("events")
            .select("*")
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(limit + 1);
          if (url.searchParams.has("workspaceId"))
            query = query.eq(
              "workspace_id",
              uuid.parse(url.searchParams.get("workspaceId")),
            );
          if (url.searchParams.has("cursor")) {
            let raw: unknown;
            try {
              raw = JSON.parse(
                Buffer.from(
                  url.searchParams.get("cursor")!,
                  "base64url",
                ).toString(),
              );
            } catch {
              throw new DomainError("INVALID_INPUT", "Invalid cursor", 400);
            }
            const cursor = z
              .object({ date: z.iso.datetime({ offset: true }), id: uuid })
              .strict()
              .parse(raw);
            query = query.or(
              `created_at.lt.${cursor.date},and(created_at.eq.${cursor.date},id.lt.${cursor.id})`,
            );
          }
          const { data, error } = await query;
          if (error) databaseError(error);
          const rows = data ?? [],
            more = rows.length > limit,
            items = rows.slice(0, limit).map((e) => ({
              id: e.id,
              workspaceId: e.workspace_id,
              title: e.title,
              type: e.type,
              dateStatus: e.date_status,
              startsAt: e.starts_at,
              timeZone: e.time_zone,
              guestCount: e.guest_count,
              budgetMinor: String(e.budget_minor),
              currency: e.currency,
              version: e.version,
              status: e.status,
              preferences: e.preferences,
              createdAt: e.created_at,
            }));
          const last = items.at(-1);
          return {
            items,
            nextCursor:
              more && last
                ? Buffer.from(
                    JSON.stringify({ date: last.createdAt, id: last.id }),
                  ).toString("base64url")
                : null,
          };
        }
        if (method === "POST") {
          const input = z
            .union([
              z.object({ workspaceId: uuid, fields: eventFields }).strict(),
              eventFields
                .safeExtend({ workspaceId: uuid })
                .transform(({ workspaceId, ...fields }) => ({
                  workspaceId,
                  fields,
                })),
            ])
            .parse(await readBody(request));
          return command(db, {
            workspaceId: input.workspaceId,
            action: "create",
            payload: input.fields,
            key: key(request),
            requestId,
          });
        }
      }
      const eventId = uuid.parse(s[1]);
      if (s.length === 2 && method === "GET") {
        const state = await snapshot(db, eventId);
        if (process.env.FEATURE_TEAMS !== "true") return state;
        const permissions = await db.rpc("event_permissions", {
          p_event_id: eventId,
        });
        if (permissions.error) databaseError(permissions.error);
        return { ...state, permissions: permissions.data };
      }
      if (s.length === 2 && method === "PATCH") {
        const body = await readBody(request);
        const raw = z.record(z.string(), z.unknown()).parse(body);
        let input: { expectedVersion: number; fields: unknown };
        if ("fields" in raw) input = versioned(eventFields).parse(raw);
        else {
          const { expectedVersion, ...patch } = raw;
          const current = await snapshot(db, eventId);
          const {
            id,
            workspaceId,
            version: currentVersion,
            createdAt,
            ...currentFields
          } = current.event;
          void id;
          void workspaceId;
          void currentVersion;
          void createdAt;
          input = {
            expectedVersion: version.parse(expectedVersion),
            fields: eventFields.parse({ ...currentFields, ...patch }),
          };
        }
        return command(db, {
          eventId,
          action: "update",
          payload: input.fields,
          expectedVersion: input.expectedVersion,
          key: key(request),
          requestId,
        });
      }
      const resourceName = s[2],
        recordId = s[3];
      const state = await snapshot(db, eventId); // RLS/auth check before every child path.
      if (["export", "data-lifecycle"].includes(resourceName) && s.length === 3)
        return eventDataRoute(request, db, eventId, resourceName, requestId);
      if (resourceName === "documents")
        return documentRoute(request, db, eventId, s.slice(3), requestId);
      if (resourceName === "finance" && s.length === 3)
        return financeRoute(request, db, eventId, requestId);
      if (resourceName === "guests" && s.length === 3) {
        return guestRoute(request, db, eventId, requestId);
      }
      if (resourceName === "functions") {
        if (process.env.FEATURE_EVENT_FUNCTIONS !== "true")
          throw new DomainError("NOT_FOUND", "Module not enabled", 404);
        if (method === "GET" && s.length === 3) {
          const { data, error } = await db.rpc("event_functions_snapshot", {
            p_event_id: eventId,
          });
          if (error) databaseError(error);
          return data;
        }
        let action: string, payload: Json, expectedVersion: number;
        if (method === "POST" && s.length === 5 && s[4] === "resources") {
          const input = functionLink.parse(await readBody(request));
          const { expectedVersion: v, ...link } = input;
          expectedVersion = v;
          action = "link";
          payload = { id: uuid.parse(recordId), ...link };
        } else if (
          (method === "POST" && s.length === 3) ||
          (method === "PATCH" && s.length === 4)
        ) {
          const input = functionMutation.parse(await readBody(request));
          expectedVersion = input.expectedVersion;
          action = "put";
          payload = {
            id: recordId ? uuid.parse(recordId) : null,
            fields: input.fields,
          };
        } else if (method === "DELETE" && s.length === 4) {
          const input = z
            .object({ expectedVersion: version })
            .strict()
            .parse(await readBody(request));
          expectedVersion = input.expectedVersion;
          action = "archive";
          payload = { id: uuid.parse(recordId) };
        } else throw new DomainError("NOT_FOUND", "Route not found", 404);
        const { data, error } = await db.rpc("event_function_command", {
          p_event_id: eventId,
          p_action: action,
          p_payload: payload,
          p_expected_version: expectedVersion,
          p_idempotency_key: key(request),
          p_request_id: requestId,
        });
        if (error) databaseError(error);
        return data;
      }
      if (method === "GET") {
        if (resourceName === "budget")
          return {
            ...calculateBudget(
              state.budgetItems,
              state.event.guestCount,
              state.event.budgetMinor,
            ),
            items: state.budgetItems,
          };
        if (resourceName === "tasks") return state.tasks;
        if (resourceName === "vendor-requirements") return state.vendors;
        if (resourceName === "history") {
          const url = new URL(request.url),
            limit = z.coerce
              .number()
              .int()
              .min(1)
              .max(50)
              .parse(url.searchParams.get("limit") ?? 20);
          let query = db
            .from("audit_events")
            .select(
              "id,action,actor_id,resource_id,safe_diff,request_id,occurred_at",
            )
            .eq("event_id", eventId)
            .order("occurred_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(limit + 1);
          if (url.searchParams.has("cursor")) {
            let raw: unknown;
            try {
              raw = JSON.parse(
                Buffer.from(
                  url.searchParams.get("cursor")!,
                  "base64url",
                ).toString(),
              );
            } catch {
              throw new DomainError("INVALID_INPUT", "Invalid cursor", 400);
            }
            const c = z
              .object({ date: z.iso.datetime({ offset: true }), id: uuid })
              .parse(raw);
            query = query.or(
              `occurred_at.lt.${c.date},and(occurred_at.eq.${c.date},id.lt.${c.id})`,
            );
          }
          const { data, error } = await query;
          if (error) databaseError(error);
          const items = (data ?? []).slice(0, limit),
            last = items.at(-1);
          return {
            items,
            nextCursor:
              data && data.length > limit && last
                ? Buffer.from(
                    JSON.stringify({ date: last.occurred_at, id: last.id }),
                  ).toString("base64url")
                : null,
          };
        }
        if (
          resourceName === "ai-drafts" ||
          resourceName === "replan-proposals"
        ) {
          let query = db
            .from(
              resourceName === "ai-drafts" ? "ai_drafts" : "replan_proposals",
            )
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false })
            .limit(20);
          if (recordId) query = query.eq("id", uuid.parse(recordId));
          const { data, error } = await query;
          if (error) databaseError(error);
          if (recordId && !data?.length)
            throw new DomainError("NOT_FOUND", "Record not found", 404);
          return recordId ? data![0] : data;
        }
      }
      if (
        ["budget-items", "tasks", "vendor-requirements"].includes(resourceName)
      ) {
        const kind =
          resourceName === "budget-items"
            ? "budget"
            : resourceName === "tasks"
              ? "task"
              : "vendor";
        if (recordId) uuid.parse(recordId);
        if (
          (method === "POST" && !recordId) ||
          (method === "PATCH" && recordId)
        ) {
          let body = await readBody(request);
          const raw = z.record(z.string(), z.unknown()).parse(body);
          if (!("fields" in raw)) {
            const { expectedVersion, ...patch } = raw;
            const existing = recordId
              ? (kind === "budget"
                  ? state.budgetItems
                  : kind === "task"
                    ? state.tasks
                    : state.vendors
                ).find((item) => item.id === recordId)
              : null;
            if (recordId && !existing)
              throw new DomainError("NOT_FOUND", "Record not found", 404);
            const previous = existing
              ? Object.fromEntries(
                  Object.entries(existing).filter(
                    ([k]) => !["id", "state"].includes(k),
                  ),
                )
              : {};
            body = {
              expectedVersion,
              fields:
                Object.keys(patch).length === 1 && patch.isLocked === false
                  ? patch
                  : { ...previous, ...patch },
            };
          }
          const fields =
            kind === "budget"
              ? budgetFields
              : kind === "task"
                ? taskFields
                : vendorFields;
          const input = z
            .object({
              expectedVersion: version,
              fields: z.union([
                z.object({ isLocked: z.literal(false) }).strict(),
                fields,
              ]),
            })
            .strict()
            .parse(body);
          return command(db, {
            eventId,
            action: `put_${kind}`,
            payload: { id: recordId ?? null, fields: input.fields },
            expectedVersion: input.expectedVersion,
            key: key(request),
            requestId,
          });
        }
        if (method === "DELETE" && recordId) {
          const input = z
            .object({ expectedVersion: version })
            .strict()
            .parse(await readBody(request));
          return command(db, {
            eventId,
            action: `delete_${kind}`,
            payload: { id: recordId, fields: {} },
            expectedVersion: input.expectedVersion,
            key: key(request),
            requestId,
          });
        }
      }
      if (resourceName === "ai-drafts" && method === "POST" && !recordId) {
        const input = z
          .object({
            expectedVersion: version,
            preferences: z.string().max(2000),
            clientRequestId: uuid,
          })
          .strict()
          .parse(await readBody(request));
        if (state.event.version !== input.expectedVersion)
          throw new DomainError(
            "VERSION_CONFLICT",
            "Refresh before generating",
            409,
          );
        const idem = key(request);
        const reservation = await command(db, {
          eventId,
          action: "reserve_ai",
          payload: {
            modelId: aiConfig().models[aiConfig().primary] ?? "unconfigured",
            provenance: {
              provider: aiConfig().primary,
              requestedModel: aiConfig().models[aiConfig().primary],
            },
            operation: "plan",
          },
          expectedVersion: input.expectedVersion,
          key: idem,
          requestId,
        });
        if ("replayed" in reservation)
          throw new DomainError(
            "VERSION_CONFLICT",
            "This generation request was already processed. Review saved drafts or retry with a new request.",
            409,
          );
        try {
          const generated = await generatePlan(state.event, input.preferences, {
            signal: request.signal,
          });
          await command(db, {
            eventId,
            action: "complete_ai",
            payload: {
              usageId: reservation.id,
              status: "success",
              inputTokens: generated.inputTokens,
              outputTokens: generated.outputTokens,
              provenance: generationMetadata(generated),
            },
            expectedVersion: input.expectedVersion,
            key: crypto.randomUUID(),
            requestId,
          });
          return command(db, {
            eventId,
            action: "save_draft",
            payload: {
              modelId: generated.model,
              payload: generated.payload,
              provenance: generationMetadata(generated),
            },
            expectedVersion: input.expectedVersion,
            key: input.clientRequestId,
            requestId,
          });
        } catch (e) {
          await command(db, {
            eventId,
            action: "complete_ai",
            payload: {
              usageId: reservation.id,
              status: "failed",
              ...failureUsage(e),
              provenance: failureMetadata(e),
            },
            expectedVersion: input.expectedVersion,
            key: crypto.randomUUID(),
            requestId,
          }).catch(() => undefined);
          throw e;
        }
      }
      if (resourceName === "plan-acceptances" && method === "POST") {
        const input = z
          .object({
            expectedVersion: version,
            draftId: uuid,
            selectedDraftItemIds: z.array(z.string().max(50)).min(1).max(49),
            edits: z
              .record(
                z.string().regex(/^[btv]-[a-zA-Z0-9_-]{1,40}$/),
                z
                  .object({
                    title: z.string().trim().min(1).max(140).optional(),
                    unitPriceMinor: moneySchema.optional(),
                  })
                  .strict(),
              )
              .default({}),
          })
          .strict()
          .parse(await readBody(request));
        return command(db, {
          eventId,
          action: "accept",
          payload: {
            draftId: input.draftId,
            selectedDraftItemIds: input.selectedDraftItemIds,
            edits: input.edits,
          },
          expectedVersion: input.expectedVersion,
          key: key(request),
          requestId,
        });
      }
      if (resourceName === "replan-proposals" && method === "POST") {
        if (process.env.FEATURE_AI_REPLAN === "false")
          throw new DomainError(
            "FEATURE_DISABLED",
            "Replanning is temporarily unavailable",
            503,
          );
        if (!recordId) {
          const input = z
            .object({ expectedVersion: version, change: changeSchema })
            .strict()
            .parse(await readBody(request));
          previewReplan(state, input.change);
          return command(db, {
            eventId,
            action: "preview",
            payload: input.change,
            expectedVersion: input.expectedVersion,
            key: key(request),
            requestId,
          });
        }
        uuid.parse(recordId);
        if (s[4] === "approve" || s[4] === "reject") {
          const input = z
            .object({
              expectedVersion: version,
              selectedOperationIds: z
                .array(z.string().max(100))
                .max(13)
                .optional(),
            })
            .strict()
            .parse(await readBody(request));
          return command(db, {
            eventId,
            action: s[4],
            payload: {
              proposalId: recordId,
              selectedOperationIds: input.selectedOperationIds ?? [],
            },
            expectedVersion: input.expectedVersion,
            key: key(request),
            requestId,
          });
        }
        if (s[4] === "explain") {
          const input = z
            .object({ expectedVersion: version })
            .strict()
            .parse(await readBody(request));
          const { data: proposal, error } = await db
            .from("replan_proposals")
            .select("calculated_effects,base_version")
            .eq("event_id", eventId)
            .eq("id", recordId)
            .single();
          if (error) databaseError(error);
          if (proposal.base_version !== state.event.version)
            throw new DomainError(
              "VERSION_CONFLICT",
              "Recompute this proposal first",
              409,
            );
          const usage = await command(db, {
            eventId,
            action: "reserve_ai",
            payload: {
              modelId: aiConfig().models[aiConfig().primary] ?? "unconfigured",
              provenance: {
                provider: aiConfig().primary,
                requestedModel: aiConfig().models[aiConfig().primary],
              },
              operation: "explain",
            },
            expectedVersion: input.expectedVersion,
            key: key(request),
            requestId,
          });
          if ("replayed" in usage)
            throw new DomainError(
              "VERSION_CONFLICT",
              "Explanation request already processed",
              409,
            );
          try {
            const response = await explainImpact(proposal.calculated_effects, {
              signal: request.signal,
            });
            await command(db, {
              eventId,
              action: "complete_ai",
              payload: {
                usageId: usage.id,
                status: "success",
                inputTokens: response.inputTokens,
                outputTokens: response.outputTokens,
                provenance: generationMetadata(response),
              },
              expectedVersion: input.expectedVersion,
              key: crypto.randomUUID(),
              requestId,
            });
            return {
              ...response.payload,
              provenance: generationMetadata(response),
            };
          } catch (e) {
            await command(db, {
              eventId,
              action: "complete_ai",
              payload: {
                usageId: usage.id,
                status: "failed",
                ...failureUsage(e),
                provenance: failureMetadata(e),
              },
              expectedVersion: input.expectedVersion,
              key: crypto.randomUUID(),
              requestId,
            }).catch(() => undefined);
            throw e;
          }
        }
      }
      throw new DomainError("NOT_FOUND", "Route not found", 404);
    },
    request.method === "POST" &&
      new URL(request.url).pathname === "/api/v1/events"
      ? 201
      : 200,
  );
}
export const GET = route;
export const POST = route;
export const PATCH = route;
export const DELETE = route;
