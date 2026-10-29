import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { readdirSync, lstatSync, mkdirSync, writeFileSync } from "node:fs";
const git = (args, encoding = "utf8") =>
  execFileSync("git", args, { encoding, maxBuffer: 32 * 1024 * 1024 });
const files = git(["ls-tree", "-r", "-l", "HEAD"])
  .trim()
  .split("\n")
  .map((line) => {
    const m = line.match(/^\d+ blob [a-f0-9]+\s+(\d+)\t(.*)$/);
    return m ? { path: m[2], bytes: Number(m[1]) } : null;
  })
  .filter(Boolean);
function directoryBytes(path) {
  let bytes = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const item = resolve(path, entry.name),
      stat = lstatSync(item);
    if (stat.isSymbolicLink()) continue;
    bytes += stat.isDirectory() ? directoryBytes(item) : stat.size;
  }
  return bytes;
}
const common = resolve(git(["rev-parse", "--git-common-dir"]).trim());
const trackedBytes = files.reduce((n, f) => n + f.bytes, 0),
  zipBytes = git(["archive", "--format=zip", "HEAD"], null).length;
const report = {
  generatedAt: new Date().toISOString(),
  commit: git(["rev-parse", "HEAD"]).trim(),
  trackedFiles: files.length,
  trackedBytes,
  headZipBytes: zipBytes,
  localGitMetadataBytes: directoryBytes(common),
  limitBytes: 10_000_000,
  trackedAndZipStrictlyUnderLimit:
    trackedBytes < 10_000_000 && zipBytes < 10_000_000,
  methods: {
    tracked:
      "Sum git ls-tree -r -l HEAD blob lengths; exact uncompressed tracked content",
    zip: "Length of git archive --format=zip HEAD; exact archive bytes",
    gitMetadata:
      "Sum regular file sizes in local common Git directory, excluding symlinks; includes available refs/history/config, not the server's inaccessible objects",
  },
  organizerDefinition:
    "Owner dashboard says GitHub repo less than10MB without defining working tree/archive/history. Report all measured forms; do not assume ignored node_modules count.",
  largest: files.sort((a, b) => b.bytes - a.bytes).slice(0, 10),
};
mkdirSync(".runtime/release-20261029", { recursive: true });
writeFileSync(
  ".runtime/release-20261029/repository-size.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (!report.trackedAndZipStrictlyUnderLimit) process.exitCode = 1;
