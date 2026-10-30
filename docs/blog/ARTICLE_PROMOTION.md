# UtsavOS article promotion drafts

These are unpublished copy drafts. No Medium, LinkedIn, GitHub release, or other social post was made.

## Short summary

An evidence-led engineering case study of UtsavOS, an AI-assisted event-planning workspace. It shows how model suggestions become reviewable drafts, while deterministic money, Supabase authorization, and version-checked transactions govern saved plans—and what production failures still teach.

## LinkedIn announcement

I’ve been writing up the engineering behind UtsavOS, my event-planning project for weddings, birthdays, and community celebrations.

The article follows the path from an AI suggestion to a saved plan: structured output, Zod and domain validation, exact integer-paise budgets, a versioned change preview, and a guarded approval transaction. It also keeps the rough edges in view: a Gemini 401, free-provider rate limits, an unexplained timeout, and incomplete email and billing operations.

I used OpenAI Codex as a development assistant and documented the actual production evidence rather than treating a passing fixture as a live provider result.

Read the source article: [insert GitHub article link after PR merge]
Live app: https://utsavos.vercel.app
Demo: https://www.youtube.com/watch?v=Z5bo9ydn7JE

I’d welcome feedback on the review-and-approval flow and the boundary between AI estimates and saved financial records.

## GitHub announcement / release note

Added a publication-ready UtsavOS engineering case study in `docs/blog/`. It documents the shipped Next.js/Supabase architecture, structured OpenRouter drafts, integer-paise calculations, guarded replanning, privacy boundaries, scoped release tests, and known production limitations. Includes a Medium publishing guide, privacy-reviewed asset manifest, claim-to-source fact check, promotion drafts, and synchronized execution reports. No Medium publication or social post was made.

## Personal message for developers

I wrote a technical case study about building UtsavOS: an event-planning workspace where the model proposes a draft, the host decides what to accept, and the database checks consequential changes. It includes source-level examples, production test scope, failure history, and the boundaries I haven’t finished yet. I’d value a careful read from anyone building Next.js/Supabase apps or human-reviewed AI workflows.

## After the article is published

Replace the placeholder source-article link in the LinkedIn draft with the actual verified Medium URL only after publication. Keep the app, YouTube, repository, and Medium links distinct. No engagement or search-performance outcome is promised.
