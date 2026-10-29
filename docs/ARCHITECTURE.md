# Implementation architecture

UtsavOS is one Next.js App Router deployment with explicit domain, application and infrastructure boundaries. PostgreSQL is the authority for tenant access and transactional state. This guide describes the implementation; [V2](../DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md) also includes proposed future work.

## Source map

| Directory              | Responsibility                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `app/`                 | Pages, authentication/callbacks, API handlers and layout                                                  |
| `src/components/`      | Event wizard, resource editors, AI review, replanning and P1 interfaces                                   |
| `src/domain/`          | Zod contracts, exact money, tasks/dates, proposals, functions, teams, guests, finance and lifecycle rules |
| `src/application/`     | HTTP envelopes, trusted-origin checks, repositories/use cases and module routes                           |
| `src/infrastructure/`  | Supabase session clients, provider adapters, document parsing and disabled billing storage boundary       |
| `supabase/migrations/` | Forward schema evolution, grants/RLS, guarded RPCs, locks, receipts, provenance and audit                 |
| `tests/`, `scripts/`   | Deterministic tests, disposable database/browser verification and contract/security tooling               |

## Domain model and authority

An event belongs to a workspace and has type, guest count, budget, optional date/time zone and version. Budget items, tasks/dependencies, vendor requirements and event functions reference that event. AI drafts and replan proposals are distinct from accepted operational records. Audit events and idempotency receipts preserve mutation history. P1 adds guests/invitation capabilities, role assignments, vendor financial records, private documents, entitlements and lifecycle requests.

Money uses canonical decimal **integer strings in paise** at API boundaries, `bigint` in domain calculations and PostgreSQL integer arithmetic. Fixed, per-guest and per-unit expense bases are explicit. The model never supplies authoritative totals. Locks protect unit prices/commitments; approving a guest-count change may still change the quantity-based total of a locked per-guest line.

## Identity and multi-tenancy

The server validates Supabase users and uses ordinary end-user sessions. Membership/assignment rules and RLS restrict reads. Narrow public invoker wrappers delegate reviewed operations to private-schema functions with independent actor authorization and an empty search path. Roles are not granted through user-editable metadata. Workspace/event locks serialize quota checks, financial commands and revocation-sensitive operations.

Same-origin mutation checks use operator/platform configuration, not arbitrary Host headers. Production uses canonical `APP_BASE_URL`; Preview uses its exact platform origin. Cookies are Secure/HttpOnly/Lax in production. Public RSVP capabilities are hashed, expiring, scoped and revocable; they cannot change financial authority or planned guest count.

## AI generation and acceptance

The server sends bounded planning context, not an entire guest roster. OpenRouter and Gemini implement a shared transport contract. The current verified route is fixed free OpenRouter; Gemini is integrated but inactive after a 401. Provider responses must have a valid completion shape and finish reason, bounded size, JSON, Zod schema and domain semantics. Invalid, refused or truncated output is rejected, not repaired into a fabricated plan.

Generation records model/token/cost provenance and allowlisted failure diagnostics. Users review/edit/select a draft before transactional acceptance. No generation directly approves a financial transaction. One global deadline bounds optional transient retries; fallback is disabled for the release. [Retained real-provider results](hackathon/AI_RELEASE_VERIFICATION_2026-10-29.md) include successful journeys and intermittent failures.

## Transactional replanning

A proposal captures the base event version, explicit operations, deterministic before/after totals, deltas and warnings. Preview persists a proposal without applying its financial/event changes. Approval rechecks current version, permissions, expiry, locks and budget constraints under a transaction; an incompatible stale or protected operation fails safely. Intent-bound receipts make retries idempotent, and audit insertion is coupled to the mutation.

## Private data and modules

Private PDF originals remain in private Storage. Parsing is bounded and source-linked fields require manual review; document text is untrusted. Full hosted AI extraction is disabled. Event lifecycle requests freeze writes, revoke invitations and retain financial holds; eligible operational erasure checks actual Storage absence. Account review requests do not claim completed Auth/backup deletion. [Module contracts](modules/README.md) detail boundaries and evidence.

## Delivery and limits

`main` deploys to Vercel; feature branches create protected Previews. CI runs `validate` and `supabase-platform`. Fifteen migrations were applied additively for the release. No application credentials, fixture payloads or private runtime evidence are committed. Commercial checkout, real payment processing, automatic notifications, managed restore/account erasure and P2 integrations are not complete. [Decisions](DECISIONS.md) preserve historical choices; [release handoff](HACKATHON_RELEASE_HANDOFF.md) supersedes older deployment-status snapshots.
