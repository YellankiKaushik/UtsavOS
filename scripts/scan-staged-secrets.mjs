import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 20_000_000 });
const paths = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
  .split("\0")
  .filter(Boolean);
const values = Object.entries(process.env)
  .filter(
    ([name, value]) =>
      /(?:_KEY|_PASSWORD|_TOKEN|DATABASE_URL)$/.test(name) &&
      value &&
      value.length >= 8,
  )
  .map(([, value]) => value);
const failures = [];
for (const path of paths) {
  if (
    /(^|\/)\.env(?:\.|$)/.test(path) &&
    ![".env.example", ".env.live.example"].includes(path)
  ) {
    failures.push(path);
    continue;
  }
  const content = git("show", `:${path}`);
  if (values.some((value) => content.includes(value))) failures.push(path);
}
if (failures.length) {
  console.error("Staged credential/config exposure detected; paths only:");
  for (const path of failures) console.error(path);
  process.exit(1);
}
console.log(
  `Staged secret scan passed for ${paths.length} files; no credential values printed.`,
);
