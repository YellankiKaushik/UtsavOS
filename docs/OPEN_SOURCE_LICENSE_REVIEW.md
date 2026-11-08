# UtsavOS license review

Phase 2 reviewed the repository after the Phase 1 merge at `2f65759`. The repository is public and has no root license. The maintainer must confirm the rights and scope before granting reuse terms.

## Recommendation

Use **MIT for the project-owned code and any documentation or fixtures the owner confirms are in scope**. UtsavOS is primarily a reference application for developers to study, adapt and self-host. MIT gives those users broad reuse rights with a short notice requirement. Choose Apache-2.0 instead if the owner wants contributors and downstream users to receive an explicit patent grant and is prepared to maintain the additional distribution notices.

| Question                         | MIT                                                                                                                                | Apache-2.0                                                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contributor and downstream reuse | Permits modification and redistribution, including commercial use. The text has no separate contribution or express patent clause. | Permits modification and redistribution, including commercial use. Section 5 provides default terms for contributions intentionally submitted for inclusion, subject to its exceptions.                          |
| Redistribution and attribution   | Retain the copyright and permission notices in copies or substantial portions.                                                     | Include the license, mark modified files, preserve applicable notices and carry forward applicable NOTICE attributions when an upstream NOTICE exists.                                                           |
| Patent terms                     | No express patent license in the text.                                                                                             | Express contributor patent grant limited to claims necessarily infringed by the contribution alone or in combination with the work it was submitted to. The grant can terminate for specified patent litigation. |

The comparison follows the published license terms. Both choices leave third-party dependencies under their own licenses. Review the actual distribution, including browser bundles, before preparing notices. [OSI MIT text](https://opensource.org/license/mit) · [Apache Software Foundation license, sections 3–6](https://www.apache.org/licenses/LICENSE-2.0)

## Rights to confirm

- Git history on the reviewed baseline uses two author display names. That is contribution evidence, and the maintainer still needs to confirm who holds rights to the source, SQL migrations, tests, documentation, and any contributions made on behalf of another party. Git attribution alone cannot establish copyright ownership or permission to relicense.
- The README documents Codex assistance. Confirm the provenance and applicable terms of any imported snippets or generated material before including them in a license grant. Confirm that the contest terms allow the intended release.
- Separate screenshots, branding, icon artwork, externally hosted video, and third-party code from the project's code grant until their rights and required notices are confirmed. The source tree's media notes record capture provenance and synthetic data boundaries. [Dependency and asset audit](DEPENDENCY_AND_ASSET_AUDIT.md)

## Owner decisions

1. Select MIT or Apache-2.0 and confirm the correct copyright holder and notice year.
2. Confirm that the grant covers the intended code, migrations, tests, documentation and fixtures. Identify excluded media, marks and third-party material explicitly.
3. Confirm the contribution terms for future PRs and any consent required for earlier contributions. Decide who will review attribution and release notices.

Add the selected license and update contributor terms in a separate change after those decisions are recorded.
