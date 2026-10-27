import "server-only";
import { DomainError } from "@/domain/errors";
type Env = Record<string, string | undefined>;
export type ProviderId = "gemini" | "openrouter";
function failure(name: string): never {
  throw new DomainError(
    "CONFIGURATION_INVALID",
    `Check ${name}. No credential values are included in this message.`,
    503,
  );
}
export function alias(env: Env, canonical: string, legacy: string) {
  const a = env[canonical]?.trim(),
    b = env[legacy]?.trim();
  if (a && b && a !== b) failure(`${canonical} / ${legacy} conflict`);
  return a || b;
}
export function supabaseConfig(env: Env = process.env) {
  const url = alias(env, "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    key = alias(
      env,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
    );
  if (url) {
    try {
      const parsed = new URL(url);
      if (
        !["https:", "http:"].includes(parsed.protocol) ||
        url.includes("\\") ||
        parsed.username ||
        parsed.password
      )
        failure("SUPABASE_URL");
    } catch {
      failure("SUPABASE_URL");
    }
  }
  if (key && (key.startsWith("sb_secret_") || key.includes("\\")))
    failure("SUPABASE_PUBLISHABLE_KEY");
  if (key?.split(".").length === 3) {
    try {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      );
      if (payload.role === "service_role")
        failure("SUPABASE_PUBLISHABLE_KEY must not be privileged");
    } catch (error) {
      if (error instanceof DomainError) throw error;
      failure("SUPABASE_PUBLISHABLE_KEY");
    }
  }
  return { url, key, configured: !!(url && key) };
}
function integer(
  env: Env,
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  if (!/^\d+$/.test(raw) || Number(raw) < min || Number(raw) > max)
    failure(name);
  return Number(raw);
}
export function aiConfig(env: Env = process.env) {
  const primary = env.AI_PROVIDER_PRIMARY || "gemini",
    fallback = env.AI_PROVIDER_FALLBACK || "none";
  if (!["gemini", "openrouter"].includes(primary))
    failure("AI_PROVIDER_PRIMARY");
  if (
    !["none", "gemini", "openrouter"].includes(fallback) ||
    primary === fallback
  )
    failure("AI_PROVIDER_FALLBACK");
  if (env.AI_PROVIDER_MODE && env.AI_PROVIDER_MODE !== "live")
    failure(
      "AI_PROVIDER_MODE must be live (test doubles are injected explicitly)",
    );
  const totalTimeoutMs = integer(
    env,
    "AI_REQUEST_TIMEOUT_MS",
    20000,
    1000,
    45000,
  );
  const providerTimeoutMs = Math.min(
    integer(env, "AI_PROVIDER_TIMEOUT_MS", totalTimeoutMs, 1000, 120000),
    totalTimeoutMs,
  );
  const geminiModel = alias(env, "GEMINI_MODEL_ID", "GEMINI_MODEL_DEFAULT");
  const openrouterModel =
    env.OPENROUTER_MODEL_ID?.trim() ||
    env.OPENROUTER_MODEL_DEFAULT?.trim() ||
    "openrouter/free";
  if (
    env.OPENROUTER_MODEL_ID &&
    env.OPENROUTER_MODEL_DEFAULT &&
    env.OPENROUTER_MODEL_ID !== env.OPENROUTER_MODEL_DEFAULT
  )
    failure("OPENROUTER_MODEL_ID / OPENROUTER_MODEL_DEFAULT conflict");
  for (const model of [geminiModel, openrouterModel])
    if (model && !/^[a-zA-Z0-9][a-zA-Z0-9/_.:-]{0,149}$/.test(model))
      failure("AI model identifier");
  return {
    primary: primary as ProviderId,
    fallback: fallback as ProviderId | "none",
    totalTimeoutMs,
    providerTimeoutMs,
    maxRetries: integer(env, "AI_PROVIDER_MAX_RETRIES", 1, 0, 2),
    enabled: env.FEATURE_AI_GENERATION !== "false",
    models: { gemini: geminiModel, openrouter: openrouterModel },
    keys: {
      gemini: env.GEMINI_API_KEY?.trim(),
      openrouter: env.OPENROUTER_API_KEY?.trim(),
    },
  };
}
