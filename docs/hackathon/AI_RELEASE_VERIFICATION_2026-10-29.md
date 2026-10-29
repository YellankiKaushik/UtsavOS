# AI release verification — 29 October 2026, 13:30 UTC

This checkpoint supplements the historical master report; it does not erase its failures. Implementation: `fa1510477dd11068cd63fc412607b45790d3a9c4`. Protected Preview: `dpl_4rhLMmRPWapSRYWjwUUhncPzZTfz`. Production remains older `main` pending explicit approval.

## Investigation

Sanitized usage diagnostics show a 45,002 ms timeout with no actual model/token response. The earlier 15,547 ms `AI_UNAVAILABLE` row predates category diagnostics and remains unclassified. Neither establishes malformed JSON. The adapter uses the OpenAI SDK with internal retries disabled and strict finish-reason, JSON, schema and domain checks. The service already enforces a shared maximum 45-second deadline; a full-window timeout cannot consume another full window. An early transient failure can retry if time remains. No additional streaming implementation or longer deadline was introduced without evidence that it would resolve upstream capacity.

Fresh account/catalogue/endpoint discovery returned 200. The fixed Dots model had one advertised AtlasCloud endpoint, zero prompt/completion pricing, optional reasoning and structured output support. Xing had an advertised Phala free/schema endpoint. Advertisement is not proof of a usable privacy-permitted route: one bounded genuine Xing request under unchanged strict policy returned HTTP200 with an embedded rate-limit error, no completion/model/tokens, after **30,073 ms**. It was not adopted or repeatedly retried. Earlier Nvidia 404 and Gemini 401 were not retried unchanged.

The candidate enforces `provider.max_price` prompt/completion zero in addition to catalogue pricing checks, reduces `max_tokens` 8192→4096, and configures this PR Preview for one retry on early transient errors. Privacy deny, parameter requirements, fixed model, disabled reasoning and no fallback remain. Late timeout never restarts the deadline; a long retry-after fails promptly. Output validation never repairs or partially accepts a truncated completion. These mitigations do not isolate whether the historical delay was upstream queuing, inference or network waiting.

Routing configuration follows the current official [provider routing documentation](https://openrouter.ai/docs/guides/routing/provider-selection), including price ceilings and privacy filtering. Successful requests prove this route is presently usable under that policy; they do not establish third-party compliance certification or a reliability SLO.

## Fresh live results

New isolated reviewer, synthetic data only, real authenticated browser → Preview API → OpenRouter → Supabase → edited selective acceptance → reload:

| Event                  | Latency ms | Input/output tokens | Accepted records   | Recorded usage             |
| ---------------------- | ---------- | ------------------- | ------------------ | -------------------------- |
| Wedding                | 22196      | 324 / 1087          | 3 tasks, 2 vendors | success, attempt 1, cost 0 |
| Birthday, 390px mobile | 20303      | 321 / 1111          | 3 tasks, 2 vendors | success, attempt 1, cost 0 |
| Community              | 18902      | 321 / 1057          | 3 tasks, 2 vendors | success, attempt 1, cost 0 |

All use actual `dots-studio/dots-3-note-preview:free`, AtlasCloud, `event-plan.v2`. The browser suite finished **3 passed, 0 failed/skipped in 4.7 minutes**. Structured budgets/tasks/vendors/ideas are nonempty. AI budget suggestions were deliberately excluded from acceptance; operational totals remained deterministic. Birthday/community each persisted version 2; wedding version 5 after two manual budget additions and approved guest-count replan. Read-only owner-session queries independently verified stored drafts, records, model/tokens, reported costs and cross-tenant invisibility.

Reviewer password sessions, refresh identity, logout/relogin, cookies and tenant denial passed. Only one non-deliverable synthetic reviewer was administratively confirmed; global confirmation and RLS were unchanged. Real email remains blocked by absence of an accessible controlled inbox. No email delivery, recovery link, expiry or replay success is claimed.

## Retained failures and limits

| Earlier evidence                  | Result retained                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-v2 shape smoke                | Genuine JSON rejected semantically; exact earlier rule was not retained                                                                                                 |
| Initial hosted provider suite     | 6 ordinary passes / 3 failures caused by old Gemini-only test import; corrected wrapper recorded separately                                                             |
| Initial hosted browser checkpoint | 6 passes, including three real event types; later failures do not erase this checkpoint                                                                                 |
| Later df53791 birthday            | 503 after 15547 ms, category unavailable in old metadata; cause unknown                                                                                                 |
| adf4685 affected birthday rerun   | 503, timeout category, 45002 ms, no actual model/tokens                                                                                                                 |
| Nvidia alternate                  | HTTP404 route unavailable, 1319 ms; unchanged route not retried                                                                                                         |
| Quotation experiments             | Two earlier source-validation failures retained; quotation.v2 later had a genuine smoke success, but extraction remains disabled and no hosted-completion claim is made |
| Diagnostic fixture regression     | 228 passed / 1 rate-limit fixture failure; isolated test workspaces corrected it without weakening production limits; prior corrected 229-pass run retained             |
| New Xing alternate                | Embedded rate-limit error after 30073 ms; no successful generation or adoption                                                                                          |
| 24-request live corpus            | Not run; explicit 24-request evaluation allowance absent; not counted as passing or skipped cases                                                                       |

New local regression is **231 passed, 0 failed/skipped** (includes two new retry/deadline cases). CI push/PR validate and real Docker Supabase jobs are green for the tested commit. Deterministic tests cover invalid/refused/truncated output, cancellation/deadline, early transient retry, excessive retry-after, failure usage provenance and synthetic outage UI/manual editing. These fixtures are clearly distinct from genuine provider requests.

Ignored local evidence is in `.runtime/hackathon-release-20261029/`: `route-probe.json`, `xing-smoke.json`, `staging-browser.json`, `hosted-ai-browser-metadata.json`, `reviewer-audit.json`, `release-checks.json`, `github-branch-ci.json`, `environment-audit.json`, `auth-audit.json`, `auth-callbacks.json`, `submission-audit.json`. Previous artifacts remain in `.runtime/release-20261029/`. Private reviewer credentials are not part of published evidence. No paid generation, public release or submission occurred.
