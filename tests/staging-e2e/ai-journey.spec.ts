import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { protect, login, read } from "../helpers/hosted-browser";
import { calculateBudget } from "../../src/domain/money";
import type { EventSnapshot } from "../../src/domain/contracts";
import type { PlanDraft } from "../../src/domain/ai-contract";
const enabled = process.env.LIVE_EXPECT_AI_ENABLED === "true";
let capture:
  | {
      context: BrowserContext;
      page: Page;
      type: string;
      started: number;
      markers: { label: string; seconds: number }[];
    }
  | undefined;
function mark(label: string) {
  if (capture)
    capture.markers.push({
      label,
      seconds: Math.round((Date.now() - capture.started) / 100) / 10,
    });
}
// Manual-only profiles explicitly skip these cases; they never count as AI passes.
test.describe("Genuine hosted GenAI acceptance", () => {
  test.afterEach(async () => {
    if (!capture) return;
    const saved = capture;
    capture = undefined;
    const video = saved.page.video();
    await saved.context.close();
    if (video)
      await video.saveAs(
        `.runtime/release-20261029/capture/${saved.type}.webm`,
      );
    writeFileSync(
      `.runtime/release-20261029/capture/${saved.type}-markers.json`,
      JSON.stringify(
        {
          markers: saved.markers,
          accountIdentifiersHidden: true,
          authenticationBootstrapExcluded: true,
          source: "genuine protected Preview interaction; synthetic event data",
        },
        null,
        2,
      ),
    );
  });
  test.skip(
    !enabled,
    "Requires the verified model enabled on the isolated Preview",
  );
  for (const type of ["wedding", "birthday", "community"] as const) {
    test(`${type}: real generation, selective acceptance, persistent operational records${type === "wedding" ? " and exact replan" : ""}`, async ({
      page,
      context,
      browser,
    }) => {
      test.setTimeout(240000);
      await protect(context);
      if (type === "birthday")
        await page.setViewportSize({ width: 390, height: 844 });
      await login(page, "A");
      if (process.env.CAPTURE_DEMO === "true") {
        mkdirSync(".runtime/release-20261029/capture", { recursive: true });
        const recorded = await browser.newContext({
          baseURL: process.env.LIVE_PREVIEW_URL,
          viewport:
            type === "birthday"
              ? { width: 390, height: 844 }
              : { width: 1440, height: 900 },
          storageState: await context.storageState(),
          recordVideo: {
            dir: ".runtime/release-20261029/capture/raw",
            size:
              type === "birthday"
                ? { width: 390, height: 844 }
                : { width: 1440, height: 900 },
          },
        });
        await protect(recorded);
        // Capture-only privacy styling, no app behavior or model result changes.
        await recorded.addInitScript(() => {
          const add = () => {
            if (
              document.documentElement &&
              !document.getElementById("capture-privacy")
            ) {
              const style = document.createElement("style");
              style.id = "capture-privacy";
              style.textContent =
                ".topbar-email,.avatar{visibility:hidden!important} input[type=email],input[type=password]{color:transparent!important;text-shadow:none!important}";
              document.documentElement.append(style);
            }
          };
          new MutationObserver(add).observe(document, {
            childList: true,
            subtree: true,
          });
          add();
        });
        page = await recorded.newPage();
        capture = {
          context: recorded,
          page,
          type,
          started: Date.now(),
          markers: [],
        };
        await page.goto("/app/events");
        mark("Authenticated event workspace; account identifiers hidden");
      }
      const me = (await read(page, "/api/v1/me")).body.data;
      expect(me.aiConfigured).toBe(true);
      expect(me.aiProviderPrimary).toBe("openrouter");
      await page.getByRole("link", { name: "New celebration" }).click();
      if (await page.getByLabel("Planning workspace").count())
        await page
          .getByLabel("Planning workspace")
          .selectOption(
            me.workspaces.find((w: { kind: string }) => w.kind === "personal")
              .id,
          );
      await page
        .getByRole("button", { name: new RegExp(`^${type}`, "i") })
        .click();
      const title = `SYNTHETIC GENAI ${type.toUpperCase()} ${Date.now()}`;
      await page.getByLabel("Celebration name").fill(title);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page
        .getByLabel("Expected guests")
        .fill(type === "wedding" ? "150" : "20");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page
        .getByLabel("Total budget ceiling (INR ₹)")
        .fill(type === "wedding" ? "500000" : "10000");
      await page
        .getByLabel("Priorities, style & preferences")
        .fill(
          "Vegetarian food, accessible logistics, inclusive low-noise activities. Concise initial plan: two budget lines, three tasks, two vendor categories, two personalized ideas. No business names.",
        );
      await page
        .getByRole("button", { name: "Create celebration", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      const eid = new URL(page.url()).pathname.split("/")[3];
      mark(
        "Event created with explicit type, guest count, preferences and budget",
      );
      await page
        .getByRole("link", { name: "AI planning", exact: true })
        .click();
      const generationResponse = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === `/api/v1/events/${eid}/ai-drafts` &&
          r.request().method() === "POST",
        { timeout: 60000 },
      );
      await page
        .getByRole("button", { name: "Generate a planning draft", exact: true })
        .click();
      const generated = await generationResponse;
      const body = await generated.json();
      expect(generated.status(), body.error?.code ?? "genuine generation").toBe(
        200,
      );
      await expect(
        page.getByRole("heading", { name: "Your planning draft", exact: true }),
      ).toBeVisible();
      const drafts = (await read(page, `/api/v1/events/${eid}/ai-drafts`)).body
        .data;
      const draft = drafts[0],
        payload = draft.payload as PlanDraft;
      mark("Genuine AI draft returned and validated");
      expect(draft.provider_id).toBe("openrouter");
      expect(draft.actual_model_id).toBe(
        "dots-studio/dots-3-note-preview:free",
      );
      expect(draft.prompt_version).toBe("event-plan.v2");
      expect(payload.ideas.length).toBeGreaterThan(0);
      expect(payload.budgetSuggestions.length).toBeGreaterThan(0);
      expect(payload.tasks.length).toBeGreaterThan(0);
      expect(payload.vendorRequirements.length).toBeGreaterThan(0);
      expect(
        (await read(page, `/api/v1/events/${eid}`)).body.data.event.version,
      ).toBe(1);
      await page
        .locator(`#draft-${payload.tasks[0].draftId}`)
        .fill("Reviewed accessibility and venue requirements");
      for (const item of [...payload.tasks, ...payload.vendorRequirements])
        await page
          .locator(".draft-row")
          .filter({ has: page.locator(`#draft-${item.draftId}`) })
          .getByRole("checkbox")
          .check();
      await page
        .getByRole("button", { name: /Review \d+ selected items/ })
        .click();
      await page
        .getByRole("button", { name: "Accept selected items", exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText(
        "selected items are saved",
      );
      await page.reload();
      const accepted = (await read(page, `/api/v1/events/${eid}`)).body
        .data as EventSnapshot;
      expect(accepted.event.version).toBe(2);
      expect(accepted.budgetItems).toHaveLength(0);
      expect(accepted.tasks).toHaveLength(payload.tasks.length);
      expect(accepted.vendors).toHaveLength(payload.vendorRequirements.length);
      expect(
        accepted.tasks.some(
          (t) => t.title === "Reviewed accessibility and venue requirements",
        ),
      ).toBe(true);
      const usage = (await read(page, "/api/v1/me")).body.data.usage[0];
      const meta = {
        type,
        provider: draft.provider_id,
        requestedModel: draft.requested_model_id,
        actualModel: draft.actual_model_id,
        promptVersion: draft.prompt_version,
        latencyMs: draft.latency_ms,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        usageStatus: usage.status,
        selectedTasks: accepted.tasks.length,
        selectedVendors: accepted.vendors.length,
        budgetSuggestionsIntentionallyNotAccepted: true,
      };
      const file = ".runtime/release-20261029/hosted-ai-browser-metadata.json",
        all = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
      all[type] = meta;
      writeFileSync(file, JSON.stringify(all, null, 2));
      console.info(JSON.stringify(meta));
      if (type === "wedding") {
        await page
          .getByRole("link", { name: "Tasks & timeline", exact: true })
          .click();
        await expect(
          page.getByRole("button", {
            name: "Complete Reviewed accessibility and venue requirements",
            exact: true,
          }),
        ).toBeVisible();
        mark("Accepted structured tasks visible in the operational timeline");
        await page.getByRole("link", { name: "Vendors", exact: true }).click();
        await expect(
          page.getByRole("heading", {
            name: payload.vendorRequirements[0].title,
            exact: true,
          }),
        ).toBeVisible();
        mark("AI vendor categories remain unconfirmed requirements");
        await page.getByRole("link", { name: "Budget", exact: true }).click();
        for (const expense of [
          {
            title: "Fixed celebration expenses",
            basis: "fixed",
            amount: "300000",
            category: "other",
          },
          {
            title: "Catering",
            basis: "per_guest",
            amount: "850",
            category: "catering",
          },
        ]) {
          await page
            .getByRole("button", { name: "Add expense", exact: true })
            .click();
          await page.getByLabel("Expense name").fill(expense.title);
          await page
            .getByLabel("Category", { exact: true })
            .fill(expense.category);
          await page.getByLabel("Pricing basis").selectOption(expense.basis);
          await page.locator("#b-price").fill(expense.amount);
          await page
            .getByRole("button", { name: "Save expense", exact: true })
            .click();
          await expect(
            page.getByText(expense.title, { exact: true }),
          ).toBeVisible();
        }
        const before = (await read(page, `/api/v1/events/${eid}`)).body
          .data as EventSnapshot;
        expect(
          calculateBudget(before.budgetItems, 150, "50000000").projectedMinor,
        ).toBe("42750000");
        await page.getByRole("link", { name: "Replan", exact: true }).click();
        await page.getByLabel("New expected guest count").fill("180");
        await page
          .getByRole("button", { name: "Preview the impact", exact: true })
          .click();
        await expect(
          page.getByText("150 → 180 guests", { exact: true }),
        ).toBeVisible();
        expect(
          (await read(page, `/api/v1/events/${eid}`)).body.data.event.version,
        ).toBe(before.event.version);
        const proposals = (
          await read(page, `/api/v1/events/${eid}/replan-proposals`)
        ).body.data;
        expect(JSON.stringify(proposals[0].calculated_effects)).toContain(
          "45300000",
        );
        await page
          .getByRole("button", { name: "Review approval", exact: true })
          .click();
        await page
          .getByRole("button", {
            name: "Approve and save changes",
            exact: true,
          })
          .click();
        await expect(page.getByRole("status")).toContainText(
          "approved changes are saved",
        );
        await page.reload();
        const after = (await read(page, `/api/v1/events/${eid}`)).body
          .data as EventSnapshot;
        expect(after.event.guestCount).toBe(180);
        expect(after.event.version).toBe(before.event.version + 1);
        const budget = calculateBudget(after.budgetItems, 180, "50000000");
        expect(budget.projectedMinor).toBe("45300000");
        expect(budget.remainingMinor).toBe("4700000");
        mark("Approved 180 guests; 453000 total and 47000 remaining");
        await page.getByRole("link", { name: "History", exact: true }).click();
        mark(
          "Saved audit history; end public excerpt before authentication checks",
        );
        await expect(
          page.getByRole("heading", { name: "approve", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        await expect(page).toHaveURL(/\/login$/);
        await login(page, "A");
        await page.goto(`/app/events/${eid}`);
        expect(
          (await read(page, `/api/v1/events/${eid}`)).body.data.event
            .guestCount,
        ).toBe(180);
        const b = await browser.newContext();
        await protect(b);
        const other = await b.newPage();
        await login(other, "B");
        expect((await read(other, `/api/v1/events/${eid}`)).status).toBe(404);
        await b.close();
      }
    });
  }
});
