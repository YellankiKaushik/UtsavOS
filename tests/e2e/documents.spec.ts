import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id = "11111111-1111-4111-8111-111111111111",
  vendor = "22222222-2222-4222-8222-222222222222",
  doc = "33333333-3333-4333-8333-333333333333";
test("synthetic documents: private upload, local text, explicit manual quote review and mobile accessibility", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const bytes = Buffer.from("Synthetic supplier\nQ-001\nINR 1000.00");
  const state = {
    event: {
      id,
      workspaceId: id,
      type: "wedding",
      title: "Synthetic document event",
      dateStatus: "tbd",
      startsAt: null,
      timeZone: "Asia/Kolkata",
      guestCount: 20,
      currency: "INR",
      budgetMinor: "1000000",
      preferences: "",
      status: "planning",
      version: 1,
      createdAt: "2026-10-01T00:00:00Z",
    },
    budgetItems: [],
    tasks: [],
    vendors: [
      {
        id: vendor,
        title: "Supplier requirement",
        category: "other",
        status: "needed",
        notes: "",
        isLocked: false,
        estimatedCostMinor: null,
        quoteSource: null,
        dueAt: null,
      },
    ],
  };
  let storedDocument: Record<string, unknown> | null = null,
    pages: { page: number; text: string }[] = [];
  let quoted = false;
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    let result: unknown = state;
    if (path.endsWith("/me"))
      result = { features: { documents: true }, aiConfigured: false };
    if (path.endsWith("/documents")) {
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        expect(body).toMatchObject({
          action: "prepare",
          mediaType: "text/plain",
          byteSize: bytes.length,
        });
        state.event.version++;
        storedDocument = {
          id: doc,
          filename: body.filename,
          media_type: body.mediaType,
          byte_size: body.byteSize,
          state: "pending_upload",
          created_at: "2026-10-01T00:00:00Z",
        };
        result = { id: doc, version: state.event.version };
      } else
        result = {
          eventVersion: state.event.version,
          items: storedDocument ? [storedDocument] : [],
          extractionAvailable: false,
        };
    } else if (path.endsWith("/upload")) {
      expect(request.postDataBuffer()).toEqual(bytes);
      expect(request.headers()["content-type"]).toBe("text/plain");
      expect(request.headers()["x-event-version"]).toBe(
        String(state.event.version),
      );
      storedDocument!.state = "ready";
      state.event.version++;
      result = { id: doc, version: state.event.version };
    } else if (path.endsWith(`/documents/${doc}`)) {
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        expect(body.expectedVersion).toBe(state.event.version);
        state.event.version++;
        if (body.action === "extract_text")
          pages = [{ page: 1, text: bytes.toString() }];
        if (body.action === "record_quote") {
          expect(body.confirmed).toBe(true);
          expect(body.extractionId).toBeNull();
          expect(body.fields.totalMinor).toBe("100000");
          quoted = true;
        }
        result = { id: doc, version: state.event.version };
      } else
        result = {
          document: storedDocument,
          sourceKind: pages.length ? "plain_text" : null,
          pages,
          extractions: [],
        };
    }
    await route.fulfill({
      json: { data: result, meta: { requestId: "synthetic-documents" } },
    });
  });
  await page.goto(`http://127.0.0.1:3100/app/events/${id}/documents`);
  await page.getByLabel("Quotation file (up to 2 MB)").setInputFiles({
    name: "synthetic.txt",
    mimeType: "text/plain",
    buffer: bytes,
  });
  await page
    .getByRole("button", { name: "Upload private document", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Download private original" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Read PDF or text locally" }).click();
  await expect(
    page.getByRole("heading", { name: "Page 1", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Source vendor requirement").selectOption(vendor);
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
  expect(quoted).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
