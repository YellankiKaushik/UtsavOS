import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const token = "a".repeat(64),
  guest = "11111111-1111-4111-8111-111111111111";
test("synthetic RSVP: private fragment, scoped response, retry key and accessible mobile form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let saved = false;
  await page.route("**/api/rsvp", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.token).toBe(token);
    expect(route.request().url()).not.toContain(token);
    if (body.action === "respond") {
      expect(route.request().headers()["idempotency-key"]).toMatch(
        /^[a-f0-9-]{36}$/,
      );
      expect(body.answers).toEqual([
        { guestId: guest, functionId: null, status: "accepted" },
      ]);
      saved = true;
    }
    await route.fulfill({
      json: {
        data: {
          eventTitle: "Synthetic reception",
          expiresAt: "2027-01-01T12:00:00Z",
          guests: [{ id: guest, displayName: "Synthetic invitee" }],
          scopes: [{ id: null, title: "Reception" }],
          answers: saved
            ? [{ guestId: guest, functionId: null, status: "accepted" }]
            : [],
        },
      },
    });
  });
  await page.goto(`/rsvp#${token}`);
  await expect(
    page.getByRole("heading", { name: "Synthetic reception" }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await page
    .getByLabel("Synthetic invitee — Reception")
    .selectOption("accepted");
  await page.getByRole("button", { name: "Save attendance response" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your response is saved",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("synthetic RSVP: expired invitation gives a safe recovery message", async ({
  page,
}) => {
  await page.route("**/api/rsvp", (route) =>
    route.fulfill({ status: 404, json: { error: { code: "NOT_FOUND" } } }),
  );
  await page.goto(`/rsvp#${token}`);
  await expect(
    page.getByRole("alert").filter({ hasText: "This invitation" }),
  ).toContainText("Ask your host for a new link");
  expect(new URL(page.url()).hash).toBe("");
});
