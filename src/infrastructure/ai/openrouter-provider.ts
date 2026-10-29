import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import { aiConfig } from "../config";
import { ProviderError, classifyFailure, type ModelTransport } from "./types";
const endpoint = "https://openrouter.ai/api/v1";
const catalog = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      supported_parameters: z.array(z.string()).optional(),
      reasoning: z.object({ mandatory: z.boolean().optional() }).optional(),
      pricing: z
        .object({ prompt: z.string(), completion: z.string() })
        .optional(),
    }),
  ),
});
export function createOpenRouterTransport(
  http: typeof fetch = fetch,
): ModelTransport {
  return async (request) => {
    const config = aiConfig();
    const key = config.keys.openrouter;
    if (!key) throw new ProviderError("openrouter", "authentication");
    try {
      const lookup = await http(`${endpoint}/models`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: request.signal,
      });
      if (!lookup.ok)
        throw classifyFailure(
          { status: lookup.status, headers: lookup.headers },
          "openrouter",
        );
      const raw = await lookup.text();
      if (raw.length > 4_000_000)
        throw new ProviderError("openrouter", "invalid_output");
      const parsed = catalog.safeParse(JSON.parse(raw));
      if (!parsed.success)
        throw new ProviderError("openrouter", "invalid_output");
      const model = parsed.data.data.find((m) => m.id === request.model);
      // Documented routers are not necessarily listed as concrete model records.
      const routedFree =
        request.model === "openrouter/free" &&
        parsed.data.data.some(
          (m) =>
            m.supported_parameters?.includes("structured_outputs") &&
            m.pricing &&
            Number(m.pricing.prompt) === 0 &&
            Number(m.pricing.completion) === 0,
        );
      if (!model && !routedFree) throw new ProviderError("openrouter", "model");
      if (
        config.openrouterRequireFree &&
        !routedFree &&
        (!model?.pricing ||
          Number(model.pricing.prompt) !== 0 ||
          Number(model.pricing.completion) !== 0)
      )
        throw new ProviderError("openrouter", "credits");
      if (
        config.openrouterDisableReasoning &&
        (model?.reasoning?.mandatory !== false ||
          !model.supported_parameters?.includes("reasoning"))
      )
        throw new ProviderError("openrouter", "capability");
      if (
        !routedFree &&
        !model?.supported_parameters?.includes("structured_outputs")
      )
        throw new ProviderError("openrouter", "capability");
      const client = new OpenAI({
        apiKey: key,
        baseURL: endpoint,
        maxRetries: 0,
        timeout: request.timeout,
        fetch: http,
      });
      const body: OpenAI.ChatCompletionCreateParamsNonStreaming & {
        reasoning?: { enabled: false; exclude: true };
        provider: {
          require_parameters: boolean;
          allow_fallbacks: boolean;
          data_collection: string;
          max_price?: { prompt: number; completion: number };
        };
      } = {
        model: request.model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: JSON.stringify(request.context) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "utsavos_planning",
            strict: true,
            schema: request.schema as Record<string, unknown>,
          },
        },
        // Keep drafts bounded. A length-limited response is rejected below,
        // never repaired or partially accepted. This also avoids asking the
        // router to reserve an unnecessarily large completion allocation.
        max_tokens: 4096,
        ...(config.openrouterDisableReasoning
          ? { reasoning: { enabled: false as const, exclude: true as const } }
          : {}),
        provider: {
          require_parameters: true,
          allow_fallbacks: false,
          data_collection: "deny",
          // Enforce the price policy on the request as well as the catalogue:
          // catalogue discovery alone is not an atomic spending guard.
          ...(config.openrouterRequireFree
            ? { max_price: { prompt: 0, completion: 0 } }
            : {}),
        },
      };
      const completion = await client.chat.completions.create(body, {
        signal: request.signal,
      });
      const choice = completion.choices?.[0];
      const meta = completion as typeof completion & {
        provider?: string;
        usage?: typeof completion.usage & { cost?: number | string };
      };
      const observation = {
        actualModel: completion.model,
        providerRequestId: completion.id,
        routingProvider: meta.provider,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        reportedCost:
          meta.usage?.cost === undefined ? undefined : String(meta.usage.cost),
      };
      function rejected(category: "refusal" | "invalid_output"): never {
        const error = new ProviderError("openrouter", category);
        error.validationStage = "response";
        error.observation = observation;
        const finish = choice?.finish_reason;
        error.finishReason = [
          "stop",
          "length",
          "tool_calls",
          "content_filter",
          "error",
        ].includes(finish ?? "")
          ? (finish as NonNullable<ProviderError["finishReason"]>)
          : "unknown";
        throw error;
      }
      const embedded = completion as unknown as {
        error?: { code?: number; message?: string };
      };
      if (embedded.error) {
        const error = classifyFailure(
          { status: Number(embedded.error.code) || 502, error: embedded.error },
          "openrouter",
        );
        error.validationStage = "response";
        error.observation = observation;
        throw error;
      }
      if (
        choice?.message?.refusal ||
        choice?.finish_reason === "content_filter"
      )
        rejected("refusal");
      if (
        !choice ||
        choice.finish_reason !== "stop" ||
        !choice.message.content ||
        choice.message.tool_calls?.length
      )
        rejected("invalid_output");
      return {
        text: choice.message.content,
        ...observation,
      };
    } catch (error) {
      if (error instanceof SyntaxError)
        throw new ProviderError("openrouter", "invalid_output");
      throw classifyFailure(error, "openrouter", request.signal);
    }
  };
}
export const openrouterTransport = createOpenRouterTransport();
