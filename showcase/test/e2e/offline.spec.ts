import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const origin = "http://127.0.0.1:4317";
const dist = fileURLToPath(new URL("../../dist/", import.meta.url));

function staticFiles(directory: string, prefix = ""): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}/${encodeURIComponent(entry.name)}`;
    if (entry.isDirectory()) {
      return staticFiles(join(directory, entry.name), path);
    }
    return entry.isFile() ? [path] : [];
  });
}

type NetworkGuard = { setOffline: (enabled: boolean) => Promise<void> };

const test = base.extend<{ staticNetwork: NetworkGuard }>({
  staticNetwork: [
    async ({ context, page }, use) => {
      const files = new Set(["/", ...staticFiles(dist)]);
      const unexpected: string[] = [];
      const errors: string[] = [];
      let offline = false;

      await context.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (
          offline ||
          url.origin !== origin ||
          url.search ||
          !files.has(url.pathname) ||
          !["GET", "HEAD"].includes(request.method())
        ) {
          unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
          await route.abort("blockedbyclient");
          return;
        }
        const response = await route.fetch({ maxRedirects: 0 });
        if (!response.ok()) {
          errors.push(`${response.status()} ${url.origin}${url.pathname}`);
          await route.abort("failed");
          return;
        }
        await route.fulfill({ response });
      });
      await context.routeWebSocket(/.*/, async (socket) => {
        const url = new URL(socket.url());
        unexpected.push(`WebSocket ${url.origin}${url.pathname}`);
        await socket.close({ code: 1008, reason: "Static showcase only" });
      });
      page.on("pageerror", (error) => errors.push(error.message));

      await use({
        async setOffline(enabled) {
          await context.setOffline(enabled);
          offline = enabled;
        },
      });

      expect(unexpected, "unexpected requests and offline traffic").toEqual([]);
      expect(errors, "page errors and failed static responses").toEqual([]);
    },
    { auto: true },
  ],
});

const demo = (page: Page) => page.locator("#demo");
const initialEvent = "The Marigold Wedding";
const editedEvent = "The Lantern Celebration";
const storageKey = "utsavos-showcase-v1";

async function openShowcase(page: Page) {
  expect((await page.goto("/"))?.status()).toBe(200);
  await expect(
    page.getByRole("link", { name: "Explore Interactive Demo" }),
  ).toBeVisible();
}

async function openDemo(page: Page) {
  await page.getByRole("link", { name: "Explore Interactive Demo" }).click();
  await expect(page).toHaveURL(/#demo$/);
  await expect(
    demo(page).getByRole("navigation", { name: "Planner sections" }),
  ).toBeVisible();
}

async function selectPanel(page: Page, name: string) {
  const button = demo(page)
    .getByRole("navigation", { name: "Planner sections" })
    .getByRole("button", { name, exact: true });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

async function expectMoney(page: Page, amount: string) {
  await expect(
    demo(page).getByText(amount, { exact: true }).first(),
  ).toBeVisible();
}

async function assertAccessible(page: Page, view: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    `${view} fits the viewport without horizontal scrolling`,
  ).toBe(true);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map(({ id, nodes }) => ({
      id,
      elements: nodes.map(({ target }) => target),
    })),
    `${view} accessibility violations`,
  ).toEqual([]);
}

test("landing, mobile layout, keyboard focus and accessible planner views", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openShowcase(page);
  await expect(page).toHaveTitle(/UtsavOS/);
  await expect(page.getByRole("main")).toHaveCount(1);

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  expect(
    await skip.evaluate((link) => {
      const style = getComputedStyle(link);
      return (
        link.matches(":focus-visible") &&
        ((style.outlineStyle !== "none" &&
          parseFloat(style.outlineWidth) > 0) ||
          style.boxShadow !== "none")
      );
    }),
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  const missingAnchors = await page
    .locator('a[href^="#"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href")?.slice(1) ?? "")
        .filter((id) => !document.getElementById(id)),
    );
  expect(missingAnchors).toEqual([]);
  await expect(
    page
      .locator('a[href="https://github.com/YellankiKaushik/UtsavOS"]')
      .first(),
  ).toBeVisible();
  await expect(page.locator('a[href$="/docs/SETUP.md"]').first()).toBeVisible();
  await expect(
    page.locator('a[href*="youtube.com/watch"]').first(),
  ).toBeVisible();

  await assertAccessible(page, "landing and overview");
  await openDemo(page);
  for (const panel of [
    "Event setup",
    "Budget",
    "Tasks",
    "Replan",
    "Sample draft",
  ]) {
    await selectPanel(page, panel);
    if (panel === "Budget") {
      await demo(page).getByRole("button", { name: "Add category" }).click();
      await expect(demo(page).getByLabel("Category name")).toBeVisible();
    }
    if (panel === "Tasks") {
      await demo(page)
        .getByRole("button", { name: "Edit Finalize the menu" })
        .click();
      await expect(demo(page).getByLabel("Task title")).toBeVisible();
    }
    if (panel === "Sample draft") {
      await demo(page)
        .getByRole("button", { name: "Load sample draft" })
        .click();
    }
    await assertAccessible(page, panel);
  }
});

test("complete browser-local planning flow with network access disabled", async ({
  page,
  staticNetwork,
}) => {
  await openShowcase(page);
  await staticNetwork.setOffline(true);
  await openDemo(page);
  const plan = demo(page);
  await expect(
    plan.getByText(initialEvent, { exact: true }).first(),
  ).toBeVisible();

  await selectPanel(page, "Event setup");
  for (const [scenario, name] of [
    ["Birthday celebration", "Paper Lantern Birthday"],
    ["Community gathering", "Courtyard Community Day"],
    ["Wedding celebration", initialEvent],
  ]) {
    await plan.getByRole("button", { name: scenario, exact: true }).click();
    await expect(plan.getByText(name, { exact: true }).first()).toBeVisible();
    await selectPanel(page, "Event setup");
  }
  await expect(plan.getByLabel("Event name")).toHaveValue(initialEvent);
  await plan.getByLabel("Event name").fill(editedEvent);
  await plan.getByLabel("Event date").fill("2027-04-18");
  await plan
    .getByLabel("Planning preferences")
    .fill("Outdoor lighting and seasonal food");
  await plan.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(plan.getByLabel("Event name")).toHaveValue(editedEvent);
  await selectPanel(page, "Overview");
  await expect(
    plan.getByText(editedEvent, { exact: true }).first(),
  ).toBeVisible();
  await expectMoney(page, "₹7,04,000.00");

  await selectPanel(page, "Budget");
  await plan.getByRole("button", { name: "Add category", exact: true }).click();
  await plan.getByLabel("Category name").fill("Lantern rentals");
  await plan.getByLabel("Pricing basis").selectOption("fixed");
  await plan.getByLabel("Amount (₹)", { exact: true }).fill("12.345");
  const saveCategory = plan.getByRole("button", {
    name: "Save category",
    exact: true,
  });
  await saveCategory.click();
  await expect(saveCategory).toBeVisible();
  await expectMoney(page, "₹7,04,000.00");
  await plan.getByLabel("Amount (₹)", { exact: true }).fill("250.25");
  await saveCategory.click();
  await expectMoney(page, "₹7,04,250.25");
  await plan.getByRole("button", { name: "Edit Lantern rentals" }).click();
  await plan.getByLabel("Amount (₹)", { exact: true }).fill("500.50");
  await saveCategory.click();
  await expectMoney(page, "₹7,04,500.50");
  await expectMoney(page, "₹1,95,499.50");

  await selectPanel(page, "Tasks");
  await expect(
    plan.getByText(/Depends on: Confirm venue layout/).first(),
  ).toBeVisible();
  const dietary = plan.getByRole("checkbox", {
    name: "Confirm dietary counts",
    exact: true,
  });
  await dietary.click();
  await expect(dietary).not.toBeChecked();
  const menu = plan.getByRole("checkbox", {
    name: "Finalize the menu",
    exact: true,
  });
  await menu.check();
  await expect(menu).toBeChecked();
  await menu.uncheck();
  await expect(menu).not.toBeChecked();
  await plan.getByRole("button", { name: "Edit Finalize the menu" }).click();
  await plan.getByLabel("Task title").fill("Confirm dinner menu");
  await plan.getByLabel("Due date").fill("2027-01-30");
  await plan.getByLabel("Priority").selectOption("high");
  await plan.getByRole("button", { name: "Save task", exact: true }).click();
  await plan
    .getByRole("checkbox", { name: "Confirm dinner menu", exact: true })
    .check();
  await expect(
    plan.getByRole("checkbox", { name: "Confirm dinner menu", exact: true }),
  ).toBeChecked();
  await expect(plan.getByText(/Depends on: Confirm dinner menu/)).toBeVisible();

  await selectPanel(page, "Replan");
  await plan.getByLabel("New guest count").fill("150");
  await plan.getByLabel("New total budget (₹)").fill("750000.00");
  await plan
    .getByRole("button", { name: "Preview changes", exact: true })
    .click();
  await expectMoney(page, "₹7,04,500.50");
  await expectMoney(page, "₹7,55,500.50");
  await expectMoney(page, "−₹5,500.50");
  await expect(
    plan.getByText(/Per-guest allocations use the new count/),
  ).toBeVisible();
  await plan
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await selectPanel(page, "Budget");
  await expect(plan.getByText("Over budget", { exact: true })).toBeVisible();
  await expectMoney(page, "₹5,500.50");

  await selectPanel(page, "Replan");
  await plan.getByLabel("New total budget (₹)").fill("920000.00");
  await plan
    .getByRole("button", { name: "Preview changes", exact: true })
    .click();
  await plan
    .getByRole("button", { name: "Apply changes", exact: true })
    .click();
  await selectPanel(page, "Event setup");
  await expect(plan.getByLabel("Guest count", { exact: true })).toHaveValue(
    "150",
  );

  await selectPanel(page, "Sample draft");
  await plan.getByRole("button", { name: "Load sample draft" }).click();
  await expect(plan.getByText(/no live model call/i).first()).toBeVisible();
  await plan.getByRole("checkbox", { name: /Wayfinding signs/ }).check();
  await plan.getByRole("checkbox", { name: /Review arrival timings/ }).check();
  await plan.getByRole("button", { name: "Accept selected" }).click();
  await plan.getByRole("checkbox", { name: /Welcome refreshments/ }).check();
  await plan
    .getByRole("checkbox", { name: /Walk through the rain plan/ })
    .check();
  await plan.getByRole("button", { name: "Reject selected" }).click();
  await expect(plan.getByText("Accepted", { exact: true })).toHaveCount(2);
  await expect(plan.getByText("Rejected", { exact: true })).toHaveCount(2);
  await selectPanel(page, "Budget");
  await expect(
    plan.getByRole("button", { name: "Edit Wayfinding signs" }),
  ).toBeVisible();
  await expect(
    plan.getByRole("button", { name: "Edit Welcome refreshments" }),
  ).toHaveCount(0);
  await expectMoney(page, "₹7,64,000.50");
  await selectPanel(page, "Tasks");
  await expect(
    plan.getByRole("checkbox", { name: "Review arrival timings", exact: true }),
  ).toBeVisible();
  await expect(
    plan.getByRole("checkbox", {
      name: "Walk through the rain plan",
      exact: true,
    }),
  ).toHaveCount(0);

  // Reopening the document can read static files again. The origin and file
  // allowlist still applies, then all in-page interactions resume offline.
  await staticNetwork.setOffline(false);
  await page.reload();
  await staticNetwork.setOffline(true);
  await expect(
    plan.getByText(editedEvent, { exact: true }).first(),
  ).toBeVisible();
  await selectPanel(page, "Budget");
  await expect(
    plan.getByRole("button", { name: "Edit Lantern rentals" }),
  ).toBeVisible();
  await expectMoney(page, "₹7,64,000.50");
  await selectPanel(page, "Tasks");
  await expect(
    plan.getByRole("checkbox", { name: "Confirm dinner menu", exact: true }),
  ).toBeChecked();
  await expect(
    plan.getByRole("checkbox", { name: "Review arrival timings", exact: true }),
  ).toBeVisible();

  await plan.getByRole("button", { name: "Reset sample", exact: true }).click();
  const confirmation = plan.getByRole("group", {
    name: "Confirm plan replacement",
  });
  await confirmation
    .getByRole("button", { name: "Reset to sample", exact: true })
    .click();
  await expect(
    plan.getByText(initialEvent, { exact: true }).first(),
  ).toBeVisible();
  await expectMoney(page, "₹7,04,000.00");
  await plan.getByRole("button", { name: "Start fresh", exact: true }).click();
  await confirmation
    .getByRole("button", { name: "Create fresh plan", exact: true })
    .click();
  await plan.getByLabel("Event name").fill("Fresh community plan");
  await plan.getByRole("button", { name: "Save event", exact: true }).click();
  await selectPanel(page, "Budget");
  await expect(
    plan.getByRole("button", { name: "Edit Lantern rentals" }),
  ).toHaveCount(0);
  await expect(plan.getByRole("button", { name: "Edit Venue" })).toHaveCount(0);
  await expectMoney(page, "₹0.00");
});

test("malformed local storage falls back to the original sample", async ({
  page,
  staticNetwork,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "{invalid JSON");
  }, storageKey);
  await openShowcase(page);
  await staticNetwork.setOffline(true);
  await openDemo(page);
  await expect(
    demo(page).getByText(initialEvent, { exact: true }).first(),
  ).toBeVisible();
  await expectMoney(page, "₹7,04,000.00");
});
