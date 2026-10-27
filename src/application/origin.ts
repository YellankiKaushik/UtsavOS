import { DomainError } from "@/domain/errors";

type Environment = Record<string, string | undefined>;

function invalid(): never {
  throw new DomainError(
    "CONFIGURATION_REQUIRED",
    "Configure an exact, trusted application origin.",
    503,
  );
}

function configuredOrigin(value: string) {
  try {
    const url = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" && !(loopback && url.protocol === "http:"))
    )
      invalid();
    return url.origin;
  } catch {
    return invalid();
  }
}

/** Deployment origins come from operator/platform configuration, never Host headers. */
export function applicationOrigin(
  request: Request,
  env: Environment = process.env,
) {
  if (env.VERCEL_ENV === "preview") {
    const host = env.VERCEL_URL;
    if (!host || !/^[a-z0-9-]+\.vercel\.app$/i.test(host)) invalid();
    return configuredOrigin(`https://${host}`);
  }
  if (env.APP_BASE_URL) return configuredOrigin(env.APP_BASE_URL);
  if (env.VERCEL_ENV || env.NODE_ENV === "production") invalid();
  const local = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(local.hostname)) invalid();
  return configuredOrigin(local.origin);
}
