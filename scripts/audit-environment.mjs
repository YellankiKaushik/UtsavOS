import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import nextEnv from "@next/env";
import { credentialFormat } from "../src/infrastructure/ai/credential-format.ts";
const names = [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "APP_BASE_URL",
  "AI_PROVIDER_MODE",
  "AI_PROVIDER_PRIMARY",
  "AI_PROVIDER_FALLBACK",
  "AI_REQUEST_TIMEOUT_MS",
  "AI_PROVIDER_TIMEOUT_MS",
  "AI_PROVIDER_MAX_RETRIES",
  "GEMINI_API_KEY",
  "GEMINI_MODEL_ID",
  "GEMINI_MODEL_DEFAULT",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL_ID",
  "OPENROUTER_MODEL_DEFAULT",
  "VITE_AUTH_PROVIDER",
];
const inherited = new Set(Object.keys(process.env));
const loaded = nextEnv.loadEnvConfig(process.cwd(), true, {
  info() {},
  error() {},
});
const diagnostics = names.map((name) => {
  const value = process.env[name],
    sources = loaded.loadedEnvFiles.filter((f) =>
      Object.hasOwn(f.env ?? {}, name),
    );
  let format = "not-configured";
  if (value) {
    format = "valid";
    if (/URL$/.test(name)) {
      try {
        const u = new URL(value);
        if (!["http:", "https:"].includes(u.protocol) || value.includes("\\"))
          format = "invalid";
      } catch {
        format = "invalid";
      }
    } else if (/_MS$|RETRIES$/.test(name) && !/^\d+$/.test(value))
      format = "invalid";
    else if (value.includes("\\") || /[\r\n]/.test(value)) format = "invalid";
  }
  return {
    name,
    present: value !== undefined,
    nonempty: !!value,
    format,
    ...(["GEMINI_API_KEY", "OPENROUTER_API_KEY"].includes(name)
      ? {
          credentialFormat: credentialFormat(
            name === "GEMINI_API_KEY" ? "gemini" : "openrouter",
            value,
          ),
          formatIsAuthorizationProof: false,
        }
      : {}),
    source: inherited.has(name) ? "process" : (sources[0]?.path ?? null),
    overriddenIn: sources.slice(1).map((f) => f.path),
  };
});
const duplicates = loaded.loadedEnvFiles.flatMap((f) => {
  const seen = new Set(),
    repeat = new Set();
  for (const line of readFileSync(f.path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=/);
    if (match) {
      if (seen.has(match[1])) repeat.add(match[1]);
      seen.add(match[1]);
    }
  }
  return [...repeat].map((name) => ({ file: f.path, name }));
});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
let projectSafety = "unconfigured";
try {
  projectSafety = new URL(url).hostname.startsWith("dbgctyqdjmvljfcezuer.")
    ? "unrelated-project-blocked"
    : "identity-verification-required";
} catch {}
const report = { variables: diagnostics, duplicates, projectSafety };
mkdirSync(".runtime", { recursive: true });
writeFileSync(
  ".runtime/environment-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
