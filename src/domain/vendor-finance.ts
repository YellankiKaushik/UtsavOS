import { z } from "zod";
import { uuid, moneySchema } from "./contracts.ts";
const positive = moneySchema.refine(
  (value) => BigInt(value) > 0n,
  "Enter a positive amount",
);
const reference = z.string().trim().min(1).max(120);
const reason = z.string().trim().min(1).max(500);
const version = { expectedVersion: z.number().int().min(1) };
export const quoteFields = z
  .object({
    id: uuid.nullable().default(null),
    vendorRequirementId: uuid,
    supplierName: z.string().trim().min(1).max(160),
    reference,
    totalMinor: positive,
    expiresOn: z.iso.date().nullable(),
    notes: z.string().max(2000).default(""),
  })
  .strict();
export const financeMutation = z.discriminatedUnion("action", [
  z
    .object({ ...version, action: z.literal("quote"), ...quoteFields.shape })
    .strict(),
  z
    .object({ ...version, action: z.literal("withdraw_quote"), id: uuid })
    .strict(),
  z
    .object({
      ...version,
      action: z.literal("commit"),
      quoteId: uuid,
      depositDueMinor: moneySchema,
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...version,
      action: z.enum(["cancel_commitment", "void_invoice", "reverse_payment"]),
      id: uuid,
      reason,
    })
    .strict(),
  z
    .object({
      ...version,
      action: z.literal("invoice"),
      commitmentId: uuid,
      reference,
      amountMinor: positive,
      issuedOn: z.iso.date(),
      dueOn: z.iso.date().nullable(),
    })
    .strict()
    .refine(
      (x) => !x.dueOn || x.dueOn >= x.issuedOn,
      "Due date must follow issue date",
    ),
  z
    .object({
      ...version,
      action: z.literal("payment"),
      invoiceId: uuid,
      reference,
      amountMinor: positive,
      paidOn: z.iso.date(),
      method: z.enum(["bank_transfer", "cash", "card", "other"]),
      confirmed: z.literal(true),
    })
    .strict(),
]);
export type VendorFinance = {
  eventVersion: number;
  quotes: {
    id: string;
    vendorRequirementId: string;
    supplierName: string;
    reference: string;
    totalMinor: string;
    expiresOn: string | null;
    notes: string;
    state: "received" | "withdrawn";
    sourceDocumentId?: string | null;
  }[];
  commitments: {
    id: string;
    quoteId: string;
    totalMinor: string;
    depositDueMinor: string;
    state: "active" | "cancelled";
    cancellationReason: string | null;
  }[];
  invoices: {
    id: string;
    commitmentId: string;
    reference: string;
    amountMinor: string;
    issuedOn: string;
    dueOn: string | null;
    state: "issued" | "void";
    voidReason: string | null;
  }[];
  payments: {
    id: string;
    invoiceId: string;
    reference: string;
    amountMinor: string;
    paidOn: string;
    method: string;
    state: "recorded" | "reversed";
    reversalReason: string | null;
  }[];
  summary: { committedMinor: string; invoicedMinor: string; paidMinor: string };
};
