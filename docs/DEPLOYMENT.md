# Deployment and operations

## Active 2026-10-28 staging execution

The dated statements below are historical. The verified Vercel project is `utsavos` / `prj_PqBVW2XZqRNqmkhNVgoBOMEysCbm`, team `team_UYEpjjRaObtrYF55SYu5rqUl`, linked to `YellankiKaushik/UtsavOS`, production branch `main`. Work is isolated on `codex/live-release-completion`; main has not been updated. Preview `https://utsavos-4plh919j5-kaushik-yellanki-project.vercel.app` (`dpl_CaDcMcKh9UxwUtk3EPQ1UvKRo8nc`) is READY for `947185e`, Node 24.x. Native Next.js output, `npm ci`, and `npm run build` are used. This is a staging deployment, not a production release.

Preview AI flags are false. Functions/guests are enabled only for this branch after real hosted tests against isolated Supabase `upbwahlegwcwiladfwwd`. Five migrations are applied; no reset or seed ran. New unverified modules remain off. Exact Vercel deployment origin is trusted through system configuration; user Host/forwarded headers are not trusted. `.vercelignore` excludes local env, synthetic identities, runtime files and the user's untracked image. Service-role credentials are absent from Vercel.

Use `playwright.staging.config.ts` for the explicitly manual-only hosted journey with a verified exact Preview URL and ignored synthetic credentials. Vercel protection stays enabled; inject a short-lived development OIDC header only for that exact origin. Traces/video/screenshots are off. The full `test:e2e:live` gate still requires a successful real AI smoke. See [LIVE_RELEASE_PROGRESS.md](LIVE_RELEASE_PROGRESS.md).

Current checkpoint: 2026-10-27 (Asia/Kolkata). See CODEX_FINAL_COMPLETION_REPORT.md and EXTERNAL_ACTION_REGISTER.md for current diagnostics and gates. P1 event functions may be tested independently under the latest user directive, while release remains blocked. Never enable the preview in production based only on local tests.

2026-10-26. Target: native Next.js on Vercel-compatible Node hosting, Supabase PostgreSQL/Auth, direct Gemini and OpenRouter. **No staging or public deployment has been created or verified.** No public URL, successful provider draft or hosted Auth session is claimed. Current blockers and exact external actions: [FOUNDER_ACTIONS_REQUIRED.md](FOUNDER_ACTIONS_REQUIRED.md).

## Local setup and secure configuration

Use Node 24.16.0, npm 11.9.0 and `npm ci`. Existing .env now contains credentials; do not overwrite/print it. If setting up a new checkout, use .env.example. Prefer an ignored .env.local or secret manager. Next environment precedence is process environment, .env.development.local/.env.production.local, .env.local, environment-specific file, then .env. Live test tooling additionally loads ignored .env.live.local. Never commit these files.

Supabase accepts SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY or the corresponding NEXT_PUBLIC names. Conflicting aliases fail closed; a privileged key is rejected in publishable settings. The ordinary application never uses the present service-role key. Gemini model aliases are GEMINI_MODEL_ID / GEMINI_MODEL_DEFAULT. OpenRouter aliases are OPENROUTER_MODEL_ID / OPENROUTER_MODEL_DEFAULT; default router is openrouter/free. Server-only keys: GEMINI_API_KEY, OPENROUTER_API_KEY. VITE_AUTH_PROVIDER is unused.

AI_PROVIDER_PRIMARY defaults to gemini, AI_PROVIDER_FALLBACK to none. Enable another destination only explicitly and disclose its data flow. Mode must be live. Shared AI_REQUEST_TIMEOUT_MS defaults to 20000, max45000; AI_PROVIDER_TIMEOUT_MS is clamped to this. Retries0–2 share at most3 attempts with fallback. A provider timeout cannot expand the request deadline. SDK retries are disabled. Max output8192tokens/64KB; DB quota20/workspace/UTCday, burst5seconds and active generation lease60seconds. Failed attempts count; one reservation may make up to3 provider attempts. These are request guards, not a guaranteed spend cap. Monitor provider billing separately.

Supabase fetch timeout10seconds; mutation UI timeout55seconds; API route duration60seconds. Confirm target hosting plan duration and region. A slow database can still delay final bookkeeping, and process termination leaves the generation lease to expire. There is no durable queue or background completion promise.

`npm run dev` serves port3000. For production behavior: build, then start. APP_BASE_URL must exactly match the browsed origin. Mutations check Origin and end-user authorization. HTTPS production cookies are Secure/HttpOnly. Never weaken Origin or RLS to fix a configuration issue.

## Database migration sequence

Confirm the correct isolated UtsavOS project identity, owner and region through management access before any write. The configured project's management lookup denied permission. Read-only Auth settings200 and anonymous REST root401 do not prove database schema, signed Auth or RLS. Unrelated inactive LoadGuard 3D was untouched.

Apply these files in order through a reviewed migration-history workflow:

1. `20261026142503_p0_core.sql`: schema, owner RLS/grants, authoritative command, financial invariants/audit/receipts.
2. `20261026165848_ai_provider_provenance.sql`: safe provider/model metadata, private core wrapper, workspace active-generation guard, explicit public SQL function invalidation for pooled connections.
3. `20261026180040_combined_change_financial_bounds.sql`: exact numeric intermediate preview arithmetic; final caps remain enforced after all proposed changes. Stored money stays bigint.
4. `20261026183745_p1_event_functions.sql`: additive owner-isolated functions, resource consistency FKs and guarded version/audit/receipt RPCs. FEATURE_EVENT_FUNCTIONS defaults false; enable only for a reviewed staging preview. All four migrations pass local PostgreSQL tests; none was applied remotely by this session.

Do not edit already applied baseline migrations or run a remote reset. Keep private schema outside PostgREST exposed schemas. Application uses guarded public invoker RPCs; direct table writes and direct private command_core execution remain revoked. Read rows through owner RLS. Inspect actual function ownership/grants in target Supabase after migration.

The tracked seed creates only synthetic local data and an identity without a sign-in password/provider; never apply it to customer production. Generated types come from executed migration catalogue with `npm run db:types`; OpenAPI from `npm run api:generate`.

## Verification before staging promotion

Local checks are in TEST_REPORT.md. Native PostgreSQL17.10 independent TCP tests pass; synthetic Auth stubs are not actual GoTrue/JWT/PostgREST. Docker/Podman is absent. A Docker-capable LOCAL stack or committed CI platform job must execute `supabase start`, `db reset --local`, `test db`. Never pass a production/linked connection to reset.

Once identity is verified, create and confirm two synthetic staging users. Configure .env.live.local from .env.live.example and set LIVE_STAGING_CONFIRMED=true only for an isolated project. Configure exact callbacks/recovery URLs for localhost:3005 plus the real staging origin, email verification, SMTP and provider rate limits. Local CLI defaults disable email confirmation for disposable tests; they are not hosted policy.

Run read-only diagnostics before changed provider smokes. Gemini configured-model metadata currently returns401. OpenRouter key/catalogue return200, but two tested fixed free models fail404/no permitted route under current policy; the earlier free-router timeout remains historical. Preserve privacy and stop unchanged retries. After resolution require genuine valid structured drafts and actual returned model metadata. Run the24-case corpus separately for each approved provider after setting LIVE_AI_PROVIDER and explicitly allowing LIVE_EVAL_REQUEST_BUDGET>=24. Corpus disables retry/fallback. Review usefulness, financial correctness, unsupported vendor/capacity facts and token/cost observations. A schema-valid output alone does not satisfy the usefulness gate.

Run `npm run test:live` with two synthetic identities to check Auth, isolated data, persistence, quotas, receipts and actual generation. Then build and run `npm run test:e2e:live` (port3005, no reused server), completing actual sign-in→create→generate→selectively accept→budget/task/vendor→preview/approve→reload→logout/login and tenant denial. Mutation suites leave labeled synthetic records for review; cleanup needs a separately reviewed staging operation. Missing preflight requirements execute zero tests and exit nonzero.

`npm run test:live:public` is a separate read-only configured production test on3004. Its passed health/anonymous guard assertions do not verify account sessions. Default offline browser suite owns3002/3100 with credentials blanked. Separate output directories avoid trace collisions.

Also verify real session refresh/expiry/recovery/revocation, deployed callback flow, platform pgTAP, hosted tenant-negative calls, deployed concurrency, backups and restore behavior. Do not infer these from fixtures/native SQL.

## Hosting configuration

Use a designated native Next.js project rooted here, install `npm ci`, build `npm run build`, Node24. Configure exact APP_BASE_URL, Supabase URL/publishable key and AI keys/models/policies securely for each environment. Build-time NEXT_PUBLIC variables can be inlined; rebuild when they change. Secrets must never use NEXT_PUBLIC names. Settings disclose provider/fallback and OpenRouter routing; privacy/retention/operator decisions still need human ownership.

After required gates pass, deploy the correct staging project, inspect build/runtime logs, validate health and complete real persistent journeys at its deployed origin. Record deployment ID/URL and actual verification. Promote only after acceptance. No Vercel project, paid provisioning, DNS purchase, public deployment or cloud database mutation was performed by this session.

## Incident and reversal runbooks

- AI outage: disable FEATURE_AI_GENERATION; retain manual CRUD. Inspect safe request IDs/configuration/quotas, not raw prompts or keys. Never substitute fixtures. Fallback only to explicitly approved destinations.
- Budget/proposal incident: disable FEATURE_AI_REPLAN. Preserve financial/audit records and reproduce with synthetic input. Apply reviewed forward correction.
- Reversal: inspect old/new history values and generate a fresh opposite guest/price proposal against current version. Review and approve it. There is no unconditional Undo or history rewrite.
- DB outage/uncertain save: show failure without success feedback, preserve idempotency key, retry/reconcile receipt after recovery. No offline save guarantee.
- Auth incident: restrict affected access and revoke through provider; preserve safe diagnostics and rerun tenant/security checks before reopening.
- Retention/recovery: draft acceptance24hours/proposal30minutes are validity windows, not deletion guarantees. Receipts retained until approved purge policy. No tested RPO/RTO or backup restore claim. Do not destroy audit/financial data for an application rollback.

Client secret scan checks actual configured private values and key patterns in .next/static; it passed. Production dependency audit reported0 vulnerabilities. Neither is a complete security/compliance assessment.
