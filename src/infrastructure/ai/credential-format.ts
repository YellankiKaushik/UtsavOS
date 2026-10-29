/** Syntax recognition only: never proves provider authorization or logs a value. */
export function credentialFormat(
  provider: "gemini" | "openrouter",
  value: string | undefined,
) {
  if (!value?.trim()) return "not-configured";
  const pattern =
    provider === "gemini" ? /^AIza[\w-]{35}$/ : /^sk-or-v1-[a-fA-F0-9]{64}$/;
  return pattern.test(value.trim()) ? "recognized" : "unrecognized";
}
