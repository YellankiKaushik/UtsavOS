# UtsavOS

AI event planning for weddings, birthdays and community celebrations. A personalized draft becomes editable tasks, budgets and vendor requirements. Exact INR calculations explain the impact of changes; only explicit approval updates the saved plan.

**29 October 2026: genuine GenAI and hosted acceptance verified in isolated staging. Public release, email delivery, competition tool eligibility and owner submission actions remain pending. Commercial production is incomplete.** See the [master report](docs/UTSAVOS_FINAL_MASTER_REPORT.md) and [owner checklist](docs/OWNER_FINAL_ACTIONS.md). Earlier dated completion reports are historical.

Start with the [project description](docs/hackathon/PROJECT_DESCRIPTION.md), [demo script](docs/hackathon/DEMO_VIDEO_SCRIPT.md) and [challenge compliance matrix](docs/hackathon/CHALLENGE_COMPLIANCE_MATRIX.md). The current implementation is on [PR #1](https://github.com/YellankiKaushik/UtsavOS/pull/1), branch codex/live-release-completion. The default main branch and existing public production have not been promoted to this candidate.

## Run locally

Use Node 24.16.0 and npm 11.9.0 with the committed lockfile.

```powershell
npm ci
# For a new setup only, copy .env.example to .env.local and configure securely.
npm run dev
```

Open [localhost:3000](http://localhost:3000). Never overwrite an existing environment file. Configure an isolated Supabase project, publishable key and APP_BASE_URL. Apply all 15 forward migrations in filename order through the authenticated Supabase CLI; never reset a customer database. Enable confirmation and configure Auth Site URL/callback allowlists for the exact intended origin. The ordinary app uses end-user sessions, never a service-role key.

The verified AI route is OpenRouter, dots-studio/dots-3-note-preview:free, with AI_PROVIDER_PRIMARY=openrouter, AI_PROVIDER_FALLBACK=none, OPENROUTER_REQUIRE_FREE=true, OPENROUTER_DISABLE_REASONING=true, AI_PROVIDER_MAX_RETRIES=0 and AI_REQUEST_TIMEOUT_MS=45000. Set FEATURE_AI_GENERATION=true only after checking the configured route/privacy policy and running a successful bounded smoke. Keep OPENROUTER_API_KEY server-side. Gemini remains integrated but the supplied credential returned401; it is inactive. Model availability can change.

Supabase accepts SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY or corresponding NEXT_PUBLIC_ aliases; conflicting aliases fail safely. Provider MODEL_ID/MODEL_DEFAULT aliases must agree. No automatic fixture mode exists. .env.live.example documents separately gated synthetic staging tests.

## Try the core journey

Create an event with type, optional date/time zone, guests, budget and preferences. Generate a draft, inspect assumptions, edit/select useful records and accept them. Review tasks/dependencies and unconfirmed vendor categories. Add your own verified estimates. Preview a guest-count or catering-price change, inspect exact effects and approve. Refresh or return later to the saved plan and history.

Golden scenario: ₹300,000 fixed +150×₹850 =₹427,500. Changing to180 guests previews ₹453,000 and ₹47,000 remaining from ₹500,000. Money is stored/calculated as exact paise; the model cannot approve transactions. AI prices can be unrealistic and require human review. Tests intentionally exclude generated budget lines from this deterministic vector.

## Architecture and verification

Next.js App Router/React/TypeScript/Tailwind; Zod domain validation; Supabase Auth/PostgreSQL/RLS/private Storage; direct Gemini SDK and OpenRouter through the OpenAI SDK. src/domain contains deterministic rules, src/application HTTP and use cases, src/infrastructure service adapters, and supabase/migrations transaction/authorization guarantees. See [architecture](DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md), [decisions](docs/DECISIONS.md) and [OpenAPI](docs/api/openapi.yaml).

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:concurrency
npm run api:generate
npm run db:types
npm run build
npm run security:client
npm run test:e2e
npm run test:live:public
```

Regression:229 passed. Native PostgreSQL:22 scenarios. Synthetic browser:28 passed. Hosted Preview:6 browser journeys passed, including3 genuine AI event types; a separate3-case provider run passed after correcting a Gemini-only test import. These are different layers, not one interchangeable test count. Do not run mutating/live suites against customer data. The 24-request live corpus requires its explicit evaluation gate; skipped/filtered/blocked cases are not passes.

P1 includes event functions, private RSVP, teams, vendor finance, source-reviewed private PDFs, limits/dashboard and eligible event export/deletion. Rollout flags remain intentional. AI document extraction, verified billing, full account/backup erasure and P2 integrations remain incomplete. Billing has an offline test-mode reconciliation foundation; the live webhook continues returning503. [Billing contract](docs/modules/BILLING.md), [operations](docs/OPERATIONS_RUNBOOK.md).
