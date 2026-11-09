# Hosted service retirement checklist

- **Supabase deletion: NOT READY — BLOCKERS REMAIN.**
- **Vercel variable removal: NOT READY — BLOCKERS REMAIN.**

The owner performs all account actions after verifying the items below. Source inspection, a passing build, and successful tests on a static preview cannot establish which external consumers or data exist, or what the canonical alias serves after a cutover. [Release verification](STATIC_SHOWCASE_RELEASE_VERIFICATION.md)

## Supabase project

| Required evidence                                                                                                                                                                              | Status                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| The canonical production URL serves the static deployment. Browser interactions and request inspection show no Supabase calls. Deployment inspection shows no functions that need the project. | Verify after authorized cutover. |
| No external app, integration, scheduled job, Preview or other authorized consumer needs the project. Check recent usage and all known clients.                                                 | **OWNER VERIFICATION REQUIRED**  |
| Inventory Auth users, database records, private Storage buckets and documents. Establish who owns the records and who may export them.                                                         | **OWNER VERIFICATION REQUIRED**  |
| Export required records and files to controlled storage outside Supabase. Secure the exports and test a representative restore in an isolated environment.                                     | **OWNER VERIFICATION REQUIRED**  |
| Determine retention, privacy, account erasure and notification obligations. Complete any required communication with active users.                                                             | **OWNER VERIFICATION REQUIRED**  |
| End the observation window only after deciding that rollback will no longer require the old full-stack app and database. Confirm the exact project and understand permanent deletion.          | **OWNER VERIFICATION REQUIRED**  |

Once all items are verified and the owner makes a separate deletion decision, record the project, evidence, date, and accountable person in a private operations record. Keep project identifiers, user data and backups outside Git.

## Vercel application variables

Verify the canonical URL and deployment first. Inventory variables by **Production, Preview, Development, and any custom environments** in the existing UtsavOS project. Record names and scope privately. Check any shared or linked team variable against other consumers. Keep Vercel-managed system settings, the project, and the canonical alias.

Candidate names from the application configuration, subject to actual inventory and consumer checks:

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`. If present, investigate `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, and `DATABASE_URL` separately. They are not required by the normal application runtime.
- AI: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_ID`, `OPENROUTER_MODEL_DEFAULT`, `OPENROUTER_REQUIRE_FREE`, `OPENROUTER_DISABLE_REASONING`, `GEMINI_API_KEY`, `GEMINI_MODEL_ID`, `GEMINI_MODEL_DEFAULT`, `AI_PROVIDER_PRIMARY`, `AI_PROVIDER_FALLBACK`, `AI_PROVIDER_MODE`, `AI_PROVIDER_TIMEOUT_MS`, `AI_PROVIDER_MAX_RETRIES`, `AI_REQUEST_TIMEOUT_MS`, `FEATURE_AI_GENERATION`, `FEATURE_AI_REPLAN`, and `FEATURE_DOCUMENT_EXTRACTION`.
- Review `APP_BASE_URL` and the remaining application feature flags individually. They are full-stack configuration and can matter during rollback. See the complete source inventory. [Transition audit](archive/reports/OPEN_SOURCE_AUDIT.md#external-services-and-credentials)

Before removing a candidate, confirm the currently served static deployment contains no application function, inspect emitted assets, and verify an isolated build with these inputs absent. Confirm older deployment access and rollback requirements. Keep the variables through the rollback window. Once removal is separately approved and performed by the owner, create a new deployment and recheck the canonical site. Existing deployments keep their original build and environment context. [Vercel environment variables](https://vercel.com/docs/environment-variables)

## External model keys

Removing a Vercel variable does not invalidate a provider key. The owner must check the OpenRouter key's usage and any other consumers before revoking it in OpenRouter. For a Gemini key, do the same in Google AI Studio or the owning Google Cloud project, as appropriate. Check scheduled jobs, local environments and other deployments, then record provider-side revocation separately if the key is truly unused. Never copy key values into Git or an issue.
