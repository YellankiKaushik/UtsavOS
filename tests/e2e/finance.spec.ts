import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id = "11111111-1111-4111-8111-111111111111",
  vendor = "22222222-2222-4222-8222-222222222222",
  quote = "33333333-3333-4333-8333-333333333333",
  commitment = "44444444-4444-4444-8444-444444444444",
  invoice = "55555555-5555-4555-8555-555555555555";
test("synthetic finance UI: quotation to payment records, exact money and accessible mobile controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = {
    event: {
      id,
      workspaceId: id,
      type: "wedding",
      title: "Synthetic finance event",
      dateStatus: "tbd",
      startsAt: null,
      timeZone: "Asia/Kolkata",
      guestCount: 20,
      currency: "INR",
      budgetMinor: "10000000",
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
        title: "Photographer",
        category: "photography",
        status: "needed",
        notes: "",
        isLocked: false,
        estimatedCostMinor: null,
        quoteSource: null,
        dueAt: null,
      },
    ],
  };
  const data: {
    eventVersion: number;
    quotes: unknown[];
    commitments: unknown[];
    invoices: unknown[];
    payments: unknown[];
    summary: {
      committedMinor: string;
      invoicedMinor: string;
      paidMinor: string;
    };
  } = {
    eventVersion: 1,
    quotes: [],
    commitments: [],
    invoices: [],
    payments: [],
    summary: { committedMinor: "0", invoicedMinor: "0", paidMinor: "0" },
  };
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let result: unknown = state;
    if (path.endsWith("/me"))
      result = { features: { vendorFinance: true }, aiConfigured: false };
    if (path.endsWith("/finance")) {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        expect(body.expectedVersion).toBe(data.eventVersion);
        data.eventVersion++;
        state.event.version++;
        if (body.action === "quote") {
          expect(body.totalMinor).toBe("1000000");
          data.quotes.push({ ...body, id: quote, state: "received" });
        }
        if (body.action === "commit") {
          expect(body.confirmed).toBe(true);
          data.commitments.push({
            ...body,
            id: commitment,
            totalMinor: "1000000",
            state: "active",
          });
          data.summary.committedMinor = "1000000";
        }
        if (body.action === "invoice") {
          data.invoices.push({ ...body, id: invoice, state: "issued" });
          data.summary.invoicedMinor = body.amountMinor;
        }
        if (body.action === "payment") {
          expect(body.confirmed).toBe(true);
          expect(body.amountMinor).toBe("100000");
          data.payments.push({ ...body, id: vendor, state: "recorded" });
          data.summary.paidMinor = body.amountMinor;
        }
        result = { id: quote, version: data.eventVersion };
      } else result = data;
    }
    await route.fulfill({
      json: { data: result, meta: { requestId: "synthetic-finance" } },
    });
  });
  await page.goto(`http://127.0.0.1:3100/app/events/${id}/finance`);
  await page
    .getByLabel("Vendor requirement", { exact: true })
    .selectOption(vendor);
  await page
    .getByLabel("Supplier name", { exact: true })
    .fill("Synthetic supplier");
  await page.getByLabel("Quotation reference", { exact: true }).fill("QUOTE-1");
  await page.getByLabel("Quoted total including charges (₹)").fill("10000");
  await page
    .getByRole("button", { name: "Save quotation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Synthetic supplier", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Commitments", exact: true }).click();
  await page
    .getByLabel("Reviewed quotation", { exact: true })
    .selectOption(quote);
  await page
    .getByLabel("I reviewed this quotation and confirm the commitment record.")
    .check();
  await page
    .getByRole("button", { name: "Record commitment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Synthetic supplier", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Invoices", exact: true }).click();
  await page
    .getByLabel("Invoice commitment", { exact: true })
    .selectOption(commitment);
  await page.getByLabel("Invoice reference", { exact: true }).fill("INV-1");
  await page.getByLabel("Invoice amount (₹)").fill("5000");
  await page
    .getByRole("button", { name: "Save invoice record", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "INV-1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Payments", exact: true }).click();
  await page.getByLabel("Paid invoice", { exact: true }).selectOption(invoice);
  await page.getByLabel("Payment reference", { exact: true }).fill("BANK-1");
  await page.getByLabel("Payment amount (₹)").fill("1000");
  await page
    .getByLabel("I confirm this payment already occurred outside UtsavOS.")
    .check();
  await page
    .getByRole("button", { name: "Save payment record", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "BANK-1", exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
