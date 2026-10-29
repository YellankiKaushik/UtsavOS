import { z } from "zod";
import { uuid } from "./contracts.ts";

export const householdFields = z
  .object({
    name: z.string().trim().min(1).max(120),
    notes: z.string().max(500).default(""),
  })
  .strict();
export const guestFields = z
  .object({
    householdId: uuid,
    displayName: z.string().trim().min(1).max(120),
    email: z.email().max(254).nullable().default(null),
    phone: z
      .string()
      .regex(/^[+0-9 ()-]{3,32}$/)
      .nullable()
      .default(null),
    notes: z.string().max(500).default(""),
  })
  .strict();
const version = { expectedVersion: z.number().int().min(1) };
const id = uuid.nullable().default(null);
export const guestMutation = z.discriminatedUnion("action", [
  z
    .object({
      ...version,
      action: z.literal("household"),
      id,
      fields: householdFields,
    })
    .strict(),
  z
    .object({ ...version, action: z.literal("guest"), id, fields: guestFields })
    .strict(),
  z
    .object({
      ...version,
      action: z.enum(["archive_household", "archive_guest", "revoke_invite"]),
      id: uuid,
    })
    .strict(),
  z
    .object({
      ...version,
      action: z.literal("attendance"),
      guestId: uuid,
      functionId: uuid.nullable(),
      status: z.enum(["pending", "accepted", "declined", "uninvited"]),
    })
    .strict(),
  z
    .object({
      ...version,
      action: z.literal("invite"),
      householdId: uuid,
      guestIds: z.array(uuid).min(1).max(50),
      functionIds: z.array(uuid).max(10).default([]),
      includeEvent: z.boolean().default(true),
      expiresInHours: z.number().int().min(1).max(168).default(72),
    })
    .strict()
    .refine(
      (x) =>
        new Set(x.guestIds).size === x.guestIds.length &&
        new Set(x.functionIds).size === x.functionIds.length &&
        x.functionIds.length + Number(x.includeEvent) >= 1 &&
        x.functionIds.length + Number(x.includeEvent) <= 10,
      "Choose distinct guests and one to ten attendance scopes",
    ),
]);
export const rsvpRequest = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("read"),
      token: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
  z
    .object({
      action: z.literal("respond"),
      token: z.string().regex(/^[a-f0-9]{64}$/),
      answers: z
        .array(
          z
            .object({
              guestId: uuid,
              functionId: uuid.nullable(),
              status: z.enum(["accepted", "declined"]),
            })
            .strict(),
        )
        .min(1)
        .max(500),
    })
    .strict(),
]);
export type GuestDirectory = {
  eventVersion: number;
  households: { id: string; name: string; notes: string }[];
  guests: {
    id: string;
    householdId: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    notes: string;
  }[];
  attendance: {
    guestId: string;
    functionId: string | null;
    status: "pending" | "accepted" | "declined";
  }[];
  functions: { id: string; title: string }[];
  invitations: {
    id: string;
    householdId: string;
    expiresAt: string;
    revoked: boolean;
  }[];
};
export type RsvpView = {
  eventTitle: string;
  expiresAt: string;
  guests: { id: string; displayName: string }[];
  scopes: { id: string | null; title: string }[];
  answers: GuestDirectory["attendance"];
};
