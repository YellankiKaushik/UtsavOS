# Static showcase release verification

Release candidate tracked in [PR #7](https://github.com/YellankiKaushik/UtsavOS/pull/7). Record exact preview and CI evidence against the candidate revision before cutover.

| Surface                         | Configuration or evidence                                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing Vercel project         | `utsavos` in scope `kaushik-yellanki-project`. Vercel project inspection showed repository root, Node 24.x, Next.js preset, and no project-level install, build, or output override.    |
| Baseline production deployment  | `dpl_8Af4NwEh1xZKS99Ca652qxvK8rqm` was READY and assigned `utsavos.vercel.app` when inspected on 8 November 2026. Confirm this is still the rollback target immediately before release. |
| Full-stack build before cutover | Git configuration used `framework: "nextjs"`, `npm ci`, `npm run build`, and the default framework output.                                                                              |
| Proposed static settings        | Keep the same project and repository root. `vercel.json` selects Other with `framework: null`, `npm ci`, `npm run showcase:build`, and `showcase/dist`.                                 |
| Production verification         | Pending until the protected release and canonical checks are complete.                                                                                                                  |

## Release gates

1. Verify the approved license and generated notices. Confirm all protected CI and review requirements on the release commit.
2. Inspect the Preview from PR #7. Confirm the deployment belongs to the existing Vercel project and matches the candidate. Verify the HTML, generated assets, response policy, absence of app API routes, desktop and mobile flows, persistence, reset and network isolation.
3. Record a READY full-stack rollback deployment and preserve its dependent services. Merge only through the authorized protected workflow.
4. Confirm Vercel built the merged SHA with the static settings and assigned the same canonical URL. In a clean signed-out browser, verify navigation, assets, input, budgets, task editing, replan, bundled draft, reload, reset, and requests. Verify the deployment exposes no application functions.
5. If verification fails, use the existing Vercel project's rollback control to reassign production to the recorded full-stack deployment. Verify the canonical URL, health, and signed-out guard after rollback. Revert the triggering Git change through the protected workflow so later builds do not reintroduce it.
6. Keep hosted services through the rollback window. Owner-only retirement checks follow separately. [Retirement checklist](HOSTED_SERVICE_RETIREMENT_CHECKLIST.md)

[Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json) · [Vercel rollback](https://vercel.com/docs/cli/rollback)
