/** Safe diagnostics: never returns provider messages, URLs, headers or key fragments. */
export type DiagnosticCategory =
  | "configuration"
  | "authentication"
  | "authorization"
  | "model_access"
  | "quota"
  | "rate_limit"
  | "dns"
  | "tls"
  | "network"
  | "timeout"
  | "unsupported_parameters"
  | "unavailable";
const reasons = new Set([
  "API_KEY_INVALID",
  "API_KEY_NOT_FOUND",
  "API_KEY_HTTP_REFERRER_BLOCKED",
  "API_KEY_IP_ADDRESS_BLOCKED",
  "API_KEY_SERVICE_BLOCKED",
  "API_KEY_API_TARGET_BLOCKED",
  "SERVICE_DISABLED",
  "BILLING_DISABLED",
  "CONSUMER_INVALID",
  "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
  "RATE_LIMIT_EXCEEDED",
  "QUOTA_EXCEEDED",
  "LOCATION_POLICY_VIOLATED",
]);
export function diagnoseFailure(input: unknown, httpStatus?: number) {
  const root = (input ?? {}) as {
    error?: {
      details?: { reason?: unknown }[];
      status?: unknown;
      code?: unknown;
    };
    status?: unknown;
    cause?: unknown;
    code?: unknown;
    name?: unknown;
  };
  const status = Number(httpStatus ?? root.status ?? root.error?.code) || null;
  const reason = (Array.isArray(root.error?.details) ? root.error.details : [])
    .map((d) => d?.reason)
    .find((r) => typeof r === "string" && reasons.has(r)) as string | undefined;
  let node: unknown = root;
  let networkCode: string | null = null;
  let timedOut = false;
  for (let i = 0; i < 5 && node && typeof node === "object"; i++) {
    const n = node as { code?: unknown; cause?: unknown; name?: unknown };
    const code = String(n.code ?? "");
    if (
      [
        "ENOTFOUND",
        "EAI_AGAIN",
        "ECONNREFUSED",
        "ECONNRESET",
        "ETIMEDOUT",
        "EACCES",
        "UND_ERR_CONNECT_TIMEOUT",
        "CERT_HAS_EXPIRED",
        "DEPTH_ZERO_SELF_SIGNED_CERT",
        "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
        "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
        "ERR_TLS_CERT_ALTNAME_INVALID",
      ].includes(code)
    )
      networkCode = code;
    if (
      ["TimeoutError", "AbortError", "APIConnectionTimeoutError"].includes(
        String(n.name),
      )
    )
      timedOut = true;
    node = n.cause;
  }
  let category: DiagnosticCategory = "unavailable";
  if (["ENOTFOUND", "EAI_AGAIN"].includes(networkCode ?? "")) category = "dns";
  else if (networkCode && /CERT|TLS|SIGNATURE|ISSUER/.test(networkCode))
    category = "tls";
  else if (
    timedOut ||
    ["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(networkCode ?? "")
  )
    category = "timeout";
  else if (networkCode) category = "network";
  else if (
    reason === "API_KEY_INVALID" ||
    reason === "API_KEY_NOT_FOUND" ||
    status === 401
  )
    category = "authentication";
  else if (reason === "QUOTA_EXCEEDED" || status === 402) category = "quota";
  else if (status === 403) category = "authorization";
  else if (status === 404) category = "model_access";
  else if (status === 429) category = "rate_limit";
  else if (status === 400 || status === 422)
    category = "unsupported_parameters";
  return { category, httpStatus: status, reason: reason ?? null, networkCode };
}
