import { beforeAll, afterAll, beforeEach, it, expect } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { database, actor, event, A, B } from "../helpers/database";
import { guestMutation, rsvpRequest } from "@/domain/guests";
let db: PGlite, eid: string, version: number, household: string, guest: string;
beforeAll(async () => {
  db = await database();
});
afterAll(async () => {
  await db?.close();
});
async function command(
  action: string,
  payload: unknown,
  expected = version,
  key = crypto.randomUUID(),
) {
  const r = (
    await db.query<{ r: { id: string; version: number; replayed?: boolean } }>(
      "select public.guest_command($1,$2,$3::jsonb,$4,$5,'synthetic-guests') r",
      [eid, action, JSON.stringify(payload), expected, key],
    )
  ).rows[0].r;
  version = r.version;
  return r;
}
async function directory() {
  return (
    await db.query<{ r: Record<string, unknown> }>(
      "select public.guest_directory($1) r",
      [eid],
    )
  ).rows[0].r;
}
async function invite(
  functionIds: string[] = [],
  includeEvent = true,
  guestIds = [guest],
) {
  const token = randomBytes(32).toString("hex");
  const r = await command("invite", {
    householdId: household,
    guestIds,
    functionIds,
    includeEvent,
    expiresInHours: 72,
    tokenHash: createHash("sha256").update(token).digest("hex"),
  });
  return { token, id: r.id };
}
async function read(token: string) {
  return (
    await db.query<{ r: Record<string, unknown> }>(
      "select public.rsvp_view($1) r",
      [token],
    )
  ).rows[0].r;
}
async function respond(
  token: string,
  answers: unknown,
  key = crypto.randomUUID(),
) {
  return (
    await db.query<{ r: { replayed?: boolean } }>(
      "select public.rsvp_respond($1,$2::jsonb,$3) r",
      [token, JSON.stringify(answers), key],
    )
  ).rows[0].r;
}
beforeEach(async () => {
  const e = await event(db);
  eid = e.id;
  version = e.version;
  household = (
    await command("household", {
      id: null,
      fields: { name: "Synthetic household", notes: "PRIVATE_HOUSEHOLD_NOTES" },
    })
  ).id;
  guest = (
    await command("guest", {
      id: null,
      fields: {
        householdId: household,
        displayName: "Synthetic guest",
        email: "private@example.test",
        phone: "+919876543210",
        notes: "PRIVATE_GUEST_NOTES",
      },
    })
  ).id;
});
it("persists household and contact corrections with version and receipt guards", async () => {
  const previous = version,
    key = crypto.randomUUID();
  const payload = {
    id: household,
    fields: { name: "Corrected household", notes: "" },
  };
  const saved = await command("household", payload, previous, key);
  expect((await command("household", payload, previous, key)).replayed).toBe(
    true,
  );
  await expect(
    command(
      "household",
      { ...payload, fields: { name: "Different" } },
      previous,
      key,
    ),
  ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
  await expect(
    command("archive_guest", { id: guest }, previous),
  ).rejects.toThrow("VERSION_CONFLICT");
  expect(saved.version).toBe(previous + 1);
  expect(JSON.stringify(await directory())).toContain("Corrected household");
});
it("denies other tenants, anonymous directory reads and direct owner table writes", async () => {
  await actor(db, B);
  expect(
    (await db.query("select * from public.guests where event_id=$1", [eid]))
      .rows,
  ).toHaveLength(0);
  await expect(directory()).rejects.toThrow("NOT_FOUND");
  await expect(command("archive_guest", { id: guest })).rejects.toThrow(
    "NOT_FOUND",
  );
  await actor(db, null, "anon");
  await expect(directory()).rejects.toThrow();
  await expect(
    db.query("select * from private.guest_invites"),
  ).rejects.toThrow();
  await actor(db, A);
  await expect(
    db.query("update public.guests set display_name='forbidden' where id=$1", [
      guest,
    ]),
  ).rejects.toThrow("permission denied");
});
it("returns only explicitly invited names and scopes, with no contact or token hashes", async () => {
  const other = (
    await command("guest", {
      id: null,
      fields: { householdId: household, displayName: "Uninvited person" },
    })
  ).id;
  const { token } = await invite();
  await actor(db, null, "anon");
  const view = await read(token),
    text = JSON.stringify(view);
  expect(text).toContain("Synthetic guest");
  for (const privateValue of [
    "PRIVATE_",
    "private@example.test",
    "+919876543210",
    "token_hash",
    other,
    token,
  ])
    expect(text).not.toContain(privateValue);
  expect((view.guests as unknown[]).length).toBe(1);
});
it("records real scoped replies without changing planned guest count and replays exactly once", async () => {
  const { token } = await invite(),
    key = crypto.randomUUID();
  const answers = [{ guestId: guest, functionId: null, status: "accepted" }];
  await actor(db, null, "anon");
  await respond(token, answers, key);
  expect((await respond(token, answers, key)).replayed).toBe(true);
  await expect(
    respond(token, [{ ...answers[0], status: "declined" }], key),
  ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
  await actor(db, A);
  const e = (
    await db.query<{ guest_count: number; version: number }>(
      "select guest_count,version from public.events where id=$1",
      [eid],
    )
  ).rows[0];
  expect(e.guest_count).toBe(150);
  expect(e.version).toBe(version + 1);
  expect(
    (
      await db.query(
        "select id from public.audit_events where event_id=$1 and action='guest_rsvp'",
        [eid],
      )
    ).rows,
  ).toHaveLength(1);
});
it("rejects out-of-scope answers atomically and rate-limits genuine response changes", async () => {
  const { token } = await invite();
  await actor(db, null, "anon");
  await expect(
    respond(token, [
      { guestId: guest, functionId: null, status: "accepted" },
      { guestId: B, functionId: null, status: "declined" },
    ]),
  ).rejects.toThrow("INVALID_SELECTION");
  expect(JSON.stringify((await read(token)).answers)).toContain("pending");
  for (let i = 0; i < 5; i++)
    await respond(token, [
      {
        guestId: guest,
        functionId: null,
        status: i % 2 ? "declined" : "accepted",
      },
    ]);
  await expect(
    respond(token, [{ guestId: guest, functionId: null, status: "declined" }]),
  ).rejects.toThrow("RATE_LIMITED");
});
it("supports function-only scope and rejects parent-event or foreign-function replies", async () => {
  const f = (
    await db.query<{ r: { id: string; version: number } }>(
      "select public.event_function_command($1,'put',$2::jsonb,$3,$4,'synthetic-function') r",
      [
        eid,
        JSON.stringify({
          fields: {
            title: "Synthetic ceremony",
            startsAt: null,
            endsAt: null,
            timeZone: "Asia/Kolkata",
            status: "planned",
            notes: "",
          },
        }),
        version,
        crypto.randomUUID(),
      ],
    )
  ).rows[0].r;
  version = f.version;
  const { token } = await invite([f.id], false);
  await actor(db, null, "anon");
  await expect(
    respond(token, [{ guestId: guest, functionId: null, status: "accepted" }]),
  ).rejects.toThrow("INVALID_SELECTION");
  await expect(
    respond(token, [{ guestId: guest, functionId: B, status: "accepted" }]),
  ).rejects.toThrow("INVALID_SELECTION");
  await respond(token, [
    { guestId: guest, functionId: f.id, status: "accepted" },
  ]);
  expect(JSON.stringify((await read(token)).answers)).toContain("accepted");
});
it("revokes invites on explicit revocation, guest archival and household moves", async () => {
  const first = await invite();
  await command("revoke_invite", { id: first.id });
  await expect(read(first.token)).rejects.toThrow("NOT_FOUND");
  const second = await invite();
  const h2 = (
    await command("household", { id: null, fields: { name: "New household" } })
  ).id;
  await command("guest", {
    id: guest,
    fields: { householdId: h2, displayName: "Moved guest" },
  });
  await expect(read(second.token)).rejects.toThrow("NOT_FOUND");
  await expect(command("archive_household", { id: h2 })).rejects.toThrow(
    "HOUSEHOLD_IN_USE",
  );
  await command("archive_guest", { id: guest });
  await command("archive_household", { id: h2 });
});
it("rejects expired capabilities and invalid or duplicated invitation scopes", async () => {
  const { token, id } = await invite();
  await db.exec("reset role");
  await db.query(
    "update private.guest_invites set expires_at=now()-interval '1 second' where id=$1",
    [id],
  );
  await actor(db, null, "anon");
  await expect(read(token)).rejects.toThrow("NOT_FOUND");
  await actor(db, A);
  await expect(invite([], true, [guest, guest])).rejects.toThrow(
    "INVALID_INPUT",
  );
  await expect(invite([B])).rejects.toThrow("NOT_FOUND");
  await expect(invite([], true, [B])).rejects.toThrow("NOT_FOUND");
});
it("validates strict HTTP contracts and refuses non-attendance RSVP fields", () => {
  expect(
    guestMutation.safeParse({
      action: "invite",
      expectedVersion: 1,
      householdId: household,
      guestIds: [guest],
      functionIds: [],
      includeEvent: false,
    }).success,
  ).toBe(false);
  expect(
    rsvpRequest.safeParse({
      action: "respond",
      token: "a".repeat(64),
      answers: [
        {
          guestId: guest,
          functionId: null,
          status: "accepted",
          guestCount: 999,
        },
      ],
    }).success,
  ).toBe(false);
});
