import { DomainError } from "@/domain/errors";
import type { ProviderId } from "../config";
import { diagnoseFailure } from "./diagnostic";
export type ModelResponse = {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  actualModel?: string;
  providerRequestId?: string;
  routingProvider?: string;
  reportedCost?: string;
};
export type ModelRequest = {
  model: string;
  system: string;
  context: unknown;
  schema: unknown;
  timeout: number;
  signal?: AbortSignal;
};
export type ModelTransport = (request: ModelRequest) => Promise<ModelResponse>;
export type ProviderFailure =
  | "authentication"
  | "authorization"
  | "quota"
  | "routing"
  | "dns"
  | "tls"
  | "network"
  | "capability"
  | "model"
  | "rate_limit"
  | "credits"
  | "timeout"
  | "cancelled"
  | "unavailable"
  | "refusal"
  | "invalid_output";
export class ProviderError extends DomainError {
  readonly retryable: boolean;
  attemptCount?: number;
  latencyMs?: number;
  observation?: Omit<ModelResponse, "text">;
  validationStage?: "json" | "schema" | "semantic" | "size";
  diagnostic?: ReturnType<typeof diagnoseFailure>;
  constructor(
    public provider: ProviderId,
    public category: ProviderFailure,
    public retryAfterMs = 0,
  ) {
    const codes = {
      authentication: "AI_AUTHENTICATION_FAILED",
      authorization: "AI_AUTHORIZATION_FAILED",
      quota: "AI_QUOTA_EXHAUSTED",
      routing: "AI_ROUTE_UNAVAILABLE",
      dns: "AI_DNS_FAILURE",
      tls: "AI_TLS_FAILURE",
      network: "AI_NETWORK_FAILURE",
      capability: "AI_CAPABILITY_UNSUPPORTED",
      model: "AI_MODEL_UNAVAILABLE",
      rate_limit: "AI_RATE_LIMITED",
      credits: "AI_CREDITS_EXHAUSTED",
      timeout: "AI_UNAVAILABLE",
      cancelled: "AI_CANCELLED",
      unavailable: "AI_UNAVAILABLE",
      refusal: "AI_REFUSED",
      invalid_output: "AI_INVALID_OUTPUT",
    };
    const messages = {
      authentication:
        "AI provider authentication failed. Check the server configuration.",
      authorization: "The AI account is not authorized for this operation.",
      quota:
        "AI account quota is exhausted. Manual planning remains available.",
      routing:
        "No approved provider route is available. Review the model and privacy policy.",
      dns: "The AI provider address could not be resolved.",
      tls: "The AI provider connection failed certificate verification.",
      network: "The AI provider connection failed. Saved work is unchanged.",
      capability:
        "The approved model does not support the required structured output.",
      model: "The configured model is not available to this account.",
      rate_limit: "AI provider rate limit reached. Try again later.",
      credits:
        "AI provider credits are exhausted. Manual planning remains available.",
      timeout: "The AI request timed out. Saved work is unchanged.",
      cancelled: "AI request cancelled. Check saved drafts before retrying.",
      unavailable:
        "AI provider is temporarily unavailable. Saved work is unchanged.",
      refusal:
        "The AI provider declined this request. Revise the preferences or plan manually.",
      invalid_output:
        "AI output was incomplete or invalid. No plan records were changed.",
    };
    super(
      codes[category],
      messages[category],
      ["rate_limit", "credits"].includes(category)
        ? 429
        : category === "cancelled"
          ? 499
          : category === "refusal"
            ? 422
            : 503,
    );
    this.retryable = [
      "rate_limit",
      "timeout",
      "unavailable",
      "dns",
      "network",
    ].includes(category);
  }
}
export function classifyFailure(
  error: unknown,
  provider: ProviderId,
  signal?: AbortSignal,
): ProviderError {
  if (error instanceof ProviderError) return error;
  if (signal?.aborted)
    return new ProviderError(
      provider,
      signal.reason === "cancelled" ? "cancelled" : "timeout",
    );
  const e = error as {
    status?: unknown;
    name?: unknown;
    headers?: Headers;
    error?: { code?: unknown };
  };
  const status = Number(e?.status || e?.error?.code),
    name = String(e?.name ?? "");
  const diagnostic = diagnoseFailure(error);
  if (["dns", "tls", "network"].includes(diagnostic.category)) {
    const classified = new ProviderError(
      provider,
      diagnostic.category as "dns" | "tls" | "network",
    );
    classified.diagnostic = diagnostic;
    return classified;
  }
  if (status === 403) return new ProviderError(provider, "authorization");
  if (status === 401) return new ProviderError(provider, "authentication");
  if (status === 402) return new ProviderError(provider, "credits");
  if (status === 404) {
    const message = String(
      (error as { error?: { message?: unknown }; message?: unknown })?.error
        ?.message ??
        (error as { message?: unknown })?.message ??
        "",
    ).toLowerCase();
    return new ProviderError(
      provider,
      /no endpoints|no allowed providers/.test(message) ? "routing" : "model",
    );
  }
  if (diagnostic.category === "quota")
    return new ProviderError(provider, "quota");
  if (status === 400 || status === 422)
    return new ProviderError(provider, "capability");
  if (status === 429) {
    const value = e.headers?.get?.("retry-after");
    return new ProviderError(
      provider,
      "rate_limit",
      value && /^\d+$/.test(value) ? Number(value) * 1000 : 0,
    );
  }
  if (name.includes("Timeout") || name === "AbortError")
    return new ProviderError(provider, "timeout");
  return new ProviderError(provider, "unavailable");
}
