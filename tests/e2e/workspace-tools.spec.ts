import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("synthetic professional dashboard: truthful limits and mobile accessibility", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/**", async (route) => {
    const data = new URL(route.request().url()).pathname.endsWith("/me")
      ? {
          workspaces: [
            { id: "workspace", name: "Synthetic agency", canCreate: true },
          ],
          features: { workspaceDashboard: true },
        }
      : {
          workspaceId: "workspace",
          plan: "pilot",
          validUntil: null,
          billingAvailable: false,
          limits: {
            activeEvents: 100,
            aiAttemptsPerUtcDay: 20,
            members: 20,
            storageBytes: 209715200,
          },
          usage: {
            activeEvents: 1,
            aiAttemptsToday: 0,
            members: 1,
            storageBytes: 0,
          },
          events: [
            {
              id: "event",
              title: "Synthetic reception",
              status: "planning",
              incompleteTasks: 2,
              overdueTasks: 1,
            },
          ],
        };
    await route.fulfill({ json: { data, meta: { requestId: "synthetic" } } });
  });
  await page.goto("http://127.0.0.1:3100/app/dashboard");
  await expect(
    page.getByRole("heading", { name: "Plan & usage" }),
  ).toBeVisible();
  await expect(
    page.getByText("Subscription purchases are unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Synthetic reception" }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
