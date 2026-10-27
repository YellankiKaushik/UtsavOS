import nextEnv from "@next/env";
import { mkdirSync, writeFileSync } from "node:fs";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
const result = {
  mode: "read-only settings/schema probe",
  projectIdentity: "management access denied; designation unverified",
  settings: null,
  schema: null,
};
try {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".supabase.co") ||
    url.hostname.startsWith("dbgctyqdjmvljfcezuer.")
  )
    throw new Error("Unsafe or unrelated project");
  for (const [name, path] of [
    ["settings", "/auth/v1/settings"],
    ["schema", "/rest/v1/"],
  ]) {
    try {
      const response = await fetch(new URL(path, url), {
        headers: { apikey: key },
        signal: AbortSignal.timeout(10000),
      });
      const item = {
        status: response.status,
        requestAllowed: response.ok,
      };
      if (response.ok && name === "schema") {
        const body = await response.json();
        item.utsavosPathsPresent = [
          "/events",
          "/budget_items",
          "/tasks",
          "/vendor_requirements",
        ].every((p) => Object.hasOwn(body.paths ?? {}, p));
        item.exposedPathCount = Object.keys(body.paths ?? {}).length;
      }
      result[name] = item;
    } catch {
      result[name] = { status: "network-or-response-failure" };
    }
  }
} catch {
  result.projectIdentity = "configuration invalid, unverified or excluded";
}
mkdirSync(".runtime", { recursive: true });
writeFileSync(
  ".runtime/supabase-probe.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
