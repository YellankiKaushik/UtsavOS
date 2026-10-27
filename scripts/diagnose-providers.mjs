import nextEnv from "@next/env";
import { mkdirSync, writeFileSync } from "node:fs";
import { diagnoseFailure } from "../src/infrastructure/ai/diagnostic.ts";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const report = {
  generatedAtUtc: new Date().toISOString(),
  mode: "Read-only metadata; no generation, fallback, retries or provider spend",
  deadlineMs: 10000,
  requests: [],
  gemini: null,
  openrouter: null,
};
async function request(provider, path, headers) {
  const start = Date.now();
  try {
    const response = await fetch(path, {
      headers,
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    const body = await response.json();
    const safe = {
      provider,
      status: response.status,
      latencyMs: Date.now() - start,
      attempts: 1,
      ...(!response.ok ? diagnoseFailure(body, response.status) : {}),
    };
    report.requests.push(safe);
    return { ok: response.ok, body, safe };
  } catch (error) {
    const safe = {
      provider,
      status: null,
      latencyMs: Date.now() - start,
      attempts: 1,
      ...diagnoseFailure(error),
    };
    report.requests.push(safe);
    return { ok: false, safe };
  }
}
const geminiModel =
  process.env.GEMINI_MODEL_ID || process.env.GEMINI_MODEL_DEFAULT;
if (
  process.env.GEMINI_API_KEY &&
  geminiModel &&
  /^[a-zA-Z0-9_.:-]{1,150}$/.test(geminiModel)
) {
  const result = await request(
    "gemini",
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}`,
    { "x-goog-api-key": process.env.GEMINI_API_KEY },
  );
  report.gemini = {
    requestedModel: geminiModel,
    ...result.safe,
    ...(result.ok
      ? {
          supportedGeneration:
            result.body.supportedGenerationMethods?.includes(
              "generateContent",
            ) ?? false,
        }
      : {}),
  };
} else report.gemini = { category: "configuration", status: "BLOCKED" };
if (process.env.OPENROUTER_API_KEY) {
  const headers = { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` };
  const key = await request(
    "openrouter-key",
    "https://openrouter.ai/api/v1/key",
    headers,
  );
  const catalogue = await request(
    "openrouter-models",
    "https://openrouter.ai/api/v1/models",
    headers,
  );
  report.openrouter = {
    keyStatus: key.safe,
    status: catalogue.safe,
    candidates: [],
  };
  if (key.ok) {
    const data = key.body.data ?? {};
    report.openrouter.account = {
      isFreeTier: data.is_free_tier ?? null,
      hasRemainingAllowance:
        data.limit_remaining === null ? null : Number(data.limit_remaining) > 0,
    };
  }
  if (catalogue.ok) {
    const candidates = (catalogue.body.data ?? []).filter(
      (m) =>
        m.supported_parameters?.includes("structured_outputs") &&
        m.pricing &&
        Number(m.pricing.prompt) === 0 &&
        Number(m.pricing.completion) === 0 &&
        /^[\w/_.:-]{1,150}$/.test(m.id),
    );
    report.openrouter.candidates = candidates
      .map((m) => ({ id: m.id, structuredOutput: true, zeroTokenPrice: true }))
      .slice(0, 15);
    report.openrouter.compatibleFreeCandidateCount = candidates.length;
  }
}
mkdirSync(".runtime", { recursive: true });
writeFileSync(
  ".runtime/provider-diagnostic.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
