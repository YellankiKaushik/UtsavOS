# Test report

## Active 2026-10-28 evidence

- Unit/integration: 181 passed before the team slice, zero failures/skips.
- Native PostgreSQL: 16 passed after the team authorization layer, including RSVP duplicate/archive races and membership revocation racing a waiting mutation.
- Hosted publishable-key sessions: baseline manual integration 1 passed (3 AI cases filtered); guest/session-refresh integration 1 passed (4 other cases filtered). These counts are separate runs, not six live passes.
- GitHub `40572301093` passed both jobs for `0b54d31`, including Docker Supabase and full browser regression. Later commits need their own CI result.
- READY Preview `dpl_CaDcMcKh9UxwUtk3EPQ1UvKRo8nc` serves commit `947185e` on Node 24. Hosted browser checks have exercised login, creation, budgets/tasks/vendors, functions and guest replies. The complete journey is still being repaired/verified; failed assertions are not counted as passes. Full AI-dependent browser and corpus gates remain blocked.
- Fresh Gemini smoke failed authentication; two bounded fixed free OpenRouter attempts failed output validation. No paid calls or privacy relaxation.

Detailed running evidence: [LIVE_RELEASE_PROGRESS.md](LIVE_RELEASE_PROGRESS.md). The following section is the earlier checkpoint.

2026-10-27. Tested implementationa98fdecfa07dc0cee18609330f764158224b65e6; Node24.16.0 on Windows. No dependency changes. Historical evidence from15be61c is retained separately; current counts below are executed results, not copied claims.

| Command / category                                                                                             | Outcome                                                                 | Passed | Failed | Skipped | Duration ms        |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ | ------ | ------- | ------------------ |
| npm test -- --reporter=default --reporter=json --outputFile=.runtime/final-unit-results.json                   | PASS                                                                    | 156    | 0      | 0       | 12187.7451171875   |
| npm run test:concurrency -- --reporter=default --reporter=json --outputFile=.runtime/final-native-results.json | PASS                                                                    | 13     | 0      | 0       | 22190.229736328125 |
| npm run test:e2e                                                                                               | PASS                                                                    | 20     | 0      | 0       | 48088.751000000004 |
| npm run test:live:public                                                                                       | PASS                                                                    | 1      | 0      | 0       | 2286.7329999999997 |
| node scripts/diagnose-providers.mjs                                                                            | DIAGNOSTIC: Gemini401; OpenRouter key/catalogue200                      | n/a    | n/a    | n/a     | not measured       |
| npm run test:providers:smoke -- -t openrouter                                                                  | FAILED — AI_MODEL_UNAVAILABLE before improved route classifier; ~1229ms | 0      | 1      | 1       | not measured       |
| npm run test:providers:smoke -- -t openrouter                                                                  | FAILED — AI_ROUTE_UNAVAILABLE; ~1367ms                                  | 0      | 1      | 1       | not measured       |
| npm run test:live                                                                                              | BLOCKED, nonzero; no test/provider call/remote mutation                 | 0      | 0      | 0       | not measured       |
| npm run test:e2e:live                                                                                          | BLOCKED, nonzero; no test/provider call/remote mutation                 | 0      | 0      | 0       | not measured       |
| npm run test:ai:live                                                                                           | BLOCKED, nonzero; no test/provider call/remote mutation                 | 0      | 0      | 0       | not measured       |
| npm run lint                                                                                                   | PASS                                                                    | n/a    | n/a    | n/a     | not measured       |
| npm run typecheck                                                                                              | PASS                                                                    | n/a    | n/a    | n/a     | not measured       |
| npm run format:check                                                                                           | PASS                                                                    | n/a    | n/a    | n/a     | not measured       |
| npm run api:generate                                                                                           | PASS                                                                    | n/a    | n/a    | n/a     | not measured       |
| npm run db:types                                                                                               | PASS                                                                    | n/a    | n/a    | n/a     | not measured       |
| npm run build                                                                                                  | PASS                                                                    | n/a    | n/a    | n/a     | not measured       |
| npm run security:client                                                                                        | PASS                                                                    | n/a    | n/a    | n/a     | not measured       |

## Scope and artifacts

PGlite executes four migrations and actual SQL transaction/RLS/grant checks with synthetic auth.uid roles. Native PostgreSQL17.10 uses independent TCP connections:13 scenarios including all prior races and2 new P1/P0 races. Neither verifies actual GoTrue/JWT/PostgREST. Default AI and API tests use controlled doubles.

Browser20 tests: original14 P0 plus6 P1. Five widths320/375/768/1024/1440;35 P0 planner scans,5 landing scans,5 function pages and5 function editor dialog scans. Axe/overflow/focus checks pass in those contexts. P1 create/edit/link/refresh/unlink/archive tested against synthetic API; real account persistence remains blocked. Production read-only check verifies health/anonymous route/API denial only. Manual screen-reader/device testing not done.

The first P1 browser run failed one of20 tests because checkbox controlled state reverted while awaiting save. Implementation now has explicit pending state/busy feedback and rollback; unchanged20-test suite passes. SQL JSON operator precedence, Node extension and generated Json RPC type mismatches were corrected; final156 regression tests pass. No assertions disabled.

Gemini metadata GET401/389ms; no unchanged generation repeated. OpenRouter key200/393ms, catalogue200/785ms. Two fixed free smokes (45s,1attempt,no fallback,privacy retained): liquid failed~1229ms; nvidia failed~1367ms with AI_ROUTE_UNAVAILABLE. Each filtered run has1failed/1skipped; Gemini skip is not a pass. No successful generated model/tokens/cost observed; live corpus0 cases. All three staged suites exit nonzero at preflight with0 tests and no remote mutation.

Ignored raw artifacts: .runtime/final-unit-results.json, final-native-results.json, browser-results.json, live-public-results.json, provider-diagnostic.json, live-provider-smoke.json. Durable redacted ledger: [final-verification.json](evidence/final-verification.json); separate [Gemini](evidence/gemini-evaluation.json) / [OpenRouter](evidence/openrouter-evaluation.json) evaluation records; [full report](CODEX_FINAL_COMPLETION_REPORT.json).

No CI dispatch, hosted migration/Auth/RLS, real authenticated browser journey, cloud deployment, load/restore or compliance result exists. P0 release remains NO-GO. P1 functions locally tested only; remaining P1/P2 implementation incomplete.
