# Static showcase release verification

## PR #7 production release — verified 9 November 2026

| Record                | Verified result                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Merge                 | PR #7 merged into `main`; merge commit `367ceb3d175f427774579be4d49b4655b04cf7d9`.                                                                                             |
| Production deployment | READY deployment `dpl_25G8Cb4hXo2RCwGhFyuQ11NAk621` from that exact `main` SHA in the existing `utsavos` project; canonical alias `https://utsavos.vercel.app`.                |
| Public response       | Read-only GET returned HTTP 200 with title `UtsavOS · A plan for every celebration`; HTML references Vite `/assets/*.js` assets and contains no `/_next/` assets.              |
| Security headers      | CSP includes `connect-src 'none'`; `X-Content-Type-Options: nosniff` and strict-origin referrer policy are present.                                                            |
| Rollback candidate    | The previous full-stack deployment `dpl_8Af4NwEh1xZKS99Ca652qxvK8rqm` remains READY in the same Vercel project at prior `main` SHA `2f657595996bc4a5191999a182e2a05495ea61d2`. |
| Preservation          | The public deployment serves the independent static Vite showcase; the original self-hostable Next.js app and Supabase migrations remain in the repository.                    |

This section records the PR #7 cutover milestone. A later protected maintenance merge may produce a newer Vercel deployment without changing what this historical deployment record describes.

## Historical PR #7 Preview and pre-cutover evidence

> **Historical pre-cutover evidence (8 November 2026):** The table below records candidate and Preview state before the approved production cutover. Its pending and baseline statements are preserved as historical evidence; the verified production release is recorded above.

| Surface                         | Configuration or evidence                                                                                                                                                                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing Vercel project         | `utsavos` in scope `kaushik-yellanki-project`. Vercel project inspection showed repository root, Node 24.x, Next.js preset, and no project-level install, build, or output override.                                                                                                          |
| Baseline production deployment  | `dpl_8Af4NwEh1xZKS99Ca652qxvK8rqm` was READY and assigned `utsavos.vercel.app` when inspected on 8 November 2026. Confirm this is still the rollback target immediately before release.                                                                                                       |
| Full-stack build before cutover | Git configuration used `framework: "nextjs"`, `npm ci`, `npm run build`, and the default framework output.                                                                                                                                                                                    |
| Proposed static settings        | Keep the same project and repository root. `vercel.json` sets `framework: null`, `npm ci`, `npm run showcase:build`, and `showcase/dist`. The verified Preview served the configured Vite output despite the project's Next.js preset.                                                        |
| Candidate commit                | `8ad6fa765b41bd7c0487ead130b36bc32b920a60` on `codex/open-source-readiness`, PR #7.                                                                                                                                                                                                           |
| GitHub CI                       | Run 70 passed for this commit: `validate`, `supabase-platform`, and `showcase`. The hosted runner completed the local Supabase start/reset/database test/stop steps.                                                                                                                          |
| Vercel Preview                  | READY deployment `dpl_6gazm8j2vswQb5Sjcd34sJBhXPhL`, built from the exact candidate SHA: [protected Preview](https://utsavos-git-codex-open-source-r-91e0fe-kaushik-yellanki-project.vercel.app).                                                                                             |
| Preview smoke checks            | HTTP 200 HTML; title `UtsavOS · A plan for every celebration`; Vite `/assets/index-ZYsLFoGv.js` and `/assets/index-BA6F9uxC.css`; no `/_next/` runtime marker. `/api/health` returned 404.                                                                                                    |
| Preview security and content    | CSP includes `connect-src 'none'`; `nosniff` and strict-origin referrer headers are present. Downloaded JS contains synthetic wedding/birthday/community examples, local persistence, and the labeled sample plan; it contains no Supabase SDK, AI provider, `fetch`, XHR, or WebSocket code. |
| Framework metadata              | Vercel still reports the project's framework preset as Next.js, while this Preview serves the Vite static build configured by `vercel.json`. The project setting was not changed. Confirm the deployed output again after the approved production cutover.                                    |
| Production and rollback state   | The canonical `utsavos.vercel.app` alias still resolves to READY deployment `dpl_8Af4NwEh1xZKS99Ca652qxvK8rqm`, main SHA `2f657595996bc4a5191999a182e2a05495ea61d2`. This remains the full-stack rollback target.                                                                             |
| Production verification         | Pending separate owner approval for the static production cutover and post-merge canonical checks.                                                                                                                                                                                            |

## Historical pre-cutover release gates

1. Verify the approved license and generated notices. Confirm all protected CI and review requirements on the release commit.
2. The Preview from PR #7 was inspected against the exact candidate SHA using the authenticated Vercel CLI. Its HTML, Vite assets, response policy, expected API 404 and built JavaScript checks are recorded above. Offline Playwright CI verified desktop and mobile flows, persistence, reset and network isolation; the Preview itself remains access-protected.
3. Record a READY full-stack rollback deployment and preserve its dependent services. Merge only through the authorized protected workflow.
4. Confirm Vercel built the merged SHA with the static settings and assigned the same canonical URL. In a clean signed-out browser, verify navigation, assets, input, budgets, task editing, replan, bundled draft, reload, reset, and requests. Verify the deployment exposes no application functions.
5. If verification fails, use the existing Vercel project's rollback control to reassign production to the recorded full-stack deployment. Verify the canonical URL, health, and signed-out guard after rollback. Revert the triggering Git change through the protected workflow so later builds do not reintroduce it.
6. Keep hosted services through the rollback window. Owner-only retirement checks follow separately. [Retirement checklist](HOSTED_SERVICE_RETIREMENT_CHECKLIST.md)

[Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json) · [Vercel rollback](https://vercel.com/docs/cli/rollback)
