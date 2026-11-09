# Repository map

This map records the file organization at the maintenance baseline and after the documentation cleanup. The baseline was protected main at commit [703430e0d4a08c56bb53386c3d891c6e2985733a](https://github.com/YellankiKaushik/UtsavOS/commit/703430e0d4a08c56bb53386c3d891c6e2985733a).

## Baseline inventory

The baseline contained **286 tracked files**. These disjoint top-level path groups account for the total:

| Path group | Files | Contents                                                                                  |
| ---------- | ----: | ----------------------------------------------------------------------------------------- |
| Root       |    35 | README, license, environment templates, manifests, and framework/build/test configuration |
| .github    |     2 | CI and Dependabot configuration                                                           |
| app        |    18 | Next.js routes, layouts, and handlers                                                     |
| src        |    50 | Application, domain, UI, generated types, and infrastructure                              |
| showcase   |    13 | Standalone Vite application                                                               |
| supabase   |    19 | Supabase configuration and database assets, including 15 migrations                       |
| tests      |    58 | Unit, integration, database, provider, and browser checks                                 |
| scripts    |    18 | Report generation, validation, security scans, and tooling                                |
| docs       |    73 | Developer guides, historical evidence, API reference, modules, and media                  |

The 50 source files are organized under application (9), components (14), domain (14), generated (1), and infrastructure (12). The 73 documentation files included 30 files at the docs root, 7 in modules, 13 in hackathon, 1 API contract, 11 in assets, 7 in evidence, and 4 in screenshots. Twelve PNGs and one SVG are retained as media; binary assets are not recompressed or rewritten.

## Resulting layout

Framework- and tool-discovered paths stayed in place. Root configuration, app, source, showcase, Supabase, migrations, tests, scripts, and GitHub workflows were not relocated.

| Area                                         | Purpose                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Root README                                  | Fast product orientation, the two quickstarts, and links into detailed guides                             |
| docs root                                    | Current setup, deployment, testing, architecture, release verification, license and maintenance documents |
| docs/archive/reports                         | Dated release, audit, test, implementation, and owner-action records                                      |
| docs/hackathon                               | Challenge-specific checklist, event requirements, draft copy, and AI verification                         |
| docs/modules and docs/api                    | Feature-specific guidance and API/database contracts                                                      |
| docs/assets, docs/screenshots, docs/evidence | Media provenance, synthetic screenshots, and retained verification evidence                               |

The root README's detailed gallery and project narrative were moved into [the product overview](PRODUCT_OVERVIEW.md). Dated reports were moved using Git renames, with internal Markdown links corrected. No application feature, API, migration, or security rule changed.

## Counts and preservation

| Measure                           | Before | After |
| --------------------------------- | -----: | ----: |
| Tracked files                     |    286 |   289 |
| docs files                        |     73 |    76 |
| docs root files                   |     30 |    13 |
| Historical reports relocated      |      0 |    19 |
| New navigation/overview documents |      0 |     3 |
| Original tracked files removed    |      0 |     0 |

The three added documents are this map, the product overview, and the archive index. The 19 moved report files remain present under their new paths. All other original tracked files retain their paths. Git history was not rewritten.

## GitHub contributor attribution

The merged commit that added the maintenance update records Dependabot as its commit author and Kaushik as a co-author. GitHub's repository contributor view is based on commit history on the default branch; its activity view can also count co-authors. This is authorship/credit metadata, not repository ownership, collaborator access, or control of the repository.

GitHub documents [how it builds a repository's contributors view](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-projects-contributors) and [how co-authors are recorded](https://docs.github.com/en/pull-requests/how-tos/commit-changes/creating-a-commit-with-multiple-authors-or-on-behalf-of-an-organization). It provides no supported per-author visibility switch. Removing this attribution would require changing commit metadata/history; this project will not rewrite it. The README instead truthfully credits the creator/maintainer and identifies Codex as development assistance, not a Git author.
