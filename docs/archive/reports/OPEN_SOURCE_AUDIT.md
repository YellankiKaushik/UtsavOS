# UtsavOS Open-Source Transition Audit

**Audit date:** 2026-11-08

**Reviewed baseline:** protected `main`, commit `c3b8600c85943cbd86fe1c0937bd9a8229279cb8`

**Purpose:** prepare the existing Challenge 5 implementation for an open-source reference release and a permanent backend-free showcase. This audit changes no application behavior and does not authorize hosted-service changes.

## Executive findings

UtsavOS is a single Next.js App Router application with a useful separation between pure domain rules, application commands, infrastructure adapters and SQL authorization. Its current interactive application is not backend-independent: authenticated pages and most API routes require a Supabase user session, while plan generation requires a server-side model credential and external provider. The local seed and committed screenshots are identified as synthetic, but the sample seed is explicitly for local testing only.

Retain the original Next.js application, domain rules and migrations as a reusable source reference for contributors. Build a standalone static `showcase/` around synthetic events, sample AI plans, deterministic budget and replan calculations, and browser-local edits. Its build and runtime will be independent of Supabase, OpenRouter, Gemini and application API routes. Verify the artifact in isolation and on a non-production deployment before requesting approval to publish it to the existing Vercel project at [utsavos.vercel.app](https://utsavos.vercel.app), the preferred permanent public URL. The full-stack application may eventually stop serving production traffic while its source remains available.

The repository is public, but has **no `LICENSE` file**. It is therefore not yet an openly licensed codebase: public visibility alone does not grant reuse rights. The lockfile is pinned and CI is substantial, but license metadata, attribution obligations, automated dependency/security monitoring and the security-reporting setting need review. No production code, database, account, data, Vercel project or credential was changed in this audit.

## Scope and method

Reviewed the repository tree and documentation, V2 architecture, Next.js pages and API dispatch, application/domain/infrastructure modules, all 15 SQL migrations, local seed and RLS tests, package manifests/lockfile, environment templates, GitHub Actions, Vercel config, and existing deterministic/live test layouts. Reviewed the reachable Git graph and scanned all locally available reachable Git refs without printing credential values. The installed `node_modules` license fields were summarized locally.

This is a source and local-history audit. It does not query the Supabase or Vercel account dashboards, inspect unreachable server-side Git objects, make an AI request, exercise an authenticated production account, render a new showcase, or certify legal, privacy or security compliance. The last items require separate, bounded verification in later phases.

## Architecture and service boundaries

| Area                   | Current implementation                                                                                                                                                         | Hosted or credential dependency                                                                                                         | Static-showcase treatment                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Web shell              | `app/`, `src/components/`, Next.js 16 App Router, React, TypeScript and Tailwind                                                                                               | Vercel builds and serves the production app; Next route handlers run server-side                                                        | New isolated static entry under `showcase/`; no Next server runtime                                                                     |
| Identity and tenancy   | Supabase SSR client, Auth callback/actions, cookie refresh in `proxy.ts`, user-scoped PostgREST and RLS/RPC authorization                                                      | Supabase Auth/PostgreSQL and publishable project URL/key; confirmation and recovery email are configured through Auth                   | Do not imitate login or claim cross-device persistence. Use an obvious demo identity-free mode and local synthetic state                |
| Event persistence      | 15 forward-only SQL migrations, generated DB types, owner/member policies, private security-definer functions behind invoker RPC wrappers, locks, versions, receipts and audit | Supabase PostgreSQL; normal application calls use an authenticated user session                                                         | Use local fixture data and browser storage only; no Supabase client, migration, endpoint or credential in the showcase bundle           |
| AI planning            | Shared `ModelTransport`; strict OpenRouter and Gemini adapters, structured output/schema/domain checks, usage provenance, bounded deadline/retries                             | OpenRouter or Google Gemini API, server-side API key, model and policy configuration; live usage can be throttled or unavailable        | Show a clearly labeled, bundled synthetic plan and deterministic acceptance UX; never label it a live model response or call a provider |
| Private files          | Document domain/application code, bounded PDF worker, private Storage bucket access and quote provenance                                                                       | Supabase Storage plus authenticated authorization; external document contents are untrusted                                             | No upload, extraction, external file request or user document. A synthetic quote example may be static text only                        |
| RSVP, guests and teams | Token-scoped RSVP endpoints, household/guest tables, scoped assignments and invites, feature-flagged modules                                                                   | Supabase tables/RPCs; RSVP is a public capability URL backed by server authorization                                                    | A nonfunctional preview of guest/RSVP screens may use explicit fake names and inert links; never mint real capability tokens            |
| Finance and lifecycle  | Exact integer-paise domain calculations, vendor finance, entitlements, exports and lifecycle/account requests                                                                  | Transactional Supabase RPCs; private finance/lifecycle records                                                                          | Safe to demonstrate calculations against synthetic values; no invoices, payments, account deletion or data export claims                |
| Billing                | Billing reconciliation tables/functions exist; `app/api/billing/webhook/route.ts` fails closed with 503                                                                        | No configured payment integration found; no Stripe dependency or working checkout/webhook flow                                          | Exclude checkout/subscription flows. Do not describe reconciliation foundation as billing support                                       |
| Deployment and checks  | `vercel.json`, Next build on Vercel; GitHub Actions `validate` and `supabase-platform`                                                                                         | Vercel project/domain and its configuration. `VERCEL_OIDC_TOKEN` is test-helper access to protected deployments, not an application key | Verify portable static output before seeking approval to publish it to the existing Vercel project at the canonical URL                 |

The pure `src/domain/` code is the strongest source for a faithful local demo: event and AI contracts, money, tasks/dependencies and replan effects contain deterministic rules. Avoid imports from `app/` and `src/infrastructure/`; those cross into server-only or hosted boundaries. A small parity test should compare showcase calculations with the pure domain functions so copied demo behavior does not silently drift.

## Repository and source inventory

- `app/`: landing, login, onboarding, password reset, authenticated app shell, public RSVP shell, auth actions/callback, health route, catch-all authenticated API and fail-closed billing webhook.
- `src/domain/`: event/API contracts, AI draft validation, dates, exact money, task DAGs, deterministic replanning, guest/team/function/document/finance/lifecycle/billing rules.
- `src/application/`: request envelope, origin checks, repository access and feature-specific HTTP command handlers.
- `src/infrastructure/`: Supabase clients/fetch, OpenRouter and Gemini transports, document/PDF handling, provider diagnostics and billing boundary.
- `supabase/`: 15 additive migrations, local Supabase config, an explicitly synthetic local seed and SQL RLS tests. Applied migrations are historical records and must not be rewritten as part of open-source preparation.
- `tests/`: unit, AI adapter, contract, integration, concurrency, Playwright E2E, local database and separately gated live/staging suites. Deterministic fixtures are distinct from real provider results.
- `scripts/`: environment checks, provider diagnostics, preflight gates, contract/database type generators, secret scanning, docs verification and report generation.
- `.github/workflows/ci.yml`: format, lint, types, unit/integration, concurrency, generated-contract consistency, build, client-secret scan, browser E2E and disposable local Docker Supabase tests. Workflow permissions are read-only for repository contents; third-party Actions use major-version tags rather than full immutable commit SHAs.
- `docs/` and `DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md`: setup, architecture, OpenAPI, operational/release/security guides, implementation status, retained evidence, module documentation and historical reports. The release handoff is the current release guide; old status reports are snapshots and should remain labeled historical.

### SQL migration inventory

All 15 files are additive release history; keep their names and order intact.

| Migration                                                   | Main purpose                                                                                                                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261026142503_p0_core.sql`                                | Workspaces, memberships, events, budget, tasks/dependencies, vendor requirements, AI drafts/usage, proposals, audit, idempotency, RLS and core transactional command |
| `20261026165848_ai_provider_provenance.sql`                 | AI request/provider metadata and command updates                                                                                                                     |
| `20261026180040_combined_change_financial_bounds.sql`       | Shared locked/idempotent command core and financial bounds                                                                                                           |
| `20261026183745_p1_event_functions.sql`                     | Event functions, linked resources, authorized snapshot/command                                                                                                       |
| `20261027192558_p1_guest_rsvp.sql`                          | Households, guests, attendance, private invitation/RSVP receipts and scoped RSVP RPCs                                                                                |
| `20261027195746_p1_team_collaboration.sql`                  | Event assignments, private team invites/audit/receipts and role capabilities                                                                                         |
| `20261027201649_p1_vendor_finance.sql`                      | Quotes, commitments, invoices, payment records and guarded finance RPCs                                                                                              |
| `20261027203506_p1_private_documents.sql`                   | Private document metadata/text, quotation extractions and scoped Storage policies                                                                                    |
| `20261028015656_p1_document_quote_provenance.sql`           | Source-linked quote provenance constraints                                                                                                                           |
| `20261028022000_p1_entitlements_dashboard.sql`              | Private workspace entitlement and dashboard foundations                                                                                                              |
| `20261028023000_p1_event_data_lifecycle.sql`                | Event lifecycle/export/account-data request foundations and lock integration                                                                                         |
| `20261028090000_storage_upload_lifecycle_serialization.sql` | Private Storage upload/delete/lifecycle serialization                                                                                                                |
| `20261029104615_ai_prompt_version_provenance.sql`           | Known prompt-version provenance constraint                                                                                                                           |
| `20261029112216_billing_reconciliation_foundation.sql`      | Private billing binding/receipt queue foundations; not a payment integration                                                                                         |
| `20261029120336_ai_failure_diagnostics.sql`                 | Allowlisted provider failure diagnostics                                                                                                                             |

`supabase/seed.sql` uses an `.invalid` synthetic account and labels itself local-only. Keep it separate from hosted deploy instructions; never run reset/seed against an owner's project. SQL test identities are also synthetic fixtures.

## External services and credentials

The names below are inventory only. This document intentionally contains no values, account identifiers, tokens, email addresses or private reviewer data.

### Runtime / deployment configuration

`APP_BASE_URL`, `NODE_ENV`, `VERCEL_ENV`, `VERCEL_URL`.

`APP_BASE_URL` defines the canonical origin outside Preview. Vercel's environment and deployment-host values select the exact Preview origin; origin validation does not trust arbitrary Host headers. `VERCEL_OIDC_TOKEN` is used by protected-deployment test tooling only.

### Supabase and secret-scan references

`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`.

The two URL and publishable-key aliases must agree if both are set. The key is a publishable client identifier and is not a substitute for RLS. `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SECRET_KEY` occur only in secret/client-scan or test-guard references, not in the normal application configuration. Do not provision privileged values to the application runtime or showcase.

### AI provider configuration

`AI_PROVIDER_PRIMARY`, `AI_PROVIDER_FALLBACK`, `AI_PROVIDER_MODE`, `AI_PROVIDER_TIMEOUT_MS`, `AI_PROVIDER_MAX_RETRIES`, `AI_REQUEST_TIMEOUT_MS`, `GEMINI_API_KEY`, `GEMINI_MODEL_ID`, `GEMINI_MODEL_DEFAULT`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_ID`, `OPENROUTER_MODEL_DEFAULT`, `OPENROUTER_DISABLE_REASONING`, `OPENROUTER_REQUIRE_FREE`.

Provider API keys are server-only secrets. Model identifiers and routing/timeout fields are configuration rather than credentials. The OpenRouter adapter discovers the model catalogue, requires structured-output support and denies data collection; a zero-price ceiling is configurable and was required for the verified release route. Both adapters validate structured output before the application accepts it. The `AI_PROVIDER_FALLBACK` option must not be interpreted as permission to bypass configured privacy, free-price or route policy.

Set `OPENROUTER_REQUIRE_FREE` to require zero pricing for prompt and completion tokens. `OPENROUTER_DISABLE_REASONING` requires a model that supports disabling reasoning and sends the request with reasoning disabled and excluded from the response.

### Feature flags

`FEATURE_AI_GENERATION`, `FEATURE_AI_REPLAN`, `FEATURE_EVENT_FUNCTIONS`, `FEATURE_GUESTS`, `FEATURE_TEAMS`, `FEATURE_VENDOR_FINANCE`, `FEATURE_DOCUMENTS`, `FEATURE_DOCUMENT_EXTRACTION`, `FEATURE_WORKSPACE_DASHBOARD`, `FEATURE_DATA_LIFECYCLE`.

Local template defaults and the released production configuration differ. Treat the deployment guide and verified release handoff as operational evidence; do not copy a production flag set into an example template or turn on disabled extraction/billing from this audit.

### Live verification / capture tooling

`LIVE_USER_A_EMAIL`, `LIVE_USER_A_PASSWORD`, `LIVE_USER_B_EMAIL`, `LIVE_USER_B_PASSWORD`, `LIVE_STAGING_CONFIRMED`, `LIVE_EVAL_REQUEST_BUDGET`, `LIVE_AI_PROVIDER`, `LIVE_EXPECT_AI_ENABLED`, `LIVE_EXPECT_MODEL`, `LIVE_PREVIEW_URL`, `LIVE_EVIDENCE_DIR`, `LIVE_VERIFY_QUOTATION`, `CAPTURE_DEMO`.

These inputs are for operator-authorized live tests, not public CI or the showcase. Keep identity values and evidence private in ignored local configuration or an approved secret manager. Live suites have separate preflights: hosted-browser runs require explicit staging confirmation and isolated identities; the AI corpus suite has a request-budget gate.

`VITE_AUTH_PROVIDER` appears in the legacy environment audit's diagnostic name list; no active production Vite auth adapter was found. `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SECRET_KEY` are scanner/guard-only names rather than normal runtime settings.

### Services not found as active integrations

- No Stripe SDK, API key, checkout handler or functioning payment webhook was found. Billing schema/reconciliation scaffolding is not a payment service.
- No application email/SMS provider SDK or notification sender was found. Supabase Auth handles configured confirmation/recovery delivery; provider settings are external account configuration.
- No client-side production database cache or offline adapter exists. If Supabase is absent, the authenticated server client fails with a configuration error; the public landing/liveness routes alone do not form a backend-free planner.
- The standalone showcase can build and run without service credentials. GitHub Pages is an optional alternative static host and would require a separate owner decision.

## Secret-exposure audit

### Results

- Scanned **531 tracked blobs** among **1,215 Git objects** reachable from all locally available Git refs, including available local, archive and remote-tracking branches.
- Compared credential-like values held in memory from the running environment and root non-template `.env*` files against reachable blob contents. No exact match was found. No non-template `.env*` file was present at the repository root during this audit.
- The one-time audit checked patterns for OpenRouter tokens, Google API keys, Supabase secret keys, GitHub tokens and private-key PEM markers. It found **zero matches**.
- The templates `.env.example` and `.env.live.example` leave credential fields blank and supply defaults for non-secret settings such as the local origin, provider, model and feature flags. Test and CI guard references do not contain live service-role or secret keys.

The scan did not print or persist candidate values. These checks reduce risk; they cannot prove absence of credentials encoded in an unrecognized format, deleted/unreachable objects, un-fetched server-side refs, artifacts outside the Git object graph or external CI/deployment settings. No history rewrite is justified by these results. If a later finding is confirmed, first scope exposure, affected systems and owner authorization; do not automatically revoke credentials or rewrite protected history.

The repeatable `node scripts/audit-history-secrets.mjs` check compares locally reachable blobs with loaded sensitive environment values and checks OpenRouter, Google and Supabase provider patterns. To reproduce the broader one-time audit coverage, also run a redacted history scan that explicitly covers GitHub tokens and private-key PEM markers across the same reachable refs. The repository script writes an ignored artifact below `.runtime/` containing paths and finding kinds. `npm run security:client` scans built client output. Keep any findings with sensitive paths private.

## Open-source readiness assessment

| Risk                                    | Finding                                                                                                                                                                                                                                                                                                                                 | Required resolution before broad open-source promotion                                                                                                                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Critical — license**                  | No root `LICENSE` exists; README and CONTRIBUTING say no license is selected. Public access does not grant permission to reuse code or included media.                                                                                                                                                                                  | Owner selects a license and scope after reviewing code, screenshots, diagrams, names/logos and contributions. Add the exact approved license and update README/contribution guidance; do not infer MIT or another license.   |
| **High — dependency obligations**       | `package-lock.json` pins versions. Local metadata showed 479 installed package instances and no missing `license` field; it includes SPDX expressions with LGPL-3.0-or-later, Python-2.0 and CC-BY-4.0 among others. This was a metadata summary of one installed platform, not a legal compatibility review or full license-text scan. | Generate an SBOM on supported CI platforms, reconcile package license texts and optional/native dependencies, review attribution/copy-left obligations and publish notices as required by the chosen project license.        |
| **High — hosted app separation**        | Core planner state/auth/RPCs and all real document/tenant features rely on hosted services. Removing configuration makes the authenticated application unavailable.                                                                                                                                                                     | Implement and independently verify a static showcase before any hosted retirement decision. Keep the Next.js app and data path intact through the showcase release.                                                          |
| **High — external privacy/risk**        | AI prompts leave the app for configured providers; provider privacy terms and capacity are outside repository control. Auth email/Storage are configured in Supabase.                                                                                                                                                                   | Document bring-your-own credentials, data sent, opt-in switches, no default live call and an offline path. Never put provider keys in static assets. Review current provider terms separately before inviting real data.     |
| **Medium — security maintenance**       | CI is extensive and has read-only contents permission, but Actions are referenced by major tag; no dependency-update/security-analysis workflow is present in `.github/workflows/`.                                                                                                                                                     | Add a maintainer-reviewed dependency update policy, security scanning/SBOM, immutable action pinning policy and release process in a later scoped PR. Avoid broad automated dependency updates without test/rollback review. |
| **Medium — vulnerability intake**       | `SECURITY.md` gives private-reporting steps conditionally. Repository settings were not queried.                                                                                                                                                                                                                                        | Verify GitHub private vulnerability reporting is enabled and the maintainers can receive/respond to reports before advertising a response process.                                                                           |
| **Medium — evidence freshness/privacy** | Valuable release, live AI failure/success and submission evidence exists; some docs are dated snapshots and some raw artifacts are ignored/private.                                                                                                                                                                                     | Preserve history. Mark snapshots with date/commit, keep only redacted/synthetic evidence public, and designate current docs. Do not copy runtime logs, user/session details or credentials into the showcase or reports.     |
| **Low — npm package status**            | `package.json` has `"private": true`; this application is not currently publishable through `npm publish`. This does not prevent a public GitHub source repository or static site.                                                                                                                                                      | Leave it in place unless maintainers deliberately define a published package; if doing so, specify package boundaries, license metadata, provenance and release versions separately.                                         |

## Verification commands

These commands document the verification paths available to contributors.

Run the Supabase commands only in a fresh disposable VM or CI job with its own Docker daemon. Worktrees using the same daemon and Supabase project ID can share a local stack. The reset erases the target database, so confirm the disposable stack was started in that environment before running it.

```powershell
# Review the selected refs and preserved file history.
git status --short --branch
git branch -avv
git log --oneline --decorate --all

# Local code checks; do not point database commands at a hosted project.
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:concurrency
npm run build
npm run security:client

# Current migration/RLS suite on a disposable local Supabase stack only.
npx supabase start
npx supabase db reset --local
npx supabase test db
npx supabase stop

# Redacted/values-free current history scanner (writes ignored .runtime evidence).
node scripts/audit-history-secrets.mjs

# Dependency inventory for later license review.
npm sbom --sbom-format=spdx
```

## Verification limitations

Live provider and hosted-browser commands remain separately gated. Hosted browser flows require an explicit staging marker, isolated synthetic identities and project configuration; the AI corpus has an explicit request-budget guard. They are not necessary to build or verify the static showcase and must not become a default showcase CI requirement.

## Destructive-action boundaries

This audit and its plan do not authorize deletion, reset, modification or migration of any Supabase project, database, user, bucket, backup or record. They do not authorize Vercel project/deployment/domain/environment changes, credential revocation, paid AI calls, live migrations, user-data export, production traffic changes or Git-history rewriting. Any eventual retirement of a hosted service is a separate owner decision after the showcase is complete, user-data/backup/restore/retention obligations are resolved, and a reversible release plan is approved. Keep the Vercel project and its canonical alias in place. Review user data, retention obligations, backup and restore evidence, and authorization before retiring any unused production credential or service.

## Related documents

- [Architecture](../../ARCHITECTURE.md) and [V2 architecture](../../../DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md)
- [Local setup](../../SETUP.md), [testing](../../TESTING.md), [deployment](../../DEPLOYMENT.md), [security policy](../../../SECURITY.md) and [contributing](../../../CONTRIBUTING.md)
- [Implementation status](IMPLEMENTATION_STATUS.md), [release handoff](HACKATHON_RELEASE_HANDOFF.md) and [retained live AI evidence](../../hackathon/AI_RELEASE_VERIFICATION_2026-10-29.md)
- [Phase-wise transition plan](OPEN_SOURCE_TRANSITION_PLAN.md)
