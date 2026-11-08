# UtsavOS static showcase

From the repository root, use Node 24 and the committed lockfile:

```sh
npm ci
npm run showcase:dev -- --host 127.0.0.1
```

Choose an invented wedding, birthday, or community plan. Edit its budget and tasks, preview the effect of changing guest count, or accept selected items from a bundled example draft. The showcase keeps its plan in this browser. Reset restores the bundled example. Storage is local to the origin and browser profile, and clearing site data removes the plan.

The showcase uses synthetic fixtures, exact integer paise, and deterministic planning rules. Its draft is a bundled example with no model call. For real accounts, collaboration, private files, database records, authorized RSVPs, or provider integration, run the separate full-stack application. [Full-stack setup](../docs/SETUP.md)

```sh
npm run showcase:test
npm run showcase:build
npm run showcase:serve -- --host 127.0.0.1 --port 4317
```

Serve `showcase/dist` at the root of a static HTTP origin. The output includes the license and generated third-party notices. No environment file, account, API route, or hosted service is needed to build or use the showcase.

For the browser checks, stop the preview server above first. Playwright starts its own server from the already built output.

```sh
npx playwright install chromium
npm run showcase:e2e:offline
```

[Attribution](../THIRD_PARTY_NOTICES.md) · [Verification and release status](../docs/STATIC_SHOWCASE_RELEASE_VERIFICATION.md)
