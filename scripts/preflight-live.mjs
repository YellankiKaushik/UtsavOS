import { readFileSync } from "node:fs";
import { loadLiveEnvironment } from "./live-env.ts";
loadLiveEnvironment();
const mode = process.argv[2],
  missing = [];
const provider =
  mode === "corpus"
    ? process.env.LIVE_AI_PROVIDER || "gemini"
    : process.env.AI_PROVIDER_PRIMARY || "gemini";
if (mode !== "corpus") {
  if (process.env.LIVE_STAGING_CONFIRMED !== "true")
    missing.push("LIVE_STAGING_CONFIRMED (designated isolated staging only)");
  for (const name of [
    "LIVE_USER_A_EMAIL",
    "LIVE_USER_A_PASSWORD",
    "LIVE_USER_B_EMAIL",
    "LIVE_USER_B_PASSWORD",
  ])
    if (!process.env[name]) missing.push(name);
  if (!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL))
    missing.push("SUPABASE_URL");
  if (!(
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ))
    missing.push("SUPABASE_PUBLISHABLE_KEY");
}
if (mode === "browser" || mode === "corpus") {
  const model =
    provider === "gemini"
      ? process.env.GEMINI_MODEL_ID || process.env.GEMINI_MODEL_DEFAULT
      : process.env.OPENROUTER_MODEL_ID ||
        process.env.OPENROUTER_MODEL_DEFAULT ||
        "openrouter/free";
  let smoke = null;
  try {
    smoke = JSON.parse(
      readFileSync(".runtime/live-provider-smoke.json", "utf8"),
    )[provider];
  } catch {}
  if (
    !smoke ||
    smoke.status !== "VERIFIED_STRUCTURED_SMOKE" ||
    smoke.requestedModel !== model
  )
    missing.push(`successful bounded ${provider} planning smoke`);
  if (
    mode === "corpus" &&
    Number(process.env.LIVE_EVAL_REQUEST_BUDGET || 0) < 24
  )
    missing.push(
      "LIVE_EVAL_REQUEST_BUDGET>=24 (operator-approved evaluation budget)",
    );
}
if (missing.length) {
  console.error(
    JSON.stringify(
      {
        status: "BLOCKED",
        mode,
        requirements: missing,
        note: "No provider call or remote mutation was attempted. Enter credentials only in ignored environment files.",
      },
      null,
      2,
    ),
  );
  process.exit(2);
}
console.log(
  `Live ${mode} preflight passed; the following tests make real provider/staging requests.`,
);
