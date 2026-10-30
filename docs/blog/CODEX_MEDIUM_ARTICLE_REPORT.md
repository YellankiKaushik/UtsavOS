# UtsavOS Medium article — execution report

**Status:** Article and supporting assets are prepared for owner editorial review. The Medium story has not been created or published.

## Article details

- **Selected headline:** Building UtsavOS: Human-Reviewed AI, Exact Budgets, and Approved Replanning
- **Subtitle (27 words):** A full-stack case study in turning weddings, birthdays, and community events into persistent plans—with structured AI drafts, integer-paise calculations, Supabase authorization, and explicit approval for consequential changes.
- **Length:** Approximately 3,290 whitespace-delimited words in the article body, including code and diagram source and excluding the title, subtitle, references, and editorial note.
- **Estimated reading time:** 14 minutes at approximately 240 words per minute.
- **Suggested Medium topics:** Software Engineering, Artificial Intelligence, Nextjs, Programming.
- **Canonical source:** [UTSAVOS_MEDIUM_ARTICLE.md](UTSAVOS_MEDIUM_ARTICLE.md)
- **Headline alternatives and copy/editing instructions:** [MEDIUM_PUBLISHING_GUIDE.md](MEDIUM_PUBLISHING_GUIDE.md)

## Content and evidence

The article covers the PromptWars Challenge 5 context; the wedding, birthday, and community planning journey; the shipped modular Next.js architecture; structured OpenRouter output and downstream validation; human review and selective acceptance; integer-paise budgeting; versioned, guarded replanning; Supabase Auth, RLS, and private documents; module-by-module verification limits; local and hosted tests; provider timeouts and rate limits; deployment; and grounded next steps. It discloses Codex use and makes no Antigravity, prize, eligibility, uptime, customer, booking, or commercial-readiness claim.

Consequential claims are mapped to implementation, tests, release evidence, and official framework/provider references in [ARTICLE_FACT_CHECK.md](ARTICLE_FACT_CHECK.md). First-person authorship and voice remain subject to owner review.

## Visual package

| Placement            | Asset                                                  |                        Size | Classification                                                          |
| -------------------- | ------------------------------------------------------ | --------------------------: | ----------------------------------------------------------------------- |
| Cover and opening    | `docs/assets/overview.png`                             |                39,590 bytes | Existing, privacy-reviewed production capture; isolated synthetic event |
| Product journey      | `docs/assets/ai-planning.png`                          |                44,621 bytes | Existing synthetic-event screenshot with saved genuine model output     |
| Selective acceptance | `docs/assets/timeline.png`                             |                38,908 bytes | Existing synthetic-event production capture                             |
| Exact budget         | `docs/assets/budget.png`                               |                41,255 bytes | Existing synthetic-event production capture                             |
| Change preview       | `docs/assets/change-impact.png`                        |                38,173 bytes | Existing synthetic-event production capture                             |
| Architecture         | `docs/blog/assets/utsavos-architecture.png` and `.svg` | 37,874 PNG; 5,460 SVG bytes | New source-backed diagram; visually inspected                           |
| Approval flow        | `docs/blog/assets/replanning-flow.png` and `.svg`      | 41,393 PNG; 4,828 SVG bytes | New source-backed diagram; visually inspected                           |

The product screenshot manifest records read-only capture, no customer data, zero new AI requests, and zero planning-data mutations. Image paths, captions, alt text, provenance, and publication placement are listed in [ARTICLE_ASSETS.md](ARTICLE_ASSETS.md). The existing demo MP4 was not added.

## Medium readiness

The article is a GitHub Markdown source with image captions, concise code, Mermaid source, technical references, and a closing invitation. The publishing guide maps seven image placements, explains converting headings and code blocks in Medium, describes adding the YouTube embed and topics, and gives desktop/mobile preview and link-check steps. The PNGs are supplied for Medium because relative Markdown paths and Mermaid source should not be relied on in the editor.

No Medium story, draft, or URL exists. The owner must review first-person claims, transfer and inspect the article and images in their Medium account, verify links/topics/layout at desktop and mobile widths, publish when ready, and provide the actual URL for any later README link.

## Repository changes

- Added the full article, publishing guide, promotion drafts, fact-check record, image manifest, and two diagram source/render pairs under `docs/blog/`.
- Added the `Engineering Story / Behind the Build` section to the root README and the article package to the documentation index.
- No application source, SQL migrations, production flags, hosting configuration, or secrets were changed.
- No social post or Medium publication was made.

## Quality checks

| Check                                  | Result                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                               | Passed; 508 packages audited, zero reported vulnerabilities                                                                                                                                                                                                                                                                            |
| `npm run format:check`                 | Passed after formatting the changed Markdown                                                                                                                                                                                                                                                                                           |
| `npm run lint`                         | Passed                                                                                                                                                                                                                                                                                                                                 |
| `npm run typecheck`                    | Passed                                                                                                                                                                                                                                                                                                                                 |
| `npm run build`                        | Passed; all static pages generated                                                                                                                                                                                                                                                                                                     |
| `npm test`                             | Passed; 26 files, 231 tests                                                                                                                                                                                                                                                                                                            |
| `npm run test:concurrency`             | Passed on retry with loopback access; 22 tests. Initial sandbox run could not bind its disposable PostgreSQL server (`EACCES`); no assertions ran in that attempt.                                                                                                                                                                     |
| `npm run test:e2e`                     | Passed on retry with loopback access; 28 Playwright cases. The first sandbox attempt could not start its local servers and was stopped before results.                                                                                                                                                                                 |
| `npm run security:client`              | Passed                                                                                                                                                                                                                                                                                                                                 |
| `node scripts/check-documentation.mjs` | Passed; 48 Markdown files, 229 valid relative targets, no broken local links. Existing screenshot PNGs passed format/size checks.                                                                                                                                                                                                      |
| Visual review                          | Passed for the five product captures and two new diagrams; no guest contacts, credentials, or tokens were visible.                                                                                                                                                                                                                     |
| External URL review                    | Official Next.js, Zod, Supabase, OpenRouter, and Medium Help pages were accessible. The web retrieval service could not fetch the public app, GitHub repository, or YouTube watch URL; this is a crawler limitation, not evidence those URLs are broken. Those public project links are already recorded in the release documentation. |
| Repository size                        | At article content commit `395e855`: 3,234,575 tracked bytes and 1,303,946-byte Git ZIP archive; both are strictly below the 10,000,000-byte ceiling. Local Git metadata measured 1,712,237 bytes; remote-only Git object storage is outside this local measurement.                                                                   |

## GitHub state

- **Starting protected `main`:** `c3b8600c85943cbd86fe1c0937bd9a8229279cb8`.
- **Working branch:** `docs/utsavos-medium-story`.
- **Article content commit:** `395e8553d501097e391941ed597f13e04e1ce854`.
- **Pull request:** [#4 — Document UtsavOS engineering story and Medium-ready article](https://github.com/YellankiKaushik/UtsavOS/pull/4) (open, based on protected `main`).
- **Required checks:** `validate` and `supabase-platform` passed on PR #4 at head `ed72efe2f1601bc4e8bc3ae86239b4dd433eb03d`. The duplicate `push` and `pull_request` runs both passed. Vercel Preview reported Ready; optional Sourcery review was skipped because the account reached its weekly review budget.
- **Merge:** Not performed. The earlier owner approval specifically named PR #2, so it does not authorize merging this new article PR. No branch protection or deployment setting was bypassed.

## Remaining owner actions

1. Approve merging PR #4 through the protected workflow if desired; required checks pass, but the earlier approval named PR #2 only.
2. Review first-person authorship and the article voice.
3. Use the publishing guide to format the story and upload/inspect images in the owner's Medium account; confirm the desktop/mobile previews and topics.
4. Publish from the owner's Medium account and provide the real story URL before adding any Medium link to the repository.
