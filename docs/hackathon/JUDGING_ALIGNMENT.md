# Judging alignment

The six official categories below come from the owner's authenticated dashboard transcription. No weights or scores were provided; none are invented.

| Official category           | Concrete evidence                                                                                                                | Limit                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Code quality                | Layered TypeScript/domain/application/adapters; Zod contracts; generated OpenAPI/database types; lint/type/build CI              | PR #1 merged; main is the release/submission branch                |
| Security                    | RLS, owner/role checks, private Storage, origin checks, hashed scoped RSVP, locks/idempotency, ordinary-session tenant denial    | Email delivery and managed retention unverified                    |
| Efficiency                  | Bounded model timeout/retries, fixed free route, SQL pagination/indexes, exact transaction scope                                 | No production load/SLO claim                                       |
| Testing                     | 231 regressions;22 native/28 synthetic browser release cases;3 Preview real types;production initial1/2 and affected2/0 retained | 24-request live corpus not executed                                |
| Accessibility               | Labels, keyboard/dialog behavior, axe checks, mobile browser workflows                                                           | Automated checks are not accessibility certification               |
| Problem statement alignment | Wedding/birthday/community generation; budgets, timelines, vendors and personalized ideas                                        | Public app verified; owner privately supplies reviewer credentials |

Additional owner-requested evaluation lenses, not independently verified official scoring categories: AI/prompting quality (promptv2, schema plus domain validation, metadata); UX (draft→review→workspace→preview→approval); innovation (AI suggestions become operational records without authority to approve financial changes). Model estimates still require review. No rank improvement, adoption or performance metric is claimed.
