import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const values = [
  process.env.GEMINI_API_KEY,
  process.env.SUPABASE_SECRET_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.OPENROUTER_API_KEY,
  process.env.DATABASE_URL,
  "utsavos-server-only-build-sentinel",
].filter((v) => v && v.length > 12);
const leaks = [];
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (/\.(js|json)$/.test(path)) {
      const content = readFileSync(path, "utf8");
      if (
        values.some((value) => content.includes(value)) ||
        /sb_secret_[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|sk-or-v1-[A-Za-z0-9_-]{20,}/.test(
          content,
        )
      )
        leaks.push(path);
    }
  }
}
scan(".next/static");
if (leaks.length) {
  console.error("Potential server secret found in client output:", leaks);
  process.exit(1);
}
console.log(
  "Client output scan passed (known values and provider-key patterns).",
);
