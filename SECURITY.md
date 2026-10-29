# Security policy

UtsavOS is a released hackathon application with bounded verification, not a certified service or a promise of comprehensive commercial readiness. No long-term supported-version or response-time commitment has been established.

## Reporting a vulnerability

Use GitHub's **Security → Advisories → Report a vulnerability** private reporting flow when available in this repository. Do not publish credentials, user data, executable exploit payloads or sensitive screenshots in public issues. If private reporting is unavailable, use [GitHub Support](https://support.github.com/contact/security) to request guidance on private disclosure; no maintainer email address has been invented here.

Include the affected commit/component, reproducible steps using isolated synthetic data, expected/actual behavior and impact. Never test against another user's records, brute-force accounts, incur paid provider calls or run destructive hosted SQL to demonstrate a finding. Redact tokens and personal information.

## Relevant boundaries

- Authenticated user sessions, workspace assignments, RLS and narrow authorized RPCs enforce tenant access.
- Trusted origins, Secure/HttpOnly/Lax production cookies, versions, locks, intent-bound idempotency and transactional audit protect writes.
- AI output and uploaded documents are untrusted; validated drafts require human acceptance and cannot approve financial changes.
- Provider keys remain server-only; ordinary deployed workflows use publishable Supabase keys with end-user sessions, never service-role authority.
- Private Storage, scoped RSVP capabilities and lifecycle holds protect source/contact/financial data.

Known limits include intermittent free-provider failures, unverified real confirmation/recovery email delivery, disabled hosted AI quotation extraction and incomplete commercial billing/account-backup operations. See [the release handoff](docs/HACKATHON_RELEASE_HANDOFF.md). No legal compliance or independent security certification is claimed.
