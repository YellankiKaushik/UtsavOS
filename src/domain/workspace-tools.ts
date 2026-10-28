import { z } from "zod";
export const lifecycleAction = z
  .object({
    action: z.enum(["request_deletion", "erase"]),
    expectedVersion: z.number().int().min(1),
    confirmed: z.literal(true),
  })
  .strict();
export type WorkspaceDashboard = {
  workspaceId: string;
  plan: string;
  validUntil: string | null;
  billingAvailable: false;
  limits: {
    activeEvents: number;
    aiAttemptsPerUtcDay: number;
    members: number;
    storageBytes: number;
  };
  usage: {
    activeEvents: number;
    aiAttemptsToday: number;
    members: number;
    storageBytes: number;
  };
  events: {
    id: string;
    title: string;
    status: string;
    timeZone: string;
    startsAt: string | null;
    incompleteTasks: number;
    overdueTasks: number;
  }[];
};
export type LifecycleStatus = {
  eventVersion: number;
  state: "none" | "pending_cleanup" | "retention_review" | "erased";
  requestedAt: string | null;
  completedAt: string | null;
  originalsPending: number;
  financialRecordsRetained: boolean;
};
// Spreadsheet software must not execute exported names/notes as formulas.
export function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return (
    '"' +
    (/^[\s]*[=+\-@\t\r]/.test(text) ? "'" : "") +
    text.replaceAll('"', '""') +
    '"'
  );
}
