import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { supabaseConfig } from "@/infrastructure/config";

it("LIVE guests: session refresh, event functions, private contacts and anonymous scoped RSVP", async () => {
  expect(process.env.LIVE_STAGING_CONFIRMED).toBe("true");
  const { url, key } = supabaseConfig();
  expect(new URL(url!).hostname).toBe("upbwahlegwcwiladfwwd.supabase.co");
  const client = () =>
    createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  const a = client(),
    b = client(),
    anonymous = client();
  for (const [db, suffix] of [
    [a, "A"],
    [b, "B"],
  ] as const) {
    const { error } = await db.auth.signInWithPassword({
      email: process.env[`LIVE_USER_${suffix}_EMAIL`]!,
      password: process.env[`LIVE_USER_${suffix}_PASSWORD`]!,
    });
    expect(error?.code).toBeUndefined();
  }
  expect((await a.auth.refreshSession()).error?.code).toBeUndefined();
  expect((await a.auth.getUser()).data.user?.id).toBeTruthy();
  const workspace = await a.rpc("create_personal_workspace");
  expect(workspace.error?.code).toBeUndefined();
  const created = await a.rpc("event_command", {
    p_event_id: null,
    p_workspace_id: workspace.data,
    p_action: "create",
    p_payload: {
      type: "birthday",
      title: "SYNTHETIC LIVE GUEST VERIFICATION",
      dateStatus: "tbd",
      startsAt: null,
      timeZone: "Asia/Kolkata",
      guestCount: 20,
      currency: "INR",
      budgetMinor: "1000000",
      preferences: "",
      status: "planning",
    },
    p_expected_version: null,
    p_idempotency_key: crypto.randomUUID(),
    p_request_id: "live-guests",
  });
  expect(created.error?.message).toBeUndefined();
  const eid = created.data.id;
  let version = created.data.version;
  const fn = await a.rpc("event_function_command", {
    p_event_id: eid,
    p_action: "put",
    p_payload: {
      fields: {
        title: "Reception",
        startsAt: null,
        endsAt: null,
        timeZone: "Asia/Kolkata",
        status: "planned",
        notes: "",
      },
    },
    p_expected_version: version,
    p_idempotency_key: crypto.randomUUID(),
    p_request_id: "live-guests",
  });
  expect(fn.error?.message).toBeUndefined();
  version = fn.data.version;
  async function command(action: string, payload: unknown) {
    const result = await a.rpc("guest_command", {
      p_event_id: eid,
      p_action: action,
      p_payload: payload,
      p_expected_version: version,
      p_idempotency_key: crypto.randomUUID(),
      p_request_id: "live-guests",
    });
    expect(result.error?.message).toBeUndefined();
    version = result.data.version;
    return result.data.id as string;
  }
  const household = await command("household", {
    fields: { name: "Synthetic household", notes: "PRIVATE_CONTACT_MARKER" },
  });
  const guest = await command("guest", {
    fields: {
      householdId: household,
      displayName: "Synthetic invitee",
      email: "synthetic@example.test",
      phone: null,
      notes: "PRIVATE_CONTACT_MARKER",
    },
  });
  const token = randomBytes(32).toString("hex");
  const invite = await command("invite", {
    householdId: household,
    guestIds: [guest],
    functionIds: [fn.data.id],
    includeEvent: false,
    expiresInHours: 1,
    tokenHash: createHash("sha256").update(token).digest("hex"),
  });
  const directory = await a.rpc("guest_directory", { p_event_id: eid });
  expect(directory.data.guests).toHaveLength(1);
  expect(JSON.stringify(directory.data)).not.toContain(token);
  expect(
    (await b.rpc("guest_directory", { p_event_id: eid })).error?.message,
  ).toBe("NOT_FOUND");
  expect(
    (await b.from("guests").select("id").eq("event_id", eid)).data,
  ).toEqual([]);
  expect((await anonymous.from("guests").select("id")).error).toBeTruthy();
  expect(
    (await a.from("guests").update({ display_name: "bypass" }).eq("id", guest))
      .error,
  ).toBeTruthy();
  const view = await anonymous.rpc("rsvp_view", { p_token: token });
  expect(view.error?.message).toBeUndefined();
  expect(view.data.scopes).toEqual([{ id: fn.data.id, title: "Reception" }]);
  expect(JSON.stringify(view.data)).not.toMatch(
    /PRIVATE_CONTACT_MARKER|synthetic@example|token_hash|budget/i,
  );
  const keyId = crypto.randomUUID();
  const response = {
    p_token: token,
    p_answers: [{ guestId: guest, functionId: fn.data.id, status: "accepted" }],
    p_idempotency_key: keyId,
  };
  expect(
    (await anonymous.rpc("rsvp_respond", response)).error?.message,
  ).toBeUndefined();
  expect((await anonymous.rpc("rsvp_respond", response)).data.replayed).toBe(
    true,
  );
  const snapshot = await a.rpc("event_snapshot", { p_event_id: eid });
  expect(snapshot.data.event.guestCount).toBe(20);
  expect(snapshot.data.event.version).toBe(version + 1);
  version = snapshot.data.event.version;
  await command("revoke_invite", { id: invite });
  expect(
    (await anonymous.rpc("rsvp_view", { p_token: token })).error?.message,
  ).toBe("NOT_FOUND");
  for (const db of [a, b])
    expect((await db.auth.signOut()).error?.code).toBeUndefined();
});
