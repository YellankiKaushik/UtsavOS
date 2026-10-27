import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { TeamWorkspace } from "../../src/domain/teams";
const id = "11111111-1111-4111-8111-111111111111",
  member = "22222222-2222-4222-8222-222222222222";
test("synthetic team UI: owner creates a private invitation and revokes a member", async ({
  page,
}) => {
  const workspace: TeamWorkspace = {
    id,
    name: "Synthetic agency",
    kind: "agency",
    version: 2,
    role: "owner",
    members: [
      { userId: id, role: "owner", state: "active" },
      { userId: member, role: "planner_member", state: "active" },
    ],
    invitations: [],
    events: [
      {
        id,
        title: "Synthetic reception",
        type: "wedding",
        startsAt: null,
        timeZone: "Asia/Kolkata",
        canOpen: true,
        canEdit: true,
        canApprove: true,
        canViewContacts: true,
      },
    ],
    assignments: [],
  };
  const token = "a".repeat(64);
  await page.route("**/api/v1/team", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body.expectedVersion).toBe(workspace.version);
      workspace.version++;
      if (body.action === "invite") {
        expect(body).toMatchObject({
          email: "synthetic@example.test",
          role: "planner_member",
          workspaceId: id,
        });
        workspace.invitations.push({
          id: member,
          email: body.email,
          role: body.role,
          expiresAt: "2027-01-01T00:00:00Z",
          revoked: false,
          accepted: false,
        });
        await route.fulfill({
          json: {
            data: { token, id: member, version: workspace.version },
            meta: { requestId: "synthetic-team" },
          },
        });
        return;
      }
      if (body.action === "member") workspace.members[1].state = "revoked";
      await route.fulfill({
        json: {
          data: { id: member, version: workspace.version },
          meta: { requestId: "synthetic-team" },
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        data: { items: [workspace] },
        meta: { requestId: "synthetic-team" },
      },
    });
  });
  await page.goto("http://127.0.0.1:3100/app/team");
  await page
    .getByLabel("Invited email for Synthetic agency")
    .fill("synthetic@example.test");
  await page
    .getByRole("button", { name: "Create private team invitation" })
    .click();
  await expect(
    page.getByLabel("Private invitation code — save it now"),
  ).toHaveValue(token);
  await page.getByRole("button", { name: "Hide invitation code" }).click();
  await expect(
    page.getByLabel("Private invitation code — save it now"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Revoke member", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Revoke member", exact: true }),
  ).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("synthetic team client: restricted mobile summary, no contacts or owner controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/team", (route) =>
    route.fulfill({
      json: {
        data: {
          items: [
            {
              id,
              name: "Synthetic agency",
              kind: "agency",
              version: 4,
              role: "client_viewer",
              members: [],
              invitations: [],
              assignments: [],
              events: [
                {
                  id,
                  title: "Assigned reception",
                  type: "wedding",
                  startsAt: null,
                  timeZone: "Asia/Kolkata",
                  canOpen: false,
                  canEdit: false,
                  canApprove: false,
                  canViewContacts: false,
                },
              ],
            },
          ],
        },
      },
    }),
  );
  await page.goto("http://127.0.0.1:3100/app/team");
  await expect(
    page.getByText("Assigned reception", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Assigned reception" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Invite a collaborator" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Members", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
