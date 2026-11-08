# Security policy

UtsavOS is a released hackathon application with bounded verification, not a certified service or a promise of comprehensive commercial readiness. No long-term supported-version or response-time commitment has been established.

## Reporting a vulnerability

Use **Report a vulnerability** on the repository's Advisories page to open a private report. Keep credentials, user data, exploit payloads and sensitive screenshots out of public issues. If the private form is unavailable, request guidance from GitHub Support before sharing vulnerability details. [Repository advisories](https://github.com/YellankiKaushik/UtsavOS/security/advisories) · [GitHub Support](https://support.github.com/contact/security)

Include the affected commit/component, reproducible steps using isolated synthetic data, expected/actual behavior and impact. Never test against another user's records, brute-force accounts, incur paid provider calls or run destructive hosted SQL to demonstrate a finding. Redact tokens and personal information.

## Relevant boundaries

The static showcase uses synthetic fixtures and keeps edited state in the browser under the site's origin. It does not sync or back up that state. Use the reset control or clear site data to remove edits. Avoid entering private details. The separate full-stack application has the service boundaries below. [Showcase guide](showcase/README.md)

- Authenticated user sessions, workspace assignments, RLS and narrow authorized RPCs enforce tenant access.
- Trusted origins, Secure/HttpOnly/Lax production cookies, versions, locks, intent-bound idempotency and transactional audit protect writes.
- AI output and uploaded documents are untrusted; validated drafts require human acceptance and cannot approve financial changes.
- Provider keys remain server-only; ordinary deployed workflows use publishable Supabase keys with end-user sessions, never service-role authority.
- Private Storage, scoped RSVP capabilities and lifecycle holds protect source/contact/financial data.

Known limits include intermittent free-provider failures, unverified real confirmation/recovery email delivery, disabled hosted AI quotation extraction and incomplete commercial billing/account-backup operations. See [the release handoff](docs/HACKATHON_RELEASE_HANDOFF.md). No legal compliance or independent security certification is claimed.
