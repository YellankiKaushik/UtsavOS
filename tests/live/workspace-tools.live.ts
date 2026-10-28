import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/infrastructure/config";
it("LIVE workspace tools: owner dashboard, private export, actual original erasure and account request isolation", async () => {
  expect(process.env.LIVE_STAGING_CONFIRMED).toBe("true");
  const { url, key } = supabaseConfig();
  expect(new URL(url!).hostname).toBe("upbwahlegwcwiladfwwd.supabase.co");
  const client = () =>
      createClient(url!, key!, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    a = client(),
    b = client();
  for (const [db, suffix] of [
    [a, "A"],
    [b, "B"],
  ] as const)
    expect(
      (
        await db.auth.signInWithPassword({
          email: process.env[`LIVE_USER_${suffix}_EMAIL`]!,
          password: process.env[`LIVE_USER_${suffix}_PASSWORD`]!,
        })
      ).error?.code,
    ).toBeUndefined();
  const workspace = await a.rpc("create_personal_workspace");
  expect(workspace.error?.code).toBeUndefined();
  const title = `SYNTHETIC LIVE ERASURE ${Date.now()}`;
  const created = await a.rpc("event_command", {
    p_event_id: null,
    p_workspace_id: workspace.data,
    p_action: "create",
    p_payload: {
      type: "community",
      title,
      dateStatus: "tbd",
      startsAt: null,
      timeZone: "Asia/Kolkata",
      guestCount: 20,
      currency: "INR",
      budgetMinor: "1000000",
      status: "planning",
      preferences: "",
    },
    p_expected_version: null,
    p_idempotency_key: crypto.randomUUID(),
    p_request_id: "live-data",
  });
  expect(created.error?.code).toBeUndefined();
  const eid = created.data.id;
  let version = created.data.version;
  expect(
    (await a.rpc("workspace_dashboard", { p_workspace_id: workspace.data }))
      .data.limits.activeEvents,
  ).toBe(100);
  expect(
    (await b.rpc("workspace_dashboard", { p_workspace_id: workspace.data }))
      .error?.message,
  ).toBe("NOT_FOUND");
  const prepared = await a.rpc("document_command", {
    p_event_id: eid,
    p_action: "prepare",
    p_payload: {
      filename: "synthetic-erasure.txt",
      mediaType: "text/plain",
      byteSize: 4,
    },
    p_expected_version: version,
    p_idempotency_key: crypto.randomUUID(),
    p_request_id: "live-data",
  });
  expect(prepared.error?.code).toBeUndefined();
  version = prepared.data.version;
  const doc = await a
    .from("event_documents")
    .select("object_path")
    .eq("id", prepared.data.id)
    .single();
  expect(doc.error?.code).toBeUndefined();
  const path = doc.data!.object_path;
  expect(
    (
      await a.storage
        .from("utsavos-documents")
        .upload(path, new TextEncoder().encode("test"), {
          contentType: "text/plain",
          upsert: false,
        })
    ).error?.name,
  ).toBeUndefined();
  const exported = await a.rpc("event_export", { p_event_id: eid });
  expect(exported.error?.code).toBeUndefined();
  expect(exported.data.planning.event.title).toBe(title);
  expect(exported.data.guests).not.toHaveProperty("invitations");
  expect(
    (await b.rpc("event_export", { p_event_id: eid })).error?.message,
  ).toBe("NOT_FOUND");
  async function lifecycle(
    action: string,
    idem = crypto.randomUUID(),
    expected = version,
  ) {
    const r = await a.rpc("event_lifecycle_command", {
      p_event_id: eid,
      p_action: action,
      p_expected_version: expected,
      p_idempotency_key: idem,
      p_request_id: "live-data",
    });
    if (!r.error) version = r.data.eventVersion;
    return r;
  }
  const requested = await lifecycle("request_deletion");
  expect(requested.error?.code).toBeUndefined();
  expect(requested.data.state).toBe("pending_cleanup");
  expect((await lifecycle("erase")).error?.message).toBe("DOCUMENT_NOT_READY");
  expect(
    (await a.storage.from("utsavos-documents").remove([path])).error?.name,
  ).toBeUndefined();
  const eraseKey = crypto.randomUUID(),
    eraseVersion = version,
    erased = await lifecycle("erase", eraseKey);
  expect(erased.error?.code).toBeUndefined();
  expect(erased.data.state).toBe("erased");
  expect((await lifecycle("erase", eraseKey, eraseVersion)).data.replayed).toBe(
    true,
  );
  expect(
    (await a.storage.from("utsavos-documents").download(path)).error,
  ).toBeTruthy();
  expect(
    (await a.rpc("event_snapshot", { p_event_id: eid })).data.event.title,
  ).toBe("Deleted celebration");
  const requestedAccount = await a.rpc("account_data_request", {
    p_action: "request",
  });
  expect(requestedAccount.error?.code).toBeUndefined();
  expect(requestedAccount.data.completed).toBe(false);
  expect(
    (await b.rpc("account_data_request", { p_action: "status" })).data.id,
  ).not.toBe(requestedAccount.data.id);
  expect(
    (await a.rpc("account_data_request", { p_action: "cancel" })).data.state,
  ).toBe("cancelled");
  for (const db of [a, b])
    expect((await db.auth.signOut()).error?.code).toBeUndefined();
});
