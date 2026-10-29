import { beforeAll, afterAll, beforeEach, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { database, actor, event, B } from "../helpers/database";
import {
  quotationExtraction,
  validateQuotationSources,
  prepareDocument,
  type DocumentPage,
} from "@/domain/documents";
let db: PGlite,
  eid: string,
  version: number,
  did: string,
  path: string,
  workspace: string;
beforeAll(async () => {
  db = await database({ storage: true });
});
afterAll(async () => {
  await db?.close();
});
async function command(
  action: string,
  p: unknown,
  expected = version,
  key = crypto.randomUUID(),
) {
  const r = (
    await db.query<{ r: { id: string; version: number; replayed?: boolean } }>(
      "select public.document_command($1,$2,$3::jsonb,$4,$5,'synthetic-documents') r",
      [eid, action, JSON.stringify(p), expected, key],
    )
  ).rows[0].r;
  version = r.version;
  return r;
}
async function upload() {
  await db.query(
    "insert into storage.objects(bucket_id,name,metadata) values('utsavos-documents',$1,$2::jsonb)",
    [path, JSON.stringify({ size: 64, mimetype: "text/plain" })],
  );
  await command("finish", { documentId: did });
}
async function detail() {
  return (
    await db.query<{
      r: {
        pages: DocumentPage[];
        extractions: { id: string; state: string }[];
      };
    }>("select public.document_detail($1,$2) r", [eid, did])
  ).rows[0].r;
}
const pages = [
  { page: 1, text: "🎉 Synthetic supplier\nQ-001\n₹ 10,000.00\n2026-12-31" },
];
function extracted() {
  const field = (value: string, quote = value) => {
    const start = pages[0].text.indexOf(quote);
    const cpStart = Array.from(pages[0].text.slice(0, start)).length;
    return {
      value,
      source: {
        page: 1,
        start: cpStart,
        end: cpStart + Array.from(quote).length,
        quote,
      },
      confidence: 0.9,
    };
  };
  return quotationExtraction.parse({
    schemaVersion: 1,
    currency: "INR",
    fields: {
      supplierName: field("Synthetic supplier"),
      reference: field("Q-001"),
      totalMinor: field("1000000", "₹ 10,000.00"),
      expiresOn: field("2026-12-31"),
    },
    warnings: [],
  });
}
beforeEach(async () => {
  const e = await event(db);
  eid = e.id;
  version = e.version;
  workspace = e.workspace;
  did = (
    await command("prepare", {
      filename: "synthetic-quote.txt",
      mediaType: "text/plain",
      byteSize: 64,
    })
  ).id;
  path = (
    await db.query<{ object_path: string }>(
      "select object_path from public.event_documents where id=$1",
      [did],
    )
  ).rows[0].object_path;
});
it("reserves private paths, requires matching uploaded metadata and denies replacement", async () => {
  expect(path).toBe(`${workspace}/${eid}/${did}/original.txt`);
  await expect(command("finish", { documentId: did })).rejects.toThrow(
    "DOCUMENT_NOT_READY",
  );
  await upload();
  expect(
    (await db.query("select name from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query(
        "update storage.objects set metadata='{}' where name=$1 returning id",
        [path],
      )
    ).rows,
  ).toEqual([]);
  expect(
    (
      await db.query("delete from storage.objects where name=$1 returning id", [
        path,
      ])
    ).rows,
  ).toEqual([]);
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name,metadata) values('utsavos-documents',$1,'{}')",
      [path + "-foreign"],
    ),
  ).rejects.toThrow("row-level security");
});
it("keeps originals, text and extraction details away from foreign and anonymous sessions", async () => {
  await upload();
  await command("save_text", {
    documentId: did,
    pages,
    sourceKind: "plain_text",
  });
  await actor(db, B);
  await expect(detail()).rejects.toThrow("NOT_FOUND");
  expect(
    (await db.query("select * from public.event_documents where id=$1", [did]))
      .rows,
  ).toEqual([]);
  expect(
    (await db.query("select * from storage.objects where name=$1", [path]))
      .rows,
  ).toEqual([]);
  await expect(db.exec("select * from private.document_texts")).rejects.toThrow(
    "permission denied",
  );
  await actor(db, null, "anon");
  await expect(detail()).rejects.toThrow("permission denied");
  expect((await db.exec("select * from storage.objects"))[0].rows).toEqual([]);
});
it("validates Unicode source spans and freezes source once extraction is recorded", async () => {
  await upload();
  await command("save_text", {
    documentId: did,
    pages,
    sourceKind: "plain_text",
  });
  const payload = validateQuotationSources(extracted(), pages);
  const result = await command("save_extraction", {
    documentId: did,
    payload,
    provenance: { provider: "synthetic_test" },
  });
  expect((await detail()).extractions[0].id).toBe(result.id);
  await command("reject_extraction", {
    documentId: did,
    extractionId: result.id,
  });
  await expect(
    command("save_text", {
      documentId: did,
      pages: [{ page: 1, text: "replacement" }],
      sourceKind: "manual_transcript",
    }),
  ).rejects.toThrow("PROTECTED_RESOURCE");
  const bad = structuredClone(payload);
  bad.fields.totalMinor.source!.start++;
  await expect(
    command("save_extraction", {
      documentId: did,
      payload: bad,
      provenance: {},
    }),
  ).rejects.toThrow("INVALID_SOURCE_SPAN");
  expect(() => validateQuotationSources(bad, pages)).toThrow("source text");
  const wrongAmount = structuredClone(payload);
  wrongAmount.fields.totalMinor.value = "1";
  expect(() => validateQuotationSources(wrongAmount, pages)).toThrow(
    "INR amount",
  );
});
it("requires explicit manual review before creating one source-linked quotation", async () => {
  await upload();
  await command("save_text", {
    documentId: did,
    pages,
    sourceKind: "plain_text",
  });
  const extraction = await command("save_extraction", {
    documentId: did,
    payload: extracted(),
    provenance: { provider: "synthetic_test" },
  });
  expect(
    (
      await db.query("select id from public.vendor_quotes where event_id=$1", [
        eid,
      ])
    ).rows,
  ).toEqual([]);
  const vendor = (
    await db.query<{ r: { id: string; version: number } }>(
      "select public.event_command($1,$2,'put_vendor',$3::jsonb,$4,$5,'doc-vendor') r",
      [
        eid,
        workspace,
        JSON.stringify({
          fields: {
            title: "Synthetic supplier requirement",
            category: "other",
            status: "needed",
            notes: "",
            quoteSource: null,
            isLocked: false,
            estimatedCostMinor: null,
            dueAt: null,
          },
        }),
        version,
        crypto.randomUUID(),
      ],
    )
  ).rows[0].r;
  version = vendor.version;
  const fields = {
    vendorRequirementId: vendor.id,
    supplierName: "Manually confirmed supplier",
    reference: "Q-001",
    totalMinor: "1000000",
    expiresOn: "2026-12-31",
    notes: "Reviewed original",
  };
  await expect(
    command("record_quote", {
      documentId: did,
      extractionId: extraction.id,
      fields,
      confirmed: false,
    }),
  ).rejects.toThrow("INVALID_INPUT");
  const before = version,
    key = crypto.randomUUID(),
    p = {
      documentId: did,
      extractionId: extraction.id,
      fields,
      confirmed: true,
    };
  const accepted = await command("record_quote", p, before, key);
  expect(accepted.version).toBe(before + 1);
  expect((await command("record_quote", p, before, key)).replayed).toBe(true);
  expect(
    (
      await db.query<{ source_document_id: string }>(
        "select source_document_id from public.vendor_quotes where id=$1",
        [accepted.id],
      )
    ).rows[0].source_document_id,
  ).toBe(did);
  expect((await detail()).extractions[0].state).toBe("accepted");
  const committed = (
    await db.query<{ r: { version: number } }>(
      "select public.vendor_finance_command($1,'commit',$2::jsonb,$3,$4,'doc-commitment') r",
      [
        eid,
        JSON.stringify({
          quoteId: accepted.id,
          depositDueMinor: "0",
          confirmed: true,
        }),
        version,
        crypto.randomUUID(),
      ],
    )
  ).rows[0].r;
  version = committed.version;
  await expect(command("archive", { documentId: did })).rejects.toThrow(
    "RETENTION_REVIEW_REQUIRED",
  );
});
it("archives an uncommitted original through explicit storage delete authorization", async () => {
  await upload();
  await command("archive", { documentId: did });
  expect(
    (
      await db.query("delete from storage.objects where name=$1 returning id", [
        path,
      ])
    ).rows,
  ).toHaveLength(1);
  await expect(detail()).rejects.toThrow("NOT_FOUND");
  await command("confirm_cleanup", { documentId: did });
  expect(
    (
      await db.query<{ original_cleanup: string }>(
        "select original_cleanup from public.event_documents where id=$1",
        [did],
      )
    ).rows[0].original_cleanup,
  ).toBe("removed");
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name,metadata) values('utsavos-documents',$1,'{}')",
      [path],
    ),
  ).rejects.toThrow("row-level security");
});
it("rejects file path tricks, unsupported types, oversized files and numeric source inventions", () => {
  expect(
    prepareDocument.safeParse({
      action: "prepare",
      expectedVersion: 1,
      filename: "../secret.pdf",
      mediaType: "application/pdf",
      byteSize: 100,
    }).success,
  ).toBe(false);
  expect(
    prepareDocument.safeParse({
      action: "prepare",
      expectedVersion: 1,
      filename: "safe.exe",
      mediaType: "application/pdf",
      byteSize: 100,
    }).success,
  ).toBe(false);
  expect(
    prepareDocument.safeParse({
      action: "prepare",
      expectedVersion: 1,
      filename: "safe.pdf",
      mediaType: "application/pdf",
      byteSize: 2097153,
    }).success,
  ).toBe(false);
  const value = extracted();
  value.fields.totalMinor.value = "9999999999999";
  expect(() => validateQuotationSources(value, pages)).toThrow();
});
