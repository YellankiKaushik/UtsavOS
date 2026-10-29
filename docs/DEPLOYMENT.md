> Current checkpoint — 29 October 2026: see [final master report](UTSAVOS_FINAL_MASTER_REPORT.md) for the latest229 regression/22 native/28 synthetic-browser results,15 applied migrations,protected release candidate,real GenAI evidence and retained hosted failures. The dated material below is historical; public release and email delivery remain unverified.

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
