# Architecture decisions

## ADR-025 — Private source review, fail-closed billing and verified operational erasure (2026-10-28)

Private originals use ordinary server-held user sessions for bounded proxy upload and attachment download, never public URLs or persistent browser JWTs. PDF parsing executes in a separate bounded Node process without application credentials. Source spans and canonical money are validated; the user explicitly reviews fields before saving one quotation. No automatic OCR, booking, commitment or payment is claimed. Storage INSERT authorization takes the workspace lock and re-reads lifecycle state, closing both orders of the upload/deletion race.

Private expiring administrative entitlements enforce active-event, AI attempt, seat and reserved storage quotas under existing locks. Default pilot limits are safety bounds, not prices. Marketplace Stripe provisioning requires owner terms acceptance; do not install an SDK or build a pretend checkout before provider provisioning. The webhook returns503 and cannot grant entitlements. FR-020 remains partial.

Owner event exports omit invitation capabilities and neutralize CSV formulas. Deletion freezes writes/revokes invitations; any financial commitment or recent in-flight AI forces retention review. Eligible operational erasure runs only after actual Storage object absence, deletes old snapshot receipts and source records, and retains opaque event/audit/usage identifiers. Account requests are durable self-scoped reviews, not false claims of Auth or backup erasure. Financial/backup/operator process and larger assisted export require commercial readiness work.

Exact tested Preview callback URLs are allowed; production URLs and email confirmation remain intact. Reported email_address_invalid for reserved synthetic addresses is not proof of an SMTP outage or successful email delivery. All P1 UI flags remain off by default and are enabled only for the separately verified review branch.

## ADR-024 — Verified staging isolation and granular capabilities (2026-10-28)

Use the positively identified isolated Supabase project and the existing repository-linked Vercel Preview. Preserve main and production. Verify each new migration locally, with real PostgreSQL concurrency where relevant, then dry-run before hosted apply. Preview AI remains disabled until genuine validated generation succeeds; service-role access is limited to synthetic account provisioning and never deployed for ordinary user operations.

FR-016 uses hashed expiring revocable invitation capabilities with frozen guest/function scopes. Anonymous responses share the event lock, revalidate after waiting, use receipts and never change planned guest count or money. Contacts and invitation hashes are excluded from anonymous responses and audit diffs.

FR-017 adds active database membership and event assignments. Managers operate workspace events; members require assignments and separate edit/approval/contact grants. Client viewers receive only assigned, restricted summaries. Mutating entry points lock the workspace before the event and recheck authorization after waiting, so a completed revocation prevents queued writes. Existing financial commands remain authoritative behind guarded wrappers, with old direct execution revoked and public SQL wrappers explicitly replaced for pooled-session correctness. Owner membership/billing administration cannot be delegated through user metadata or role invitations. Rejoining after revocation requires a fresh invitation and matching-email consent.

## ADR-023 — Diagnostic evidence and process environment precedence (2026-10-27)

Use read-only configured Gemini model metadata and OpenRouter key/model metadata before further generation. Retain only status, latency, whitelisted reason/category and capability booleans/model IDs. Never persist raw errors, messages, headers, URL query keys or account labels. Distinguish HTTP401 authentication from403 authorization, unavailable model from no compatible route, and nested DNS/TLS/network failures. TLS/authorization/routing errors cannot trigger automatic fallback; JSON/schema/semantic rejection stages remain distinct diagnostics and cannot reroute. Live verification is still required; catalogue metadata cannot prove generated output.

The former live test setup overwrote process environment with values loaded from files. Replace it with `scripts/live-env.ts`, which resolves staging file precedence while preserving explicit shell/secret-manager overrides. This made the fixed-model diagnostics possible without rewriting the user's ignored environment or weakening privacy. Provider smokes remain one attempt/no fallback; each fixed free-model test used a45-second total deadline. No paid model/purchase or privacy relaxation was attempted.

## ADR-024 — Isolated P1 function module before P0 staging acceptance (2026-10-27)

Original V2 says P1 follows P0 acceptance. The user's latest explicit directive authorizes independent P1/P2 modules when P0 remains externally blocked. Implement FR-015 only as a separately documented preview, keeping FEATURE_EVENT_FUNCTIONS=false by default and all production/staging release gates unchanged. This supersedes gating only for independent development; it does not certify P0/P1 as release complete.

Each function has an independent optional start/end/time zone and status. Add nullable event_function_id to tasks, expenses and vendor requirements with workspace/event/function composite FKs. One resource has at most one function. Reassignment changes only the link, never quantities, costs, deadlines or vendor facts. Locked expenses/vendors cannot be assigned/detached without their existing standalone unlock. A function with active linked resources cannot be archived. An archived expense may keep a reference to an archived function for historical integrity.

Use a separate allowlisted RPC sharing the P0 event row lock/version, SHA256 receipt intent and transaction-coupled audit. Function changes invalidate prior P0 proposals through the shared version. No team roles, delegated users, supplier bookings, billing entitlements or notifications are inferred. Owner access only. Rollout flag lives in the HTTP/UI layer; database authorization always independently checks auth.uid and owner. Hidden UI is not an authorization boundary. Parent event financial totals remain authoritative and are not split or double-counted by function.

The module has no commercial pricing promise: preview availability does not sell an agency tier. Pricing/entitlements require the later FR-020 contract and business approval. P1 basic event-day coordination appears in Appendix F while advanced operations appears under P2; neither is claimed implemented by this function schedule module.

Current amendments ADR-018–022 below supersede earlier statements about provider deadlines, missing credentials and unavailable native concurrency. Historical decisions remain for context; current verification is in TEST_REPORT.md.

## ADR-011 — V2 execution baseline (2026-10-26)

Context: V2 is marked draft, but the user explicitly authorizes its implementation. Decision: implement its P0 contracts; preserve the source document unchanged. Adopt ADR-001–010 as implementation direction, with verification still required. P1/P2 remain gated. Owner: engineering session; human review pending.

## ADR-012 — Money and local database verification (2026-10-26)

Use decimal strings at every HTTP boundary, bigint in domain and PostgreSQL, cap individual and aggregate nonnegative amounts at 9,000,000,000,000 paise. Signed deltas/remainders may be negative. INR only. No floating point financial arithmetic.

Docker is absent. Use PGlite PostgreSQL to execute migrations, grants/RLS, transactions and negative tests against synthetic users. This does not verify Supabase Auth, PostgREST or hosted platform behavior; those remain release gates. No replacement runtime database or fake login is introduced.

## ADR-013 — Hosting compatibility (2026-10-26)

The Sites skill was inspected. Its default Vinext/Cloudflare stack conflicts with the explicit Next.js/Supabase/Vercel implementation contract. User requirements take precedence; build a native Next.js application in the existing workspace. Do not create an unrelated hosted Site or change runtime/database stack. Deployment follows verified P0 gates.

## ADR-014 — Server-owned auth and guarded dispatcher (2026-10-26)

Context: V2 specifies Supabase SSR and reviewed RPC entry points. Decision: all Auth requests run on the server; browser code never instantiates a Supabase data/auth client. Session cookies are HttpOnly, SameSite=Lax, Secure in production. Proxy refreshes verified sessions, protected layout and APIs verify `getUser`. Identity/authorization never comes from editable user metadata. Display name alone uses profile metadata. Consequence: verify signup PKCE, email verification, recovery, expired/revoked sessions and refresh on real Supabase before release.

The API catalogue is implemented by one Next.js catch-all dispatcher with strict, allowlisted schemas. Database mutation uses one exposed SECURITY INVOKER `event_command` wrapper over a private SECURITY DEFINER implementation with an action allowlist. It authorizes auth.uid(), checks owner membership and row relationships, locks the event, validates versions, then writes state/audit/receipt in one transaction. No arbitrary table name, SQL fragment or caller-supplied actor is executed. Direct table writes and internal helper EXECUTE are revoked. Trade-off: shared transaction boilerplate is centralized; each action still needs independent safety tests. The private schema stays unexposed.

Canonical flat create/update fields from V2 are supported, alongside strict `{fields, expectedVersion}` UI envelopes. Flat PATCH fields merge with an authorized snapshot before validation; SQL still enforces the expected version. API money strings remain canonical. Generic metadata updates cannot change guest count; use a proposal.

## ADR-015 — Replan grammar and protection semantics (2026-10-26)

P0 implements two deterministic operations: set event guest count and set catering-item unit price. Multiple changes are computed together; every stored operation is mandatory. Gemini may explain but cannot supply operations. No task deadline or vendor selection changes automatically. All open tasks are conservatively flagged for review because the P0 schema has no reliable semantic dependency tags. Task DAG relationships remain explicit.

Locked unit prices stay fixed. A locked per-guest line's derived total can change with the approved guest count; this is explained in preview. A locked record can only be unlocked by a separate explicit user mutation. A budget ceiling violation blocks approval by default; the user may explicitly preview a new proposal allowing an overrun. No constraint is silently dropped. Reversal is a fresh proposal using prior values from history, checked against the current version; history is immutable.

## ADR-016 — Quotas, validity and provenance (2026-10-26)

Database-enforced AI quota: 20 attempts/workspace/UTC day, with a 5-second burst interval; workspace row lock serializes reservations. Failed attempts count. The cap is a migration-owned constant rather than a caller-editable argument; change it through a reviewed migration. Removed the unused proposed environment override. Each actual model request is bounded to at most 25 seconds total, one retry for 429/503, SDK automatic retries disabled, 8192 output tokens and 64KB returned text. Missing credentials never return a synthetic draft. Usage records retain provider token metadata without prompts. Costs are not estimated without verified pricing.

Drafts expire in 24 hours; proposals in 30 minutes. Receipt `expires_at` is 24 hours but receipts are retained and replayable until an operator-approved purge policy is implemented; no deletion job or legal retention promise is claimed. A partially accepted draft is closed to further acceptance; regenerate for remaining items after the version changes, preventing duplicate insertion. Title and budget-unit-price edits before acceptance are allowlisted; dependencies/IDs cannot be replaced with arbitrary records.

Vendor checklist estimated cost and deadline were added as nullable fields to satisfy the explicit user directive. A checklist estimate does not create or duplicate a budget line. The UI tells users to add an expense if it should contribute to projected totals. No availability, booking, payment or verified market-price claim is made.

## ADR-017 — Verification without authentication bypass (2026-10-26)

The test-only Vite harness mounts the same planner components with a visible synthetic-data notice and Playwright-controlled HTTP responses. It is outside `app/` and absent from the Next.js production routes. The production auth guard is never bypassed. UI fixture tests, embedded PostgreSQL tests, controlled API/AI tests, and live-provider release gates are reported separately. Actual Supabase/Auth/PostgREST, parallel connections and real model reliability remain release blockers until executed.

Default onboarding provisions the one-owner personal workspace; profession preference has no authorization effect in P0. No team roles, billing UI or professional capabilities are implied.

Official compatibility references consulted: [Next installation](https://nextjs.org/docs/app/getting-started/installation), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase changelog](https://supabase.com/changelog), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Gemini model catalogue](https://ai.google.dev/gemini-api/docs/models). The markdown changelog fetch was unsupported by the web tool; the official HTML changelog was inspected instead. These sources support API contracts, not claims of live integration. Revisit pins/model and provider security behavior on upgrade.

Canonical idempotency hashes use SHA-256 over normalized command action, event ID, payload and expected version; receipt uniqueness also scopes workspace and actor. This is the semantic equivalent of the V2 method/path/body convention for the fixed dispatcher: alternate flat/nested HTTP encodings map to the same guarded command, while changed financial intent conflicts. Ambiguous DST wall times use the date-fns-tz convention; nonexistent wall times are rejected by round-trip validation.

The local synthetic seed identity has no password or Auth identity provider and cannot sign in. Its event is visible only when using its synthetic auth context in SQL tests. No application session is bypassed or implicitly logged in to this fixture.

## ADR-018 — Server configuration aliases and bounded I/O (2026-10-26)

The supplied environment uses SUPABASE_URL/PUBLISHABLE_KEY and GEMINI_MODEL_DEFAULT rather than the initial canonical names. Support these as server-only aliases; reject conflicting nonempty values and privileged keys in publishable settings. Keep the actual environment ignored. Remove only duplicate AI mode/retry declarations, preserving the effective final values. VITE_AUTH_PROVIDER has no effect. Public browser code receives no privileged configuration. `config.ts`, Supabase server/proxy and environment diagnostics implement this decision.

Supabase fetch has a ten-second deadline, merged with caller cancellation. UI requests have a 55-second deadline and retain uncertain mutation keys for replay. AI uses one shared configurable 1–45 second deadline (20-second default), provider timeout clamped to it, and 0–2 explicit retries (maximum three total attempts). SDK retries are disabled. An approved fallback reserves half the remaining primary time; otherwise a healthy primary receives the full remaining deadline. This supersedes ADR-016's original 25-second/one-retry limits. The API route duration is 60 seconds; target hosting support still requires verification.

## ADR-019 — Provider-neutral generation, explicit fallback and provenance (2026-10-26)

The user explicitly adds OpenRouter to P0. Keep direct Gemini, add the OpenAI SDK against the fixed official OpenRouter endpoint, and share prompt/schema/domain validation. The compatibility Gemini wrapper preserves existing callers and tests. No client-selected endpoint/model and no model tools or database actions exist. Only temporary/rate/timeout failures may retry or switch once to an explicitly configured other provider. Invalid credentials, capability/model errors, credits, refusals and invalid outputs fail closed. A semantic failure never triggers another provider.

Check OpenRouter's current model catalogue for structured_outputs. The documented openrouter/free router may not be a concrete catalogue record; allow it only when free structured-output candidates exist, require parameters and disable provider fallback. Actual returned model remains mandatory provenance when available. Send data_collection=deny; failure due to available privacy-compatible routes is an explicit service limitation. The app discloses primary/fallback destinations and OpenRouter routing in settings/planning. Minimize event context, never send contacts or user IDs, and treat preferences as untrusted data. Free router selection is not a claim of verified model identity or latency.

Migration 20261026165848 adds nullable safe provenance fields to drafts/usage, preserving legacy rows. Public event_command remains invoker; the renamed private command_core is revoked from authenticated direct execution and called by the authorized private wrapper. Explicitly recreate the public function to invalidate previously used pooled SQL entry points. Store actual/requested model, routing/request IDs, latency, attempts, fallback and reported cost, without prompts. Provider cost is metadata, never authoritative INR budget arithmetic. Rejected returned content retains safe observed usage where available, never response text. Limit workspace generation concurrency with a 60-second lease under the existing workspace lock, in addition to 20/day and five-second burst controls. Crashed requests recover after lease expiry. Slow completion persistence can outlive a provider deadline; no durable job guarantee is claimed.

## ADR-020 — Independent native PostgreSQL verification (2026-10-26)

Docker remains absent. Add development-only embedded-postgres binaries and pg to start a disposable PostgreSQL 17.10 listener on loopback with random port/password and SCRAM. Independent TCP sessions exercise actual blocking/races, receipt replay, conflicts, locks, rollback, cross-tenant denial, AI reservations and migration upgrades. Synthetic auth.uid roles remain explicitly test-only. No system service or OS user is created. This supersedes the earlier native-concurrency blocker, but does not replace actual Supabase Auth, signed JWT, PostgREST, pgTAP or hosted verification. Native server files remain ignored under .runtime; the app still uses Supabase.

## ADR-021 — Staging identity, evaluation budget and artifact isolation (2026-10-26)

Configured secrets are not authority to mutate an unidentified cloud project. Management access to the configured project was denied; unrelated LoadGuard 3D is not used. Require explicit isolated-stage designation and two confirmed synthetic account credentials before live mutation suites. Browser/corpus preflight additionally requires a matching successful provider smoke; corpus requires a separately allowed 24-request budget. It uses one provider, zero retries/fallback. Preflight failure executes zero tests, never counts as passed. A read-only public production-browser check can run independently.

Default fixture browser tests blank Supabase/provider credentials and own ports 3002/3100. Read-only configured checks use 3004; authenticated staging browser tests use 3005 and never reuse an unknown existing server. Separate output directories prevent concurrent Playwright invocations deleting each other's traces. Native/fixture results are evidence only for their actual layers. No release classification can skip the failed live gates.

## ADR-022 — Final-state bounds for combined financial proposals (2026-10-26)

The baseline SQL preview capped a guest-adjusted subtotal before applying simultaneous catering price reductions, which could reject a valid final proposal. Keep applied baseline migration immutable and replace only the private core in forward migration 20261026180040. Compute the temporary subtotal with exact PostgreSQL numeric, apply all bounded price changes, then enforce the 9e12 final cap. Authoritative stored amounts remain bigint; HTTP/domain money stays exact strings/bigint. Preserve every authorization/version/audit/lock/receipt check and revoke direct core execution. Regression: 1 guest × 9e12 paise becomes 2 guests × 1 paise; preview and atomic approval yield exactly 2 paise without mutating before approval. Existing over-budget/overflow/conflict tests continue to pass.

Provider references: [OpenRouter structured output](https://openrouter.ai/docs/guides/features/structured-outputs), [model catalogue API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties), [free router](https://openrouter.ai/openrouter/free), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output). These establish adapter contracts; live success remains unverified.

## ADR-023 — Verified provider-neutral hackathon planning (2026-10-29)

The latest owner directive requires at least one genuine approved LLM rather than Gemini exclusively. Preserve both direct adapters and the authoritative architecture; select the verified OpenRouter fixed free route dots-studio/dots-3-note-preview:free with no fallback/retry or paid use. Prompt event-plan.v2 explicitly states existing identifier/dependency/quantity/paise rules; validation is not weakened. Store prompt provenance in additive migration20261029104615. Actual hosted wedding/birthday/community selective acceptance passed. Gemini401 remains separately documented. This correction supersedes historical statements that live AI is wholly blocked.

## ADR-024 — Disabled billing reconciliation and recovery evidence (2026-10-29)

Implement the independently executable billing core before owner account provisioning: worker-only private receipts/bindings, current-snapshot retrieval after a leased claim, durable deduplication, bounded retries, stale-worker epochs and expiring test-mode entitlements. No live route, price or customer binding is activated. Official SDK signature verification and real Stripe events require the owner account; injected test verifiers are not provider acceptance. Add an isolated synthetic physical database restore drill, clearly distinguished from managed Supabase/Storage/Auth recovery. See modules/BILLING.md and OPERATIONS_RUNBOOK.md.

## ADR-025 — Quotation evidence anchors and schema consistency (2026-10-29)

A genuine quotation probe failed strict source validation. Add bounded Unicode code-point anchors from exact source lines/label tails so the model can copy evidence, and encode missing-value/null-source/zero-confidence combinations directly in the schema. The observed second failure was a missing value paired with source evidence; do not infer that offsets caused every failure. Validation and explicit financial review stay intact. The changed quotation.v2 probe passed exact source/money validation with462 input/268 output tokens,13027ms and reported cost0. This is component evidence, not complete hosted extraction acceptance; keep FEATURE_DOCUMENT_EXTRACTION disabled until the full authorized source-review workflow passes.

## ADR-026 — Persist safe failure diagnostics (2026-10-29)

A repeated hosted birthday generation returned503 with no model/tokens and15547ms latency. The earlier database provenance wrapper retained only routing/cost,discarding failure categories and semantic diagnostics. Add migration20261029120336 to persist only fixed category/status/stage/rule/finish-reason values. Unknown metadata,raw prompts/errors/headers remain excluded. Integration tests exercise valid and malicious metadata through actual command RPCs. This improves future diagnosis;the original upstream cause remains unknown and is not retroactively attributed.
