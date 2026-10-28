import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/infrastructure/config";
it("LIVE documents: genuine private Storage, immutable originals, tenant denial and confirmed cleanup", async () => {
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
  const created = await a.rpc("event_command", {
    p_event_id: null,
    p_workspace_id: workspace.data,
    p_action: "create",
    p_payload: {
      type: "community",
      title: "SYNTHETIC LIVE PRIVATE DOCUMENT",
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
    p_request_id: "live-documents",
  });
  expect(created.error?.code).toBeUndefined();
  const eid = created.data.id;
  let version = created.data.version;
  async function command(action: string, payload: unknown) {
    const r = await a.rpc("document_command", {
      p_event_id: eid,
      p_action: action,
      p_payload: payload,
      p_expected_version: version,
      p_idempotency_key: crypto.randomUUID(),
      p_request_id: "live-documents",
    });
    expect(r.error?.code).toBeUndefined();
    version = r.data.version;
    return r.data.id as string;
  }
  const bytes = new TextEncoder().encode(
    "Synthetic supplier\nQuotation Q-001\nINR 1000.00",
  );
  const did = await command("prepare", {
    filename: "synthetic-private-quote.txt",
    mediaType: "text/plain",
    byteSize: bytes.length,
  });
  const metadata = await a
    .from("event_documents")
    .select("object_path")
    .eq("id", did)
    .single();
  expect(metadata.error?.code).toBeUndefined();
  const path = metadata.data!.object_path;
  const upload = await a.storage.from("utsavos-documents").upload(path, bytes, {
    contentType: "text/plain",
    cacheControl: "0",
    upsert: false,
  });
  expect(upload.error?.name).toBeUndefined();
  await command("finish", { documentId: did });
  const downloaded = await a.storage.from("utsavos-documents").download(path);
  expect(downloaded.error?.name).toBeUndefined();
  expect(await downloaded.data!.text()).toBe(new TextDecoder().decode(bytes));
  expect(
    (
      await a.storage
        .from("utsavos-documents")
        .upload(path, bytes, { contentType: "text/plain", upsert: true })
    ).error,
  ).toBeTruthy();
  expect(
    (await b.storage.from("utsavos-documents").download(path)).error,
  ).toBeTruthy();
  expect(
    (await b.rpc("document_detail", { p_event_id: eid, p_document_id: did }))
      .error?.message,
  ).toBe("NOT_FOUND");
  expect(
    (await b.from("event_documents").select("id").eq("id", did)).data,
  ).toEqual([]);
  const publicResponse = await fetch(
    a.storage.from("utsavos-documents").getPublicUrl(path).data.publicUrl,
  );
  expect(publicResponse.status).toBeGreaterThanOrEqual(400);
  await command("save_text", {
    documentId: did,
    pages: [{ page: 1, text: new TextDecoder().decode(bytes) }],
    sourceKind: "plain_text",
  });
  expect(
    (await a.rpc("document_detail", { p_event_id: eid, p_document_id: did }))
      .data.pages,
  ).toHaveLength(1);
  await command("archive", { documentId: did });
  expect(
    (await a.storage.from("utsavos-documents").remove([path])).error?.name,
  ).toBeUndefined();
  await command("confirm_cleanup", { documentId: did });
  expect(
    (await a.storage.from("utsavos-documents").download(path)).error,
  ).toBeTruthy();
  expect(
    (
      await a
        .from("event_documents")
        .select("original_cleanup")
        .eq("id", did)
        .single()
    ).data?.original_cleanup,
  ).toBe("removed");
  for (const db of [a, b])
    expect((await db.auth.signOut()).error?.code).toBeUndefined();
});
