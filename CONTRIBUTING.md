# Contributing to UtsavOS

Start with the [setup guide](docs/SETUP.md), [architecture](docs/ARCHITECTURE.md) and [current evidence matrix](docs/IMPLEMENTATION_STATUS.md). No open-source license has been selected; discuss material contributions with the maintainer before starting. This file does not add a license or contributor agreement.

## A reviewable change

1. Branch from current `main`; prefer a focused `codex/`, `docs/`, `fix/` or `feature/` branch.
2. Keep domain, API, migration and UI boundaries intact. Do not edit applied migrations, rewrite history or reset hosted data.
3. Describe the concrete problem, resulting behavior, validation and remaining limits in the PR. Use synthetic data in screenshots and label fixtures explicitly.
4. Run formatting, lint, types, appropriate tests, build and the client secret scan. For docs, also check links/media and repository size. [Testing commands](docs/TESTING.md).
5. Open a PR into `main`; resolve conversations and wait for `validate` and `supabase-platform`. Required checks must run on an up-to-date branch. Do not force-push or bypass checks. The solo-maintainer policy requires zero external approvals, not zero engineering review.

Secrets, cookies, reviewer credentials, raw provider errors and private runtime artifacts must stay out of commits, issues and screenshots. The repository must remain below the hackathon's reported 10 MB limit; videos belong on a genuinely hosted external service, not in Git.

AI changes need schema/domain tests and bounded, explicitly authorized provider verification. Fixtures are useful for deterministic errors but cannot stand in for real generation. Do not enable paid routes, Stripe, notifications or commercial/P2 features as incidental cleanup. Financial authority and tenant authorization require particular care.

For urgent fixes, use a focused revert/fix PR with the same checks. A deliberate owner-managed ruleset change is an auditable emergency account action, not an automatic maintenance bypass. [Report vulnerabilities privately](SECURITY.md).
