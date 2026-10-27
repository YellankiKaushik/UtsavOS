import { z } from "zod";
import { uuid } from "./contracts.ts";
export const teamRole = z.enum([
  "planner_manager",
  "planner_member",
  "client_viewer",
]);
const version = { workspaceId: uuid, expectedVersion: z.number().int().min(1) };
export const teamMutation = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      name: z.string().trim().min(1).max(120),
    })
    .strict(),
  z
    .object({
      action: z.literal("invite"),
      ...version,
      email: z
        .email()
        .max(254)
        .transform((x) => x.toLowerCase()),
      role: teamRole,
    })
    .strict(),
  z
    .object({
      action: z.literal("accept"),
      token: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
  z
    .object({ action: z.literal("revoke_invite"), ...version, id: uuid })
    .strict(),
  z
    .object({
      action: z.literal("member"),
      ...version,
      userId: uuid,
      role: teamRole,
      state: z.enum(["active", "revoked"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("assign"),
      ...version,
      eventId: uuid,
      userId: uuid,
      assigned: z.boolean(),
      canEdit: z.boolean(),
      canApprove: z.boolean(),
      canViewContacts: z.boolean(),
    })
    .strict(),
]);
export type TeamWorkspace = {
  id: string;
  name: string;
  kind: string;
  version: number;
  role: "owner" | z.infer<typeof teamRole>;
  members: {
    userId: string;
    role: z.infer<typeof teamRole> | "owner";
    state: "active" | "revoked";
  }[];
  invitations: {
    id: string;
    email: string;
    role: string;
    expiresAt: string;
    revoked: boolean;
    accepted: boolean;
  }[];
  events: {
    id: string;
    title: string;
    type: string;
    startsAt: string | null;
    timeZone: string;
    canOpen: boolean;
    canEdit: boolean;
    canApprove: boolean;
    canViewContacts: boolean;
  }[];
  assignments: {
    eventId: string;
    userId: string;
    canEdit: boolean;
    canApprove: boolean;
    canViewContacts: boolean;
  }[];
};
