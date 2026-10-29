# UtsavOS — final hackathon release handoff

29 October 2026. **Owner-approved release deployed and verified; submission still awaits owner publication/account actions.** [PR #1](https://github.com/YellankiKaushik/UtsavOS/pull/1) merged after final CI passed. No social post, video upload or form submission was performed.

| Release evidence                   | Result                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application release commit         | `d5751a2863e8c017bff3f5817e8266a35ef1d04f`; tested implementation `fa1510477dd11068cd63fc412607b45790d3a9c4`; approved PR head `ba5df4fb3d43117b7669c06219d2b058f60e7990`                                                                                                                                                    |
| Production verification checkpoint | [https://utsavos.vercel.app](https://utsavos.vercel.app), deployment `dpl_DB6i53hJUpDztcMbKTDtFxMG2uM8`, production target, READY, SHA `d5751a2863e8c017bff3f5817e8266a35ef1d04f`                                                                                                                                            |
| CI                                 | [Final candidate push](https://github.com/YellankiKaushik/UtsavOS/actions/runs/40883162894), [final PR](https://github.com/YellankiKaushik/UtsavOS/actions/runs/40883171122), [production merge](https://github.com/YellankiKaushik/UtsavOS/actions/runs/40884240524): **all successful**, validate and Docker Supabase jobs |
| Local checks                       | **231 regression tests passed, 0 failed/skipped**; format, lint, typecheck, build, client and reachable-history secret scans passed                                                                                                                                                                                          |
| Repository at release              | Public GitHub 200; 2,536,463 tracked bytes / 778,293 ZIP bytes / 1,943,510 local Git metadata bytes, each below 10,000,000. Film stays outside Git                                                                                                                                                                           |

This records the production application checkpoint tested end to end. Subsequent handoff updates contain documentation only; any rebuilt deployment must have the same application tree and pass canonical-domain guard checks.

## Live AI results and remaining reliability limit

The prior 45,002 ms failure exhausted the shared deadline before a completion; no parser defect was established. Its upstream queue/network/inference split is unknown. The earlier 15,547 ms failure remains unclassified. The candidate enforces zero prompt/completion price, a 4,096-token output cap and one early transient retry within the same 45-second deadline. Strict schema/domain validation, privacy deny, fixed model, disabled reasoning and no fallback remain. Truncated output is rejected. No paid route or fixture replaced genuine AI.

Protected Preview first passed **3/3** real journeys (22,196 / 20,303 / 18,902 ms). It remains protected and is not the submission link. On the public production domain, with no bypass header:

| Event                     | Verified generation latency | Input/output tokens |
| ------------------------- | --------------------------- | ------------------- |
| Wedding                   | 17325 ms                    | 324 / 838           |
| Birthday, affected rerun  | 11631 ms                    | 321 / 871           |
| Community, affected rerun | 20436 ms                    | 321 / 1209          |

All recorded actual `dots-studio/dots-3-note-preview:free`, AtlasCloud, `event-plan.v2`, one attempt and cost 0. All four structured sections validated; edited selective acceptance saved 3 tasks/2 vendor requirements per event and survived reload. AI budget lines were deliberately excluded. Wedding also passed the ₹427,500→₹453,000 replan, ₹47,000 remaining, approval/history, logout/relogin and cross-tenant 404.

**Initial production suite: 1 passed / 2 rate-limit failures. Separate affected rerun after cooldown: 2 passed / 0 failed/skipped.** The failed events stayed version 1 with no draft or accepted records. Quota checks found free allowance remaining; the exact limiter was not captured. These successes do not eliminate upstream intermittency. Every prior timeout, validation/fixture failure, alternate-route rejection and new production failure is preserved in the [dated evidence](hackathon/AI_RELEASE_VERIFICATION_2026-10-29.md) and historical master report. Deterministic failure/outage tests are separate from genuine AI passes.

## Judge access, security and release configuration

A separate synthetic reviewer is ready at [the production login](https://utsavos.vercel.app/login). Password login, refresh, persistence, logout/relogin and tenant isolation passed. Credentials exist only in ignored local `.runtime/hackathon-release-20261029/reviewer-private.json`; share privately through the organizer's permitted channel. Cookies are Secure/HttpOnly/Lax. Signed-out landing/health return 200, application redirects to login, API returns 401, invalid input returns 400 and an invalid external callback stays on the application origin.

The owner selected this reviewer workflow and documentation of the **controlled-inbox blocker**. The single synthetic account was administratively confirmed; global email confirmation and RLS remain enabled. Real confirmation/recovery mail delivery, email-link expiry/replay and inbox completion are **unverified** because no controlled inbox is connected.

All **15 migrations** match remote; dry run is up to date. Canonical `APP_BASE_URL`, exact Supabase callbacks, free AI settings and tested flags are applied. Document extraction stays false; Stripe/P2 remain inactive. Protection on unrelated deployments was unchanged. [Release configuration and rollback](hackathon/RELEASE_RUNBOOK.md) retain the prior deployment `dpl_8KWZiS3WCC8xUCKY6uRHWm9xYGyi` / SHA `0798627de160425a9a5925a1291bfe37fce825be`.

## Final submission checklist and owner actions

- [x] Public repository/default main, approved production app and private synthetic judge workflow verified.
- [x] Required text limits pass: GitHub URL 42/1024; updates 795/1024; GenAI explanation 755/1024. Actual production URL is in the [form drafts](hackathon/SUBMISSION_FORM_ANSWERS.md).
- [x] Existing genuine 82.034-second film verified locally, 11,773,092 bytes outside Git. [Upload instructions](hackathon/DEMO_VIDEO_SCRIPT.md); [LinkedIn draft](hackathon/LINKEDIN_POST.md). No public video/post URL exists yet.
- [ ] **Owner:** clarify conflicting organizer Antigravity/tool-eligibility guidance and the permitted private judge-credential channel. Actual Codex use is disclosed.
- [ ] **Owner:** upload the existing film as unlisted YouTube or access-granted Drive; verify signed out and provide its actual URL.
- [ ] **Owner:** publish the reviewed LinkedIn draft with verified app/video links and provide the real post URL.
- [ ] **Owner:** select the matching official Challenge 5 dropdown option and manually submit all fields by **1 November 2026, 23:59 IST**. Last owner-reported attempts **0/3**; none consumed here. Video/LinkedIn fields remain null, so `readyToSubmit=false`.

## Repository presentation follow-up

The corrected owner-supplied YouTube walkthrough is now verified: https://www.youtube.com/watch?v=Z5bo9ydn7JE . It is distinct from the local82-second edit. Video/form drafts are updated; LinkedIn publication, organizer eligibility/private reviewer delivery and manual form submission remain pending. See [the repository final report](GITHUB_REPOSITORY_FINAL_REPORT.md) for presentation PR/CI/main-protection evidence. The release checkpoint above and earlier pending-video statements are retained historically.
