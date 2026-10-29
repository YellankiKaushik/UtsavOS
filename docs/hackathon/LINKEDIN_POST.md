# LinkedIn post — ready for owner review and publication

I built UtsavOS for PromptWars Challenge 5: Celebration & Event Planner.

Event planning becomes harder when a change in one place affects everything else: guests, catering costs, tasks and vendor requirements. I wanted an AI-generated plan to become a workspace a host can actually maintain.

UtsavOS supports weddings, birthdays and community celebrations. OpenRouter generates structured budget suggestions, tasks, vendor categories and personalized ideas. The host can inspect assumptions, edit suggestions and accept only useful records. The model never approves financial changes.

A concrete example: ₹300,000 fixed expenses plus ₹850 catering per guest totals ₹427,500 for150 guests. At180 guests it becomes ₹453,000, leaving ₹47,000 from a ₹500,000 budget. UtsavOS previews the exact impact and saves it only after approval, with version checks and audit history.

The engineering challenge was making AI useful when it is imperfect. Initial production free-provider rate limits failed safely; bounded affected reruns later passed. Those failures remain documented. Deterministic money, database transactions and tenant isolation carry the authority, while suggestions stay reviewable.

The released application has verified wedding, birthday and community AI acceptance and persistence. It uses Next.js, React, TypeScript, Zod, Supabase Auth/PostgreSQL/RLS and Vercel, tested with Vitest, Playwright and GitHub Actions. OpenAI Codex assisted implementation, debugging, tests and release preparation. Gemini adapter support exists, but I am not claiming successful Gemini generation. Billing, payment execution and hosted AI document extraction are not presented as complete.

Try it: https://utsavos.vercel.app
Watch the walkthrough: https://www.youtube.com/watch?v=Z5bo9ydn7JE
Explore the code and evidence: https://github.com/YellankiKaushik/UtsavOS

I would appreciate constructive feedback on the planning flow, change review and clarity of the AI suggestions.

#PromptWars #BuildInPublic #GenAI #EventPlanning #UtsavOS

---

Owner publication checklist: verify the wording and evaluation access, resolve organizer tool eligibility, then publish in your own LinkedIn account and copy the actual post URL into the submission form. No Antigravity contribution or organizer approval is claimed. This Markdown draft is public build narrative, not a published LinkedIn URL. No post has been made by the agent.
