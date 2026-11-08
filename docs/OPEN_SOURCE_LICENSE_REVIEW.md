# UtsavOS license review

Phase 2 reviewed the repository after the Phase 1 merge at `2f65759`. The decision record below was updated after the owner approved the project license.

On 8 November 2026, the owner authorized MIT with the notice **Copyright (c) 2026 Yellanki Kaushik** for original code, migrations, tests, scripts, configuration, documentation, architecture diagrams, and synthetic fixtures he owns or has permission to license. Third-party material keeps its own terms, and the grant confers no trademark rights. [MIT license](../LICENSE) · [Third-party notices](../THIRD_PARTY_NOTICES.md)

## License choice

The owner selected **MIT** for original code, SQL migrations, tests, scripts, configuration, documentation, diagrams and synthetic fixtures that he owns or has permission to license. UtsavOS is a reference application for developers to study, adapt and self-host. MIT gives those users broad reuse rights with a short notice requirement. Apache-2.0 would provide an express contributor patent grant and requires additional notice maintenance; it was not selected.

| Question                         | MIT                                                                                                                                | Apache-2.0                                                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contributor and downstream reuse | Permits modification and redistribution, including commercial use. The text has no separate contribution or express patent clause. | Permits modification and redistribution, including commercial use. Section 5 provides default terms for contributions intentionally submitted for inclusion, subject to its exceptions.                          |
| Redistribution and attribution   | Retain the copyright and permission notices in copies or substantial portions.                                                     | Include the license, mark modified files, preserve applicable notices and carry forward applicable NOTICE attributions when an upstream NOTICE exists.                                                           |
| Patent terms                     | No express patent license in the text.                                                                                             | Express contributor patent grant limited to claims necessarily infringed by the contribution alone or in combination with the work it was submitted to. The grant can terminate for specified patent litigation. |

The comparison follows the published license terms. Both choices leave third-party dependencies under their own licenses. Review the actual distribution, including browser bundles, before preparing notices. [OSI MIT text](https://opensource.org/license/mit) · [Apache Software Foundation license, sections 3–6](https://www.apache.org/licenses/LICENSE-2.0)

## Scope and continuing rights checks

- The inspected reachable history uses the author display names `Kaushik` and `YellankiKaushik`. Git metadata is not a legal ownership record. The MIT grant remains limited to material the owner owns or has rights to license; contributions by other rights holders require their permission.
- The README records Codex assistance. The owner-approved grant covers AI-assisted material only where he has the necessary rights. Check any copied snippets, contributions made for another party, or applicable challenge terms before redistributing them.
- The grant does not extend to third-party dependencies, fonts, icons, externally sourced images or videos, or UtsavOS marks. Preserve dependency notices where required; do not reproduce the brand under the code license. The standalone showcase uses its own synthetic fixtures, inline icon paths and system fonts. [Dependency and asset audit](DEPENDENCY_AND_ASSET_AUDIT.md)

## Decision record

1. **Resolved:** The owner authorized MIT and the exact notice `Copyright (c) 2026 Yellanki Kaushik` for project materials he owns or may license.
2. **Resolved:** The owner excluded third-party works, unpermitted contributions, and trademark use from that grant.
3. For future contributions, keep the permission and attribution review in the PR. Check third-party rights whenever new media or dependencies are added; this review does not establish rights to material outside the stated grant.

The release candidate carries the approved grant and preserves third-party terms. Check rights and notice obligations again for any future contribution or redistributed artifact.
