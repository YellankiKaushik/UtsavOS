# Guests, RSVP and team boundaries

## Guests and RSVP

Guest records belong to an event/workspace. Scoped RSVP invitations use hashed capabilities with expiry, revocation and frozen guest/function scope. Anonymous responses lock and revalidate the capability and event state; they cannot edit the planned guest count, budget or other tenants. Contact visibility is explicitly controlled. Invitations are links for the user to distribute; no automatic delivery or email-notification service is claimed.

Source: `src/domain/guests.ts`, `src/application/guest-http.ts`, `src/components/guests.tsx`, migration `20261027192558_p1_guest_rsvp.sql`. Evidence includes local/native rules and hosted manual RSVP/tenant checks.

## Teams

Workspace membership and event assignment determine access. Managers can operate workspace events; members require assignments with distinct edit, approval and contact grants. Restricted viewers receive assigned summaries. Authorization is rechecked after acquiring locks, so completed revocation defeats queued writes. User-editable profile metadata never grants administrative authority.

Invitations require matching-email consent; rejoining after revocation requires a fresh invitation. Membership/billing administration is not delegated by client-supplied roles. Source: `src/domain/teams.ts`, `src/application/team-http.ts`, `src/components/teams.tsx`, migration `20261027195746_p1_team_collaboration.sql`.

Local/native transaction checks, mobile UI and ordinary hosted RPCs passed at the release checkpoints. This is not proof that every hosted role/UI permutation or real email delivery was exercised. See [implementation status](../IMPLEMENTATION_STATUS.md).
