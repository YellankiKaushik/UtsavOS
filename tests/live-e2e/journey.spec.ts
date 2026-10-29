import { test, expect } from "@playwright/test";
import type { EventSnapshot } from "../../src/domain/contracts";
test.beforeAll(() => {
  for (const name of [
    "LIVE_USER_A_EMAIL",
    "LIVE_USER_A_PASSWORD",
    "LIVE_USER_B_EMAIL",
    "LIVE_USER_B_PASSWORD",
  ])
    if (!process.env[name])
      throw new Error(
        `Live browser release gate requires ${name}. Configure isolated staging credentials securely.`,
      );
  if (
    !(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) ||
    !(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY
    )
  )
    throw new Error(
      "Configure Supabase server settings or their public aliases.",
    );
  const provider = process.env.AI_PROVIDER_PRIMARY || "gemini";
  if (
    provider === "gemini" &&
    (!process.env.GEMINI_API_KEY ||
      !(process.env.GEMINI_MODEL_ID || process.env.GEMINI_MODEL_DEFAULT))
  )
    throw new Error("Configure Gemini credentials/model.");
  if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY)
    throw new Error("Configure OpenRouter credentials.");
});
test("LIVE: sign in, persist event, accept real configured-provider draft, manual CRUD, approve and refresh", async ({
  page,
  browser,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(process.env.LIVE_USER_A_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.LIVE_USER_A_PASSWORD!);
  await page.getByRole("button", { name: "Sign in to UtsavOS" }).click();
  await expect(page).toHaveURL(/\/app\/events$/);
  await page.getByRole("link", { name: "New celebration" }).click();
  const title = `SYNTHETIC LIVE E2E ${Date.now()}`;
  await page.getByLabel("Celebration name").fill(title);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create celebration" }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const eventId = new URL(page.url()).pathname.split("/")[3];
  await page.getByRole("link", { name: "AI planning", exact: true }).click();
  await page.getByRole("button", { name: "Generate a planning draft" }).click();
  await expect(
    page.getByRole("heading", { name: "Your planning draft" }),
  ).toBeVisible({ timeout: 55000 });
  await page
    .getByRole("checkbox", { name: /Select all proposed records/ })
    .check();
  await page.getByRole("button", { name: /Review \d+ selected items/ }).click();
  await page.getByRole("button", { name: "Accept selected items" }).click();
  await expect(page.getByRole("status")).toContainText(
    "selected items are saved",
  );
  await page.getByRole("link", { name: "Budget", exact: true }).click();
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page.getByLabel("Expense name").fill("Synthetic stationery");
  await page.getByLabel("Category", { exact: true }).fill("gifts");
  await page.getByLabel("Total estimate (₹)").fill("1000");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  await expect(
    page.getByText("Synthetic stationery", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Tasks & timeline" }).click();
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Task name").fill("Synthetic verify venue capacity");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page
    .getByRole("button", { name: "Complete Synthetic verify venue capacity" })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Reopen Synthetic verify venue capacity",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vendors", exact: true }).click();
  await page
    .getByRole("button", { name: "Add vendor requirement", exact: true })
    .click();
  await page
    .getByLabel("Requirement name")
    .fill("Synthetic photographer requirement");
  await page
    .getByRole("button", { name: "Save requirement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Synthetic photographer requirement" }),
  ).toBeVisible();
  const before = (
    await (await page.request.get(`/api/v1/events/${eventId}`)).json()
  ).data as EventSnapshot;
  await page.getByRole("link", { name: "Replan", exact: true }).click();
  await page.getByLabel("New expected guest count").fill("180");
  await page
    .getByRole("checkbox", { name: "Do not exceed my event budget" })
    .uncheck();
  await page.getByRole("button", { name: "Preview the impact" }).click();
  await expect(page.getByText("150 → 180 guests")).toBeVisible();
  await page.getByRole("button", { name: "Review approval" }).click();
  await page.getByRole("button", { name: "Approve and save changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "approved changes are saved",
  );
  await page.reload();
  const after = (
    await (await page.request.get(`/api/v1/events/${eventId}`)).json()
  ).data as EventSnapshot;
  expect(after.event.guestCount).toBe(180);
  expect(after.event.version).toBe(before.event.version + 1);
  expect(
    after.tasks.some(
      (t) =>
        t.title === "Synthetic verify venue capacity" && t.status === "done",
    ),
  ).toBe(true);
  expect(
    after.vendors.some((v) => v.title === "Synthetic photographer requirement"),
  ).toBe(true);
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "approve", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(`/app/events/${eventId}`);
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(process.env.LIVE_USER_A_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.LIVE_USER_A_PASSWORD!);
  await page.getByRole("button", { name: "Sign in to UtsavOS" }).click();
  await expect(page).toHaveURL(/\/app\/events$/);
  await page.goto(`/app/events/${eventId}`);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const contextB = await browser.newContext();
  const second = await contextB.newPage();
  await second.goto("/login");
  await second.getByLabel("Email address").fill(process.env.LIVE_USER_B_EMAIL!);
  await second
    .getByLabel("Password", { exact: true })
    .fill(process.env.LIVE_USER_B_PASSWORD!);
  await second.getByRole("button", { name: "Sign in to UtsavOS" }).click();
  await expect(second).toHaveURL(/\/app\/events$/);
  for (const suffix of [
    "",
    "/budget",
    "/tasks",
    "/vendor-requirements",
    "/history",
  ])
    expect(
      (await second.request.get(`/api/v1/events/${eventId}${suffix}`)).status(),
    ).toBe(404);
  const denied = await second.request.post(
    `/api/v1/events/${eventId}/replan-proposals`,
    {
      headers: {
        Origin: new URL(second.url()).origin,
        "Idempotency-Key": crypto.randomUUID(),
      },
      data: {
        expectedVersion: after.event.version,
        change: { newGuestCount: 190 },
      },
    },
  );
  expect(denied.status()).toBe(404);
  await contextB.close();
});
