# Contributing to UtsavOS

Choose the setup path for your change. The showcase runs with browser fixtures, while the original app supports self-hosting with your own services. Submit only material you have permission to contribute under the project's MIT terms. Identify third-party material, applicable terms and required notices in the PR. [Showcase guide](showcase/README.md) · [Full-stack setup](docs/SETUP.md) · [MIT license](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)

## A reviewable change

1. Branch from current `main`; prefer a focused `codex/`, `docs/`, `fix/` or `feature/` branch.
2. Keep domain, API, migration and UI boundaries intact. Do not edit applied migrations, rewrite history or reset hosted data.
3. Describe the concrete problem, resulting behavior, validation and remaining limits in the PR. Use synthetic data in screenshots and label fixtures explicitly.
4. Run formatting, lint, types, appropriate tests, build and the client secret scan. For docs, also check links/media and repository size. [Testing commands](docs/TESTING.md).
5. Open a PR into `main`, resolve review conversations and wait for `validate` and `supabase-platform` on the current branch head. Follow any review requirements GitHub shows before merging.

Keep `.env.local`, provider keys, Supabase service-role keys, database URLs and passwords, cookies, reviewer credentials, raw provider errors and private runtime artifacts out of commits, issues and screenshots. Record provenance and permissions for contributed media or fixtures. The hackathon submission recorded a 10 MB repository limit. Keep videos linked from their host. [License review](docs/OPEN_SOURCE_LICENSE_REVIEW.md)

AI changes need schema/domain tests and bounded, explicitly authorized provider verification. Fixtures are useful for deterministic errors but cannot stand in for real generation. Do not enable paid routes, Stripe, notifications or commercial/P2 features as incidental cleanup. Financial authority and tenant authorization require particular care.

For urgent fixes, use a focused revert/fix PR with the same checks. A deliberate owner-managed ruleset change is an auditable emergency account action, not an automatic maintenance bypass. [Report vulnerabilities privately](SECURITY.md).
