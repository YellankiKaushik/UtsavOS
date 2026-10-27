# Live release execution — 2026-10-28

Working branch: `codex/live-release-completion`, starting at published `0798627de160425a9a5925a1291bfe37fce825be`. Main and archived original history remain intact. This is an active execution log; the final release report will reconcile all evidence.

## Verified services

- Dedicated Supabase `upbwahlegwcwiladfwwd`, name `usthav os`, region `ap-south-1`, PostgreSQL 17.11. Authenticated local management access verified the project and matching publishable key. The connected MCP principal cannot access this project; it was not used to bypass authorization. Unrelated LoadGuard3D was untouched.
- Initial schema, migrations, users and buckets were empty. Four baseline migrations were dry-run and applied without reset, seeds, role changes or vault synchronization. Thirteen public tables have RLS; ordinary authenticated users cannot write tables directly. Public guarded RPC wrappers are invoker functions; private schemas are not exposed.
- Two synthetic users were provisioned through a narrowly scoped admin operation. Administrative email confirmation does **not** verify email delivery. Ignored `.env.live.local` contains test identities. Real ordinary publishable-key sessions passed the manual persistence/isolation/approval test: 1 passed, 3 provider-dependent tests deliberately filtered out.
- GitHub push workflow `40465138009` for the starting commit succeeded, including both validation and Docker/Supabase-platform jobs. New changes need their own CI result.
- Vercel project `utsavos`, `prj_PqBVW2XZqRNqmkhNVgoBOMEysCbm`, team `team_UYEpjjRaObtrYF55SYu5rqUl`, is linked to `YellankiKaushik/UtsavOS`, production branch `main`. Local checkout is linked to that exact project. Existing owner-created production deployment is separate from this work; no new deployment is claimed yet.

## Provider outcomes and request boundary

Fresh Gemini metadata returned 401; one new structured smoke failed authentication (203 ms). Requested model `gemini-3.8-flash`; no returned model, valid draft or usage. No further unchanged calls.

OpenRouter key/catalogue requests succeeded. Two bounded synthetic generation tests of fixed free `xingchen-agi/xing4.0-29b-a4b:free` produced no valid output, including one test with optional reasoning disabled. The latter response had unknown finish reason and no returned model/usage/cost. A subsequent read-only generation lookup returned 404. Reasoning is a tested hypothesis, not an established cause. Zero paid requests; `data_collection=deny`, no provider fallback and strict schema/semantic validation remain enforced. Corpus evaluation is blocked by the smoke gate.

## Engineering decisions

Hosted mutation and auth callback origins come from exact operator configuration or Vercel's deployment-specific `VERCEL_URL` in Preview. Host/forwarded headers are not trusted. Preview ignores a production-only canonical URL. Invalid/missing hosted origins fail closed. Unit tests cover hostile origins and callback handling.

Rejected AI outputs retain only allowlisted model/usage/finish metadata. Provider errors and generated private text are not copied into reports. OpenRouter optional reasoning and free-only controls are explicit server configuration; they cannot relax routing privacy. Fallback evidence reflects the actual primary request.

FR-016 uses separate owner-only contacts and anonymous capability RPCs. Tokens are random 256-bit values, stored only as hashes, expire within seven days, and are revocable. Anonymous results reveal selected names/scopes only. Replies never change planned guest counts or money. Event locks, versions, receipts and safe audit entries cover owner mutations; anonymous retries produce one version/audit. Invitations are revalidated after waiting on the event lock to prevent a response racing an archive. Features remain off by default pending hosted verification.

## Current local evidence

- Unit/integration regression: 181 passed, 0 failed, 0 skipped (including 9 guest/RSVP cases).
- Production build passed after granting local build filesystem access; the initial sandbox build failed with EPERM creating the new route directory.
- Initial native concurrency attempt was blocked by sandbox loopback EACCES. Authorized rerun passed all 15 cases, including simultaneous anonymous replies and RSVP racing a host archive. The first new test setup attempted a direct row lock, correctly denied by table grants; the corrected test acquires its lock through the ordinary guarded RPC.
- Browser regression: 21 passed initially; one new assertion matched both the app error and Next.js route announcer. Correcting the selector yielded 2/2 RSVP cases, including mobile layout, axe accessibility and token fragment removal. Existing 20 browser cases passed unchanged.
- Fifth migration `20261027192558_p1_guest_rsvp.sql` was dry-run and applied to the verified isolated project. A real hosted guest test passed using ordinary A/B sessions and an anonymous publishable client: refresh, function persistence, private contacts, direct-write denial, cross-tenant denial, scoped reply, idempotent replay, unchanged planned count and revocation. No AI request was made by this test.

Redacted detailed execution evidence is ignored under `.runtime/release-20261028/`; no credentials or generated test passwords belong in Git.
