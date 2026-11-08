# Third-party notices

The MIT grant in [LICENSE](LICENSE) covers original UtsavOS source, SQL, tests, scripts, configuration, documentation, diagrams, and synthetic fixtures that Yellanki Kaushik owns or has permission to license. Third-party material keeps its own terms. The grant conveys no right to use the UtsavOS name, logos, branding, or trademarks as trademarks.

The standalone showcase build copies the project license and generates `THIRD_PARTY_NOTICES.txt` from the licenses in the npm packages that actually contribute modules to the browser bundle. Publish both text files alongside the HTML, CSS, and JavaScript. The build checks the module graph against an explicit allowlist and will fail if a new browser dependency needs review. React, React DOM, Scheduler, and Zod are the permitted third-party browser packages. The installed packages provide their respective license notices.

The original application uses Lucide icons, including Feather-derived icons. Keep the Lucide ISC and Feather MIT notices with distributions that include those icons. No icon package, external font, historical screenshot, or third-party video is bundled by the static showcase. [Lucide and Feather license text](docs/assets/lucide-license.txt)

The repository retains historical screenshots and links to an externally hosted walkthrough. Their provenance is documented separately. Any original image or other media supplied by someone else requires its own permission. A link to a walkthrough does not authorize redistribution. [Screenshot provenance](docs/assets/README.md) · [Dependency and asset audit](docs/DEPENDENCY_AND_ASSET_AUDIT.md)

The npm inventory describes one installation of the full repository. When redistributing a separately built full-stack server, container, or other platform binary, inventory that artifact and preserve its applicable upstream licenses, attributions, and notices. [Windows SPDX inventory](docs/evidence/dependencies.spdx.json)
