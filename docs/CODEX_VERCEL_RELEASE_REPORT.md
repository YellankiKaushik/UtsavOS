# UtsavOS — verified release handoff

2026-10-28 (Asia/Calcutta). **P0 LOCALLY VERIFIED — LIVE RELEASE BLOCKED.**

This report records executed evidence and remaining dependencies. It does not claim full product or production completion. Code snapshot: `314700302aee83debe80a9d574dab074435afccf`. A documentation-only commit follows; use the draft PR head for the documentation revision.

## A. Executive status

**implementation**: Independent P1 engineering completed through private document/manual review, database quotas/dashboard and eligible event lifecycle; full commercial task remains blocked by external dependencies

**p0LiveReadiness**: BLOCKED: genuine AI draft and email journeys unverified

**p1**: FR015–018 implemented; FR019 manual slice implemented, AI extraction disabled; FR020 partial billing blocker; FR021 event lifecycle implemented, account/backups pending operator review

**p2**: Not attempted: P0 full live acceptance is not satisfied; no marketplace/WhatsApp/booking/payment execution claimed

**improvements**: `["Tenant-scoped guests and frozen RSVP capabilities","Database roles, delegation and revocation after locks","Exact immutable financial records and corrections","Private documents, bounded isolated PDF parser and source provenance","Authoritative quotas/dashboard","Owner export, hold/revoke, verified original cleanup and eligible operational erasure","Secure Preview origins, disabled AI availability, anonymous audit actor fix and Node24"]`

## B. GitHub state

**repository**: https://github.com/YellankiKaushik/UtsavOS

**branch**: codex/live-release-completion

**startingCommit**: 0798627de160425a9a5925a1291bfe37fce825be

**finalImplementationCommit**: 314700302aee83debe80a9d574dab074435afccf

**finalCommitScope**: Verified code snapshot at report generation; subsequent documentation-only commit is identified by the branch/PR head, avoiding an impossible self-referential commit hash

**commitsPushed**: `["314700302aee83debe80a9d574dab074435afccf fix: serialize private uploads with deletion lifecycle","b55e212c11da81d441b2e23f08b25ef97175faca feat: enforce workspace limits and add reviewed data lifecycle","c5f6835a5b1d3a5e4082db42f1d3633a67092b21 feat: add private document upload and reviewed quotation provenance","9f1d40dea6daa99df4750f2daa0ade44c08ba9fa feat: track vendor commitments invoices and external payment records","ab2d27f153cb770c42b16285ee5bd5801f275f46 fix: render anonymous RSVP actors in audit history","a807f40498d9d833e655b6583564b42edbe49cbc fix: satisfy hosted-team test lint in CI","036eb43038c644f031d5a02f4884d8bf7711329c feat: add consent-based teams and event-scoped capabilities","947185e4688b8d9572a96ab39b4780291f016863 fix: honor disabled AI in UI and verify isolated hosted planning","0b54d31fef23244fb29cc28f1ef25438257573ce feat: add private households and scoped revocable RSVPs","d82b0909ef414e995cd35bb5dc75b9d4f3f709f7 fix: secure preview origins and preserve provider failure evidence"]`

**mainUnchanged**: `true`

**ci**: `{"sha":"314700302aee83debe80a9d574dab074435afccf","runs":[{"id":40660004425,"name":"UtsavOS verification","status":"completed","conclusion":"success","event":"pull_request","headSha":"314700302aee83debe80a9d574dab074435afccf","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40660004425","runAttempt":1},{"id":40659197920,"name":"UtsavOS verification","status":"completed","conclusion":"success","event":"push","headSha":"314700302aee83debe80a9d574dab074435afccf","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40659197920","runAttempt":1}],"checks":[{"id":122720387865,"name":"Vercel Preview Comments","status":"completed","conclusion":"success","url":"https://vercel.com/github"},{"id":122720370678,"name":"supabase-platform","status":"completed","conclusion":"success","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40660004425/job/122720370678"},{"id":122720370362,"name":"validate","status":"completed","conclusion":"success","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40660004425/job/122720370362"},{"id":122717653559,"name":"supabase-platform","status":"completed","conclusion":"success","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40659197920/job/122717653559"},{"id":122717653232,"name":"validate","status":"completed","conclusion":"success","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40659197920/job/122717653232"}]}`

**pullRequest**: `{"url":"https://github.com/YellankiKaushik/UtsavOS/pull/1","number":1,"draft":true,"head":"314700302aee83debe80a9d574dab074435afccf","branch":"codex/live-release-completion","base":"main","state":"open","created":true}`

**uncommittedChangesAtGeneration**: M docs/DECISIONS.md
M docs/DEPLOYMENT.md
M docs/EXTERNAL_ACTION_REGISTER.md
M docs/IMPLEMENTATION_STATUS.md
M docs/TEST_REPORT.md
?? "ChatGPT Image Oct 26, 2026, 06_25_05 PM.png"
?? docs/CODEX_VERCEL_RELEASE_REPORT.json
?? docs/CODEX_VERCEL_RELEASE_REPORT.md

**historyPreserved**: No force push, reset, rewrite or main merge. Original master/archive and publication worktree retained. Owner PNG preserved/untracked/excluded.

## C. Environment audit

No secret values, fragments, hashes or authorization headers are included. Valid syntax does not prove authorization.

| Local variable                         | Present | Format         | Source         |
| -------------------------------------- | ------- | -------------- | -------------- |
| `SUPABASE_URL`                         | true    | valid          | .env           |
| `NEXT_PUBLIC_SUPABASE_URL`             | false   | not-configured | not configured |
| `SUPABASE_PUBLISHABLE_KEY`             | true    | valid          | .env           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | false   | not-configured | not configured |
| `SUPABASE_SERVICE_ROLE_KEY`            | true    | valid          | .env           |
| `SUPABASE_SECRET_KEY`                  | false   | not-configured | not configured |
| `APP_BASE_URL`                         | true    | valid          | .env           |
| `AI_PROVIDER_MODE`                     | true    | valid          | .env           |
| `AI_PROVIDER_PRIMARY`                  | false   | not-configured | not configured |
| `AI_PROVIDER_FALLBACK`                 | false   | not-configured | not configured |
| `AI_REQUEST_TIMEOUT_MS`                | true    | valid          | .env           |
| `AI_PROVIDER_TIMEOUT_MS`               | true    | valid          | .env           |
| `AI_PROVIDER_MAX_RETRIES`              | true    | valid          | .env           |
| `GEMINI_API_KEY`                       | true    | valid          | .env           |
| `GEMINI_MODEL_ID`                      | false   | not-configured | not configured |
| `GEMINI_MODEL_DEFAULT`                 | true    | valid          | .env           |
| `OPENROUTER_API_KEY`                   | true    | valid          | .env           |
| `OPENROUTER_MODEL_ID`                  | false   | not-configured | not configured |
| `OPENROUTER_MODEL_DEFAULT`             | true    | valid          | .env           |
| `VITE_AUTH_PROVIDER`                   | true    | valid          | .env           |

No conflicting local aliases were found. Configured identity was subsequently verified; the initial environment audit safety marker is historical. `.env.live.local` holds ignored synthetic credentials and process overrides win.

| Vercel variable               | Targets             | Branch                        | Type      |
| ----------------------------- | ------------------- | ----------------------------- | --------- |
| `FEATURE_DATA_LIFECYCLE`      | preview             | codex/live-release-completion | encrypted |
| `FEATURE_WORKSPACE_DASHBOARD` | preview             | codex/live-release-completion | encrypted |
| `FEATURE_DOCUMENTS`           | preview             | codex/live-release-completion | encrypted |
| `FEATURE_VENDOR_FINANCE`      | preview             | codex/live-release-completion | encrypted |
| `FEATURE_TEAMS`               | preview             | codex/live-release-completion | encrypted |
| `FEATURE_GUESTS`              | preview             | codex/live-release-completion | encrypted |
| `FEATURE_EVENT_FUNCTIONS`     | preview             | codex/live-release-completion | encrypted |
| `FEATURE_AI_REPLAN`           | preview             | all applicable                | plain     |
| `FEATURE_AI_GENERATION`       | preview             | all applicable                | plain     |
| `APP_BASE_URL`                | production          | all applicable                | sensitive |
| `SUPABASE_URL`                | production, preview | all applicable                | sensitive |
| `SUPABASE_PUBLISHABLE_KEY`    | production, preview | all applicable                | sensitive |
| `GEMINI_MODEL_DEFAULT`        | production, preview | all applicable                | sensitive |
| `GEMINI_API_KEY`              | production, preview | all applicable                | sensitive |
| `OPENROUTER_API_KEY`          | production, preview | all applicable                | sensitive |

Exact trusted VERCEL_URL; APP_BASE_URL currently production-only; no Host/forwarded trust. Local only; used once for synthetic account creation/administrative confirmation, not ordinary tests or Vercel. No hashes/fragments/values included.

## D. Supabase

**project**: `{"ref":"upbwahlegwcwiladfwwd","name":"usthav os","organization":"izsxmpprrxxqxjffwrar","region":"ap-south-1","postgres":"17.11","status":"ACTIVE_HEALTHY","purpose":"dedicated isolated UtsavOS staging"}`

**access**: MCP target access unavailable; authenticated CLI confirmed correct project. Unrelated LoadGuard3D untouched.

**migrations**: `["20261026142503_p0_core.sql","20261026165848_ai_provider_provenance.sql","20261026180040_combined_change_financial_bounds.sql","20261026183745_p1_event_functions.sql","20261027192558_p1_guest_rsvp.sql","20261027195746_p1_team_collaboration.sql","20261027201649_p1_vendor_finance.sql","20261027203506_p1_private_documents.sql","20261028015656_p1_document_quote_provenance.sql","20261028022000_p1_entitlements_dashboard.sql","20261028023000_p1_event_data_lifecycle.sql","20261028090000_storage_upload_lifecycle_serialization.sql"]`

**migrationProcedure**: Dry run and additive apply only, no remote reset/seed/vault/role push

**schema**: 23 public tables all RLS;0 direct authenticated writes;0 anonymous table reads; private schema unexposed; only scoped RSVP RPCs anonymous executable

**authentication**: Real ordinary A/B password login, refresh and logout pass. Synthetic users admin-confirmed, email delivery not verified.

**persistenceAndIsolation**: Real workspaces/events, approvals, guests, teams, finance, originals and lifecycle tests pass; cross tenant requests denied

**concurrency**: `{"native":"PostgreSQL 17.10 on x86_64-windows, compiled by msvc-19.44.35226, 64-bit","scenarios":[{"scenario":"Storage insertion and deletion hold serialization in both orders","passed":true},{"scenario":"parallel event entitlement enforcement","passed":true},{"scenario":"deletion hold rejects a queued writer","passed":true},{"scenario":"pooled RPC upgrade resolves provenance wrapper","passed":true},{"scenario":"independent tenants","passed":true},{"scenario":"same-event optimistic race","passed":true},{"scenario":"duplicate concurrent approval","passed":true},{"scenario":"different-key concurrent approval","passed":true},{"scenario":"stale approval behind row lock","passed":true},{"scenario":"real transactional rollback","passed":true},{"scenario":"budget edit race and protected price","passed":true},{"scenario":"duplicate draft acceptance race","passed":true},{"scenario":"cross-tenant denial during owner edit","passed":true},{"scenario":"concurrent generation reservation cap","passed":true},{"scenario":"P1/P0 shared version race","passed":true},{"scenario":"P1 duplicate function creation replay","passed":true},{"scenario":"anonymous RSVP duplicate replay","passed":true},{"scenario":"RSVP waits for host archive then revalidates","passed":true},{"scenario":"workspace revocation wins against a waiting member command","passed":true},{"scenario":"parallel financial payment bounds","passed":true},{"scenario":"duplicate financial record replay","passed":true}],"hostedConcurrency":"Native tests are not hosted platform concurrency; hosted ordinary-session atomic/idempotent behavior tested separately"}`

**authSettings**: Email confirmation preserved true; production site URL preserved; exact tested Preview callback/recovery allowlist managed separately; no broad wildcard

**remaining**: Controlled-inbox signup/recovery; operator account/backup deletion and restore process; no unrelated project modification

## E. Gemini

**requestedModel**: gemini-3.8-flash

**actualModel**: `null`

**metadataStatus**: `401`

**metadataLatencyMs**: `522`

**smokeStatus**: AI_AUTHENTICATION_FAILED

**smokeLatencyMs**: `203`

**validatedDrafts**: `0`

**schemaValidation**: No model output available to validate

**usage**: `null`

**corpus**: Blocked; no approved24-request budget/successful smoke; no further identical retries

## F. OpenRouter

**authorization**: Key200 and catalogue200; metadata access alone is not completion success

**route**: xingchen-agi/xing4.0-29b-a4b:free

**eligibleEndpoint**: Phala metadata structured output and zero prompt/completion pricing

**actualModel**: `null`

**structuredResult**: FAILED AI_INVALID_OUTPUT twice; latest response unknown finishReason; no returned usage/cost

**latencyMs**: `[10722,10705]`

**privacy**: `{"data_collection":"deny","allow_fallbacks":false,"require_parameters":true}`

**generationLookup**: 404; provider-side cause not established

**paidRequests**: `0`

**applicationFallback**: Filtered smokes set noFallback:true; no provider retry after unchanged failure. Historical latest-smoke fallbackOccurred:true is an earlier instrumentation artifact; current explicit-primary handling and fixture assert false. Do not reinterpret artifact as successful routing.

**evaluations**: No genuine validated generation or corpus pass

## G. Vercel

**id**: prj_PqBVW2XZqRNqmkhNVgoBOMEysCbm

**name**: utsavos

**team**: team_UYEpjjRaObtrYF55SYu5rqUl

**repository**: YellankiKaushik/UtsavOS

**productionBranch**: main

**framework**: nextjs

**nodeVersion**: 24.x; CI pinned24.16.0

**rootDirectory**: `null`

**buildCommand**: `null`

**installCommand**: `null`

**outputDirectory**: `null`

**configuration**: vercel.json explicit npm ci, npm run build, nextjs; Next output default; dashboard command/output overrides null; root project

**variables**: `[{"name":"FEATURE_DATA_LIFECYCLE","type":"encrypted","target":["preview"],"branch":"codex/live-release-completion"},{"name":"FEATURE_WORKSPACE_DASHBOARD","type":"encrypted","target":["preview"],"branch":"codex/live-release-completion"},{"name":"FEATURE_DOCUMENTS","type":"encrypted","target":["preview"],"branch":"codex/live-release-completion"},{"name":"FEATURE_VENDOR_FINANCE","type":"encrypted","target":["preview"],"branch":"codex/live-release-completion"},{"name":"FEATURE_TEAMS","type":"encrypted","target":["preview"],"branch":"codex/live-release-completion"},{"name":"FEATURE_GUESTS","type":"encrypted","target":["preview"],"branch":"codex/live-release-completion"},{"name":"FEATURE_EVENT_FUNCTIONS","type":"encrypted","target":["preview"],"branch":"codex/live-release-completion"},{"name":"FEATURE_AI_REPLAN","type":"plain","target":["preview"],"branch":null},{"name":"FEATURE_AI_GENERATION","type":"plain","target":["preview"],"branch":null},{"name":"APP_BASE_URL","type":"sensitive","target":["production"],"branch":null},{"name":"SUPABASE_URL","type":"sensitive","target":["production","preview"],"branch":null},{"name":"SUPABASE_PUBLISHABLE_KEY","type":"sensitive","target":["production","preview"],"branch":null},{"name":"GEMINI_MODEL_DEFAULT","type":"sensitive","target":["production","preview"],"branch":null},{"name":"GEMINI_API_KEY","type":"sensitive","target":["production","preview"],"branch":null},{"name":"OPENROUTER_API_KEY","type":"sensitive","target":["production","preview"],"branch":null}]`

**deployment**: `{"id":"dpl_96sUVUXP5R1Fz8WMkszwYA3ZXUyw","url":"utsavos-l4fm7nwpy-kaushik-yellanki-project.vercel.app","readyState":"READY","target":null,"projectId":"prj_PqBVW2XZqRNqmkhNVgoBOMEysCbm","alias":["utsavos-git-codex-live-release-a4180c-kaushik-yellanki-project.vercel.app"],"gitRef":"codex/live-release-completion","sha":"314700302aee83debe80a9d574dab074435afccf","nodeVersion":"24.x"}`

**production**: Existing owner deployment was observed, not created/promoted/verified by this run; main unchanged

**protection**: Remains enabled; exact-origin short-lived Vercel OIDC header used for tests without exposing JWT or changing project protection

**health**: Verified200 on hosted journey; final browser report identifies exact code deployment

**authCallback**: Exact redirect allowlist verified separately; ordinary password cookies pass; actual email callback/recovery delivery remains unverified

**runtime**: Document PDF child process executes successfully on Vercel; previous anonymous actor crash fixed; no known unresolved crash in tested manual paths

**rollback**: Retain current production; do not merge/promote until gates pass. Revert branch code or promote an explicitly reviewed prior Preview; database changes additive and shared, require forward fix, not reset

## H. Application functionality

| Requirement                       | State                                                                                                          | Implementation and verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-001 Auth                       | IMPLEMENTED; hosted password login/refresh/logout passed; signup confirmation and recovery delivery unverified | app/auth/actions/route.ts; app/auth/callback/route.ts; proxy.ts; src/infrastructure/supabase/server.ts — Hosted secure HttpOnly SameSite=Lax cookies. Two synthetic users were administratively confirmed, which is not email evidence.                                                                                                                                                                                                                                                                 |
| FR-002 Workspace                  | HOSTED ORDINARY SESSION VERIFIED                                                                               | app/onboarding/page.tsx; supabase/migrations/20261026142503_p0_core.sql — Idempotent personal workspace provisioning and tenant isolation.                                                                                                                                                                                                                                                                                                                                                              |
| FR-003 Event setup                | HOSTED MANUAL VERIFIED                                                                                         | src/components/planner.tsx; src/domain/contracts.ts; app/api/v1/[...segments]/route.ts — All three event types covered locally; real community/wedding journeys persist.                                                                                                                                                                                                                                                                                                                                |
| FR-004 Event CRUD                 | HOSTED MANUAL VERIFIED                                                                                         | src/components/planner.tsx; src/application/repository.ts — List/detail/edit/refresh and stale version protection.                                                                                                                                                                                                                                                                                                                                                                                      |
| FR-005 Genuine AI drafts          | LIVE BLOCKED                                                                                                   | src/infrastructure/ai/service.ts; gemini-provider.ts; openrouter-provider.ts; src/domain/ai-contract.ts — Gemini authentication failure and OpenRouter invalid output; no real validated saved draft.                                                                                                                                                                                                                                                                                                   |
| FR-006 Draft review/acceptance    | LOCALLY/NATIVE VERIFIED; GENUINE AI JOURNEY BLOCKED                                                            | src/components/planning.tsx; core SQL command — Fixture review/edit/selection and atomic acceptance races pass; not a real generated-draft acceptance claim.                                                                                                                                                                                                                                                                                                                                            |
| FR-007 Exact budgets              | HOSTED MANUAL VERIFIED                                                                                         | src/domain/money.ts; src/components/resources.tsx; core SQL — Canonical decimal strings in INR paise, exact totals and protected bounds.                                                                                                                                                                                                                                                                                                                                                                |
| FR-008 Vendor checklist           | HOSTED MANUAL VERIFIED                                                                                         | src/components/resources.tsx; src/domain/contracts.ts — Owner-entered requirements/status/source; no genuine vendor booking.                                                                                                                                                                                                                                                                                                                                                                            |
| FR-009 Tasks/timeline             | HOSTED MANUAL VERIFIED; dependency rules LOCAL/NATIVE VERIFIED                                                 | src/domain/tasks.ts; src/domain/dates.ts; src/components/resources.tsx — Persistence, status and cycle/timezone invariants.                                                                                                                                                                                                                                                                                                                                                                             |
| FR-010 Replan preview             | HOSTED VERIFIED                                                                                                | src/domain/replan.ts; src/components/planning.tsx; core SQL — 150 to 180 guests preview leaves version unchanged.                                                                                                                                                                                                                                                                                                                                                                                       |
| FR-011 Atomic replan approval     | HOSTED/NATIVE VERIFIED                                                                                         | src/domain/replan.ts; core SQL; src/components/planning.tsx — One version increment, persistence, conflict/lock/duplicate approval races.                                                                                                                                                                                                                                                                                                                                                               |
| FR-012 History                    | HOSTED VERIFIED                                                                                                | src/components/planner.tsx; public.audit_events — Fixed legitimate null anonymous actor crash; safe guest invitation label.                                                                                                                                                                                                                                                                                                                                                                             |
| FR-013 Responsive accessibility   | SYNTHETIC BROWSER VERIFIED; HOSTED MOBILE CORE VERIFIED                                                        | app/globals.css; src/components/*; tests/e2e — 28 browser tests include axe/keyboard and 320–1440px layouts; not a full assistive-technology certification.                                                                                                                                                                                                                                                                                                                                             |
| FR-014 Resilience                 | LOCAL/NATIVE VERIFIED; HOSTED MANUAL OUTAGE MODE VERIFIED                                                      | src/infrastructure/ai/*; src/components/ui.tsx; core SQL — No invalid AI output accepted; cancellation/version/receipts preserved; manual planning works with AI disabled.                                                                                                                                                                                                                                                                                                                              |
| FR-015 Event functions            | IMPLEMENTED; LOCAL/HOSTED VERIFIED                                                                             | src/domain/event-functions.ts; src/components/event-functions.tsx; migration20261026183745 — Shared event version, resources/schedule constraints, default-off feature.                                                                                                                                                                                                                                                                                                                                 |
| FR-016 Guests/RSVP                | IMPLEMENTED; LOCAL/NATIVE/HOSTED VERIFIED                                                                      | src/domain/guests.ts; src/application/guest-http.ts; src/components/guests.tsx; migration20261027192558 — Frozen guest/function scopes, hashed expiring revocable links, mobile fragment scrubbing, minimal anonymous payload, rate/idempotency, no budget/guest-count changes.                                                                                                                                                                                                                         |
| FR-017 Teams                      | IMPLEMENTED; LOCAL/NATIVE/HOSTED RPC VERIFIED                                                                  | src/domain/teams.ts; src/application/team-http.ts; src/components/teams.tsx; migration20261027195746 — Active database roles/assignment capabilities, consent and matching email; revoke rechecked after waiting; viewer only gets restricted summaries.                                                                                                                                                                                                                                                |
| FR-018 Vendor finance             | IMPLEMENTED; LOCAL/NATIVE/HOSTED RPC VERIFIED                                                                  | src/domain/vendor-finance.ts; src/application/finance-http.ts; src/components/vendor-finance.tsx; migration20261027201649 — Distinct quotes/commitments/deposits/invoices/payment records; exact limits, duplicate references, reversals/voids/cancellation history. No funds moved.                                                                                                                                                                                                                    |
| FR-019 Private documents          | IMPLEMENTED MANUAL SLICE; HOSTED PDF VERIFIED; AI EXTRACTION BLOCKED                                           | src/domain/documents.ts; src/application/document-http.ts; src/infrastructure/documents/files.ts; src/components/documents.tsx; scripts/pdf-extract-worker.mjs; migrations20261027203506/20261028015656/20261028090000 — Private 2 MiB originals, 30 pages/50,000 characters, 10-second parser deadline, separate process/128 MiB JS heap/empty app environment. Not OCR/antivirus/OS memory isolation. Validated source spans and manual confirmation before quotation; no automatic commitment.       |
| FR-020 Subscriptions/entitlements | PARTIAL: LIMITS/DASHBOARD VERIFIED; PROVIDER BILLING BLOCKED                                                   | src/components/workspace-tools.tsx; migration20261028022000; app/api/billing/webhook/route.ts — Private expiring administrative entitlements; authoritative event/AI/seat/storage quotas; dashboard. Stripe terms acceptance required. No signed webhook implementation, event reconciliation, checkout, price or paid plan is claimed; endpoint always503.                                                                                                                                             |
| FR-021 Export/correction/deletion | EVENT LIFECYCLE IMPLEMENTED/VERIFIED; ACCOUNT/BACKUP PROCESS PENDING                                           | src/domain/workspace-tools.ts; src/application/workspace-tools-http.ts; src/components/workspace-tools.tsx; migration20261028023000 — Owner JSON/CSV with formula protection; existing profile/guest correction; freeze/revoke, financial retention review, actual original removal check, eligible operational purge, replay; self account review durable/cancellable. Retains opaque event, membership, account, usage and redacted audit metadata. Full account/provider backup deletion unverified. |

P2: Not attempted; advanced reminders, marketplace, WhatsApp, booking, true payment execution and native mobile remain unimplemented

Known limitations: No real generated draft/AI extraction accepted; No genuine signup confirmation/recovery email delivery; FR020 signed/idempotent billing webhook and checkout not implemented:503 fail closed; Financial/account/backups require operator retention process; 3 MB synchronous event export cap; large assisted export process pending; 2 MiB uploads,30 pages/50k text; no automatic OCR or antivirus claim; AI attempt limit including failures remains; no unlimited commercial quota promise.

## I. Test evidence

Counts are per run and overlap; do not add them together. Filtered cases and blocked suites are not passes.

| Command                                                                                                                                 | Environment                                                                                                                                    | Passed | Failed | Skipped/filtered | Result and evidence                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -----: | -----: | ---------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check; npm run lint; npm run typecheck; npm run api:generate; npm run db:types; npm run build; npm run security:client` | local Node24; generated catalogue; production webpack build                                                                                    |  check |      0 |                0 | PASSED — `terminal outputs and GitHub CI; docs/api/openapi.yaml (36 paths); src/generated/database.types.ts`. These are checks, not a fabricated count of tests. Final CI must pass on the implementation SHA.                                                                   |
| `npm test -- --reporter=json --outputFile=.runtime/release-20261028/regression-lifecycle-final.json`                                    | PGlite/unit/provider fixtures                                                                                                                  |    214 |      0 |                0 | PASSED — `.runtime/release-20261028/regression-lifecycle-final.json`. 214 passed before the final function-only lock migration; affected regression and final CI cover that migration.                                                                                           |
| `npx vitest run tests/integration/documents.test.ts tests/integration/workspace-tools.test.ts`                                          | PGlite synthetic Storage catalogue                                                                                                             |     15 |      0 |                0 | PASSED — `.runtime/release-20261028/storage-lock-regression.json`. After the final lock migration.                                                                                                                                                                               |
| `npm run test:concurrency`                                                                                                              | PostgreSQL 17.10 on x86_64-windows, compiled by msvc-19.44.35226, 64-bit; independent loopback TCP sessions, synthetic Auth/Storage catalogues |     21 |      0 |                0 | PASSED — `.runtime/concurrency-summary.json`. 21 scenarios; includes both Storage insert/deletion transaction orders. Not hosted Supabase concurrency.                                                                                                                           |
| `npm run test:e2e`                                                                                                                      | local synthetic browser harness + real public Next.js pages                                                                                    |     28 |      0 |                0 | PASSED — `.runtime/browser-results.json`. 28 tests; fixtures are not live provider evidence.                                                                                                                                                                                     |
| `npm run test:live:public`                                                                                                              | local production build at localhost:3004, configured staging Supabase; public/anonymous guards only                                            |      1 |      0 |                0 | PASSED — `.runtime/live-public-results.json`. Despite the script name, this does not verify public production deployment.                                                                                                                                                        |
| `npx vitest run --config vitest.live.config.ts -t manual`                                                                               | real isolated Supabase ordinary sessions                                                                                                       |      3 |      0 |                3 | PASSED — `.runtime/release-20261028/hosted-manual-roles.json`. Historical focused run: only the reported cases passed; filtered AI cases are not passes.                                                                                                                         |
| `npx vitest run --config vitest.live.config.ts -t "LIVE finance"`                                                                       | real isolated Supabase ordinary sessions                                                                                                       |      1 |      0 |                6 | PASSED — `.runtime/release-20261028/hosted-finance.json`. Historical focused finance run; filtered cases are not passes.                                                                                                                                                         |
| `npx vitest run --config vitest.live.config.ts -t documents`                                                                            | real Supabase Storage/Auth with publishable key + user sessions                                                                                |      1 |      0 |                7 | PASSED — `.runtime/release-20261028/hosted-documents.json`. Historical focused run:1 pass,7 filtered.                                                                                                                                                                            |
| `npx vitest run --config vitest.live.config.ts tests/live/documents.live.ts tests/live/workspace-tools.live.ts`                         | real isolated Supabase/Storage ordinary sessions                                                                                               |      2 |      0 |                0 | PASSED — `.runtime/release-20261028/hosted-storage-final.json`. After final migration;2 pass,0 filtered. Two runs of account request/cancel total four changes, below five/day cap; avoid needless repeat.                                                                       |
| `node .runtime/release-20261028/run-vercel-command.cjs .runtime/release-20261028/hosted-browser.cjs`                                    | exact protected Vercel Preview; ordinary synthetic A/B/anonymous sessions                                                                      |      3 |      0 |                0 | PASSED — `.runtime/release-20261028/staging-browser.json`. 3 genuine hosted manual browser journeys; final document journey also exports, erases original/content, opens dashboard/account review. AI explicitly disabled; traces/video/screenshots off.                         |
| `npm run test:providers:smoke -- -t gemini`                                                                                             | new local Gemini credential; one bounded synthetic generation                                                                                  |      0 |      1 |                1 | FAILED — `.runtime/release-20261028/provider-smoke-initial.json`. Other provider filtered; no unchanged retry.                                                                                                                                                                   |
| `npm run test:providers:smoke -- -t openrouter (fixed free route, bounded changed-config attempts)`                                     | new OpenRouter credential; no paid route or privacy relaxation                                                                                 |      0 |      1 |                1 | FAILED — `.runtime/live-provider-smoke.json; .runtime/release-20261028/provider-smoke-before-reasoning-policy.json`. Latest attempt failed invalid output; repeated failure remains failure, not a passed catalogue check.                                                       |
| `npm run test:e2e:live`                                                                                                                 | designated staging/provider gate                                                                                                               |      0 |      0 |                0 | BLOCKED_BEFORE_TEST_EXECUTION — `.runtime/release-20261028/live-preflight-final.json`. Preflight exit2: successful bounded Gemini planning smoke missing; no browser/provider request.                                                                                           |
| `npm run test:ai:live`                                                                                                                  | designated staging/provider gate                                                                                                               |      0 |      0 |                0 | BLOCKED_BEFORE_TEST_EXECUTION — `.runtime/release-20261028/live-preflight-final.json`. Preflight exit2: successful smoke and approved >=24 request corpus budget missing; no corpus requests.                                                                                    |
| `npm run test:live`                                                                                                                     | full hosted suite includes genuine AI cases                                                                                                    |      0 |      0 |                0 | NOT_REPEATED — `.runtime/release-20261028/provider-smoke-initial.json`. Would repeat known failing provider requests without changed authorization; manual hosted modules executed separately, not relabelled as full suite success.                                             |
| `node scripts/audit-history-secrets.mjs; npm run security:client; npm audit --omit=dev --json`                                          | reachable local refs and actual built client; npm registry                                                                                     |  check |      0 |                0 | PASSED — `.runtime/release-20261028/history-secret-audit.json; .runtime/release-20261028/dependency-audit.json`. No configured-secret/pattern findings; production dependencies0 vulnerabilities. Initial sandbox DNS audit failure resolved using authorized network execution. |

CI: {"sha":"314700302aee83debe80a9d574dab074435afccf","runs":[{"id":40660004425,"name":"UtsavOS verification","status":"completed","conclusion":"success","event":"pull_request","headSha":"314700302aee83debe80a9d574dab074435afccf","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40660004425","runAttempt":1},{"id":40659197920,"name":"UtsavOS verification","status":"completed","conclusion":"success","event":"push","headSha":"314700302aee83debe80a9d574dab074435afccf","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40659197920","runAttempt":1}],"checks":[{"id":122720387865,"name":"Vercel Preview Comments","status":"completed","conclusion":"success","url":"https://vercel.com/github"},{"id":122720370678,"name":"supabase-platform","status":"completed","conclusion":"success","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40660004425/job/122720370678"},{"id":122720370362,"name":"validate","status":"completed","conclusion":"success","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40660004425/job/122720370362"},{"id":122717653559,"name":"supabase-platform","status":"completed","conclusion":"success","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40659197920/job/122717653559"},{"id":122717653232,"name":"validate","status":"completed","conclusion":"success","url":"https://github.com/YellankiKaushik/UtsavOS/actions/runs/40659197920/job/122717653232"}]}

## J. Security

**secretScan**: No configured-value/pattern findings in reachable local Git refs or built client; staged scan before every commit. Does not cover inaccessible/deleted/unreachable GitHub objects.

**credentials**: Ignored environment/test credentials never staged; no hashes/fragments/tokens printed. Vercel metadata audited without decrypting values.

**authorization**: Ordinary user sessions, RLS/RPC guards, workspace→event locks, version checks, exact money, receipts and safe audit preserved

**sessions**: Hosted Secure HttpOnly SameSite=Lax cookies; logout redirects/protects events

**documents**: Private bucket, immutable originals, scoped normal-session transfer, bounded parser, no app credentials in child, explicit source review, retention and cleanup states, Storage upload/deletion serialization

**dependencies**: `{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}`

**productionRisks**: Unverified AI/mail/billing and operational privacy/backup/incident requirements prevent commercial release; no certification asserted

## K. External action register

### Google Gemini

- Safe classification: AI_AUTHENTICATION_FAILED / HTTP401
- Evidence: `.runtime/release-20261028/provider-diagnostic.json; provider-smoke-initial.json`
- Established cause: Authentication-level rejection established; exact project/key restriction not established
- Owner action: Verify project, enabled Generative Language API, key restrictions, model entitlement and quota; securely update local and Preview configuration if necessary
- Codex can resolve now: false
- Next verification: npm run test:providers:smoke -- -t gemini once after a material external change

### OpenRouter

- Safe classification: AI_INVALID_OUTPUT; response validation; earlier AI_ROUTE_UNAVAILABLE
- Evidence: `.runtime/live-provider-smoke.json; .runtime/release-20261028/openrouter-routes.json`
- Established cause: Key/catalogue authorized; an eligible fixed free completion failed validation twice. Reasoning-disable test did not establish cause; generation lookup404
- Owner action: Identify a compatible permitted fixed route under data_collection=deny and approve a spend budget if no free route works; configure securely
- Codex can resolve now: false
- Next verification: One filtered smoke on the changed approved route, then bounded corpus only with explicit budget

### Supabase Auth email

- Safe classification: email_address_invalid / HTTP400 for reserved example.test addresses; delivery UNVERIFIED
- Evidence: `.runtime/release-20261028/email-diagnostic.json`
- Established cause: Synthetic reserved address rejection established; SMTP/provider delivery failure is not established
- Owner action: Configure/verify permitted sender and controlled test inbox; verify real signup confirmation and recovery callback/session/password/logout on exact Preview
- Codex can resolve now: false
- Next verification: One bounded signup and recovery journey with a controlled inbox; preserve email confirmation

### Stripe via Vercel Marketplace

- Safe classification: integration_terms_acceptance_required / action_required
- Evidence: `vercel integration add stripe --environment preview --no-env-pull --no-connect --format json --non-interactive returned owner action`
- Established cause: Marketplace agreement/account setup required before provisioning
- Owner action: Review and accept terms at https://vercel.com/kaushik-yellanki-project/~/integrations/accept-terms/stripe?source=cli; finish approved test-mode account setup. Do not create live charges or assume pricing
- Codex can resolve now: false
- Next verification: Inspect installations, retry only after acceptance, follow provider skill; implement test-mode checkout, raw-body signature verification, idempotent event receipts and out-of-order reconciliation; then test before enablement

### Commercial operations/privacy/retention

- Safe classification: OPERATIONAL_RELEASE_GATE_UNVERIFIED
- Evidence: `DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md sections629–678/1255; docs/modules/WORKSPACE_AND_DATA.md`
- Established cause: No verified production operator, retention/backup deletion policy, restore drill, customer support/incident owner or provider data agreement evidence
- Owner action: Assign responsible operators, publish reviewed privacy/support/retention terms, verify backups/restore and held financial/account deletion handling with applicable advice
- Codex can resolve now: false
- Next verification: Synthetic restore/deletion drill on approved isolated backup; operator runbook and onboarding acceptance; no claim of regulatory compliance

## L. Release verdict

**verdict**: P0 LOCALLY VERIFIED — LIVE RELEASE BLOCKED.

**staging**: Manual P0 and selected P1 flows genuinely verified; full P0 staging acceptance not met

**production**: NOT READY; not promoted

**p1**: Substantial verified implementation; FR019 AI, FR020 provider billing and FR021 operator account/backup closure remain incomplete

**p2**: Not started

## M. Continuation packet

**nextEngineering**: `["Resolve Gemini/approved OpenRouter route through external configuration; perform one smoke after material change, then authorized corpus budget and real draft save/acceptance browser journey","Verify controlled-inbox signup confirmation and recovery on exact Preview with confirmation still enabled","Complete Stripe owner setup, then provider-specific test-mode checkout/signature verification/durable idempotent event receipts/order reconciliation; do not enable or grant paid plans before those tests","Establish operator retention/financial hold/account deletion/backups/restore/support/incident process; test large assisted export before customer onboarding","Review draft PR, all CI checks and schema/environment rollout; production stays unchanged until acceptance gates pass","Only then choose P2 priorities; do not promise marketplace/delivery/booking/payment execution without real integrations"]`

**relevantFiles**: `["docs/LIVE_RELEASE_PROGRESS.md","docs/EXTERNAL_ACTION_REGISTER.md","docs/modules/WORKSPACE_AND_DATA.md","src/infrastructure/ai/service.ts","tests/live-smoke/providers.live.ts","playwright.staging.config.ts","src/application/workspace-tools-http.ts","app/api/billing/webhook/route.ts","supabase/migrations"]`

**commands**: `["npm run verify","npm run test:concurrency","npm run test:e2e","npm run test:live:public","npm run test:providers:smoke -- -t gemini (after configuration change)","npm run test:providers:smoke -- -t openrouter (after approved route change)","npm run test:e2e:live (requires smoke)","npm run test:ai:live (requires smoke and authorized budget)","node .runtime/release-20261028/branch-ci.cjs (local ignored helper)","node .runtime/release-20261028/run-vercel-command.cjs .runtime/release-20261028/hosted-browser.cjs (exact verified Preview only)"]`

**evidenceStorage**: Redacted snapshots are in ignored .runtime/release-20261028 and CI. Do not upload whole runtime folder: it also holds local execution helpers; ignored live credentials are separate .env.live.local. No secret values are needed to read this report.

Primary technical references: [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables), [Supabase private upload capability](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl), [unpdf](https://github.com/unjs/unpdf), [Stripe webhook verifier source](https://github.com/stripe/stripe-node/blob/master/src/Webhooks.ts), [OpenRouter reasoning](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens). These explain implementation choices; provider documentation is not evidence of this account’s successful execution.
