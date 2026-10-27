import { test, expect } from "@playwright/test";
const id = "11111111-1111-4111-8111-111111111111";
test("anonymous RSVP and authenticated approval both render in audit history", async ({
  page,
}) => {
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/me")
      ? { features: { guests: true }, aiConfigured: false }
      : path.endsWith("/history")
        ? {
            items: [
              {
                id,
                action: "guest_rsvp",
                actor_id: null,
                occurred_at: "2026-10-28T10:00:00Z",
                safe_diff: { answersRecorded: 1 },
                request_id: id,
              },
              {
                id: "22222222-2222-4222-8222-222222222222",
                action: "approve",
                actor_id: id,
                occurred_at: "2026-10-28T10:01:00Z",
                safe_diff: { fromVersion: 2, toVersion: 3 },
                request_id: id,
              },
            ],
            nextCursor: null,
          }
        : {
            event: {
              id,
              workspaceId: id,
              type: "wedding",
              title: "Synthetic audit event",
              dateStatus: "tbd",
              startsAt: null,
              timeZone: "Asia/Kolkata",
              guestCount: 20,
              currency: "INR",
              budgetMinor: "1000000",
              preferences: "",
              status: "planning",
              version: 3,
              createdAt: "2026-10-28T10:00:00Z",
            },
            budgetItems: [],
            tasks: [],
            vendors: [],
          };
    return route.fulfill({ json: { data, meta: { requestId: id } } });
  });
  await page.goto(`http://127.0.0.1:3100/app/events/${id}/history`);
  await expect(
    page.getByRole("heading", { name: "guest rsvp", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Actor Guest invitation/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "approve", exact: true }),
  ).toBeVisible();
  await page
    .getByText("View recorded changes", { exact: true })
    .first()
    .click();
  await expect(
    page.getByText('"answersRecorded": 1', { exact: false }),
  ).toBeVisible();
});
