# Operations and recovery — implementation versus operating acceptance

This runbook is an engineering procedure, not legal certification. Paid commercial release is blocked until an owner accepts retention, recovery, support and response responsibilities. Use only the identified isolated UtsavOS project; never run deletion/restore experiments on customer data.

## Recovery drill

Run npx vitest run tests/integration/restore.test.ts. It creates a synthetic PGlite PostgreSQL database from all migrations, writes an exact-money event, snapshots the physical data directory, restores into a separate instance and verifies versions, grants, RLS, tenant denial and guarded writes. The redacted artifact is .runtime/release-20261029/synthetic-restore.json. It does not restore Supabase managed backups, Auth mail/sessions or actual Storage objects and establishes no cloud RPO/RTO.

Before real users: owner chooses an approved backup plan and retention window; operator inventories database plus Storage originals separately, records encrypted backup location/access, restores to a new isolated target and verifies row counts, versions, financial totals, RLS/roles, private files, Auth URLs/session behavior and deletion holds. Measure observed recovery time and loss from timestamps. Require explicit approval before a production recovery/cutover; retain evidence and preserve the previous target until validation. Do not delete live backups to simulate erasure.

## Export and retention

Event JSON/CSV exports are owner/manager scoped and generated through authenticated APIs; CSV cells neutralize formula prefixes. Existing tests verify cross-tenant denial, exact money and retained audit/financial references. Treat exported files as private and deliver only through the authorized owner channel. Verify exported event/version and record counts against the same snapshot before handoff. Do not put customer exports in Git or public media.

Event erasure is operational deletion, not full account erasure. Existing lifecycle commands enforce version checks, revoke invitations and protect financial records/audit holds; Storage cleanup is serialized with uploads. Account deletion creates a review request. A human-reviewed account process, financial/legal retention policy, backup expiry, processor retention and session revocation still require operational implementation and acceptance. Never promise immediate removal from backups.

## Incident and security response

For suspected tenant exposure or secret compromise: stop the relevant rollout through existing flags; preserve redacted request IDs/time ranges; restrict impacted access without deleting evidence; identify affected users/data; rotate compromised secrets through the actual manager; validate RLS/origin/session controls; assess notification obligations with the responsible owner. Record severity, responder, timeline and resolution privately. No legal breach deadline is invented here.

For provider outage: keep manual planning available; disable AI generation if needed; inspect safe provider failure codes, deadline and quota accounting; retry only after a material access/configuration change. Never log raw prompts, documents, credentials or full provider errors. No paid fallback is enabled.

For billing: webhook remains disabled until real signature verification and provider acceptance. Monitor queue age, dead receipts, stale leases and entitlement expiry using the private worker principal. Reconcile authoritative provider snapshots; do not grant plans from browser metadata.

## Monitoring and support

Use existing health endpoints, redacted request IDs, Vercel deployment/runtime logs, Supabase service health and AI usage records. Review counts of5xx, validation/auth denials, model latency/failure codes and stuck document cleanup. Never export cookies, Authorization headers, passwords, provider keys or raw user content. Alerts, an accepted response rota, support address, retention window and numerical SLOs are not provisioned by this document. Assign them before beta; measure first rather than claiming invented availability.

Support requests should identify event ID privately, action, request ID, timestamp/time zone and expected result. Verify workspace authority before discussing private records or restoring access. Corrections use versioned commands and audit history; do not edit database rows around financial safeguards.

## Release and rollback

Keep main/production stable while PR remains blocked. Review PR#1 and exact CI checks. After owner approval, build for the production target with production APP_BASE_URL and canonical Auth URLs; a Preview artifact may contain the wrong trusted origin. Preserve protection and authentication. Verify anonymous landing/login, authorized judge flow, AI review/acceptance, exact replan, refresh and tenant denial on the actual public target before putting its URL in the form.

If regression occurs, disable affected optional flags and roll back the Vercel code deployment to the last verified compatible release. Forward migrations are additive; do not reverse/reset the database or erase customer records. Confirm compatibility and repeat affected acceptance checks. Full production rollback/recovery has not been exercised in this run.
