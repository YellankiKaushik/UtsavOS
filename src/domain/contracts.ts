import { z } from "zod";
export const MAX_MINOR = 9_000_000_000_000n;
export const moneySchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,12})$/)
  .refine(
    (v) => /^(0|[1-9]\d{0,12})$/.test(v) && BigInt(v) <= MAX_MINOR,
    "Amount exceeds supported range",
  );
const text = (n: number) => z.string().trim().min(1).max(n);
export const uuid = z.uuid();
export const eventType = z.enum(["wedding", "birthday", "community"]);
export const guestCount = z.number().int().min(0).max(100000);
export const instant = z.iso.datetime({ offset: true });
export const timeZone = z
  .string()
  .max(100)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Use a valid IANA time zone");
export const eventFields = z
  .object({
    type: eventType,
    title: text(140),
    dateStatus: z.enum(["tbd", "scheduled"]),
    startsAt: instant.nullable().default(null),
    timeZone,
    guestCount,
    currency: z.literal("INR"),
    budgetMinor: moneySchema,
    preferences: z.string().max(2000).default(""),
    status: z
      .enum(["planning", "active", "completed", "archived"])
      .default("planning"),
  })
  .strict()
  .refine(
    (v) => (v.dateStatus === "tbd" ? v.startsAt === null : v.startsAt !== null),
    "Date and scheduling status must agree",
  );
export const budgetFields = z
  .object({
    title: text(140),
    category: text(80),
    pricingBasis: z.enum(["fixed", "per_guest", "per_unit"]),
    unitPriceMinor: moneySchema,
    quantity: z.number().int().min(0).max(100000).nullable().default(null),
    sourceKind: z
      .enum(["ai_estimate", "user_estimate", "vendor_quote"])
      .default("user_estimate"),
    sourceLabel: z.string().max(500).nullable().default(null),
    isLocked: z.boolean().default(false),
  })
  .strict()
  .refine(
    (v) =>
      v.pricingBasis === "per_unit" ? v.quantity !== null : v.quantity === null,
    "Only per-unit prices require a manual quantity",
  );
export const taskFields = z
  .object({
    title: text(200),
    description: z.string().max(4000).nullable().default(null),
    status: z.enum(["todo", "in_progress", "done", "blocked"]).default("todo"),
    dueAt: instant.nullable().default(null),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
    isLocked: z.boolean().default(false),
    dependencyIds: z.array(uuid).max(100).default([]),
  })
  .strict();
export const vendorFields = z
  .object({
    title: text(140),
    category: text(80),
    status: z
      .enum(["needed", "researching", "shortlisted", "confirmed", "not_needed"])
      .default("needed"),
    notes: z.string().max(4000).nullable().default(null),
    quoteSource: z.string().max(500).nullable().default(null),
    isLocked: z.boolean().default(false),
    estimatedCostMinor: moneySchema.nullable().default(null),
    dueAt: instant.nullable().default(null),
  })
  .strict();
export const changeSchema = z
  .object({
    newGuestCount: guestCount.optional(),
    priceChanges: z
      .array(
        z
          .object({ budgetItemId: uuid, newUnitPriceMinor: moneySchema })
          .strict(),
      )
      .max(12)
      .default([]),
    doNotExceedBudget: z.boolean().default(true),
    protectResourceIds: z.array(uuid).max(100).default([]),
  })
  .strict()
  .refine(
    (v) => v.newGuestCount !== undefined || v.priceChanges.length > 0,
    "Specify a guest count or price change",
  );
export type EventFields = z.infer<typeof eventFields>;
export type BudgetFields = z.infer<typeof budgetFields>;
export type TaskFields = z.infer<typeof taskFields>;
export type VendorFields = z.infer<typeof vendorFields>;
export type Change = z.infer<typeof changeSchema>;
export type EventRecord = EventFields & {
  id: string;
  workspaceId: string;
  version: number;
  createdAt: string;
};
export type BudgetItem = BudgetFields & {
  id: string;
  state: "active" | "archived";
};
export type Task = TaskFields & { id: string };
export type Vendor = VendorFields & { id: string };
export type EventSnapshot = {
  event: EventRecord;
  budgetItems: BudgetItem[];
  tasks: Task[];
  vendors: Vendor[];
  permissions?: {
    canManageData?: boolean;
    canEdit: boolean;
    canApprove: boolean;
    canViewContacts: boolean;
  };
};
export type Operation =
  | {
      id: string;
      kind: "set_event_guest_count";
      oldValue: number;
      newValue: number;
      mandatory: true;
    }
  | {
      id: string;
      kind: "set_budget_item_unit_price";
      budgetItemId: string;
      oldValue: string;
      newValue: string;
      mandatory: true;
    };
export type Proposal = {
  id: string;
  baseVersion: number;
  status: string;
  expiresAt: string;
  proposedChange: Change;
  operations: Operation[];
  effects: ReturnType<typeof import("./money").calculateBudget>;
  before: ReturnType<typeof import("./money").calculateBudget>;
  deltaMinor: string;
  warnings: { code: string; message: string }[];
  affectedTasks: string[];
  explanation: string;
};
