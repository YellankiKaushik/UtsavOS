import { z } from "zod";
import { uuid } from "./contracts.ts";
import { quoteFields } from "./vendor-finance.ts";
import { DomainError } from "./errors.ts";
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const mediaType = z.enum([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
]);
export const prepareDocument = z
  .object({
    action: z.literal("prepare"),
    expectedVersion: z.number().int().min(1),
    filename: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[^/\\\u0000-\u001f\u007f]+$/),
    mediaType,
    byteSize: z.number().int().min(1).max(MAX_DOCUMENT_BYTES),
  })
  .strict()
  .refine(
    (x) =>
      ({
        "application/pdf": /\.pdf$/i,
        "image/png": /\.png$/i,
        "image/jpeg": /\.jpe?g$/i,
        "text/plain": /\.txt$/i,
      })[x.mediaType].test(x.filename),
    "Use the file extension matching its type",
  );
export const documentPages = z
  .array(
    z
      .object({
        page: z.number().int().min(1).max(30),
        text: z.string().max(50000),
      })
      .strict(),
  )
  .min(1)
  .max(30)
  .refine(
    (pages) =>
      pages.reduce((total, page) => total + page.text.length, 0) <= 50000 &&
      pages.every((page, i) => page.page === i + 1),
    "Source pages must be ordered and bounded",
  );
const evidence = z
  .object({
    page: z.number().int().min(1).max(30),
    start: z.number().int().min(0).max(50000),
    end: z.number().int().min(1).max(50000),
    quote: z.string().min(1).max(500),
  })
  .strict();
const field = z.union([
  z
    .object({ value: z.null(), source: z.null(), confidence: z.literal(0) })
    .strict(),
  z
    .object({
      value: z.string().min(1).max(500),
      source: evidence,
      confidence: z.number().min(0).max(1),
    })
    .strict(),
]);
export const quotationExtraction = z
  .object({
    schemaVersion: z.literal(1),
    currency: z.literal("INR"),
    fields: z
      .object({
        supplierName: field,
        reference: field,
        totalMinor: field,
        expiresOn: field,
      })
      .strict(),
    warnings: z.array(z.string().max(300)).max(10),
  })
  .strict();
export type QuotationExtraction = z.infer<typeof quotationExtraction>;
export type DocumentPage = z.infer<typeof documentPages>[number];
// The model selects exact evidence rather than calculating character offsets.
// These are textual anchors, never verified supplier/financial facts.
export function quotationSourceSpans(pages: DocumentPage[]) {
  const spans: { page: number; start: number; end: number; quote: string }[] =
    [];
  for (const page of pages) {
    let offset = 0;
    for (const line of page.text.split("\n")) {
      const points = Array.from(line);
      const candidates = [0];
      const colon = points.indexOf(":");
      if (colon >= 0) candidates.push(colon + 1);
      for (const from of candidates) {
        let start = from,
          end = points.length;
        while (start < end && /\s/u.test(points[start])) start++;
        while (end > start && /\s/u.test(points[end - 1])) end--;
        const quote = points.slice(start, end).join("");
        if (end === start || quote.length > 500 || spans.length >= 300)
          continue;
        spans.push({
          page: page.page,
          start: offset + start,
          end: offset + end,
          quote,
        });
      }
      offset += points.length + 1;
    }
  }
  return spans;
}
function sourceMoney(text: string) {
  const match =
    /^(?:₹\s*|INR\s*|Rs\.?\s*)([0-9][0-9,]*)(?:\.([0-9]{1,2}))?$/i.exec(
      text.trim(),
    );
  if (!match) return null;
  if (
    match[1].includes(",") &&
    !/^(?:[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d?(?:,\d{2})*,\d{3})$/.test(match[1])
  )
    return null;
  const digits = match[1].replaceAll(",", "");
  if (!/^\d{1,11}$/.test(digits)) return null;
  return (
    BigInt(digits) * 100n +
    BigInt((match[2] ?? "").padEnd(2, "0"))
  ).toString();
}
export function validateQuotationSources(
  payload: QuotationExtraction,
  pages: DocumentPage[],
) {
  for (const [name, field] of Object.entries(payload.fields)) {
    if (field.value === null) {
      if (field.source !== null)
        throw new DomainError(
          "INVALID_SOURCE_SPAN",
          "A missing field cannot claim source evidence.",
          422,
        );
      continue;
    }
    const span = field.source,
      page = span && pages.find((p) => p.page === span.page);
    if (
      !span ||
      !page ||
      span.end <= span.start ||
      Array.from(page.text).slice(span.start, span.end).join("") !== span.quote
    )
      throw new DomainError(
        "INVALID_SOURCE_SPAN",
        "A suggested field does not match the source text.",
        422,
      );
    if (name === "totalMinor") {
      if (
        sourceMoney(span.quote) !== field.value ||
        !/^([1-9][0-9]{0,12})$/.test(field.value) ||
        BigInt(field.value) > 9000000000000n
      )
        throw new DomainError(
          "INVALID_SOURCE_VALUE",
          "Review the original INR amount manually.",
          422,
        );
    } else if (name === "expiresOn") {
      if (
        !z.iso.date().safeParse(field.value).success ||
        span.quote.trim() !== field.value
      )
        throw new DomainError(
          "INVALID_SOURCE_VALUE",
          "Review the original expiry date manually.",
          422,
        );
    } else if (field.value !== span.quote.trim())
      throw new DomainError(
        "INVALID_SOURCE_VALUE",
        "A suggested value is not a faithful source excerpt.",
        422,
      );
  }
  return payload;
}
const version = { expectedVersion: z.number().int().min(1) };
export const documentAction = z.discriminatedUnion("action", [
  z.object({ ...version, action: z.literal("extract_text") }).strict(),
  z
    .object({
      ...version,
      action: z.literal("manual_text"),
      text: z.string().min(1).max(20000),
    })
    .strict(),
  z
    .object({
      ...version,
      action: z.literal("suggest"),
      consent: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...version,
      action: z.literal("record_quote"),
      extractionId: uuid.nullable(),
      confirmed: z.literal(true),
      fields: quoteFields.omit({ id: true }),
    })
    .strict(),
  z
    .object({
      ...version,
      action: z.literal("reject_extraction"),
      extractionId: uuid,
    })
    .strict(),
  z.object({ ...version, action: z.literal("archive") }).strict(),
  z.object({ ...version, action: z.literal("cleanup_original") }).strict(),
]);
export type EventDocument = {
  id: string;
  filename: string;
  media_type: z.infer<typeof mediaType>;
  byte_size: number;
  state: "pending_upload" | "ready" | "quarantined" | "archived";
  created_at: string;
  original_cleanup?: "pending" | "removed";
};
export type DocumentDetail = {
  document: EventDocument;
  sourceKind: string | null;
  pages: DocumentPage[];
  extractions: {
    id: string;
    payload: QuotationExtraction;
    provenance: Record<string, unknown>;
    state: string;
    quoteId: string | null;
  }[];
};
