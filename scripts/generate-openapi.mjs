import { mkdirSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { functionFields } from "../src/domain/event-functions.ts";
import { guestMutation, rsvpRequest } from "../src/domain/guests.ts";
import { teamMutation } from "../src/domain/teams.ts";
import { financeMutation } from "../src/domain/vendor-finance.ts";
import { prepareDocument, documentAction } from "../src/domain/documents.ts";
import { format } from "prettier";
import {
  eventFields,
  budgetFields,
  taskFields,
  vendorFields,
  changeSchema,
  moneySchema,
} from "../src/domain/contracts.ts";
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const version = { type: "integer", minimum: 1 };
const pathParam = (name) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
});
const idem = {
  name: "Idempotency-Key",
  in: "header",
  required: true,
  schema: { type: "string", format: "uuid" },
};
const paths = {};
function add(path, method, summary, body, opts = {}) {
  const params = [...path.matchAll(/\{(\w+)\}/g)].map((m) => pathParam(m[1]));
  if (method !== "get") params.push(idem);
  paths[path] ??= {};
  paths[path][method] = {
    summary,
    operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
    security: [{ sessionCookie: [] }],
    parameters: params,
    ...(body
      ? {
          requestBody: {
            required: true,
            content: { "application/json": { schema: body } },
          },
        }
      : {}),
    responses: {
      [opts.created ? "201" : "200"]: {
        description: "Persisted or non-mutating result in data/meta envelope",
        content: { "application/json": { schema: ref("Success") } },
      },
      400: { description: "Invalid input" },
      401: { description: "Authentication required" },
      403: { description: "Origin or authorization denied" },
      404: { description: "Unavailable resource" },
      409: { description: "Stale version or idempotency conflict" },
      422: {
        description: "Domain constraint, protection or dependency violation",
      },
      429: { description: "Quota exceeded" },
      503: { description: "Provider/database/configuration unavailable" },
    },
  };
}
const object = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const fields = (name) =>
  object({ expectedVersion: version, fields: ref(name) });
const contractMap = {
  EventFields: eventFields,
  BudgetFields: budgetFields,
  TaskFields: taskFields,
  VendorFields: vendorFields,
};
function flat(name, metadata, partial = false) {
  const schema = z.toJSONSchema(contractMap[name], { io: "input" });
  delete schema.$schema;
  return {
    ...schema,
    properties: { ...metadata, ...schema.properties },
    required: [
      ...Object.keys(metadata),
      ...(partial ? [] : (schema.required ?? [])),
    ],
  };
}
add("/me", "get", "Current verified identity, workspaces and AI usage");
add(
  "/events/{eventId}/documents",
  "get",
  "Contact-authorized private document metadata (FEATURE_DOCUMENTS required)",
);
add(
  "/events/{eventId}/documents",
  "post",
  "Reserve an immutable private document path",
  z.toJSONSchema(prepareDocument, { io: "input" }),
);
add(
  "/events/{eventId}/documents/{documentId}",
  "get",
  "Private source text and review suggestions",
);
add(
  "/events/{eventId}/documents/{documentId}",
  "post",
  "Local text parsing, consent-gated suggestions and explicit quote review",
  z.toJSONSchema(documentAction, { io: "input" }),
);
add(
  "/events/{eventId}/documents/{documentId}/upload",
  "post",
  "Upload raw file bytes up to 2 MB; exact Content-Type and X-Event-Version required",
);
paths["/events/{eventId}/documents/{documentId}/upload"].post.requestBody = {
  required: true,
  content: Object.fromEntries(
    ["application/pdf", "image/png", "image/jpeg", "text/plain"].map((type) => [
      type,
      { schema: { type: "string", format: "binary" } },
    ]),
  ),
};
paths["/events/{eventId}/documents/{documentId}/upload"].post.parameters.push({
  name: "X-Event-Version",
  in: "header",
  required: true,
  schema: version,
});
add(
  "/events/{eventId}/documents/{documentId}/download",
  "get",
  "Private attachment download; no public or reusable capability URL",
);
paths[
  "/events/{eventId}/documents/{documentId}/download"
].get.responses[200].content = {
  "application/octet-stream": { schema: { type: "string", format: "binary" } },
};
add(
  "/events/{eventId}/finance",
  "get",
  "Distinct quotation, commitment, invoice and payment records (FEATURE_VENDOR_FINANCE required)",
);
add(
  "/events/{eventId}/finance",
  "post",
  "Versioned financial bookkeeping; no payment processing",
  z.toJSONSchema(financeMutation, { io: "input" }),
);
add(
  "/team",
  "get",
  "Role-scoped workspaces and restricted client summaries (FEATURE_TEAMS required)",
);
add(
  "/team",
  "post",
  "Owner membership, scoped assignments and authenticated invite consent",
  z.toJSONSchema(teamMutation, { io: "input" }),
);
add(
  "/events/{eventId}/guests",
  "get",
  "Private guest directory (FEATURE_GUESTS required)",
);
add(
  "/events/{eventId}/guests",
  "post",
  "Versioned household, guest, attendance and invitation commands",
  z.toJSONSchema(guestMutation, { io: "input" }),
);
add(
  "/api/rsvp",
  "post",
  "Read or reply to an expiring scoped invitation; Idempotency-Key required only for respond",
  z.toJSONSchema(rsvpRequest, { io: "input" }),
);
paths["/api/rsvp"].servers = [{ url: "/" }];
paths["/api/rsvp"].post.security = [];
paths["/api/rsvp"].post.parameters[0].required = false;
add(
  "/events/{eventId}/functions",
  "get",
  "P1 preview: list own functions (FEATURE_EVENT_FUNCTIONS required)",
);
add(
  "/events/{eventId}/functions",
  "post",
  "P1 preview: create a function with audit/version protection",
  fields("FunctionFields"),
);
add(
  "/events/{eventId}/functions/{functionId}",
  "patch",
  "P1 preview: edit a function",
  fields("FunctionFields"),
);
add(
  "/events/{eventId}/functions/{functionId}",
  "delete",
  "P1 preview: archive an unassigned function",
  object({ expectedVersion: version }),
);
add(
  "/events/{eventId}/functions/{functionId}/resources",
  "post",
  "P1 preview: assign or detach an owned resource without duplicating costs",
  object({
    expectedVersion: version,
    kind: { type: "string", enum: ["task", "budget", "vendor"] },
    resourceId: { type: "string", format: "uuid" },
    assigned: { type: "boolean" },
  }),
);
add(
  "/workspaces/personal",
  "post",
  "Idempotently provision personal owner workspace",
);
add("/events", "get", "List own events (limit 1–50 and opaque cursor)");
add(
  "/events",
  "post",
  "Create event and audit atomically",
  {
    oneOf: [
      object({
        workspaceId: { type: "string", format: "uuid" },
        fields: ref("EventFields"),
      }),
      flat("EventFields", { workspaceId: { type: "string", format: "uuid" } }),
    ],
  },
  { created: true },
);
add("/events/{eventId}", "get", "Read authorized event snapshot");
add(
  "/events/{eventId}",
  "patch",
  "Edit metadata (guest changes require replan)",
  {
    oneOf: [
      fields("EventFields"),
      flat("EventFields", { expectedVersion: version }, true),
    ],
  },
);
for (const [collection, schema] of [
  ["budget-items", "BudgetFields"],
  ["tasks", "TaskFields"],
  ["vendor-requirements", "VendorFields"],
]) {
  if (collection !== "budget-items")
    add(`/events/{eventId}/${collection}`, "get", `Read ${collection}`);
  add(
    `/events/{eventId}/${collection}`,
    "post",
    `Create ${collection} record`,
    { oneOf: [fields(schema), flat(schema, { expectedVersion: version })] },
  );
  add(
    `/events/{eventId}/${collection}/{itemId}`,
    "patch",
    `Edit ${collection}; locked rows allow only explicit unlock`,
    {
      oneOf: [
        fields(schema),
        flat(schema, { expectedVersion: version }, true),
        object({
          expectedVersion: version,
          fields: object({ isLocked: { const: false } }),
        }),
      ],
    },
  );
  add(
    `/events/{eventId}/${collection}/{itemId}`,
    "delete",
    `Remove ${collection} (budget items are archived)`,
    object({ expectedVersion: version }),
  );
}
add(
  "/events/{eventId}/budget",
  "get",
  "Exact projected/remaining decimal strings and active items",
);
add("/events/{eventId}/ai-drafts", "get", "List up to 20 saved drafts");
add(
  "/events/{eventId}/ai-drafts",
  "post",
  "Generate bounded live Gemini draft without mutating plan",
  object({
    expectedVersion: version,
    preferences: { type: "string", maxLength: 2000 },
    clientRequestId: { type: "string", format: "uuid" },
  }),
);
add(
  "/events/{eventId}/ai-drafts/{draftId}",
  "get",
  "Read saved candidate draft",
);
add(
  "/events/{eventId}/plan-acceptances",
  "post",
  "Atomically accept selected IDs and permitted title/price edits",
  object({
    expectedVersion: version,
    draftId: { type: "string", format: "uuid" },
    selectedDraftItemIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 49,
    },
    edits: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 140 },
          unitPriceMinor: ref("MoneyMinor"),
        },
        additionalProperties: false,
      },
    },
  }),
);
add(
  "/events/{eventId}/replan-proposals",
  "get",
  "List saved proposal previews",
);
add(
  "/events/{eventId}/replan-proposals",
  "post",
  "Compute authoritative diff, save preview only",
  object({ expectedVersion: version, change: ref("Change") }),
);
add("/events/{eventId}/replan-proposals/{proposalId}", "get", "Read proposal");
for (const action of ["approve", "reject"])
  add(
    `/events/{eventId}/replan-proposals/{proposalId}/${action}`,
    "post",
    action === "approve"
      ? "Atomically approve all required stored operations"
      : "Reject without mutating event",
    object({
      expectedVersion: version,
      selectedOperationIds: {
        type: "array",
        items: { type: "string" },
        maxItems: 13,
      },
    }),
  );
add(
  "/events/{eventId}/replan-proposals/{proposalId}/explain",
  "post",
  "Optional Gemini nonbinding explanation",
  object({ expectedVersion: version }),
);
add("/events/{eventId}/history", "get", "Paginated scrubbed audit history");
paths["/api/health/live"] = {
  servers: [{ url: "/" }],
  get: {
    summary: "Process liveness without dependency or secret disclosure",
    operationId: "get_health",
    security: [],
    responses: { 200: { description: "Process is serving requests" } },
  },
};
const schemas = Object.fromEntries(
  Object.entries({
    EventFields: eventFields,
    FunctionFields: functionFields,
    BudgetFields: budgetFields,
    TaskFields: taskFields,
    VendorFields: vendorFields,
    Change: changeSchema,
    MoneyMinor: moneySchema,
  }).map(([k, s]) => [k, z.toJSONSchema(s)]),
);
schemas.Success = object({
  data: {},
  meta: object({ requestId: { type: "string", format: "uuid" } }),
});
mkdirSync("docs/api", { recursive: true });
writeFileSync(
  "docs/api/openapi.yaml",
  JSON.stringify(
    {
      openapi: "3.1.0",
      info: {
        title: "UtsavOS P0 API",
        version: "0.1.0",
        description:
          "Money is a canonical decimal string in INR paise. Every state-changing request requires an exact allowed Origin. Routes are implemented with an allowlisted Next.js dispatcher. Refined Zod rules and SQL constraints are normative alongside this schema.",
      },
      servers: [{ url: "/api/v1" }],
      paths,
      components: {
        securitySchemes: {
          sessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "sb-<project-ref>-auth-token",
            description:
              "Supabase SSR session cookies; chunking managed by @supabase/ssr",
          },
        },
        schemas,
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Generated ${Object.keys(paths).length} API paths from implemented contracts.`,
);
const { readFileSync } = await import("node:fs");
writeFileSync(
  "docs/api/openapi.yaml",
  await format(readFileSync("docs/api/openapi.yaml", "utf8"), {
    parser: "yaml",
  }),
);
