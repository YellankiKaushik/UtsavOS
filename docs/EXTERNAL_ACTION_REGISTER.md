# External action register

## Active 2026-10-28 reconciliation

The dated entries below describe the earlier checkpoint. Supabase target access, initial migrations, synthetic session provisioning, ordinary persistence/isolation and Docker-capable CI are now resolved through verified authenticated access. A staging Preview is deployed; complete hosted acceptance is still in progress. Real email delivery/confirmation/recovery remain unverified; administrative confirmation is not delivery evidence.

Gemini still returns authentication failure with the replaced local configuration. OpenRouter key/catalogue access succeeds, but two bounded tests of an eligible fixed free route produced no valid draft. Exact provider-side cause is not established. Owner actions remain API authorization/configuration for Gemini and an approved usable route/budget for OpenRouter; do not paste keys in chat. No unchanged generation retry is scheduled. See [LIVE_RELEASE_PROGRESS.md](LIVE_RELEASE_PROGRESS.md) for current service IDs and evidence.

2026-10-27. No secret values should be pasted in chat. Credentials belong in ignored environment files or approved secret storage. All current actions below remain BLOCKED; new diagnostic evidence replaces repeated speculative retries. No external purchase/migration/deployment was made.

## EXT-01 — Gemini

- Required access/configuration: Authorized Google key/project/API access to selected model
- Evidence: One read-only model metadata request,389ms; official v1beta endpoint and header checked; no model substitution or repeated generation
- Root cause boundary: Authentication-level failure confirmed by configured-model GET HTTP401; exact credential/project restriction not disclosed
- Exact owner action: In Google AI Studio/API key and Cloud API credentials settings verify the configured key belongs to the intended project and its API restrictions permit Generative Language. Verify API enabled/model entitlement/quota; securely replace configuration only if needed. Never paste the key in chat.
- Prerequisite: Authorized Google account/project owner access
- Risk: Credential handling; no purchase authorized
- Can execute autonomously now: Read-only diagnosis complete; cannot grant absent external authorization
- Verification: npm run test:providers:smoke -- -t gemini (once after external change)
- Status: BLOCKED

## EXT-02 — OpenRouter

- Required access/configuration: Account-permitted structured-output route compatible with retained privacy policy
- Evidence: Read-only key200/393ms and catalogue200/785ms;6 free structured candidates. One liquid/lfm-2.5-2.6b:free smoke failed ~1.23s; one nvidia/nemotron-3.5-super-vl:free smoke failed ~1.37s. Both one attempt,45s deadline, no fallback/data-collection relaxation
- Root cause boundary: Key accepted200; compatible free catalogue exists. Fixed free-model completion404/no permitted endpoint under current policy; exact exclusion not established
- Exact owner action: In OpenRouter model endpoints, account privacy and key/provider restrictions identify a permitted structured-output endpoint with data_collection=deny. Preserve privacy; select an approved fixed route. If no free compatible route exists, account owner must decide access/budget; do not purchase or silently enable training.
- Prerequisite: Approved route/account policy and explicit spend allowance for any paid model
- Risk: Third-party routing and potential inference cost
- Can execute autonomously now: Free metadata/two bounded tests completed; no further unchanged retries or paid calls
- Verification: Set both model aliases consistently in secure environment, then npm run test:providers:smoke -- -t openrouter
- Status: BLOCKED

## EXT-03 — Supabase

- Required access/configuration: Correct isolated UtsavOS staging project and management membership
- Evidence: Current list shows only unrelated inactive LoadGuard3D; configured get_project still denies permission. Historical Auth settings200/REST schema401 are reachability only
- Root cause boundary: Connected Supabase principal lacks access to configured project; isolated UtsavOS staging designation unverified
- Exact owner action: In the intended Supabase organization invite/authorize the connected account, or securely configure the actual designated staging URL/publishable key. Reconnect the correct account. Inspect project identity, migration history and grants; dry-run then apply four reviewed migrations through history. Never remote-reset.
- Prerequisite: Project owner designation and management access
- Risk: Database integrity; cloud mutations forbidden until identity verified
- Can execute autonomously now: Local migration verification complete; remote changes cannot proceed
- Verification: Authorized management get_project and migration history; local db:types; then reviewed staging migration dry-run
- Status: BLOCKED

## EXT-04 — Supabase Auth

- Required access/configuration: Two confirmed synthetic accounts in verified isolated project
- Evidence: Current live test and browser preflights execute0 tests and exit nonzero; production anonymous guard verified separately
- Root cause boundary: .env.live.local absent; staging confirmation and both account credentials missing
- Exact owner action: After EXT-03, create/confirm two dedicated synthetic users. Configure LIVE_USER_A_EMAIL/PASSWORD, LIVE_USER_B_EMAIL/PASSWORD and LIVE_STAGING_CONFIRMED=true in ignored .env.live.local. Configure exact localhost:3005 and staged callback/recovery origins, email confirmation and SMTP. Do not use customer identities.
- Prerequisite: Verified staging schema/Auth settings and successful selected-model smoke for browser
- Risk: Account credentials and synthetic staging records
- Can execute autonomously now: No account provisioning until project identity verified
- Verification: npm run test:live; npm run test:e2e:live; manually verify signup/confirmation/recovery/refresh/expiry
- Status: BLOCKED

## EXT-05 — Local Supabase/CI

- Required access/configuration: Docker-capable local machine or repository CI
- Evidence: Current PATH/common-path checks negative; no repeated doomed Supabase startup.13 native independent TCP tests pass
- Root cause boundary: Neither CLI on PATH nor known installed executable paths available; no operational local container stack
- Exact owner action: Provide an operational supported container runtime or run committed supabase-platform CI job in an authorized repository. There is currently no Git remote, so this checkout cannot dispatch its CI autonomously.
- Prerequisite: Disposable LOCAL stack or designated repository/CI access
- Risk: Local reset must never target linked/customer data
- Can execute autonomously now: Native verification done; runtime installation/remote CI unavailable
- Verification: npx supabase start; npx supabase db reset --local; npx supabase test db (LOCAL ONLY)
- Status: BLOCKED

## EXT-06 — AI evaluation

- Required access/configuration: Successful smoke and approved request budget per provider
- Evidence: Corpus preflight blocks with0 cases; synthetic contracts and adversarial doubles pass
- Root cause boundary: No provider smoke succeeds; no approved24-request budget configured
- Exact owner action: Resolve each provider, set LIVE_AI_PROVIDER and LIVE_EVAL_REQUEST_BUDGET>=24 in ignored environment, run separately. Review actual outputs for cultural/task usefulness, conflicting actions, vendor/capacity claims, financial correctness, time zones and observed usage. Schema checks do not replace judgment.
- Prerequisite: EXT-01/02 resolved plus explicitly permitted quota/budget
- Risk: Provider charges/quota and privacy; synthetic inputs only
- Can execute autonomously now: No corpus calls while smoke/budget gate fails
- Verification: npm run test:ai:live (one provider at a time)
- Status: BLOCKED

## EXT-07 — Vercel/deployment

- Required access/configuration: Designated authorized UtsavOS staging target and correct service configuration
- Evidence: Vercel account/team discovery and scoped utsav project searches empty; no unrelated target accessed
- Root cause boundary: No .vercel link or Git remote; authorized personal and available team project search returns no UtsavOS target
- Exact owner action: Designate/link the actual UtsavOS Vercel-compatible staging project/team and environment; assign region/operator, configure secrets, exact APP_BASE_URL and Auth callbacks. Deploy only that target after critical service gates. Verify real health/login/persistence/tenant/proposal journeys. No plan change or domain purchase.
- Prerequisite: Correct hosting target and verified Supabase/provider settings
- Risk: Publication and potential hosting cost; no unrelated projects
- Can execute autonomously now: Local build complete; no target can be safely selected or deployed
- Verification: Target-specific reviewed deployment, inspect logs/health; run deployed authenticated journey
- Status: BLOCKED
