# Deployment and release operations

The owner-approved app is live at https://utsavos.vercel.app . Default branch **main** is the stable production/submission branch; PR #1 is already merged. See [release evidence](HACKATHON_RELEASE_HANDOFF.md) and [the release/rollback runbook](hackathon/RELEASE_RUNBOOK.md). This documentation task does not alter runtime configuration, financial rules, migrations, secrets or user data.

## Git and hosting

Vercel project utsavos uses the repository root, Next.js, Node 24, `npm ci` and `npm run build` from [vercel.json](../vercel.json). A feature-branch push creates a protected Preview; it must not be presented as a public submission URL. Main pushes trigger production-target builds, including documentation-only commits. An unchanged application tree after a docs-only build is verified with deployment metadata and anonymous/authenticated guard checks, not new model calls.

Main changes go through PRs and the active main-only ruleset. Required Actions contexts are **validate** and **supabase-platform**, tied to GitHub Actions. Deletion and non-fast-forward pushes are blocked; conversations must be resolved, and the branch must be current. No bypass actors or impossible second-maintainer approval are configured. Use a focused revert/fix PR for urgent repair.

## Runtime configuration

| Setting             | Release contract                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APP_BASE_URL        | https://utsavos.vercel.app in production; exact local origin for development                                                                            |
| Preview origin      | Exact platform VERCEL_URL, never untrusted Host headers                                                                                                 |
| Supabase            | Dedicated project URL/publishable key with end-user sessions; no deployed service-role key                                                              |
| AI                  | OpenRouter, fixed dots-studio/dots-3-note-preview:free, fallback none; server-only credential                                                           |
| Safety              | Free pricing required, reasoning disabled, privacy deny, strict output validation, 4096-token maximum                                                   |
| Deadline/retry      | 45000 ms total/provider cap, one early transient retry sharing that deadline                                                                            |
| P1 flags            | Functions, guests, teams, vendor finance, documents, dashboard/data lifecycle enabled in the verified release; false by default in a new local template |
| Document extraction | false until full hosted acceptance; no Stripe or P2 activation                                                                                          |

The exact variable names are in [setup](SETUP.md) and [.env.example](../.env.example). Sensitive values are masked by Vercel; inventory presence is not value verification. Never print or copy secrets into reports.

## Auth and database

Keep email confirmation enabled and exact canonical callback/recovery URLs allowlisted. Preserve separately approved exact Preview redirects; avoid wildcards. Real email delivery/expiry/replay remains unverified because no controlled inbox was connected; the owner selected private synthetic reviewer access. The reviewer is isolated and its credentials are not public documentation.

All **15** migrations through 20261029120336_ai_failure_diagnostics were applied additively and matched remote in the release dry run. Do not reset/seed hosted data, edit applied migrations or weaken RLS to deploy. Database tests use disposable local stacks. [Local project setup](SETUP.md) uses your own project reference.

## Verification and rollback

Record commit, deployment target/ID, canonical alias and flags. Signed-out landing/health should return 200; application routes redirect to login and authenticated APIs deny access. Use the authorized synthetic reviewer to verify sessions/runtime guards. Real provider generation is separately bounded and authorized; don't consume live quota for a README change. Initial production rate limits and successful affected reruns remain in [AI verification](hackathon/AI_RELEASE_VERIFICATION_2026-10-29.md).

Preserve the previous known deployment before release. Restore its alias/configuration on an application regression and verify access/persistence; don't assume environment changes affect an existing build. Retain additive schema and audit records. Provider unavailability must keep manual planning usable and failures visible. The [runbook](hackathon/RELEASE_RUNBOOK.md) records actual release/rollback checkpoints.

## Historical pre-release staging snapshot

The following 28 October record is retained as evidence of the state **before** the owner-approved release. Its pending-release statements are superseded by the guide above.

# Deployment and operations

2026-10-28 (Asia/Calcutta). **Staging manual flows verified; complete live release blocked.**

- Repository: https://github.com/YellankiKaushik/UtsavOS; branch `codex/live-release-completion`; production branch `main` unchanged.
- Vercel project `utsavos` / `prj_PqBVW2XZqRNqmkhNVgoBOMEysCbm`, team `team_UYEpjjRaObtrYF55SYu5rqUl`. Next.js framework; repo root; `vercel.json` explicitly uses `npm ci` and `npm run build`; default output, Node24. CI uses24.16.0.
- Verified implementation Preview: [utsavos-l4fm7nwpy-kaushik-yellanki-project.vercel.app](https://utsavos-l4fm7nwpy-kaushik-yellanki-project.vercel.app), `dpl_96sUVUXP5R1Fz8WMkszwYA3ZXUyw`, SHA `314700302aee83debe80a9d574dab074435afccf`, READY. A documentation-only branch push may create another Preview; this is the actually tested artifact.
- Deployment Protection remains enabled. Tests inject short-lived Vercel OIDC only at the exact deployment origin, preserving cookies. No token, trace, screenshot or video artifact is published.
- Preview `FEATURE_AI_GENERATION=false` disables planning, explanation and extraction provider calls. `FEATURE_AI_REPLAN=true` keeps deterministic core replanning available; its legacy name must not be mistaken for permission to call an LLM. Document extraction feature remains false/unset.
- Functions, guests, teams, vendor finance, documents, workspace dashboard and data lifecycle enabled only for the review branch after their respective hosted migration/session tests. Defaults in .env.example remain false; production P1 flags were not enabled.
- Supabase `upbwahlegwcwiladfwwd`, ap-south-1, PostgreSQL17.11:12 additive migrations applied after dry runs; no remote reset, seed or vault/role push.
- Vercel service-role credentials absent. Normal application/testing uses ordinary sessions; one-time synthetic account provisioning was administrative and is not signup delivery evidence.
- Exact tested Preview callback and recovery URLs allowlisted; existing production URLs/site URL/email confirmation preserved. Password login/cookies/logout tested; actual email confirmation/recovery callback remains unverified.
- Trusted origins derive from configured APP_BASE_URL or exact Preview VERCEL_URL, never user Host/forwarded headers. .vercelignore excludes env/runtime/test credentials and the owner image.

Production promotion is prohibited until genuine AI generation/draft acceptance, controlled-inbox signup/recovery, billing if charging, and operational privacy/retention/support/backup-restore gates pass. Keep the current production artifact; no main merge or production promotion occurred. Roll back code by a reviewed revert/known deployment. Applied schemas are additive and shared: repair forward, never reset remote staging.

For tests use `playwright.staging.config.ts` plus the exact verified Preview and ignored synthetic credentials. Preserve the original `test:e2e:live` and corpus smoke/budget gates. Manual-only staging is not full P0 acceptance.

[detailed release report](CODEX_VERCEL_RELEASE_REPORT.md) provides variable metadata, CI, health, deployment and continuation details.
