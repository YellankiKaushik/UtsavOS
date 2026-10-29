import { afterEach, expect, it, vi } from "vitest";
const exchange = vi.hoisted(() => vi.fn());
vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: exchange } }),
}));
import { GET } from "../../app/auth/callback/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it("redirects successful callbacks to the trusted configured origin", async () => {
  vi.stubEnv("APP_BASE_URL", "https://planner.example");
  exchange.mockResolvedValue({ error: null });
  const r = await GET(
    new Request(
      "https://attacker.example/auth/callback?code=synthetic&next=https://attacker.example",
    ),
  );
  expect(r.headers.get("location")).toBe("https://planner.example/onboarding");
  expect(exchange).toHaveBeenCalledWith("synthetic");
});
it("uses the exact trusted preview origin for password recovery", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_URL", "utsavos-preview.vercel.app");
  exchange.mockResolvedValue({ error: null });
  const r = await GET(
    new Request(
      "https://attacker.example/auth/callback?code=synthetic&next=/reset-password",
    ),
  );
  expect(r.headers.get("location")).toBe(
    "https://utsavos-preview.vercel.app/reset-password",
  );
});
it("returns a safe configuration error when a hosted origin is missing", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("APP_BASE_URL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  const r = await GET(
    new Request(
      "https://attacker.example/auth/callback?code=PRIVATE_SYNTHETIC_CODE",
    ),
  );
  expect(r.status).toBe(503);
  expect(await r.text()).not.toContain("PRIVATE_SYNTHETIC_CODE");
});
