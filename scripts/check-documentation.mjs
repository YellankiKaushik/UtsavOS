import {
  readFileSync,
  existsSync,
  statSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname, relative } from "node:path";
const root = process.cwd();
const files = ["README.md", "CONTRIBUTING.md", "SECURITY.md"];
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(path);
    else if (e.name.endsWith(".md")) files.push(path);
  }
}
walk("docs");
const failures = [],
  links = [];
for (const file of files) {
  const source = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
  const targets = [
    ...source.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\)/g),
  ].map((m) => m[1].replace(/^<|>$/g, ""));
  targets.push(
    ...[...source.matchAll(/<(?:img|a)\b[^>]*(?:src|href)="([^"]+)"/g)].map(
      (m) => m[1],
    ),
  );
  for (const target of targets) {
    if (/^(https?:|mailto:|codex:|#|C:|\/)/i.test(target)) continue;
    let path;
    try {
      path = resolve(
        dirname(file),
        decodeURIComponent(target.split("#")[0].split("?")[0]),
      );
    } catch {
      failures.push({ file, target, reason: "invalid encoding" });
      continue;
    }
    const within = !relative(root, path).startsWith("..");
    if (!within || !existsSync(path))
      failures.push({
        file,
        target,
        reason: within ? "missing relative target" : "outside repository",
      });
    else links.push({ file, target });
  }
}
const media = [];
for (const name of readdirSync("docs/assets").filter((n) =>
  n.endsWith(".png"),
)) {
  const path = `docs/assets/${name}`,
    b = readFileSync(path),
    size = statSync(path).size;
  const valid = b
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  media.push({
    path,
    width: valid ? b.readUInt32BE(16) : null,
    height: valid ? b.readUInt32BE(20) : null,
    bytes: size,
  });
  if (!valid || size > 500000)
    failures.push({ file: path, reason: "invalid or oversized image" });
}
const report = {
  observedAt: new Date().toISOString(),
  markdownFiles: files.length,
  validRelativeLinks: links.length,
  media,
  failures,
  note: "Checks file/directory targets and PNG structure/size; external access, anchors, visual privacy and GitHub rendering require separate review.",
};
mkdirSync(".runtime/github-presentation", { recursive: true });
writeFileSync(
  ".runtime/github-presentation/documentation-check.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
if (failures.length) process.exitCode = 1;
