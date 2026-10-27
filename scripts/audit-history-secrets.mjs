import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import nextEnv from "@next/env";
import { loadLiveEnvironment } from "./live-env.ts";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
loadLiveEnvironment();
const git = (...args) =>
  execFileSync("git", args, { maxBuffer: 128 * 1024 * 1024 });
const values = Object.entries(process.env)
  .filter(
    ([name, value]) =>
      /(?:_KEY|_PASSWORD|_TOKEN|DATABASE_URL)$/.test(name) &&
      value &&
      value.length >= 8,
  )
  .map(([, value]) => Buffer.from(value));
const objects = git("rev-list", "--objects", "--all")
  .toString("utf8")
  .trim()
  .split("\n")
  .map((line) => {
    const i = line.indexOf(" ");
    return {
      id: i < 0 ? line : line.slice(0, i),
      path: i < 0 ? "" : line.slice(i + 1),
    };
  });
const paths = new Map(objects.map((o) => [o.id, o.path]));
const batch = execFileSync("git", ["cat-file", "--batch"], {
  input: objects.map((o) => o.id).join("\n") + "\n",
  maxBuffer: 128 * 1024 * 1024,
});
const findings = [];
let offset = 0,
  blobs = 0;
while (offset < batch.length) {
  const end = batch.indexOf(10, offset),
    [id, type, rawSize] = batch
      .subarray(offset, end)
      .toString("ascii")
      .split(" "),
    size = Number(rawSize);
  if (!Number.isSafeInteger(size) || size < 0)
    throw Error("Unexpected Git object response");
  const content = batch.subarray(end + 1, end + 1 + size);
  offset = end + 1 + size + 1;
  if (type !== "blob") continue;
  blobs++;
  const path = paths.get(id) ?? "";
  if (
    /(^|\/)\.env(?:\.|$)/.test(path) &&
    ![".env.example", ".env.live.example"].includes(path)
  )
    findings.push({ path, kind: "tracked environment file" });
  if (values.some((value) => content.includes(value)))
    findings.push({ path, kind: "configured secret value" });
  if (
    /(?:AIza[0-9A-Za-z_-]{35}|sk-or-v1-[a-f0-9]{32,}|sb_secret_[A-Za-z0-9_-]{20,})/.test(
      content.toString("utf8"),
    )
  )
    findings.push({
      path,
      kind: "provider credential pattern; review required",
    });
}
const report = {
  scope:
    "All locally available reachable Git refs; not deleted/unreachable server objects",
  objects: objects.length,
  blobs,
  configuredSecretComparison: true,
  credentialPatterns: true,
  findings,
  status: findings.length ? "REVIEW_REQUIRED" : "PASS",
};
mkdirSync(".runtime/release-20261028", { recursive: true });
writeFileSync(
  ".runtime/release-20261028/history-secret-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
if (findings.length) process.exitCode = 1;
