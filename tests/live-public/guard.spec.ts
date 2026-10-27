import { test, expect } from "@playwright/test";
test("configured production app serves public pages and denies anonymous event access", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/health/live")).status()).toBe(200);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Less coordinating/ }),
  ).toBeVisible();
  await page.goto("/app/events");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Email address")).toBeVisible();
  const r = await request.post("/api/v1/events", {
    headers: {
      Origin: "http://localhost:3004",
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: {},
  });
  expect(r.status()).toBe(401);
});
