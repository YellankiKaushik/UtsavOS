# Local setup and configuration

Use Node 24.x; the validated toolchain is Node **24.16.0** and npm **11.9.0**. `package-lock.json` pins dependencies. Bring your own isolated Supabase project and server-side AI provider access; the repository does not supply shared credentials.

```powershell
git clone https://github.com/YellankiKaushik/UtsavOS.git
cd UtsavOS
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

## Database and authentication

1. Create a dedicated Supabase project for your environment. Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, or their corresponding `NEXT_PUBLIC_` aliases. Aliases must agree. Never put a service-role/secret key in publishable settings.
2. Set `APP_BASE_URL=http://localhost:3000`. In your project's Auth configuration, use that local origin and exact `/auth/callback` and `/auth/callback?next=/reset-password` redirects. Keep email confirmation enabled and use a controlled inbox to verify confirmation and recovery.
3. Review all **15** migration files in [supabase/migrations](../supabase/migrations), in filename order. They include private authorization functions, public invoker wrappers, financial locks, provenance and P1 contracts. Do not rename or edit an applied migration.
4. Inspect the installed CLI help, authenticate and dry-run against **your own project reference**:

```powershell
npx supabase --help
npx supabase login
npx supabase db push --help
npx supabase db push --project-ref YOUR_PROJECT_REF --linked --dry-run --skip-vault
# Only after confirming the target and proposed forward migrations:
npx supabase db push --project-ref YOUR_PROJECT_REF --linked --skip-vault --yes
```

`YOUR_PROJECT_REF` is an instruction placeholder, not the released UtsavOS database. Never run hosted reset/seed commands against an existing project to make tests pass. The CI `supabase db reset --local` operates on a disposable local Docker stack.

## AI configuration

The template includes both adapters. The released route was verified with these **non-secret** settings:

```dotenv
AI_PROVIDER_PRIMARY=openrouter
AI_PROVIDER_FALLBACK=none
OPENROUTER_MODEL_ID=dots-studio/dots-3-note-preview:free
OPENROUTER_REQUIRE_FREE=true
OPENROUTER_DISABLE_REASONING=true
AI_REQUEST_TIMEOUT_MS=45000
AI_PROVIDER_TIMEOUT_MS=45000
AI_PROVIDER_MAX_RETRIES=1
FEATURE_DOCUMENT_EXTRACTION=false
```

Set your own `OPENROUTER_API_KEY` privately. Catalogue capability and pricing checks, request-level zero token pricing, strict JSON/schema/domain validation, privacy deny and no provider fallback constrain the call. A free model can disappear, throttle or time out. Do not switch to a paid model or relax privacy just to reproduce a test. Keep `FEATURE_AI_GENERATION=false` until your real route is verified; saved manual planning remains available.

Direct Gemini requires your own valid `GEMINI_API_KEY` and exact `GEMINI_MODEL_ID`. The supplied release credential returned 401; integration support is not evidence of a successful Gemini draft. `MODEL_DEFAULT` compatibility aliases must agree with `MODEL_ID`. There is no production fixture mode.

## Feature flags and startup

The template defaults P1 flags off: event functions, guests, teams, vendor finance, private documents, workspace dashboard and data lifecycle. Enable modules deliberately after configuration and verification. AI document extraction stays false; its component smoke is not full hosted acceptance. Billing cannot be enabled by a presentation or feature-flag change.

```powershell
npm run dev
```

Open [localhost:3000](http://localhost:3000). Sign up using an inbox you control, confirm your account and create an event. Account secrets, session cookies and synthetic test credentials belong only in ignored local/secret-manager configuration. [Testing](TESTING.md) explains separately gated live suites. [Deployment](DEPLOYMENT.md) describes exact deployed origins.
