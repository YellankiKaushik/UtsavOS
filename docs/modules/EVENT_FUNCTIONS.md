# FR-015 — Multi-function event preview

2026-10-27. IMPLEMENTED / TESTED LOCALLY. Hosted verification BLOCKED. Off by default through FEATURE_EVENT_FUNCTIONS=false. Not a P1 commercial-beta release or a billing entitlement. New user directive permits isolated development before the external P0 gates pass (ADR-024).

Each owned event can have up to50 active functions, such as ceremonies/receptions, with title, optional start/end, IANA time zone, status (planned/active/completed/cancelled) and notes. End requires a known start and cannot precede it. Unknown dates remain null. Parent date/guest count/budget stay unchanged. No capacity or supplier availability is inferred.

| Interface                                    | Contract                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| GET events/:eventId/functions                | {eventVersion,items}; owner read; private/no-store response                         |
| POST events/:eventId/functions               | {expectedVersion,fields}; create                                                    |
| PATCH events/:eventId/functions/:id          | {expectedVersion,fields}; full allowlisted edit                                     |
| DELETE events/:eventId/functions/:id         | {expectedVersion}; archive only with no active links                                |
| POST events/:eventId/functions/:id/resources | {expectedVersion,kind:task/budget/vendor,resourceId,assigned}; explicit link/detach |

Writes require exact Origin, UUID Idempotency-Key and an authenticated owner. All routes return404 when the flag is off. SQL remains owner-guarded independently; the rollout flag is not database authorization. Native tasks/expenses/vendors have nullable event_function_id with workspace/event consistency FKs. Links do not duplicate records or alter costs. One resource belongs to at most one function; explicit reassignment moves it. Locked expenses/vendors reject changes. Archived expense references remain for history.

Permission matrix: owner READ/CREATE/EDIT/LINK/ARCHIVE; anonymous and nonmember DENY. No planner/team delegation is implemented. No direct client table writes. Public functions are SECURITY INVOKER wrappers; private implementations have fixed search_path, literal action/table branches and explicit authorized event checks. Every mutation locks the same event row as P0, checks version, records safe audit metadata and a replay receipt atomically. Same-key changed intent conflicts. Invalid operations roll back all changes. A function edit makes existing P0 proposals stale.

Source: src/domain/event-functions.ts, src/components/event-functions.tsx, app/api/v1/[...segments]/route.ts, migration20261026183745. API catalogue/generated database types are reproduced from actual contracts/migrations. SQL tests: tests/integration/event-functions.test.ts. Native races: tests/concurrency/transactions.native.ts. API gate/schema test: tests/contract/api.test.ts. Browser: tests/e2e/functions.spec.ts; uses visible synthetic harness, not hosted data.

UI provides independent schedule editor, create/edit/archive, per-function resource checkboxes, pending-save state with rollback, explicit errors and reload. Five viewport widths, axe and keyboard focus are checked. Function changes use event version protection; on409 reload before retrying. Never announce an unconfirmed save as success.

Rollout: apply all four migrations to verified isolated staging; run platform/Auth/RLS checks; enable preview flag; complete real create/reload/re-login/link/race tests. Rollback UI by disabling flag. Preserve additive tables/history; do not drop referenced data or reverse financial state. Reverse assignments/edits through new versioned commands. Commercial entitlements/pricing, guest attendance, role delegation, notifications and function-specific financial allocation are outside this module and remain unimplemented.
