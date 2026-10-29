import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { previewReplan } from "../../src/domain/replan";
import type { EventSnapshot, Proposal } from "../../src/domain/contracts";
const ID = "11111111-1111-4111-8111-111111111111",
  BUDGET = "22222222-2222-4222-8222-222222222222";
async function syntheticApi(page: Page) {
  const state: EventSnapshot = {
    event: {
      id: ID,
      workspaceId: ID,
      type: "wedding",
      title: "Synthetic garden celebration",
      dateStatus: "tbd",
      startsAt: null,
      timeZone: "Asia/Kolkata",
      guestCount: 150,
      currency: "INR",
      budgetMinor: "50000000",
      preferences: "Garden celebration with local food",
      status: "planning",
      version: 1,
      createdAt: "2026-10-26T10:00:00Z",
    },
    budgetItems: [
      {
        id: BUDGET,
        title: "Catering",
        category: "catering",
        pricingBasis: "per_guest",
        unitPriceMinor: "85000",
        quantity: null,
        sourceKind: "user_estimate",
        sourceLabel: null,
        isLocked: false,
        state: "active",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        title: "Other fixed costs",
        category: "other",
        pricingBasis: "fixed",
        unitPriceMinor: "30000000",
        quantity: null,
        sourceKind: "user_estimate",
        sourceLabel: null,
        isLocked: true,
        state: "active",
      },
    ],
    tasks: [],
    vendors: [],
  };
  const proposals: Proposal[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/v1/", ""),
      method = req.method(),
      body = method === "GET" ? {} : req.postDataJSON();
    let data: unknown = {};
    if (path === "me")
      data = {
        user: { email: "synthetic@example.test", id: ID },
        workspaces: [{ id: ID, name: "Synthetic workspace" }],
        usage: [],
        aiConfigured: true,
      };
    else if (path === "events" && method === "GET")
      data = { items: [state.event], nextCursor: null };
    else if (path === "events" && method === "POST") {
      Object.assign(state.event, body.fields);
      data = { eventId: ID };
    } else if (path.endsWith("/ai-drafts")) {
      if (method === "POST") {
        await route.fulfill({
          status: 503,
          json: {
            error: {
              code: "AI_UNAVAILABLE",
              message: "Synthetic outage fixture; not a live Gemini response",
              requestId: "ui-test",
            },
          },
        });
        return;
      }
      data = [];
    } else if (path.endsWith("/history"))
      data = { items: [], nextCursor: null };
    else if (path.endsWith("/replan-proposals") && method === "POST") {
      const proposal = {
        ...previewReplan(state, body.change),
        id: crypto.randomUUID(),
        status: "pending",
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };
      proposals.unshift(proposal);
      data = { proposal, id: proposal.id };
    } else if (path.endsWith("/replan-proposals"))
      data = proposals.map((p) => ({
        id: p.id,
        status: p.status,
        base_version: p.baseVersion,
        expires_at: p.expiresAt,
        calculated_effects: p,
      }));
    else if (path.endsWith("/approve")) {
      const proposal = proposals[0];
      state.event.guestCount = proposal.proposedChange.newGuestCount!;
      state.event.version++;
      proposal.status = "approved";
      data = { snapshot: state };
    } else if (path.includes("/budget-items") && method === "POST") {
      state.budgetItems.push({
        ...body.fields,
        id: crypto.randomUUID(),
        state: "active",
      });
      state.event.version++;
      data = { snapshot: state };
    } else if (path.includes("/tasks") && method === "POST") {
      state.tasks.push({ ...body.fields, id: crypto.randomUUID() });
      state.event.version++;
      data = { snapshot: state };
    } else if (path.includes("/vendor-requirements") && method === "POST") {
      state.vendors.push({ ...body.fields, id: crypto.randomUUID() });
      state.event.version++;
      data = { snapshot: state };
    } else if (path === `events/${ID}`) data = state;
    else {
      await route.fulfill({
        status: 404,
        json: {
          error: { message: "Unknown synthetic test route", code: "NOT_FOUND" },
        },
      });
      return;
    }
    await route.fulfill({
      json: { data, meta: { requestId: "synthetic-ui-test" } },
    });
  });
  return state;
}
test("synthetic UI: create, budget, task, vendor, outage, replan review and refresh", async ({
  page,
}) => {
  await syntheticApi(page);
  await page.goto("http://127.0.0.1:3100/app/events/new");
  await page
    .getByLabel("Celebration name")
    .fill("Synthetic garden celebration");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create celebration" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic garden celebration",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Budget", exact: true }).click();
  await expect(page.getByText("₹4,27,500.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page.getByLabel("Expense name").fill("Welcome stationery");
  await page.getByLabel("Total estimate (₹)").fill("1000");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  await expect(
    page.getByText("Welcome stationery", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Tasks & timeline" }).click();
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Task name").fill("Confirm venue capacity");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Confirm venue capacity" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vendors", exact: true }).click();
  await page
    .getByRole("button", { name: "Add vendor requirement", exact: true })
    .click();
  await page.getByLabel("Requirement name").fill("Photographer");
  await page
    .getByRole("button", { name: "Save requirement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Photographer" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "AI planning", exact: true }).click();
  await page.getByRole("button", { name: "Generate a planning draft" }).click();
  await expect(page.getByRole("alert")).toContainText("Synthetic outage");
  await page.getByRole("link", { name: "Replan", exact: true }).click();
  await page.getByLabel("New expected guest count").fill("180");
  await page.getByRole("button", { name: "Preview the impact" }).click();
  await expect(page.getByText("150 → 180 guests")).toBeVisible();
  await expect(page.getByText("Estimate change: +₹25,500.00")).toBeVisible();
  await page.getByRole("button", { name: "Review approval" }).click();
  await page.getByRole("button", { name: "Approve and save changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "approved changes are saved",
  );
  await page.reload();
  await expect(page.getByText(/180 guests/).first()).toBeVisible();
});
for (const width of [320, 375, 768, 1024, 1440])
  test(`synthetic planner layout and axe at ${width}px`, async ({ page }) => {
    await syntheticApi(page);
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of [
      "",
      "/budget",
      "/timeline",
      "/vendors",
      "/ai-plan",
      "/replan",
      "/history",
    ]) {
      await page.goto(`http://127.0.0.1:3100/app/events/${ID}${tab}`);
      await expect(
        page.getByRole("heading", {
          name: "Synthetic garden celebration",
          exact: true,
        }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
      if (!tab)
        await page.screenshot({
          path: `test-results/planner-${width}.png`,
          fullPage: true,
        });
    }
  });

test("synthetic draft: edit price/title, select one record, and inspect acceptance payload", async ({
  page,
}) => {
  await syntheticApi(page);
  const draft = {
    id: "44444444-4444-4444-8444-444444444444",
    base_version: 1,
    status: "ready",
    expires_at: new Date(Date.now() + 300000).toISOString(),
    created_at: new Date().toISOString(),
    model_id: "SYNTHETIC_TEST_FIXTURE",
    payload: {
      schemaVersion: 1,
      eventType: "wedding",
      summary: "Synthetic editable draft; no live Gemini call",
      budgetSuggestions: [
        {
          draftId: "b-01",
          title: "Catering allowance",
          category: "catering",
          pricingBasis: "per_guest",
          unitPriceMinor: "85000",
          quantity: null,
          sourceKind: "ai_estimate",
          evidenceStatus: "unverified",
          reason: "Synthetic planning allowance",
        },
      ],
      tasks: [],
      vendorRequirements: [],
      ideas: [],
      assumptions: [],
      questions: [],
      warnings: [],
    },
  };
  await page.route("**/api/v1/events/*/ai-drafts", (r) =>
    r.fulfill({ json: { data: [draft] } }),
  );
  let accepted = false;
  await page.route("**/api/v1/events/*/plan-acceptances", async (r) => {
    const body = r.request().postDataJSON();
    expect(body.selectedDraftItemIds).toEqual(["b-01"]);
    expect(body.edits["b-01"]).toEqual({
      title: "My catering allowance",
      unitPriceMinor: "90000",
    });
    accepted = true;
    draft.status = "partial";
    await r.fulfill({ json: { data: { version: 2 } } });
  });
  await page.goto(`http://127.0.0.1:3100/app/events/${ID}/ai-plan`);
  await page.getByLabel("Expense name").fill("My catering allowance");
  await page.getByLabel("Edit unit price (₹)").fill("900");
  await page
    .getByRole("checkbox", { name: "Accept Catering allowance" })
    .check();
  await page.getByRole("button", { name: "Review 1 selected items" }).click();
  await page.getByRole("button", { name: "Accept selected items" }).click();
  await expect(page.getByRole("status")).toContainText(
    "selected items are saved",
  );
  expect(accepted).toBe(true);
});
test("keyboard dialog closes with Escape and returns focus", async ({
  page,
}) => {
  await syntheticApi(page);
  await page.goto(`http://127.0.0.1:3100/app/events/${ID}/budget`);
  const trigger = page.getByRole("button", {
    name: "Add expense",
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
