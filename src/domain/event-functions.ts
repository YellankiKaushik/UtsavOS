import { z } from "zod";
import { instant, timeZone, uuid } from "./contracts.ts";
export const functionFields = z
  .object({
    title: z.string().trim().min(1).max(140),
    startsAt: instant.nullable(),
    endsAt: instant.nullable(),
    timeZone,
    status: z
      .enum(["planned", "active", "completed", "cancelled"])
      .default("planned"),
    notes: z.string().max(2000).default(""),
  })
  .strict()
  .refine(
    (v) =>
      v.endsAt === null ||
      (v.startsAt !== null && Date.parse(v.endsAt) >= Date.parse(v.startsAt)),
    "End must follow the start; undecided functions cannot have an end date",
  );
export const functionMutation = z
  .object({ expectedVersion: z.number().int().min(1), fields: functionFields })
  .strict();
export const functionLink = z
  .object({
    expectedVersion: z.number().int().min(1),
    kind: z.enum(["task", "budget", "vendor"]),
    resourceId: uuid,
    assigned: z.boolean(),
  })
  .strict();
export type EventFunction = z.infer<typeof functionFields> & {
  id: string;
  resources: { tasks: string[]; budgetItems: string[]; vendors: string[] };
};
export type FunctionList = { eventVersion: number; items: EventFunction[] };
