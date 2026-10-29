# Testing and evidence

Tests operate at different boundaries. Counts overlap and must not be added together. A fixture pass does not establish provider access, email delivery or production availability. [Production release evidence](HACKATHON_RELEASE_HANDOFF.md) and [retained failures](hackathon/AI_RELEASE_VERIFICATION_2026-10-29.md) identify the actual tested commits.

## Deterministic development checks

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run security:client
```

At the final application release checkpoint, regression was **231 passed, 0 failed/skipped**. This includes domain, provider-double and database integration checks; no real provider calls are implied. Build/client scanning requires local environment configuration but must never emit secret values.

## Additional layers

| Command                                    | Boundary and prerequisites                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `npm run test:unit`                        | Domain and AI adapter/validation doubles                                                                            |
| `npm run test:integration`                 | Disposable integration fixtures; overlaps the full regression run                                                   |
| `npm run test:concurrency`                 | Native disposable PostgreSQL 17 races; 22 scenarios at the release checkpoint                                       |
| `npm run test:e2e`                         | Controlled browser fixtures; 28 cases at the release checkpoint, including accessibility/keyboard/responsive checks |
| `npm run api:generate`, `npm run db:types` | Regenerate reviewed contracts; generated files must remain in sync                                                  |
| `node scripts/scan-staged-secrets.mjs`     | Staged configured-secret values and patterns                                                                        |
| `node scripts/audit-history-secrets.mjs`   | Locally available reachable Git refs; not deleted/unreachable server objects                                        |
| `node scripts/measure-repository.mjs`      | Exact tracked/ZIP/local Git byte measurements for HEAD                                                              |

GitHub Actions uses Node 24.16.0 and `npm ci`. The `validate` job also runs native concurrency, generation consistency, build/client checks and browser tests. `supabase-platform` starts a disposable Docker Supabase stack, resets **local** data and runs database tests. The main ruleset requires these exact Actions contexts and up-to-date PRs. No direct main push or check bypass is part of normal maintenance.

## Genuine hosted tests

Use `.env.live.example` and inspect each preflight gate first. `test:live`, `test:providers:smoke`, `test:e2e:live` and `test:ai:live` require real credentials and explicit synthetic-target confirmation. Never point mutating suites at customer data. Live corpus evaluation requires its own explicit 24-request allowance; blocked preflight is not a pass or 24 skipped test executions.

The final protected Preview passed three genuine wedding/birthday/community acceptance journeys. The first public production suite passed wedding but failed birthday/community with rate limits; those events stayed unchanged. After cooldown and one successful direct diagnostic, the separately selected affected rerun passed 2/2. All three types therefore have successful production generation, edited selective acceptance and reload persistence evidence, with initial failures retained. Each successful production generation reported zero cost on the verified free route. These observations do not establish an availability SLO.

Real email confirmation/recovery delivery and link expiry/replay were not verified because no controlled inbox was connected. The owner selected a private isolated synthetic reviewer workflow; password sessions, refresh, cookies, logout/relogin and tenant denial passed without disabling global confirmation or RLS.

For a documentation-only PR, run formatting, link/media/privacy checks, lint/types/regression/build/client scan and repository size. Browser/database behavior is unchanged; full CI still executes the existing browser/native/platform jobs. Read-only production captures and guard checks make no new model requests. Keep private test credentials, traces and runtime artifacts ignored.
