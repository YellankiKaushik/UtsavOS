# UtsavOS documentation

[Live application](https://utsavos.vercel.app) · [YouTube walkthrough](https://www.youtube.com/watch?v=Z5bo9ydn7JE) · [Repository overview](../README.md)

The owner-approved application is released; `main` is the stable production and submission branch. PR #1 is merged. Begin with current guides, then use dated reports for the evidence available at their checkpoint. An older failure or unreleased status is historical, not a reason to erase the record.

## Product and engineering guides

| Need                                    | Read                                                                                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install and configure your own instance | [Setup](SETUP.md) and [environment template](../.env.example)                                                                                                                                                       |
| Understand application/data boundaries  | [Architecture guide](ARCHITECTURE.md), [full V2 target design](../DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md), [decisions](DECISIONS.md)                                                                             |
| Inspect API and database contracts      | [OpenAPI](api/openapi.yaml), [generated database types](../src/generated/database.types.ts), [forward migrations](../supabase/migrations)                                                                           |
| Understand each feature                 | [Module index](modules/README.md) and [implementation/evidence matrix](IMPLEMENTATION_STATUS.md)                                                                                                                    |
| Run checks and interpret evidence       | [Testing](TESTING.md); [historical test ledger](TEST_REPORT.md)                                                                                                                                                     |
| Deploy safely                           | [Deployment](DEPLOYMENT.md), [release/rollback procedure](hackathon/RELEASE_RUNBOOK.md), [operations contract](OPERATIONS_RUNBOOK.md)                                                                               |
| Contribute or report a vulnerability    | [Contributing](../CONTRIBUTING.md), [security policy](../SECURITY.md)                                                                                                                                               |
| Inspect actual product images           | [Media sources and privacy](assets/README.md); [older fixture-image classification](screenshots/README.md)                                                                                                          |
| Read the engineering case study         | [UtsavOS technical article](blog/UTSAVOS_MEDIUM_ARTICLE.md), [publishing guide](blog/MEDIUM_PUBLISHING_GUIDE.md), [fact-check](blog/ARTICLE_FACT_CHECK.md), [execution report](blog/CODEX_MEDIUM_ARTICLE_REPORT.md) |

The V2 architecture is a proposed target design, including unreleased commercial/P2 work. The current implementation matrix and release evidence establish what is actually implemented and verified. In particular, the runtime release uses OpenRouter; the direct Gemini adapter is present but unsuccessful release authentication is not represented as generation success.

## Hackathon and release

- [Project description](hackathon/PROJECT_DESCRIPTION.md)
- [Challenge 5 checklist](hackathon/SUBMISSION_CHECKLIST.md) and [form answers](hackathon/SUBMISSION_FORM_ANSWERS.md)
- [Organizer requirements and unresolved tool eligibility](hackathon/ORGANIZER_REQUIREMENTS.md)
- [Judging alignment](hackathon/JUDGING_ALIGNMENT.md) and [compliance matrix](hackathon/CHALLENGE_COMPLIANCE_MATRIX.md)
- [Demo source/edit notes](hackathon/DEMO_VIDEO_SCRIPT.md) and [copy-ready LinkedIn post](hackathon/LINKEDIN_POST.md)
- [Production release handoff](HACKATHON_RELEASE_HANDOFF.md), [retained AI reliability evidence](hackathon/AI_RELEASE_VERIFICATION_2026-10-29.md) and [owner account actions](OWNER_FINAL_ACTIONS.md)
- [GitHub presentation/security report](GITHUB_REPOSITORY_FINAL_REPORT.md)

The demo URL is verified. A published LinkedIn URL, organizer eligibility clarification/private judge credential delivery and manual submission remain owner actions. The Markdown LinkedIn draft is not the external post URL. No form has been submitted by the agent.

## Historical engineering evidence

These files remain in place because scripts and earlier links reference them. Their failures and checkpoint-specific statuses are preserved; they are not current setup instructions.

| Record                                                                                                                                             | Purpose                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Final master report](UTSAVOS_FINAL_MASTER_REPORT.md) / [JSON](UTSAVOS_FINAL_MASTER_REPORT.json)                                                   | Requirement traceability and staged implementation history, with a pointer to the later release |
| [Final completion report](CODEX_FINAL_COMPLETION_REPORT.md) / [JSON](CODEX_FINAL_COMPLETION_REPORT.json)                                           | Earlier engineering acceptance and limitations                                                  |
| [Vercel release report](CODEX_VERCEL_RELEASE_REPORT.md) / [JSON](CODEX_VERCEL_RELEASE_REPORT.json)                                                 | Earlier manual-only staging and service configuration                                           |
| [Completion report](CODEX_COMPLETION_REPORT.md) / [JSON](CODEX_COMPLETION_REPORT.json)                                                             | Initial implementation/discovery evidence                                                       |
| [Test ledger](TEST_REPORT.md) and [evidence directory](evidence)                                                                                   | Independent fixture, native, hosted and provider checkpoints                                    |
| [Live progress](LIVE_RELEASE_PROGRESS.md), [external-action register](EXTERNAL_ACTION_REGISTER.md), [founder actions](FOUNDER_ACTIONS_REQUIRED.md) | Historical continuation/account state; current actions are in OWNER_FINAL_ACTIONS.md            |

Private `.runtime` evidence, authentication state and reviewer credentials are intentionally absent from Git. Public documentation contains sanitized summaries, not privileged replay credentials.
