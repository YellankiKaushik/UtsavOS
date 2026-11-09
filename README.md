# UtsavOS — open-source event planning application

Plan weddings, birthdays, and community celebrations with connected budgets, tasks, and reviewable changes.

**Created and maintained by Yellanki Kaushik. Development assistance: OpenAI Codex.** UtsavOS is MIT licensed; third-party materials retain their own terms. [License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)

The public website is a standalone, browser-only Vite showcase using synthetic events and browser-local storage. [Try the live showcase](https://utsavos.vercel.app). The repository also preserves the original self-hostable Next.js application. The full-stack app needs a Supabase project that you control; AI generation is optional and uses provider credentials that you supply. These are separate experiences.

## Static showcase

The showcase needs no sign-in, Supabase project, AI key, or application server.

    npm ci
    npm run showcase:dev

Open the local address printed by Vite. Build the static site with `npm run showcase:build`. See the [showcase guide](showcase/README.md) and the [public release verification](docs/STATIC_SHOWCASE_RELEASE_VERIFICATION.md).

## Self-host the full-stack application

The Next.js app is not backend-free. To run it, connect it to your own Supabase project and configure its Auth settings.

1. Clone this repository and install its locked dependencies.
2. Create an isolated Supabase project for your instance.
3. Copy `.env.example` to `.env.local`; enter your project's Supabase URL and publishable key.
4. Review the 15 included forward migrations and apply them to your own project using the documented dry-run procedure.
5. Optionally configure your own server-side OpenRouter or Gemini credentials and enable AI only after verifying your route.
6. After configuring your project and reviewing migrations, start the application with `npm run dev`.

   git clone https://github.com/YellankiKaushik/UtsavOS.git
   cd UtsavOS
   npm ci
   Copy-Item .env.example .env.local

After filling the template with your own settings, configure Auth and apply the reviewed migrations as described in the full [setup guide](docs/SETUP.md). Then run `npm run dev`. The guide also covers local database testing and optional AI configuration. Keep real keys out of tracked files and never put a Supabase service-role key in browser settings.

## Project guides

- [Product overview and approach](docs/PRODUCT_OVERVIEW.md)
- [Documentation index](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md) and [V2 design reference](DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md)
- [API contract](docs/api/openapi.yaml), [database migrations](supabase/migrations), and [feature modules](docs/modules/README.md)
- [Testing](docs/TESTING.md), [deployment](docs/DEPLOYMENT.md), and [operations](docs/OPERATIONS_RUNBOOK.md)
- [Contributing](CONTRIBUTING.md) and [security reporting](SECURITY.md)

Historical release records, hackathon materials, and engineering evidence are preserved in [the documentation archive](docs/archive/reports/README.md). The project’s verified public URL currently serves the static showcase; archived full-stack screenshots and release reports describe earlier checkpoints.

## How the project handles planning

AI can help draft ideas, but a person reviews and chooses what to accept. Budget calculations use exact integer paise, and consequential plan changes can be previewed before an explicit save. The [product overview](docs/PRODUCT_OVERVIEW.md) explains the project’s scope, evidence, and limitations.
