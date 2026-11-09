# UtsavOS documentation

[Public showcase](https://utsavos.vercel.app) · [Repository README](../README.md) · [Project map](REPOSITORY_MAP.md)

The canonical website serves the standalone Vite showcase. The original Next.js application remains in this repository for developers who want to self-host with their own Supabase project and optional AI credentials.

## Start here

| If you want to…                            | Read                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Try the backend-free interactive demo      | [Showcase quickstart](../showcase/README.md)                                                                                        |
| Run the full-stack application             | [Self-hosting setup](SETUP.md) and [.env.example](../.env.example)                                                                  |
| Understand system boundaries and data flow | [Architecture](ARCHITECTURE.md), [V2 design reference](../DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md), and [decisions](DECISIONS.md) |
| Run checks safely                          | [Testing guide](TESTING.md)                                                                                                         |
| Deploy or operate your own instance        | [Deployment](DEPLOYMENT.md) and [operations runbook](OPERATIONS_RUNBOOK.md)                                                         |
| Review the static production release       | [Release verification](STATIC_SHOWCASE_RELEASE_VERIFICATION.md)                                                                     |
| Understand modules and their evidence      | [Module index](modules/README.md) and the dated [implementation matrix](archive/reports/IMPLEMENTATION_STATUS.md)                   |
| Read API and database contracts            | [OpenAPI](api/openapi.yaml), [generated types](../src/generated/database.types.ts), and [15 migrations](../supabase/migrations)     |

## Open-source project

- [Product overview](PRODUCT_OVERVIEW.md)
- [License review](OPEN_SOURCE_LICENSE_REVIEW.md), [dependency and asset audit](DEPENDENCY_AND_ASSET_AUDIT.md), and [third-party notices](../THIRD_PARTY_NOTICES.md)
- [Contributing](../CONTRIBUTING.md) and [security reporting](../SECURITY.md)
- [Repository layout and attribution notes](REPOSITORY_MAP.md)

## Showcase and media

- [Static showcase source and local commands](../showcase/README.md)
- [Media provenance and attributions](assets/README.md)
- [Historical test screenshots](screenshots/README.md)
- [Synthetic fixtures and retained verification artifacts](evidence)

## Historical material

- [Hackathon materials](hackathon/PROJECT_DESCRIPTION.md), [submission checklist](hackathon/SUBMISSION_CHECKLIST.md), and [retained AI verification](hackathon/AI_RELEASE_VERIFICATION_2026-10-29.md)
- [Archived release, phase, and engineering reports](archive/reports/README.md)

Archived reports retain the dates, failures, and decisions recorded at their original checkpoints. They are evidence, not current deployment or setup instructions. Use the current guides above for how the repository works now.
