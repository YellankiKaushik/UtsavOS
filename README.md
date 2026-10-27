# UtsavOS

Persistent event planning for weddings, birthdays and community celebrations, built against the unchanged `DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md`. Stack: Next.js App Router, React, TypeScript, Tailwind, Zod, Supabase Auth/PostgreSQL/RLS, direct Google Gemini and OpenRouter using the OpenAI SDK.

**P0 IS NOT RELEASE VERIFIED.** Gemini's configured-model diagnostic returns HTTP401. OpenRouter accepts the key, but tested fixed free models have no permitted route under the current request policy. Hosted Supabase identity/Auth and deployment remain blocked. P1 multi-function scheduling is implemented and tested locally behind an off-by-default flag; the rest of P1 and P2 remain incomplete. See the [current final report](docs/CODEX_FINAL_COMPLETION_REPORT.md) and [external action register](docs/EXTERNAL_ACTION_REGISTER.md). The older completion report is historical evidence from checkpoint15be61c.

The application includes personal workspaces, event CRUD, exact INR budgets, tasks and dependency timelines, vendor checklists, editable AI draft review/selective acceptance, deterministic guest/catering replanning, atomic approval, version checks, locks, idempotency and immutable history. Manual planning remains available during AI outages. Fixtures are confined to tests.

Use **Node 24.16.0**, npm 11.9.0 and the exact dependency lockfile.

```powershell
npm ci
# Only if no environment file exists: copy .env.example to .env.local and configure securely.
npm run dev
```

Open [localhost:3000](http://localhost:3000). Do not overwrite or print an existing environment file. Supabase accepts `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` or the corresponding `NEXT_PUBLIC_` names. Conflicting nonempty aliases fail safely. The application uses publishable keys and end-user sessions, never a service-role key. `VITE_AUTH_PROVIDER` is unused.

Gemini accepts `GEMINI_MODEL_ID` or `GEMINI_MODEL_DEFAULT`. OpenRouter accepts `OPENROUTER_MODEL_ID` or `OPENROUTER_MODEL_DEFAULT`, defaulting to `openrouter/free`. Keys stay server-side. `AI_PROVIDER_PRIMARY` defaults to `gemini`; `AI_PROVIDER_FALLBACK` defaults to `none`. Explicitly select the approved other provider for fallback. `AI_PROVIDER_MODE` must be `live`; no automatic mock mode exists.

`AI_REQUEST_TIMEOUT_MS` defaults to 20000 (1000–45000 allowed). Provider timeout is clamped to the shared deadline. `AI_PROVIDER_MAX_RETRIES` is 0–2, sharing at most three attempts including fallback; zero disables additional attempts. SDK retries are disabled. Temporary failures may retry; authentication, credits, refusal, capability and invalid output never reroute automatically. Changing model/provider requires another live smoke and privacy review.

```powershell
node scripts/audit-environment.mjs
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:concurrency
npm run api:generate
npm run db:types
npm run build
npm run security:client
npm audit --omit=dev
npx playwright install chromium
npm run test:e2e
```

`npm test` runs domain, controlled HTTP/AI and PGlite PostgreSQL tests. `test:concurrency` starts disposable loopback PostgreSQL 17.10 and races independent TCP sessions. Synthetic Auth roles do not verify GoTrue/PostgREST. Neither suite needs Docker. Native binaries are development dependencies; test data stays in ignored `.runtime/`.

Default browser tests start isolated production Next on 3002 with credentials blanked plus a visibly labeled synthetic planner harness on 3100. They cover 320/375/768/1024/1440 widths, keyboard interactions and axe checks. They do not authenticate real users or claim genuine AI outputs. Each browser configuration has a separate artifact directory.

```powershell
# Genuine bounded synthetic planning calls; may incur provider charges.
npm run test:providers:smoke
# Read-only public/auth-guard checks with configured environment, port 3004.
npm run test:live:public
# After isolated staging and two confirmed synthetic accounts are configured:
npm run test:live
npm run test:e2e:live
# After matching successful smoke and an explicitly allowed 24-request budget:
npm run test:ai:live
```

Never run mutation suites against customer data. `.env.live.example` documents the ignored `.env.live.local` flags. Preflight rejects absent staging confirmation/accounts and stops browser/corpus runs without a successful matching provider smoke. Blocked preflight means zero tests executed. No deployment URL is claimed.

Golden calculation: ₹300,000 fixed + 150 × ₹850 = ₹427,500 against ₹500,000. Previewing 180 guests yields ₹453,000, +₹25,500 and ₹47,000 remaining; only approval changes the event. Monetary API values are exact paise strings. Locked prices and confirmed vendor selections remain protected.

Source boundaries: `src/domain` (rules), `src/application` (HTTP/persistence), `src/infrastructure` (configuration, Supabase and AI), `src/components` and `app` (UI/routes), `supabase/migrations` (database integrity). Apply all four migrations in filename order. The seed is synthetic and local only.

P1 functions: after applying the fourth migration to verified isolated staging, set `FEATURE_EVENT_FUNCTIONS=true` to expose Functions in event navigation. Functions have independent optional schedules/time zones, owner-only create/edit/archive, and resource assignments. They share the event version, audit history and idempotency controls. Locked expenses/vendors cannot be reassigned. Existing P0 snapshots and financial calculations stay compatible. See [module contract](docs/modules/EVENT_FUNCTIONS.md). This flag is a rollout control, not a billing entitlement or an authorization bypass.

`node scripts/diagnose-providers.mjs` performs bounded read-only metadata diagnostics without generation. Run again only after a relevant configuration/access change. It never logs raw provider errors, headers or keys. Live test configs now honor process/secret-manager overrides before environment files; see `scripts/live-env.ts`.

See [status](docs/IMPLEMENTATION_STATUS.md), [test evidence](docs/TEST_REPORT.md), [decisions](docs/DECISIONS.md), [deployment](docs/DEPLOYMENT.md), [OpenAPI](docs/api/openapi.yaml) and [JSON report](docs/CODEX_COMPLETION_REPORT.json).
