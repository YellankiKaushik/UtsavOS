# External action register

2026-10-28 (Asia/Calcutta). Credentials belong in ignored environment files or approved secret storage, never chat. Unchanged provider failures are not retried.

Resolved: designated Supabase ownership/access and migrations; ordinary session persistence/isolation; GitHub validation and Docker platform CI; protected Vercel Preview; genuine hosted manual core/document/lifecycle journeys. Unrelated LoadGuard3D untouched.

## Google Gemini

- Safe classification: AI_AUTHENTICATION_FAILED / HTTP401
- Evidence: `.runtime/release-20261028/provider-diagnostic.json; provider-smoke-initial.json`
- Established cause: Authentication-level rejection established; exact project/key restriction not established
- Required owner action: Verify project, enabled Generative Language API, key restrictions, model entitlement and quota; securely update local and Preview configuration if necessary
- Codex can resolve without external change: false
- Next verification: npm run test:providers:smoke -- -t gemini once after a material external change

## OpenRouter

- Safe classification: AI_INVALID_OUTPUT; response validation; earlier AI_ROUTE_UNAVAILABLE
- Evidence: `.runtime/live-provider-smoke.json; .runtime/release-20261028/openrouter-routes.json`
- Established cause: Key/catalogue authorized; an eligible fixed free completion failed validation twice. Reasoning-disable test did not establish cause; generation lookup404
- Required owner action: Identify a compatible permitted fixed route under data_collection=deny and approve a spend budget if no free route works; configure securely
- Codex can resolve without external change: false
- Next verification: One filtered smoke on the changed approved route, then bounded corpus only with explicit budget

## Supabase Auth email

- Safe classification: email_address_invalid / HTTP400 for reserved example.test addresses; delivery UNVERIFIED
- Evidence: `.runtime/release-20261028/email-diagnostic.json`
- Established cause: Synthetic reserved address rejection established; SMTP/provider delivery failure is not established
- Required owner action: Configure/verify permitted sender and controlled test inbox; verify real signup confirmation and recovery callback/session/password/logout on exact Preview
- Codex can resolve without external change: false
- Next verification: One bounded signup and recovery journey with a controlled inbox; preserve email confirmation

## Stripe via Vercel Marketplace

- Safe classification: integration_terms_acceptance_required / action_required
- Evidence: `vercel integration add stripe --environment preview --no-env-pull --no-connect --format json --non-interactive returned owner action`
- Established cause: Marketplace agreement/account setup required before provisioning
- Required owner action: Review and accept terms at https://vercel.com/kaushik-yellanki-project/~/integrations/accept-terms/stripe?source=cli; finish approved test-mode account setup. Do not create live charges or assume pricing
- Codex can resolve without external change: false
- Next verification: Inspect installations, retry only after acceptance, follow provider skill; implement test-mode checkout, raw-body signature verification, idempotent event receipts and out-of-order reconciliation; then test before enablement

## Commercial operations/privacy/retention

- Safe classification: OPERATIONAL_RELEASE_GATE_UNVERIFIED
- Evidence: `DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md sections629–678/1255; docs/modules/WORKSPACE_AND_DATA.md`
- Established cause: No verified production operator, retention/backup deletion policy, restore drill, customer support/incident owner or provider data agreement evidence
- Required owner action: Assign responsible operators, publish reviewed privacy/support/retention terms, verify backups/restore and held financial/account deletion handling with applicable advice
- Codex can resolve without external change: false
- Next verification: Synthetic restore/deletion drill on approved isolated backup; operator runbook and onboarding acceptance; no claim of regulatory compliance

The GitHub connector could read but could not create a PR (integration403). Existing verified repository-owner Git authentication created draft PR#1 through the API; no unrelated identity or service role was used. No merge occurred. See [detailed release report](CODEX_VERCEL_RELEASE_REPORT.md) for release state.
