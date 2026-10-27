import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { EventFunction } from "../../src/domain/event-functions";
const id = "11111111-1111-4111-8111-111111111111",
  task = "22222222-2222-4222-8222-222222222222",
  functionId = "33333333-3333-4333-8333-333333333333";
async function fixture(page: Page, populated = false) {
  const state = {
    event: {
      id,
      workspaceId: id,
      type: "wedding",
      title: "Synthetic multi-function celebration",
      dateStatus: "tbd",
      startsAt: null,
      timeZone: "Asia/Kolkata",
      guestCount: 20,
      currency: "INR",
      budgetMinor: "1000000",
      preferences: "",
      status: "planning",
      version: 1,
      createdAt: "2026-10-26T10:00:00Z",
    },
    budgetItems: [],
    vendors: [],
    tasks: [
      {
        id: task,
        title: "Arrange welcome desk",
        status: "todo",
        priority: "normal",
        dueAt: null,
        dependencyIds: [],
      },
    ],
  };
  let items: EventFunction[] = populated
    ? [
        {
          id: functionId,
          title: "Reception",
          startsAt: "2027-01-01T12:00:00Z",
          endsAt: null,
          timeZone: "Asia/Kolkata",
          status: "planned",
          notes: "Synthetic reception schedule",
          resources: { tasks: [], budgetItems: [], vendors: [] },
        },
      ]
    : [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      method = request.method();
    let data: unknown;
    if (path.endsWith("/me"))
      data = {
        user: { id, email: "synthetic@example.test" },
        workspaces: [{ id, name: "Synthetic" }],
        usage: [],
        aiConfigured: false,
        features: { eventFunctions: true },
      };
    else if (path.includes("/functions")) {
      if (method !== "GET") {
        const body = request.postDataJSON();
        expect(body.expectedVersion).toBe(state.event.version);
        if (path.endsWith("/resources")) {
          items[0].resources.tasks = body.assigned ? [task] : [];
        } else if (method === "DELETE") items = [];
        else if (method === "PATCH") items[0] = { ...items[0], ...body.fields };
        else
          items.push({
            id: functionId,
            ...body.fields,
            resources: { tasks: [], budgetItems: [], vendors: [] },
          });
        state.event.version++;
      }
      data = { eventVersion: state.event.version, items };
    } else data = state;
    await route.fulfill({
      json: { data, meta: { requestId: "synthetic-functions-ui" } },
    });
  });
}
test("synthetic P1: create, edit, assign, refresh, unassign and archive a function", async ({
  page,
}) => {
  await fixture(page);
  await page.goto(`http://127.0.0.1:3100/app/events/${id}/functions`);
  await page.getByRole("button", { name: "Add function", exact: true }).click();
  await page.getByLabel("Function name").fill("Reception");
  await page
    .getByRole("button", { name: "Save function", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Reception", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Arrange welcome desk").check();
  await page.reload();
  await expect(page.getByLabel("Arrange welcome desk")).toBeChecked();
  await page.getByRole("button", { name: "Edit Reception" }).click();
  await page.getByLabel("Function name").fill("Evening reception");
  await page
    .getByRole("button", { name: "Save function", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Evening reception", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Arrange welcome desk").uncheck();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Archive Evening reception" }).click();
  await expect(
    page.getByRole("heading", { name: "Plan each part of your celebration" }),
  ).toBeVisible();
});
for (const width of [320, 375, 768, 1024, 1440])
  test(`P1 function accessibility and layout at ${width}px`, async ({
    page,
  }) => {
    await fixture(page, true);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`http://127.0.0.1:3100/app/events/${id}/functions`);
    await expect(
      page.getByRole("heading", { name: "Reception", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.getByRole("button", { name: "Edit Reception" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Edit Reception" }),
    ).toBeFocused();
  });
