# UtsavOS — GitHub repository final report

Generated 2026-10-29T17:06:53.159Z. **Evidence checkpoint:** Ready-to-merge presentation branch; main publication held for explicit PR2 approval requested by automatic approval review. Source verification commits are named explicitly; a report-only descendant does not change the tested application. No pending merge or CI result is reported as complete.

## A. Executive summary

The repository now presents the owner-approved public UtsavOS release with a branded README, real synthetic-data production images, an anonymously verified YouTube walkthrough, current developer guides and a structured documentation index. About metadata and private vulnerability reporting are configured. Main has an active PR/checks ruleset with no bypass.

Presentation branch verification is complete locally; PR/CI and main verification states below identify what remains at this checkpoint. Public source, application and demo are available for hackathon inspection. A real published LinkedIn URL, organizer tool eligibility/private reviewer handoff and manual form submission remain owner actions. Commercial readiness is not claimed.

## B. Git and branch status

| Item                      | Evidence                                          |
| ------------------------- | ------------------------------------------------- |
| Repository                | https://github.com/YellankiKaushik/UtsavOS        |
| Default/submission branch | main                                              |
| Initial main              | db39c6ff98fc048aa0af2599d23ed2d6a5bf35f8          |
| Verified content commit   | 390199bef44fad3f06029ad857968bfdcce05da1          |
| Presentation merge commit | pending at this checkpoint                        |
| PR                        | https://github.com/YellankiKaushik/UtsavOS/pull/2 |
| PR state                  | open                                              |
| Main protection           | active ruleset26138826                            |
| Deleted branches/tags     | none                                              |

| Initial ref                          | Unique commits vs initial main | Disposition                                 |
| ------------------------------------ | ------------------------------ | ------------------------------------------- |
| archive/utsavos-original-history     | 4                              | Retained; unique historical commits         |
| codex/github-presentation            | 0                              | Retained; occupied worktree                 |
| codex/hackathon-release-handoff      | 0                              | Retained; history/deployment/review context |
| codex/live-release-completion        | 0                              | Retained; history/deployment/review context |
| master                               | 4                              | Retained; unique historical commits         |
| publication/utsavos-granular         | 0                              | Retained; occupied worktree                 |
| origin                               | 0                              | Retained; history/deployment/review context |
| origin/codex/live-release-completion | 0                              | Retained; history/deployment/review context |
| origin/main                          | 0                              | Retained; history/deployment/review context |

Archive/master each have four unique commits; the publication worktree is occupied. The merged live branch is associated with historical Previews and PR #1. No reset, history rewrite or branch deletion was used. PR #1 remains merged and was not merged again.

| CI event     | Run                                                                 | State     | Conclusion |
| ------------ | ------------------------------------------------------------------- | --------- | ---------- |
| pull_request | https://github.com/YellankiKaushik/UtsavOS/actions/runs/40916585914 | completed | success    |
| push         | https://github.com/YellankiKaushik/UtsavOS/actions/runs/40916574803 | completed | success    |

## C. README

The rewrite covers the product/problem, released state, live/demo/docs links, hero and clickable video, capability/evidence matrix, exact golden scenario, gallery, eight-step journey, stack, Mermaid architecture, setup/configuration, testing, security, documentation, Challenge5, limits/roadmap, contributing and licensing. It corrects the former open-PR/unreleased/staging-only statements. AI estimates, inactive Gemini access and narrower P1 evidence are explicit.

Actual anonymous GitHub branch rendering returned200. All seven README images loaded and five YouTube links resolved in the DOM; desktop/gallery/mobile screenshots were visually reviewed. The gallery uses expandable full-size image links and captions; the thumbnail points to the corrected YouTube video. No embedded-YouTube playback or original-video download is promised. Rendering evidence is recorded in the JSON companion and local runtime captures.

## D. Visual assets

| Image                          | Dimensions | Bytes |
| ------------------------------ | ---------- | ----- |
| docs/assets/ai-planning.png    | 1440×960   | 44621 |
| docs/assets/budget.png         | 1440×960   | 41255 |
| docs/assets/change-impact.png  | 1440×960   | 38173 |
| docs/assets/dashboard.png      | 1440×960   | 34296 |
| docs/assets/demo-thumbnail.png | 1440×960   | 39590 |
| docs/assets/landing.png        | 1440×960   | 38835 |
| docs/assets/overview.png       | 1440×960   | 39590 |
| docs/assets/timeline.png       | 1440×960   | 38908 |

All new product images are genuine read-only production captures with isolated synthetic records. Account email/avatar are hidden only in capture CSS. Visual/DOM privacy review found no credentials, cookies, tokens or guest contacts. There were zero new model calls and zero planning-data writes. Loaded dashboard and correct route states were re-captured before staging; the saved proposal retains truthful stale/expiry notices.

The thumbnail is an exact overview screenshot copy, not fabricated artwork. Small lossless PNGs preserve text legibility. Existing development/fixture images remain classified in docs/screenshots/README.md and are not passed off as live generation. The three earlier external genuine Preview images were inspected but fresh production images were preferred. The MP4 remains outside Git.

## E. Video integration

[Verified UtsavOS walkthrough](https://www.youtube.com/watch?v=Z5bo9ydn7JE): owner-supplied, anonymous watch/oEmbed HTTP200, playability OK; title “UtsavOS | AI-native Event Planning Platform”, channel Kaushik. The first supplied unrelated devotional video was rejected and never added to public links. The corrected URL is in README, project description, submission drafts, demo notes and LinkedIn draft. No video URL remains missing. No direct-download Release asset was published. The earlier local82-second edit is separately identified; its duration is not attributed to this external walkthrough.

## F. Repository About

Description: AI-native event planning for weddings, birthdays and celebrations, with structured GenAI plans, exact budgets, collaborative workflows and explainable replanning.

Website: https://utsavos.vercel.app. Topics: ai, event-planning, gemini, hackathon, nextjs, openrouter, promptwars, supabase, typescript, weddings. Public visibility and default main were preserved; existing Issues/Discussions settings were unchanged. Social preview remains GitHub's existing default because the repository REST API has no supported custom-image upload field; a real screenshot is available for optional owner upload. Private vulnerability reporting was enabled and verified. No admin permission gap blocked metadata or main rules.

## G. Repository structure

Application directories app/, src/domain/, src/application/, src/infrastructure/, src/components/, supabase/, tests/ and root tooling remain intact. No source/migration/generated-contract relocation occurred. Historical reports remain at their original paths to preserve scripts and links, with current pointers and checkpoint labels. docs/README.md organizes architecture, setup, development/API, testing/deployment/security, modules, hackathon and history. docs/assets contains only small approved images and provenance. The owner untracked image and private runtime/secret folders were preserved.

## H. Documentation

Current setup, architecture and testing guides link to the unchanged full V2 target design and actual contracts. Module guides cover AI validation/acceptance, event functions, guests/RSVP, team roles, finance/private documents, limits and lifecycle. The deployment guide distinguishes the released configuration from its historical staging snapshot. CONTRIBUTING.md explains focused PRs and required checks; SECURITY.md gives the verified private disclosure route without inventing an email address.

Relative-link scan: 42 Markdown files, 208 valid targets, 0 failures. One existing master-report organizer link was corrected to hackathon/ORGANIZER_REQUIREMENTS.md. No historical failure was removed. The V2 proposal is not relabeled as wholly implemented; commercial/P2 boundaries remain explicit.

## I. Branch security

| Control                    | Effective value                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Ruleset                    | Protect main — reviewed and verified releases                                        |
| ID / target                | 26138826 / refs/heads/main                                                           |
| Enforcement                | active                                                                               |
| Deletion / force push      | blocked / blocked                                                                    |
| PR required                | yes                                                                                  |
| Required checks            | validate and supabase-platform                                                       |
| Trusted integration        | GitHub Actions app15368                                                              |
| Up-to-date / conversations | required / resolved                                                                  |
| External approvals         | 0, deliberate solo-maintainer policy                                                 |
| Bypass actors              | none                                                                                 |
| Owner bypass capability    | never                                                                                |
| Normal PR workflow         | awaiting this PR merge                                                               |
| Plan/capability            | GitHub Free public repository; API create/read/effective-rule verification succeeded |

[View the actual ruleset](https://github.com/YellankiKaushik/UtsavOS/rules/26138826). No destructive force-push/delete probe was run. Urgent fixes use a focused checked PR; an owner-managed emergency rule change would be a separate auditable account action, not an automatic bypass.

## J. LinkedIn

docs/hackathon/LINKEDIN_POST.md is a copy-ready narrative with real app/repository/YouTube URLs, human-approved AI, exact budget example, technology, actual Codex attribution, honest rate-limit lessons and a request for feedback. Publication instructions are separate from the post body. It is not auto-published and the external LinkedIn URL remains null; a Markdown file cannot satisfy that form field.

## K. Hackathon submission

Public repository: https://github.com/YellankiKaushik/UtsavOS ; default main. Public application: https://utsavos.vercel.app . Demo: https://www.youtube.com/watch?v=Z5bo9ydn7JE . The GitHub URL/updates/GenAI text remain42/795/755 characters under their1024 limits. The owner still selects the exact official challenge option. Attempts remain owner-reported0/3; none consumed. Deadline:1 November2026,23:59 IST.

Measured commit 390199bef44fad3f06029ad857968bfdcce05da1: 3059011 tracked bytes, 1196170 ZIP bytes, 1523770 local Git metadata bytes, each below10,000,000. The organizer's exact size definition is unspecified; these methods are kept distinct. Tool eligibility remains unresolved because public organizer statements conflict; no Antigravity use, organizer approval, award, score or submission receipt was invented. readyToSubmit stays false until the actual LinkedIn link and owner account steps are complete.

## L. Testing

| Command/layer                        | Executed result                             |
| ------------------------------------ | ------------------------------------------- |
| npm run format:check                 | passed; repeated after final edits          |
| npm run lint                         | passed                                      |
| npm run typecheck                    | passed                                      |
| npm test -- --maxWorkers=1           | 231 passed, 0 failed, 0 skipped             |
| npm run build                        | passed optimized Next.js build              |
| npm run security:client              | passed known-value and pattern scan         |
| node scripts/check-documentation.mjs | passed                                      |
| node scripts/measure-repository.mjs  | passed at named commit                      |
| npm audit --omit=dev                 | 0 reported vulnerabilities                  |
| Package/lock consistency             | all direct production and dev entries agree |
| External-link probes                 | 7 prominent links HTTP200                   |
| New live AI calls                    | 0                                           |

The first link scan failed on one historical path; the corrected scan passed. Existing full CI includes native races, synthetic browser and disposable Docker Supabase jobs. Local mutating browser/native suites were not repeated solely for presentation because application/migration/runtime files are unchanged; read-only production capture/session checks were performed. Previous231 regression,22 native and28 synthetic-browser release counts overlap and are not summed. Provider production initial1pass/2fail and affected2pass/0fail remain separate historical evidence.

## M. Security and quality

No application financial/authorization/API code, applied migrations, AI runtime, production secrets, hosting settings or customer planning records changed. Main was previously unprotected; the ruleset is now effective. Private reporting is real. Media is privacy-reviewed. Existing .gitignore/.vercelignore exclusions and PNG binary attributes are retained; lock/dependency checks passed. No LICENSE exists, so no open-source rights or CLA were added. Direct production dependencies declare MIT, Apache-2.0 or ISC licenses; that is an inventory, not an exhaustive legal audit or relicensing claim.

Residual limits: free-provider throttling/timeouts; unverified real email delivery/expiry/replay; disabled full hosted quotation extraction; incomplete checkout/managed account-backup operations. None was concealed by documentation polish. Source/history scanning covers locally reachable refs, not deleted/unreachable server objects; no independent security certification is claimed.

## N. Owner actions

1. **Explicitly approve protected PR2 merge after required checks pass.** https://github.com/YellankiKaushik/UtsavOS/pull/2 — Review the presentation branch; authorize normal protected PR merge. Already completed: Presentation, media, metadata, effective ruleset and exact-head push/PR CI passed; merge did not execute. Verify: Agent merges only after approval and final checks, without bypassing protection.

2. **Resolve tool eligibility and permitted private reviewer-credential channel.** https://hack2skill.com/login — Official Challenge5 instructions/organizer communication. Already completed: Real Codex attribution and isolated reviewer workflow documented. Verify: Obtain actual organizer clarification; privately share credentials only through permitted channel.

3. **Publish reviewed LinkedIn draft and supply actual post URL.** https://www.linkedin.com/feed/ — Create post using docs/hackathon/LINKEDIN_POST.md. Already completed: Copy-ready text includes verified app/repository/YouTube links. Verify: Open actual post URL signed out and place it in submission fields.

4. **Manually select exact Challenge5 option and submit before1Nov2026 23:59IST.** https://hack2skill.com/login — PromptWars Virtual → Challenge5 → Submission. Already completed: Public main/app/video and field-length drafts verified; no attempt consumed. Verify: Check actual required URLs and receipt; agent never submits.

5. **Optional: choose an open-source license if desired.** https://github.com/YellankiKaushik/UtsavOS — Add LICENSE only after explicit owner choice. Already completed: No license rights invented; direct dependency licenses inventoried. Verify: Review selected license and third-party obligations before labeling open-source.

6. **Optional: customize GitHub social preview.** https://github.com/YellankiKaushik/UtsavOS/settings — General → Social preview → upload approved docs/assets/demo-thumbnail.png. Already completed: Actual screenshot prepared; default preview left unchanged because REST has no supported upload field. Verify: Inspect repository link preview after owner upload.

The optional license/social-preview choices do not block the verified main-protection or video integration. No technical code troubleshooting is assigned to the owner.

## O. Final verdict

| Dimension              | Verdict                |
| ---------------------- | ---------------------- |
| repositoryPresentation | PARTIAL                |
| documentation          | COMPLETE               |
| media                  | COMPLETE               |
| mainProtection         | VERIFIED               |
| hackathonLinks         | INCOMPLETE             |
| application            | UNCHANGED AND VERIFIED |
| submission             | OWNER ACTIONS REQUIRED |
