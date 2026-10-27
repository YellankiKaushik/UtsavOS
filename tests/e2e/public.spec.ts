import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("real Next.js public journey, honest configuration failure and safe health", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/health/live");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: "ok" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Less coordinating/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Plan your celebration" }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.getByLabel("Email address").fill("synthetic@example.test");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in to UtsavOS" }).click();
  await expect(page.locator(".notice[role=alert]")).toContainText("Supabase");
  await page.goto("/app/events");
  await expect(
    page.getByRole("heading", { name: "Connect your planning workspace." }),
  ).toBeVisible();
  const forged = await request.post("/api/v1/events", {
    headers: {
      Origin: "https://evil.example",
      "Content-Type": "application/json",
    },
    data: {},
  });
  expect(forged.status()).toBe(403);
});
for (const width of [320, 375, 768, 1024, 1440])
  test(`public accessibility and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({
      path: `test-results/landing-${width}.png`,
      fullPage: true,
    });
  });
