import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { draftSchema } from "@/domain/ai-contract";
import { createOpenRouterTransport } from "@/infrastructure/ai/openrouter-provider";
import {
  generateStructured,
  generatePlan,
  failureMetadata,
  failureUsage,
} from "@/infrastructure/ai/service";
import {
  ProviderError,
  type ModelRequest,
  type ModelTransport,
} from "@/infrastructure/ai/types";
import { aiConfig, supabaseConfig } from "@/infrastructure/config";
const request: ModelRequest = {
  model: "openrouter/free",
  system: "Synthetic instructions",
  context: { synthetic: true },
  schema: { type: "object" },
  timeout: 1000,
};
const event = {
  id: "synthetic",
  workspaceId: "synthetic",
  type: "birthday" as const,
  title: "PRIVATE_TEST_TITLE",
  dateStatus: "tbd" as const,
  startsAt: null,
  timeZone: "Asia/Kolkata",
  guestCount: 20,
  currency: "INR" as const,
  budgetMinor: "1000000",
  preferences: "",
  status: "planning" as const,
  version: 1,
  createdAt: "",
};
const plan = {
  schemaVersion: 1,
  eventType: "birthday",
  summary: "Synthetic controlled response",
  budgetSuggestions: [],
  tasks: [],
  vendorRequirements: [],
  ideas: [],
  assumptions: [],
  questions: [],
  warnings: [],
};
beforeEach(() => {
  vi.stubEnv("AI_PROVIDER_MODE", "live");
  vi.stubEnv("AI_PROVIDER_PRIMARY", "gemini");
  vi.stubEnv("AI_PROVIDER_FALLBACK", "none");
  vi.stubEnv("AI_PROVIDER_MAX_RETRIES", "1");
  vi.stubEnv("GEMINI_API_KEY", "SYNTHETIC_GEMINI_KEY");
  vi.stubEnv("GEMINI_MODEL_ID", "synthetic-gemini");
  vi.stubEnv("OPENROUTER_API_KEY", "SYNTHETIC_OPENROUTER_KEY");
  vi.stubEnv("OPENROUTER_MODEL_DEFAULT", "openrouter/free");
  vi.stubEnv("OPENROUTER_DISABLE_REASONING", "false");
  vi.stubEnv("OPENROUTER_REQUIRE_FREE", "false");
});
afterEach(() => vi.unstubAllEnvs());
function mockHttp(
  opts: {
    parameters?: string[];
    status?: number;
    completion?: unknown;
    catalog?: unknown;
    model?: string;
  } = {},
) {
  return vi.fn<typeof fetch>(async (input) =>
    String(input).endsWith("/models")
      ? Response.json(
          opts.catalog ?? {
            data: [
              {
                id: opts.model ?? "openrouter/free",
                supported_parameters: opts.parameters ?? [
                  "structured_outputs",
                  "response_format",
                ],
              },
            ],
          },
        )
      : Response.json(
          opts.completion ?? {
            id: "synthetic-request",
            model: "synthetic/actual-model",
            provider: "synthetic-router-provider",
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: { role: "assistant", content: JSON.stringify(plan) },
              },
            ],
            usage: { prompt_tokens: 11, completion_tokens: 22, cost: "0" },
          },
          { status: opts.status ?? 200 },
        ),
  );
}
describe("OpenRouter HTTP adapter", () => {
  it("disables optional reasoning only on a verified capable fixed free route", async () => {
    vi.stubEnv("OPENROUTER_DISABLE_REASONING", "true");
    vi.stubEnv("OPENROUTER_REQUIRE_FREE", "true");
    const catalog = {
      data: [
        {
          id: "synthetic/free",
          reasoning: { mandatory: false },
          supported_parameters: ["structured_outputs", "reasoning"],
          pricing: { prompt: "0", completion: "0" },
        },
      ],
    };
    const http = mockHttp({ catalog });
    await createOpenRouterTransport(http)({
      ...request,
      model: "synthetic/free",
    });
    const call = http.mock.calls.find(([url]) =>
      String(url).includes("/chat/completions"),
    )!;
    expect(JSON.parse(String(call[1]?.body)).reasoning).toEqual({
      enabled: false,
      exclude: true,
    });
    for (const model of [
      { ...catalog.data[0], reasoning: { mandatory: true } },
      { ...catalog.data[0], pricing: { prompt: "1", completion: "0" } },
    ]) {
      const denied = mockHttp({ catalog: { data: [model] } });
      await expect(
        createOpenRouterTransport(denied)({
          ...request,
          model: "synthetic/free",
        }),
      ).rejects.toBeInstanceOf(ProviderError);
      expect(denied).toHaveBeenCalledTimes(1);
    }
  });
  it("retains usage for rejected completions without retaining private content", async () => {
    const http = mockHttp({
      completion: {
        id: "synthetic-truncated",
        model: "synthetic/actual",
        provider: "synthetic",
        choices: [
          {
            index: 0,
            finish_reason: "length",
            message: {
              role: "assistant",
              content: "PRIVATE_TRUNCATED_RESPONSE",
            },
          },
        ],
        usage: { prompt_tokens: 9, completion_tokens: 8192, cost: "0" },
      },
    });
    const error = await generatePlan(event, "PRIVATE_CONTEXT", {
      provider: "openrouter",
      noFallback: true,
      transports: { openrouter: createOpenRouterTransport(http) },
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.retryable).toBe(false);
    expect(failureMetadata(error)).toMatchObject({
      actualModel: "synthetic/actual",
      finishReason: "length",
      validationStage: "response",
      reportedCost: "0",
      attemptCount: 1,
      fallbackOccurred: false,
    });
    expect(failureUsage(error)).toEqual({ inputTokens: 9, outputTokens: 8192 });
    expect(JSON.stringify(error)).not.toContain("PRIVATE_");
    expect(http).toHaveBeenCalledTimes(2);
  });
  it("permits the documented free router only when compatible free candidates exist", async () => {
    const http = mockHttp({
      catalog: {
        data: [
          {
            id: "synthetic/model:free",
            supported_parameters: ["structured_outputs"],
            pricing: { prompt: "0", completion: "0" },
          },
        ],
      },
    });
    expect((await createOpenRouterTransport(http)(request)).actualModel).toBe(
      "synthetic/actual-model",
    );
    await expect(
      createOpenRouterTransport(mockHttp({ parameters: ["response_format"] }))(
        request,
      ),
    ).rejects.toMatchObject({ category: "capability" });
  });
  it("uses fixed endpoint, JSON schema, safe routing and actual provenance", async () => {
    const http = mockHttp(),
      out = await createOpenRouterTransport(http)(request);
    expect(out.actualModel).toBe("synthetic/actual-model");
    expect(out.providerRequestId).toBe("synthetic-request");
    expect(out.inputTokens).toBe(11);
    expect(out.reportedCost).toBe("0");
    const call = http.mock.calls.find(([url]) =>
      String(url).includes("/chat/completions"),
    )!;
    const body = JSON.parse(String(call[1]?.body));
    expect(body.provider).toEqual({
      require_parameters: true,
      allow_fallbacks: false,
      data_collection: "deny",
    });
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.model).toBe("openrouter/free");
  });
  it("rejects missing credentials before any HTTP call", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const http = mockHttp();
    await expect(
      createOpenRouterTransport(http)(request),
    ).rejects.toMatchObject({ category: "authentication" });
    expect(http).not.toHaveBeenCalled();
  });
  it.each([
    [401, "authentication"],
    [403, "authorization"],
    [402, "credits"],
    [404, "model"],
    [429, "rate_limit"],
    [503, "unavailable"],
  ] as const)(
    "classifies HTTP %s without exposing response content",
    async (status, category) => {
      await expect(
        createOpenRouterTransport(
          mockHttp({
            status,
            completion: {
              error: { message: "DO_NOT_LOG_PROVIDER_CONTENT", code: status },
            },
          }),
        )(request),
      ).rejects.toMatchObject({ category });
    },
  );
  it("rejects absent model and unsupported capability", async () => {
    await expect(
      createOpenRouterTransport(mockHttp({ model: "different/model" }))(
        request,
      ),
    ).rejects.toMatchObject({ category: "model" });
    await expect(
      createOpenRouterTransport(mockHttp({ parameters: [] }))(request),
    ).rejects.toMatchObject({ category: "capability" });
  });
  it.each([
    {},
    { choices: [] },
    {
      id: "x",
      model: "x",
      choices: [{ finish_reason: "stop", message: { content: "" } }],
    },
    {
      id: "x",
      model: "x",
      choices: [
        { finish_reason: "content_filter", message: { refusal: "no" } },
      ],
    },
  ])("rejects malformed, empty or refused response", async (completion) => {
    await expect(
      createOpenRouterTransport(mockHttp({ completion }))(request),
    ).rejects.toBeInstanceOf(ProviderError);
  });
});
describe("shared validated generation and bounded fallback", () => {
  const ok: ModelTransport = async () => ({
    text: JSON.stringify(plan),
    actualModel: "synthetic-actual",
  });
  it("switches to approved fallback once on temporary failure", async () => {
    vi.stubEnv("AI_PROVIDER_FALLBACK", "openrouter");
    const gemini = vi
      .fn<ModelTransport>()
      .mockRejectedValue(new ProviderError("gemini", "unavailable"));
    const openrouter = vi.fn(ok);
    const result = await generatePlan(event, "", {
      transports: { gemini, openrouter },
    });
    expect(result.provider).toBe("openrouter");
    expect(result.fallbackOccurred).toBe(true);
    expect(result.model).toBe("synthetic-actual");
    expect(result.attemptCount).toBe(2);
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(openrouter).toHaveBeenCalledTimes(1);
  });
  for (const category of [
    "authentication",
    "authorization",
    "routing",
    "tls",
    "quota",
    "model",
    "capability",
    "credits",
    "refusal",
    "invalid_output",
  ] as const)
    it(`never falls back on ${category}`, async () => {
      vi.stubEnv("AI_PROVIDER_FALLBACK", "openrouter");
      const fallback = vi.fn(ok);
      await expect(
        generatePlan(event, "", {
          transports: {
            gemini: async () => {
              throw new ProviderError("gemini", category);
            },
            openrouter: fallback,
          },
        }),
      ).rejects.toMatchObject({ category });
      expect(fallback).not.toHaveBeenCalled();
    });
  it("rejects invalid JSON and semantic mismatch without rerouting", async () => {
    vi.stubEnv("AI_PROVIDER_FALLBACK", "openrouter");
    const fallback = vi.fn(ok);
    for (const text of [
      "not json",
      JSON.stringify({ ...plan, eventType: "wedding" }),
    ])
      await expect(
        generatePlan(event, "", {
          transports: { gemini: async () => ({ text }), openrouter: fallback },
        }),
      ).rejects.toMatchObject({ code: "AI_INVALID_OUTPUT" });
    expect(fallback).not.toHaveBeenCalled();
  });
  it("accounts for rejected output without retaining response text or context", async () => {
    for (const text of [
      "INVALID_PRIVATE_RESPONSE",
      JSON.stringify({ ...plan, eventType: "wedding" }),
    ]) {
      const error = await generatePlan(event, "PRIVATE_CONTEXT", {
        transports: {
          gemini: async () => ({
            text,
            actualModel: "synthetic/actual",
            inputTokens: 9,
            outputTokens: 8,
            reportedCost: "0",
          }),
        },
      }).catch((e) => e);
      expect(error).toBeInstanceOf(ProviderError);
      expect(failureUsage(error)).toEqual({ inputTokens: 9, outputTokens: 8 });
      expect(failureMetadata(error)).toMatchObject({
        actualModel: "synthetic/actual",
        attemptCount: 1,
        reportedCost: "0",
      });
      expect(JSON.stringify(error)).not.toContain(text);
      expect(JSON.stringify(error)).not.toContain("PRIVATE_CONTEXT");
    }
  });
  it("exhausts a shared attempt budget without a recursive provider loop", async () => {
    vi.stubEnv("AI_PROVIDER_FALLBACK", "openrouter");
    vi.stubEnv("AI_PROVIDER_MAX_RETRIES", "2");
    const g = vi
        .fn<ModelTransport>()
        .mockRejectedValue(new ProviderError("gemini", "unavailable")),
      o = vi
        .fn<ModelTransport>()
        .mockRejectedValue(new ProviderError("openrouter", "unavailable"));
    await expect(
      generatePlan(event, "", { transports: { gemini: g, openrouter: o } }),
    ).rejects.toMatchObject({ category: "unavailable" });
    expect(g).toHaveBeenCalledTimes(1);
    expect(o).toHaveBeenCalledTimes(2);
  });
  it("cancels in flight and propagates an abort signal", async () => {
    const controller = new AbortController();
    let signal: AbortSignal | undefined;
    const pending = generateStructured(
      draftSchema,
      {},
      {
        signal: controller.signal,
        transports: {
          gemini: async (r) => {
            signal = r.signal;
            return new Promise(() => {});
          },
        },
      },
    );
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "AI_CANCELLED" });
    expect(signal?.aborted).toBe(true);
  });
  it("bounds all attempts within one end-to-end deadline", async () => {
    vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "1000");
    vi.stubEnv("AI_PROVIDER_TIMEOUT_MS", "90000");
    vi.stubEnv("AI_PROVIDER_MAX_RETRIES", "0");
    const start = Date.now();
    await expect(
      generatePlan(event, "", {
        transports: { gemini: () => new Promise(() => {}) },
      }),
    ).rejects.toMatchObject({ category: "timeout" });
    expect(Date.now() - start).toBeLessThan(1500);
  });
  it("reserves time for an explicitly approved timeout fallback", async () => {
    vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "1000");
    vi.stubEnv("AI_PROVIDER_FALLBACK", "openrouter");
    const result = await generatePlan(event, "", {
      transports: { gemini: () => new Promise(() => {}), openrouter: ok },
    });
    expect(result.provider).toBe("openrouter");
    expect(result.fallbackOccurred).toBe(true);
  });
  it("enforces output size and rejects tool-shaped output", async () => {
    // Valid JSON and a permissive schema isolate the UTF-8 byte limit.
    await expect(
      generateStructured(
        z.string(),
        {},
        {
          transports: {
            gemini: async () => ({ text: JSON.stringify("界".repeat(24000)) }),
          },
        },
      ),
    ).rejects.toMatchObject({ code: "AI_INVALID_OUTPUT" });
    for (const text of [
      "x".repeat(65537),
      JSON.stringify({ ...plan, toolCalls: [{ kind: "sql" }] }),
    ])
      await expect(
        generatePlan(event, "", {
          transports: { gemini: async () => ({ text }) },
        }),
      ).rejects.toMatchObject({ code: "AI_INVALID_OUTPUT" });
  });
});
describe("server environment compatibility", () => {
  it("supports safe aliases and rejects conflicting model or URL aliases", () => {
    expect(
      aiConfig({ GEMINI_MODEL_DEFAULT: "gemini-example" }).models.gemini,
    ).toBe("gemini-example");
    expect(() =>
      aiConfig({ GEMINI_MODEL_ID: "a", GEMINI_MODEL_DEFAULT: "b" }),
    ).toThrow("conflict");
    expect(
      supabaseConfig({
        SUPABASE_URL: "https://synthetic.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
      }).configured,
    ).toBe(true);
    expect(() =>
      supabaseConfig({
        SUPABASE_URL: "https://a.supabase.co",
        NEXT_PUBLIC_SUPABASE_URL: "https://b.supabase.co",
      }),
    ).toThrow("conflict");
  });
  it("rejects a privileged key in publishable settings and live mock mode", () => {
    expect(() =>
      supabaseConfig({ SUPABASE_PUBLISHABLE_KEY: "sb_secret_synthetic" }),
    ).toThrow();
    expect(() => aiConfig({ AI_PROVIDER_MODE: "mock" })).toThrow();
    expect(() =>
      aiConfig({
        AI_PROVIDER_PRIMARY: "gemini",
        AI_PROVIDER_FALLBACK: "gemini",
      }),
    ).toThrow();
  });
});
