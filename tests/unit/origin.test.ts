import { afterEach, describe, expect, it, vi } from "vitest";
import { applicationOrigin } from "@/application/origin";
import { checkOrigin } from "@/application/http";

afterEach(() => vi.unstubAllEnvs());
describe("trusted deployment origins", () => {
  it("uses operator configuration despite forged request and forwarded hosts", () => {
    const request = new Request("https://attacker.example/api", {
      headers: {
        host: "attacker.example",
        "x-forwarded-host": "attacker.example",
      },
    });
    expect(
      applicationOrigin(request, { APP_BASE_URL: "https://planner.example" }),
    ).toBe("https://planner.example");
  });
  it("trusts only the platform's exact preview deployment host", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "utsavos-preview.vercel.app");
    vi.stubEnv("APP_BASE_URL", "https://production.example");
    expect(() =>
      checkOrigin(
        new Request("https://attacker.example/api", {
          headers: { origin: "https://utsavos-preview.vercel.app" },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      checkOrigin(
        new Request("https://utsavos-preview.vercel.app/api", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toThrow("Request origin");
  });
  it.each([
    undefined,
    "attacker.example",
    "valid.vercel.app@attacker.example",
    "valid.vercel.app/path",
  ])("fails closed for an absent or invalid preview host: %s", (host) => {
    expect(() =>
      applicationOrigin(new Request("https://attacker.example"), {
        VERCEL_ENV: "preview",
        VERCEL_URL: host,
      }),
    ).toThrow("trusted application origin");
  });
  it("requires configured production origins and permits only loopback development fallback", () => {
    expect(() =>
      applicationOrigin(new Request("https://attacker.example"), {
        NODE_ENV: "production",
      }),
    ).toThrow();
    expect(() =>
      applicationOrigin(new Request("https://attacker.example"), {}),
    ).toThrow();
    expect(
      applicationOrigin(new Request("http://localhost:3000/api"), {}),
    ).toBe("http://localhost:3000");
  });
  it.each([
    "http://planner.example",
    "https://user:password@planner.example",
    "https://planner.example/path",
    "https://planner.example?redirect=bad",
  ])("rejects unsafe configured URLs", (value) => {
    expect(() =>
      applicationOrigin(new Request("http://localhost"), {
        APP_BASE_URL: value,
      }),
    ).toThrow();
  });
});
