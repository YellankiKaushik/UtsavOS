# Medium publishing guide — UtsavOS engineering story

This guide prepares the article for the owner's Medium account. No Medium draft or publication was created by this repository change.

## Selected editorial package

**Selected headline:** Building UtsavOS: Human-Reviewed AI, Exact Budgets, and Approved Replanning

**Other headline candidates:**

- Building UtsavOS: From an AI Event Planner Idea to a Full-Stack Production Application
- How I Built UtsavOS: An AI-Assisted Event Planning Workspace with Next.js, Supabase, and OpenRouter
- Engineering UtsavOS: Structured AI, Exact Budgets, and Human-Approved Replanning

**Subtitle (27 words):** A full-stack case study in turning weddings, birthdays, and community events into persistent plans—with structured AI drafts, integer-paise calculations, Supabase authorization, and explicit approval for consequential changes.

**Short summary:** An evidence-led engineering case study of UtsavOS, an AI-assisted event-planning workspace. It traces how model suggestions become reviewable drafts, while deterministic money, Supabase authorization, and version-checked transactions govern saved plans.

**Social description:** How UtsavOS keeps AI-generated event plans reviewable, budgets exact, and consequential changes behind explicit approval—with honest production evidence and failure modes.

**Suggested Medium topics (four):** Software Engineering, Artificial Intelligence, Nextjs, Programming. These topic pages were visible on Medium when this guide was prepared. Medium allows up to five topics per post; select the final set in the editor and confirm the visible topic labels before publishing. [Medium Help: Using topics](https://help.medium.com/hc/en-us/articles/214741038-Using-topics).

**Cover:** `docs/assets/overview.png` (1440 × 960 PNG; 39,590 bytes). It is a real production capture using isolated synthetic event data. Add it as the first image in the Medium story, then use Medium's preview-image control to select it as the cover.

## Image placement order

Upload the repository PNGs to Medium using the order below. Do not paste only the GitHub relative paths: Medium cannot resolve those relative to the Markdown file.

| Order | Repository asset                            | Insert after                                                                     | Alt text / caption                                                                                                                                                                                                                     |
| ----: | ------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cover | `docs/assets/overview.png`                  | Set as story preview image; the article also places it after the opening         | “UtsavOS event workspace with an approved budget and accepted planning records.” Caption: “Read-only production capture using an isolated synthetic event, not customer data.”                                                         |
|     1 | `docs/assets/ai-planning.png`               | Product journey                                                                  | “Saved AI planning draft with editable suggestions.” Caption: “Previously saved genuine model output; estimates remain unverified.”                                                                                                    |
|     2 | `docs/assets/budget.png`                    | Structured-output section                                                        | “Saved UtsavOS budget with fixed and per-guest values.” Caption: “Synthetic records; AI budget suggestions were excluded from the golden vector.”                                                                                      |
|     3 | `docs/blog/assets/utsavos-architecture.png` | Architecture section                                                             | “UtsavOS architecture from browser through Next.js services to Supabase and the external AI boundary.” Caption: “The PNG is rendered from `utsavos-architecture.svg`; the article also includes equivalent Mermaid source for GitHub.” |
|     4 | `docs/assets/change-impact.png`             | Approval section, before the process diagram                                     | “Saved before-and-after change proposal with stale and expiry notices.” Caption: “A saved production proposal; its stale state cannot be approved again.”                                                                              |
|     5 | `docs/blog/assets/replanning-flow.png`      | After the Mermaid approval diagram                                               | “Re-planning flow from snapshot and preview to approval checks and audited transaction.” Caption: “A proposal changes no saved plan until all approval checks pass.”                                                                   |
|     6 | `docs/assets/timeline.png`                  | Product journey or selective-acceptance explanation, if a sixth screenshot helps | “Accepted planning tasks with dependency relationships.” Caption: “Accepted suggestions become editable task records.”                                                                                                                 |

Use the five distinct product captures named as the cover and orders 1, 2, 4, and optional 6. The two technical PNGs are diagrams, not additional product screenshots. The article itself currently places the cover image, AI draft, budget, architecture diagram, change-impact capture, and workflow diagram; the timeline image is optional if it creates repetition.

After this PR reaches `main`, stable raw image source URLs follow this pattern:

```text
https://raw.githubusercontent.com/YellankiKaushik/UtsavOS/main/docs/assets/overview.png
https://raw.githubusercontent.com/YellankiKaushik/UtsavOS/main/docs/assets/ai-planning.png
https://raw.githubusercontent.com/YellankiKaushik/UtsavOS/main/docs/assets/budget.png
https://raw.githubusercontent.com/YellankiKaushik/UtsavOS/main/docs/blog/assets/utsavos-architecture.png
https://raw.githubusercontent.com/YellankiKaushik/UtsavOS/main/docs/assets/change-impact.png
https://raw.githubusercontent.com/YellankiKaushik/UtsavOS/main/docs/blog/assets/replanning-flow.png
https://raw.githubusercontent.com/YellankiKaushik/UtsavOS/main/docs/assets/timeline.png
```

Upload the local PNGs through Medium rather than depending on externally hosted images in the final story. The raw URLs are a convenient preview/source route, not a publication guarantee.

## Copy and format in Medium

1. Sign in to the owner's Medium account and create a new story draft. Do not publish until the first-person claims have been reviewed.
2. Put the selected headline and subtitle in Medium's title and subtitle fields. Copy the article body from `UTSAVOS_MEDIUM_ARTICLE.md`, starting with the opening paragraph below the subtitle and ending with the conclusion. Do not copy the editorial note or the technical references as a footnote block unless they are still useful after review.
3. Paste in sections, then use Medium's heading controls to convert section headings. Confirm the title and subtitle are styled through the editor fields. Medium's editor supports headings, links, lists, images, and code blocks, but raw Markdown should not be assumed to format itself perfectly. See [Using the story editor](https://help.medium.com/hc/en-us/articles/215194537-Using-the-story-editor).
4. Add each image from the placement map at its narrative location. Write or verify the alt text and caption in the editor. Upload `overview.png` first and select it as the story's preview image.
5. Recreate each TypeScript and text code fence as a Medium code block. Keep the integer-paise example monospace. Preserve the short Zod excerpt and its source link.
6. Mermaid diagrams are GitHub-friendly Markdown, not a Medium image. For Medium, insert the two PNGs rendered from the companion SVGs. The article includes the readable Mermaid source for GitHub readers; do not paste Mermaid code into the Medium story unless you also want it as plain text.
7. To embed the video, paste `https://www.youtube.com/watch?v=Z5bo9ydn7JE` by itself on a new line and press Enter. Medium's publishing guide describes pasting third-party URLs to create embeds. Confirm the actual player appears; leave a normal link if the embed is unavailable.
8. Add the four suggested topics. The story editor allows up to five; do not add unrelated topics just to fill the limit.
9. Open every source, demo, repository, and live-app link from the draft. If a relative Markdown link remains, replace it with the intended full GitHub or official URL.
10. Preview on desktop and mobile widths. Check heading hierarchy, code wrapping, image crops, captions, alt text, embedded video, and the overall length before publishing.
11. Review the title, subtitle, disclosure of Codex use, first-person wording, release limitations, image privacy, and all numbers. Then publish only from the owner's account.
12. After publication, open the published story signed out, copy the canonical story URL, and add it to a follow-up README change only after it is verified. Keep the source Markdown as the durable repository version and add the Medium link alongside it; do not invent the URL or replace the Git copy.

Medium's own [first-story checklist](https://help.medium.com/hc/en-us/articles/225168768-Writing-and-publishing-your-first-story) documents adding the preview image and third-party embeds. The publication action is deliberately left to the owner.
