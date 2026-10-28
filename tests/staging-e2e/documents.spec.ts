import { test, expect } from "@playwright/test";
import { protect, login, read } from "../helpers/hosted-browser";
import { pdf } from "../helpers/pdf";
test("HOSTED documents: private PDF upload, isolated parser, explicit review and source provenance", async ({
  page,
  context,
}) => {
  await protect(context);
  await login(page, "A");
  const me = (await read(page, "/api/v1/me")).body.data;
  expect(me.features.documents).toBe(true);
  const created = await page.evaluate(
    async (workspaceId) => {
      const post = async (path: string, body: unknown) => {
        const r = await fetch(`/api/v1/${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`Synthetic setup status ${r.status}`);
        return (await r.json()).data;
      };
      const event = await post("events", {
        workspaceId,
        fields: {
          type: "community",
          title: "SYNTHETIC HOSTED DOCUMENT",
          dateStatus: "tbd",
          startsAt: null,
          timeZone: "Asia/Kolkata",
          guestCount: 20,
          currency: "INR",
          budgetMinor: "1000000",
          status: "planning",
          preferences: "",
        },
      });
      const vendor = await post(`events/${event.id}/vendor-requirements`, {
        expectedVersion: event.version,
        fields: {
          title: "Synthetic supplier requirement",
          category: "other",
          status: "needed",
          notes: "",
          isLocked: false,
          estimatedCostMinor: null,
          quoteSource: null,
          dueAt: null,
        },
      });
      return { id: event.id, vendorId: vendor.id };
    },
    me.workspaces.find((w: { kind: string }) => w.kind === "personal").id,
  );
  await page.goto(`/app/events/${created.id}/documents`);
  const bytes = pdf("Synthetic supplier Q-001 INR 1000.00");
  await page.getByLabel("Quotation file (up to 2 MB)").setInputFiles({
    name: "synthetic.pdf",
    mimeType: "application/pdf",
    buffer: bytes,
  });
  await page
    .getByRole("button", { name: "Upload private document", exact: true })
    .click();
  const downloadLink = page.getByRole("link", {
    name: "Download private original",
  });
  await expect(downloadLink).toBeVisible();
  const downloaded = await page.evaluate(
    async (url) => {
      const r = await fetch(url!);
      return {
        status: r.status,
        bytes: Array.from(new Uint8Array(await r.arrayBuffer())),
        type: r.headers.get("content-type"),
        cache: r.headers.get("cache-control"),
      };
    },
    await downloadLink.getAttribute("href"),
  );
  expect(downloaded.status).toBe(200);
  expect(Buffer.from(downloaded.bytes)).toEqual(bytes);
  expect(downloaded.type).toBe("application/octet-stream");
  expect(downloaded.cache).toContain("no-store");
  await page.getByRole("button", { name: "Read PDF or text locally" }).click();
  await expect(
    page.getByRole("heading", { name: "Page 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic supplier Q-001 INR 1000.00", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Source vendor requirement")
    .selectOption(created.vendorId);
  await page.getByLabel("Reviewed supplier name").fill("Synthetic supplier");
  await page.getByLabel("Reviewed quotation reference").fill("Q-001");
  await page.getByLabel("Reviewed total including charges (₹)").fill("1000");
  await page
    .getByLabel(
      "I checked the original source and explicitly confirm these quotation fields.",
    )
    .check();
  await page
    .getByRole("button", { name: "Save reviewed quotation", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Reviewed quotation saved",
  );
  await page.reload();
  const finance = (await read(page, `/api/v1/events/${created.id}/finance`))
    .body.data;
  expect(finance.quotes).toHaveLength(1);
  expect(finance.quotes[0].totalMinor).toBe("100000");
  expect(finance.quotes[0].sourceDocumentId).toMatch(/^[a-f0-9-]{36}$/);
});
