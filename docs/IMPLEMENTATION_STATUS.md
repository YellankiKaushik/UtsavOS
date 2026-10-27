# Implementation status

## Active 2026-10-28 release execution

See [LIVE_RELEASE_PROGRESS.md](LIVE_RELEASE_PROGRESS.md) for current evidence. The dated assessment below is historical. The dedicated Supabase project is now identified and has five applied migrations; real ordinary-user persistence, isolation, atomic approval, session refresh and scoped guest RSVP tests pass. GitHub CI passed for `0b54d31`; staging Preview `947185e` is READY on Node 24 with AI disabled. Hosted browser verification is in progress. Gemini authentication and validated OpenRouter output remain blocked. FR-016 is implemented and tested locally/hosted; FR-017 is being implemented and has not been migrated remotely. Full commercial product remains incomplete.

## Earlier checkpoint

FR-017 now has six applied migrations, ordinary hosted role/delegation/revocation verification and default-off UI/API. FR-018 adds a seventh applied migration and hosted-tested financial records; no payment processing is implied. Current local regression 194 tests and native concurrency 18 tests pass. The first hosted manual vertical passes; a discovered anonymous audit-actor crash is fixed locally and needs hosted recheck. See the active progress log for exact commits and deployment identities.

2026-10-27 (Asia/Kolkata). Starting checkpoint15be61c preserved; tested implementation **a98fdecfa07dc0cee18609330f764158224b65e6**. Current milestone7 external release gate **BLOCKED**; independent milestone8 FR-015 **IMPLEMENTED / TESTED LOCALLY, preview off by default**. Full product incomplete.

## Gate assessment

- A: P0 code locally verified.
- B: Staging BLOCKED: Gemini401, no approved OpenRouter route, target Supabase access/accounts absent, no deployment.
- C: Public production NOT READY: B plus operational/privacy/retention/support/recovery requirements.

## New verified implementation

Provider diagnostic.ts + diagnose-providers.mjs distinguish authentication/authorization/model/routing/quota/DNS/TLS/network/timeout safely. Live environment loader honors process overrides. Actual metadata Gemini401; OpenRouter key/catalogue200; two bounded fixed free generation attempts fail404/no route. No privacy relaxation, purchases or unchanged retries.

FR-015 functions: domain/event-functions.ts; components/event-functions.tsx; API functions routes; fourth migration20261026183745; resource consistency FKs; owner RLS; shared P0 lock/version; audit/receipts; protected links; create/edit/archive and schedules. FEATURE_EVENT_FUNCTIONS=false by default. See modules/EVENT_FUNCTIONS.md. No team/billing/RSVP capability implied.

## Requirement mapping

| Requirement                                                           | Source / evidence                                                                                                                                                           | State                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| FR-001 Registration/login/logout/recovery and protected sessions      | app/auth/actions/route.ts, app/auth/callback/route.ts, proxy.ts, src/infrastructure/supabase/server.ts                                                                      | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-002 Personal owner workspace                                       | app/onboarding/page.tsx, src/application/repository.ts, supabase/migrations/20261026142503_p0_core.sql                                                                      | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-003 Create all three event types                                   | src/domain/contracts.ts, src/components/planner.tsx, app/api/v1/[...segments]/route.ts                                                                                      | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-004 List/detail/edit persistent events                             | src/components/planner.tsx, src/application/repository.ts, app/api/v1/[...segments]/route.ts                                                                                | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-005 Real Gemini structured draft and personalized ideas            | src/infrastructure/ai/gemini-provider.ts, src/infrastructure/ai/service.ts, src/domain/ai-contract.ts, src/infrastructure/gemini.ts                                         | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-006 Review/edit/select and atomically accept draft                 | src/components/planning.tsx, src/domain/ai-contract.ts, supabase/migrations/20261026142503_p0_core.sql                                                                      | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-007 Exact estimated budgets, pricing bases and overrun             | src/domain/money.ts, src/components/resources.tsx, supabase/migrations/20261026142503_p0_core.sql                                                                           | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-008 Manual vendor checklist with category/status/deadline/estimate | src/components/resources.tsx, src/domain/contracts.ts                                                                                                                       | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-009 Tasks/status/priority/deadlines and dependency timeline        | src/domain/tasks.ts, src/domain/dates.ts, src/components/resources.tsx                                                                                                      | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-010 Non-mutating deterministic replan preview                      | src/domain/replan.ts, src/components/planning.tsx, supabase/migrations/20261026180040_combined_change_financial_bounds.sql                                                  | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-011 Approval/staleness/locks/idempotency and reversal              | src/domain/replan.ts, supabase/migrations/20261026142503_p0_core.sql, src/components/planning.tsx                                                                           | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-012 Audit history                                                  | src/components/planner.tsx, src/application/repository.ts, supabase/migrations/20261026142503_p0_core.sql                                                                   | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-013 Responsive accessible dashboard/modules/account UI             | app/globals.css, src/components/planner.tsx, src/components/planning.tsx, src/components/resources.tsx, src/components/ui.tsx                                               | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-014 Failure recovery and manual planning during AI outage          | src/infrastructure/ai/service.ts, src/infrastructure/ai/types.ts, src/infrastructure/supabase/fetch.ts, src/components/ui.tsx                                               | IMPLEMENTED; local tested layers pass; staging blocked |
| USR-OR-001 OpenRouter unified provider/fallback/provenance            | src/infrastructure/ai/openrouter-provider.ts, src/infrastructure/ai/service.ts, src/infrastructure/config.ts, supabase/migrations/20261026165848_ai_provider_provenance.sql | IMPLEMENTED; local tested layers pass; staging blocked |
| FR-015 functions                                                      | domain/component, API, fourth migration;10 SQL,2 native race,6 browser and API gate cases                                                                                   | IMPLEMENTED / TESTED LOCALLY; flag off; hosted blocked |
| Remaining FR-016–021 / AppendixF                                      | Not implemented; see final report L                                                                                                                                         | NOT STARTED                                            |
| P2 backlog                                                            | No advanced operations/integrations exposed                                                                                                                                 | NOT STARTED / conditional mobile DEFERRED              |

## Tests and defects

156 regression tests PASS; 13 native TCP tests PASS; 20 browser tests PASS; 1 configured read-only public test PASS. Lint/types/format/build/client-secret scan and generated24-path API/database types pass. New SQL operator precedence/ESM import/typed RPC errors fixed; P1 pending checkbox now preserves selection during save and rolls back on failure. All original assertions retained. Actual signed Auth/PostgREST/provider output/corpus/deployment remain unverified.

## Exact continuation

First resolve external register in order for real-service acceptance. Independent next module: FR-016 guest/household/function-consistent attendance + hashed expiring/revocable invitation tokens/manual share, then FR-017 authorization before collaboration. Remaining P1/P2 code is not exhausted or completed. Preserve existing financial/tenant/version/receipt checks. Read final report P before resuming.

[Current report](CODEX_FINAL_COMPLETION_REPORT.md) · [Tests](TEST_REPORT.md) · [Actions](EXTERNAL_ACTION_REGISTER.md) · [Decisions](DECISIONS.md) · [Deployment](DEPLOYMENT.md). Older CODEX_COMPLETION_REPORT files are historical, not regenerated. No known critical local domain/SQL defect remains in tested scope; target platform and commercial readiness remain unknown.
