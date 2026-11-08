# UtsavOS Open-Source Transition Plan

**Status:** proposed, implementation not started

**Order:** documentation and legal decisions → isolated showcase → offline/public verification → separate publication review → only then, if the owner elects, a distinct hosted-service retirement decision.

The objective is a useful reference application plus a permanent backend-free public demonstration. This plan preserves the original Next.js app, migrations, reachable Git history, released evidence and all hosted resources. A static showcase is not a migration of user accounts or production data.

## Recommended boundary

Add `showcase/` as a static Vite + React entrypoint (or a minimal static HTML/TypeScript app if its implementation stays simpler). Build it as static assets that work on a clean machine with no `.env` file, no Supabase project, no provider account, no Vercel deployment URL and no network connection after loading. Keep its route tree, fixtures and styles inside `showcase/`.

Reuse only demonstrably pure functions from `src/domain/` when their module graph is browser-safe; do not import `app/`, `src/application/` or `src/infrastructure/`. Add parity tests for any duplicated calculation. The showcase must not import Supabase/OpenAI/Gemini SDKs or call HTTP APIs. It can use browser-local storage for an explicitly temporary visitor demo; include a one-click reset and never sync it elsewhere.

Suggested layout:

````text
showcase/
  index.html
  src/                  # isolated UI and local interactions
  fixtures/             # reviewed synthetic events/plans; no user exports
  public/               # approved, licensed static assets only
  tests/                # component, calculation-parity and offline browser checks
  vite.config.ts


For public hosting, prefer a separate GitHub Pages workflow rooted at `showcase/dist`, after the repository owner enables Pages and approves the URL. It should not change the existing Vercel project, production alias, domain or secrets. If GitHub Pages is not suitable, compare other static hosts with the owner and keep the deployment artifact independent of Supabase and of the production app deployment.

## What the showcase can and cannot demonstrate

| Safe to make interactive with synthetic/local behavior                                      | Must remain described as hosted-only or visibly simulated                                                           |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Event type/date/guest/budget setup; wedding, birthday and community samples                 | Real signup, confirmation, password recovery, login, session refresh or roles                                       |
| Manual event edits, exact budget arithmetic, line items, locked estimates and budget totals | Supabase persistence, collaboration, cross-device data, workspace isolation/RLS guarantees                          |
| Task checklist, dependency visualization, manual task/vendor changes                        | Real guests/contacts, invitations, live RSVP capabilities, email delivery                                           |
| A bundled AI-shaped sample draft that visitors can review, edit and selectively accept      | A new/generated model response, provider provenance, availability, price, privacy guarantee or current model access |
| Deterministic change preview and before/after replan calculations using pure domain rules   | A production transaction, database audit receipt, server lock, permission check or approved financial change        |
| Synthetic dashboard, history and static document/quotation example when labeled             | Real invoice/payment, private upload, OCR/PDF extraction, quote validation, account export or deletion              |
| Local reset and sample reload                                                               | Persistent account data or a claim that browser storage is private/secure backup                                    |

Use conspicuous copy such as **“Static demo · synthetic data · saved in this browser · sample AI output, no model call.”** Keep every person, vendor, event, quote, amount, status and history row in fixtures invented and reviewed for disclosure. Do not repurpose raw runtime artifacts or reviewer records. Existing screenshots have synthetic provenance in the repository, but check their rights and re-review them before bundling into a separately licensed public showcase.

## Phase plan

| Phase / risk                                                                    | Scope and intended files                                                                                                                                                                                                                                                                                                                                  | Acceptance checks                                                                                                                                                                                                                                                                                                                                                                                                   | Rollback and boundary                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0 — Preserve baseline (low, first)**                                          | Record base SHA/branch; retain current `README.md`, `DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md`, migrations, tests and evidence. Add no rewrite or deletion.                                                                                                                                                                                              | `git status --short`; branch diff from protected main contains only scoped files; history scanner is values-free; confirm existing ignored `.runtime/` and local env stay untracked.                                                                                                                                                                                                                                | Revert only the new documentation commit. Never reset a hosted database, clean private evidence, discard another worktree's files or rewrite existing refs.                                                                                  |
| **1 — License and public contribution terms (high, owner decision)**            | Owner selects the project license and whether it covers code, docs, diagrams, screenshots and fixtures. Later files: root `LICENSE`; update `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/README.md`; consider `NOTICE`/asset notices only if required. Preserve `package.json` `private:true` unless a separately scoped npm package is intended. | Chosen license is approved and applies to all included material; attribution and asset sources are reconciled; contribution terms, vulnerability intake and maintainer contact path are accurate; no unknown third-party asset is relicensed by implication.                                                                                                                                                        | Revert unmerged licensing docs before publication if ownership is unclear. Do not add a default permissive license, CLA, maintainer identity or legal/compliance claim without owner approval.                                               |
| **2 — Dependency and security baseline (high)**                                 | Review `package.json`/`package-lock.json`, `npm sbom --sbom-format=spdx`, current license metadata/texts, native/optional packages, workflow actions and ignored files. Later files may include pinned security/license tooling, `.github/dependabot.yml`, workflow changes or `NOTICE`.                                                                  | Reproducible `npm ci`; reviewed production and dev dependency inventory on Linux and Windows; all license expressions/texts/attribution obligations resolved for the selected license; redacted secret/history scans clean; updates are pinned and CI passes.                                                                                                                                                       | Roll back only the tooling/workflow PR if noisy or breaking. Keep lockfile reproducibility; never silently remove a dependency to clear a scanner. Do not rewrite history absent a confirmed owner-approved incident.                        |
| **3 — Implement isolated static showcase (medium)**                             | Add `showcase/index.html`, `showcase/src/`, `showcase/fixtures/`, `showcase/public/`, `showcase/tests/`, `showcase/vite.config.ts`; update root scripts/lockfile only if needed and with a reviewable dependency rationale. No edits to application routes, Supabase config, migrations, server AI adapters or Vercel production config.                  | `npm ci` then a deterministic static build with all hosted environment variables unset; bundle contains no credentials or hosted SDKs; browser interactions use only reviewed fixtures and local state; no outbound requests beyond the same-origin static assets; labels distinguish saved sample AI from live generation; reset clears demo storage; calculations match the pure domain logic.                    | Revert the showcase-only commit. Existing Next.js code and hosted app remain operational. No hosted mutation, AI spend, auth change, migration or account setup is part of implementation.                                                   |
| **4 — Offline, accessibility and public-build verification (high gate)**        | Add/extend showcase-specific unit and browser tests, CI workflow job and offline/security checklist. Likely files: `showcase/tests/**`, `.github/workflows/ci.yml` or a separate showcase workflow, `docs/TESTING.md`, `docs/SECURITY.md` if later created.                                                                                               | On clean Linux CI: isolated install/build succeeds; test every main flow with browser network blocked except local static origin; inspect requests/storage and built output; keyboard-only and axe checks pass; test narrow/mobile/desktop layouts; reload/reset semantics verified; no `.env`, remote API or unapproved media required. Also ensure existing `validate` and `supabase-platform` checks still pass. | Revert only showcase job/test changes if they destabilize existing CI; keep the app's required checks. Do not use production traffic or live AI to satisfy static acceptance.                                                                |
| **5 — Publish showcase independently (medium, account setting)**                | Later add a dedicated workflow such as `.github/workflows/showcase-pages.yml`, Pages configuration and a README link after owner confirms title/URL. Publish only `showcase/dist`, with a restrictive static content policy and no secrets.                                                                                                               | Deployed site works in a signed-out clean browser; all URLs/assets load under the actual Pages subpath; network panel shows static same-origin requests only; reset and all synthetic interactions work; production Vercel project/domain remain unchanged.                                                                                                                                                         | Disable/revert only the Pages workflow and restore its previous static release artifact. Do not remove the Vercel deployment or edit production aliases/env as part of Pages rollback.                                                       |
| **6 — Separate future hosted-retirement review (highest, not authorized here)** | No implementation until a new owner decision. Inventory accounts, users, events, documents/buckets, backups, billing bindings, auth callback/email configuration, domains and project logs; identify notice, export, legal-retention, support and restore obligations.                                                                                    | Owner approves a service-by-service retirement schedule only after showcase is publicly stable for an agreed observation period, every existing user-data obligation has a verified path, backups are restorable, ownership is confirmed and a rollback window exists.                                                                                                                                              | Destructive deletion/revocation is an explicit separate action. No Supabase deletion/reset/user/bucket/backup change, Vercel project/deployment/domain/env removal, credential revocation or DNS cutover is included in this plan or its PR. |

## Verification commands

### Existing application baseline

Run on an isolated checkout with Node 24 and a lockfile install:

```powershell
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:concurrency
npm run build
npm run security:client


Database/RLS verification uses a disposable local stack only:

```powershell
npx supabase start
npx supabase db reset --local
npx supabase test db
npx supabase stop


The commands do not authorize `supabase db reset` without `--local`, hosted migration pushes, real accounts or live provider calls. Hosted suites remain explicitly gated by the existing preflight and owner-approved target/budget.

### Future showcase acceptance commands

Once Phase 3 exists, document exact scripts in `package.json` or the showcase package and use equivalent commands:

```powershell
# Run with every app/provider environment variable unset.
npm ci
npm run showcase:build
npm run showcase:test
npm run showcase:e2e:offline


The offline browser suite should deny all requests outside the local preview origin and assert none are attempted; inspect browser storage for only synthetic demo state; search the built assets for provider keys, Supabase client libraries, API endpoint strings and unapproved network/font references. These checks complement, not replace, the existing application/security suites.

## Owner decisions and release boundaries

1. Select and approve the license and covered files before describing the whole repo as open source.
2. Confirm whether the public showcase will be hosted on GitHub Pages and approve the permanent URL/account setting.
3. Review third-party and generated media rights and dependency notices.
4. Define a future user-data/backup/retention/communication plan before deciding whether any hosted application component should ever be retired.

No owner decision is needed to review this documentation-only proposal. Branching, merging, publishing and every destructive service action remain subject to their normal protected workflows and separate authorization.
````
