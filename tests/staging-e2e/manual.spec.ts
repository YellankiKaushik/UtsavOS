import { test, expect } from "@playwright/test";
import { protect, login, read } from "../helpers/hosted-browser";
test.beforeEach(async ({ context }) => protect(context));
test.describe.serial("Hosted manual verticals", () => {
  let recordedEventId = "";
  test("HOSTED MANUAL ONLY: real Vercel/Auth/DB planning, private RSVP, refresh and tenant isolation", async ({
    page,
    browser,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect((await read(page, "/api/health/live")).status).toBe(200);
    await login(page, "A");
    const me = (await read(page, "/api/v1/me")).body.data;
    expect(me.aiConfigured).toBe(false);
    expect(me.features).toMatchObject({ eventFunctions: true, guests: true });
    await page.getByRole("link", { name: "New celebration" }).click();
    const title = `SYNTHETIC HOSTED MANUAL ${Date.now()}`;
    await page.getByLabel("Celebration name").fill(title);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create celebration" }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    const eventId = new URL(page.url()).pathname.split("/")[3];
    await page.getByRole("link", { name: "Budget", exact: true }).click();
    await page
      .getByRole("button", { name: "Add expense", exact: true })
      .click();
    await page.getByLabel("Expense name").fill("Synthetic stationery");
    await page.getByLabel("Category", { exact: true }).fill("gifts");
    await page.getByLabel("Total estimate (₹)").fill("1000");
    await page
      .getByRole("button", { name: "Save expense", exact: true })
      .click();
    await expect(
      page.getByText("Synthetic stationery", { exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Tasks & timeline" }).click();
    await page.getByRole("button", { name: "Add task", exact: true }).click();
    await page.getByLabel("Task name").fill("Synthetic welcome desk");
    await page.getByRole("button", { name: "Save task", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Complete Synthetic welcome desk" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Vendors", exact: true }).click();
    await page
      .getByRole("button", { name: "Add vendor requirement", exact: true })
      .click();
    await page.getByLabel("Requirement name").fill("Synthetic photographer");
    await page
      .getByRole("button", { name: "Save requirement", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Synthetic photographer" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Functions · preview", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add function", exact: true })
      .click();
    await page.getByLabel("Function name").fill("Hosted reception");
    await page
      .getByRole("button", { name: "Save function", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Hosted reception", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Guests & RSVP", exact: true })
      .click();
    await page
      .getByLabel("Household name", { exact: true })
      .fill("Synthetic household");
    await page
      .getByRole("button", { name: "Add household", exact: true })
      .click();
    await page.getByRole("button", { name: "Add guest", exact: true }).click();
    await page
      .getByLabel("Guest name", { exact: true })
      .fill("Synthetic invitee");
    await page.getByLabel("Email (optional)").fill("synthetic@example.test");
    await page.getByRole("button", { name: "Save guest", exact: true }).click();
    await expect(
      page.getByRole("rowheader", { name: "Synthetic invitee" }),
    ).toBeVisible();
    await page
      .getByLabel("Invited household")
      .selectOption({ label: "Synthetic household" });
    await page.getByRole("button", { name: "Create invitation link" }).click();
    const invitation = await page
      .getByLabel("Invitation link — save it now")
      .inputValue();
    const guestContext = await browser.newContext();
    await protect(guestContext);
    const guestPage = await guestContext.newPage();
    await guestPage.setViewportSize({ width: 390, height: 844 });
    await guestPage.goto(invitation);
    await expect(
      guestPage.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    expect(new URL(guestPage.url()).hash).toBe("");
    await guestPage
      .getByLabel(`Synthetic invitee — ${title}`)
      .selectOption("accepted");
    await guestPage
      .getByRole("button", { name: "Save attendance response" })
      .click();
    await expect(guestPage.getByRole("status")).toContainText(
      "Your response is saved",
    );
    await page.reload();
    await expect(
      page.getByLabel("Attendance for Synthetic invitee"),
    ).toHaveValue("accepted");
    const persisted = (await read(page, `/api/v1/events/${eventId}`)).body.data;
    expect(
      persisted.budgetItems.some(
        (x: { title: string; unitPriceMinor: string }) =>
          x.title === "Synthetic stationery" && x.unitPriceMinor === "100000",
      ),
    ).toBe(true);
    expect(persisted.event.guestCount).toBe(150);
    const bContext = await browser.newContext();
    await protect(bContext);
    const bPage = await bContext.newPage();
    await login(bPage, "B");
    expect((await read(bPage, `/api/v1/events/${eventId}`)).status).toBe(404);
    expect((await read(bPage, `/api/v1/events/${eventId}/guests`)).status).toBe(
      404,
    );
    await page.getByRole("button", { name: "Revoke invitation" }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Revoked" }),
    ).toHaveCount(1);
    await guestPage.reload();
    await guestPage
      .getByLabel("Invitation code")
      .fill(new URL(invitation).hash.slice(1));
    const revokedResponse = guestPage.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/rsvp" &&
        response.request().method() === "POST",
    );
    await guestPage.getByRole("button", { name: "Open invitation" }).click();
    expect((await revokedResponse).status()).toBe(404);
    await expect(
      guestPage.getByRole("alert").filter({ hasText: "This invitation" }),
    ).toBeVisible();
    recordedEventId = eventId;
    await guestContext.close();
    await bContext.close();
  });
  test("HOSTED MANUAL ONLY: mobile replan preview, atomic approval, audit and logout", async ({
    page,
  }) => {
    expect(recordedEventId).toBeTruthy();
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "A");
    const eventId = recordedEventId;
    await page.goto(`/app/events/${eventId}/replan`);
    const before = (await read(page, `/api/v1/events/${eventId}`)).body.data;
    await page.getByLabel("New expected guest count").fill("180");
    await page
      .getByRole("checkbox", { name: "Do not exceed my event budget" })
      .uncheck();
    await page.getByRole("button", { name: "Preview the impact" }).click();
    await expect(page.getByText("150 → 180 guests")).toBeVisible();
    expect(
      (await read(page, `/api/v1/events/${eventId}`)).body.data.event.version,
    ).toBe(before.event.version);
    await page.getByRole("button", { name: "Review approval" }).click();
    await page
      .getByRole("button", { name: "Approve and save changes" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "approved changes are saved",
    );
    await page.reload();
    const after = (await read(page, `/api/v1/events/${eventId}`)).body.data;
    expect(after.event.guestCount).toBe(180);
    expect(after.event.version).toBe(before.event.version + 1);
    await page.getByRole("link", { name: "History", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "approve", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto(`/app/events/${eventId}`);
    await expect(page).toHaveURL(/\/login$/);
  });
});
