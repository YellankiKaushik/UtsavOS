# UtsavOS — hackathon release handoff

29 October 2026. **Verified release candidate; production release and submission remain held.** PR [#1](https://github.com/YellankiKaushik/UtsavOS/pull/1) is open and unmerged. No production promotion, social publication or form submission was performed.

## Commit, CI and deployments

| Item                           | Verified state                                                                                                                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tested implementation          | `fa1510477dd11068cd63fc412607b45790d3a9c4`, branch `codex/live-release-completion`; subsequent handoff changes are documentation only                                                                                                                                   |
| GitHub CI                      | [Push 40881249792](https://github.com/YellankiKaushik/UtsavOS/actions/runs/40881249792) and [PR 40881259082](https://github.com/YellankiKaushik/UtsavOS/actions/runs/40881259082): **success**, both `validate` and Docker `supabase-platform` jobs                     |
| Local verification             | **231 regression tests passed, 0 failed/skipped**; format, lint, typecheck, optimized build and client secret scan passed                                                                                                                                               |
| Tested protected Preview       | [utsavos-dp7i0j1tm](https://utsavos-dp7i0j1tm-kaushik-yellanki-project.vercel.app), deployment `dpl_4rhLMmRPWapSRYWjwUUhncPzZTfz`, SHA `fa1510477dd11068cd63fc412607b45790d3a9c4`, READY; anonymous access redirects to Vercel SSO, so **not a public submission link** |
| Current production             | [utsavos.vercel.app](https://utsavos.vercel.app), deployment `dpl_8KWZiS3WCC8xUCKY6uRHWm9xYGyi`, SHA `0798627de160425a9a5925a1291bfe37fce825be`; older `main`, **not this release candidate**                                                                           |
| Signed-out production baseline | Landing/health 200; application 307 to `/login`. Latest implementation and reviewer flow have **not** been tested on production because release approval is pending                                                                                                     |

## Genuine AI reliability and judge access

The previous 45,002 ms failure exhausted the shared deadline before a completion was available; it was not a JSON/schema parsing rejection. The earlier 15,547 ms failure remains unclassified. Upstream queue/processing/first-byte timings were not captured, so their exact contribution is unknown. There is no evidence of a response-parser defect causing that timeout.

The existing free Dots route remains authorized and usable under `data_collection: deny`, required schema parameters and no fallback. A fresh alternate Xing probe failed with an embedded rate-limit error after 30,073 ms; it was not adopted. No privacy restriction was relaxed or paid route used. The candidate adds a request-level zero-token-price ceiling, reduces output allowance from 8,192 to 4,096 tokens, and the PR Preview enables one early transient retry within the same 45-second deadline. Strict validation rejects truncated output. These are safeguards and mitigations, **not proof that upstream intermittency is eliminated**.

| Fresh hosted journey | Generation latency | Input/output tokens | Result |
| -------------------- | ------------------ | ------------------- | ------ |
| Wedding              | 22,196 ms          | 324 / 1,087         | Passed |
| Birthday, mobile     | 20,303 ms          | 321 / 1,111         | Passed |
| Community            | 18,902 ms          | 321 / 1,057         | Passed |

**3 passed, 0 failed/skipped**; actual model `dots-studio/dots-3-note-preview:free`, routing provider AtlasCloud, prompt `event-plan.v2`, one attempt each, reported cost `0` each. All four output sections validated. Each journey edited a task, selectively accepted 3 tasks/2 vendor requirements, excluded AI budget suggestions and verified saved records after reload. Wedding also verified the ₹427,500 → ₹453,000 replan, ₹47,000 remaining, approval/history, logout/relogin and another tenant's 404. Deterministic CI covers malformed output, deadline/cancellation, early retry, retry-after exhaustion and synthetic outage/manual-planning behavior; those are not counted as genuine AI successes. Earlier failures are retained in the [master report](UTSAVOS_FINAL_MASTER_REPORT.md) and [dated verification record](hackathon/AI_RELEASE_VERIFICATION_2026-10-29.md).

A separate synthetic reviewer account is prepared and verified in Preview: password login, refresh identity, persistence, local logout and tenant denial. Cookies are Secure, HttpOnly, SameSite=Lax. Credentials exist **only** in the ignored local `.runtime/hackathon-release-20261029/reviewer-private.json`; share privately with authorized judges, never in GitHub or a public post. This single synthetic account was administratively confirmed; global email confirmation and RLS remain enabled. **No controlled inbox is connected**, so real signup/recovery delivery, email-link expiry/replay and inbox callback completion remain unverified. Synthetic sessions do not establish email delivery.

## Release and submission checklist

- [x] Scoped implementation and real hosted planning verified; no P2 work, Stripe enablement or page redesign.
- [x] All **15 migrations** match the dedicated Supabase project; dry run up to date, no pending migration/reset/seed/RLS change.
- [x] Canonical Auth Site URL and confirmation setting verified; exact Preview and canonical recovery callbacks configured, existing URLs preserved.
- [x] Production settings and rollback prepared in the [release runbook](hackathon/RELEASE_RUNBOOK.md): canonical `APP_BASE_URL`, dedicated publishable-key database access, explicit free AI route/flags, fresh production-target build and recorded prior deployment. Production environment remains unchanged; masked values require explicit configuration/verification at release.
- [x] Public [GitHub repository](https://github.com/YellankiKaushik/UtsavOS) returns 200. Current implementation is on the PR branch; default `main` awaits reviewed release. Submission draft text is within limits: repository URL 42/1024, deployed updates 795/1024, GenAI explanation 755/1024. Exact source/archive size is measured separately for the final handoff commit.
- [x] Existing 82.034-second film verified locally: 11,773,092 bytes, outside Git; [asset and upload instructions](hackathon/DEMO_VIDEO_SCRIPT.md). [LinkedIn draft](hackathon/LINKEDIN_POST.md) retained.
- [ ] Owner-approved release, then canonical-domain signed-out and synthetic-reviewer verification of the latest implementation.
- [ ] Real accessible video and LinkedIn URLs; these fields remain null. Deployed URL stays null until the approved candidate is publicly verified. Exact Challenges dropdown text still requires the owner's selection.
- [ ] Organizer tool-eligibility clarification: the [official public page](https://promptwars.in/promptwarsVirtual.html) still conflicts about mandatory Antigravity. Actual Codex use is disclosed; no Antigravity contribution is claimed.

## Remaining owner account actions only

1. Obtain organizer clarification on development-tool eligibility and the permitted private judge-credential channel.
2. Make a controlled inbox available to finish confirmation/recovery testing; no passwords or email tokens in chat. The isolated reviewer account already exists.
3. **Explicitly approve release of the reviewed PR candidate.** Codex will then handle production configuration, reviewed merge/build/deployment and public/reviewer verification; approval has not yet been given.
4. Upload the existing film as unlisted YouTube or accessible Drive, verify signed out, and supply the real URL.
5. Publish the reviewed LinkedIn draft with verified app/video links, supply the actual post URL, then select the matching Challenge 5 option and manually submit the validated fields by **1 November 2026, 23:59 IST**. Dashboard attempts were owner-reported **0/3**; none were consumed here.
