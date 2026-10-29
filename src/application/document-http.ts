import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/errors";
import { uuid } from "@/domain/contracts";
import {
  documentAction,
  documentPages,
  prepareDocument,
  quotationExtraction,
  validateQuotationSources,
  type DocumentDetail,
  quotationSourceSpans,
} from "@/domain/documents";
import {
  extractDocumentText,
  readDocumentBody,
  validateDocumentBytes,
} from "@/infrastructure/documents/files";
import { aiConfig } from "@/infrastructure/config";
import {
  generateStructured,
  generationMetadata,
  failureMetadata,
  failureUsage,
} from "@/infrastructure/ai/service";
import { key, readBody } from "./http";
import { command, databaseError, snapshot } from "./repository";
const bucket = "utsavos-documents";
async function record(
  db: SupabaseClient,
  eid: string,
  action: string,
  payload: unknown,
  version: number,
  idem: string,
  requestId: string,
) {
  const result = await db.rpc("document_command", {
    p_event_id: eid,
    p_action: action,
    p_payload: payload,
    p_expected_version: version,
    p_idempotency_key: idem,
    p_request_id: requestId,
  });
  if (result.error) databaseError(result.error);
  return result.data;
}
async function detail(db: SupabaseClient, eid: string, did: string) {
  const r = await db.rpc("document_detail", {
    p_event_id: eid,
    p_document_id: did,
  });
  if (r.error) databaseError(r.error);
  return r.data as DocumentDetail;
}
async function original(db: SupabaseClient, eid: string, did: string) {
  const r = await db
    .from("event_documents")
    .select(
      "id,object_path,state,filename,media_type,byte_size,original_cleanup",
    )
    .eq("event_id", eid)
    .eq("id", did)
    .maybeSingle();
  if (r.error) databaseError(r.error);
  if (!r.data) throw new DomainError("NOT_FOUND", "Document unavailable", 404);
  return r.data;
}
async function download(
  db: SupabaseClient,
  document: Awaited<ReturnType<typeof original>>,
) {
  if (document.state !== "ready")
    throw new DomainError(
      "DOCUMENT_NOT_READY",
      "This file is not ready to download.",
      422,
    );
  const r = await db.storage.from(bucket).download(document.object_path);
  if (r.error || !r.data || r.data.size !== document.byte_size)
    throw new DomainError(
      "DOCUMENT_UNAVAILABLE",
      "The private original could not be read.",
      503,
    );
  const bytes = new Uint8Array(await r.data.arrayBuffer());
  validateDocumentBytes(bytes, document.media_type);
  return bytes;
}
async function cleanupOriginal(
  db: SupabaseClient,
  eid: string,
  did: string,
  version: number,
  idem: string,
  requestId: string,
) {
  const document = await original(db, eid, did);
  if (!["archived", "quarantined"].includes(document.state))
    throw new DomainError(
      "DOCUMENT_NOT_READY",
      "Archive the original before cleanup.",
      422,
    );
  if (document.original_cleanup === "removed")
    return {
      id: did,
      version,
      originalCleanup: "removed",
      note: "The original object has already been removed.",
    };
  const removed = await db.storage.from(bucket).remove([document.object_path]);
  if (!removed.error) {
    try {
      const confirmed = await record(
        db,
        eid,
        "confirm_cleanup",
        { documentId: did },
        version,
        idem,
        requestId,
      );
      return {
        ...confirmed,
        originalCleanup: "removed",
        note: "Original object removed; retained planning/audit records follow the retention review policy.",
      };
    } catch {
      /* Retry remains visible until absence is confirmed in PostgreSQL. */
    }
  }
  return {
    id: did,
    version,
    originalCleanup: "pending",
    note: "Archive saved. Original cleanup is pending; use Retry original cleanup.",
  };
}
export async function documentRoute(
  request: Request,
  db: SupabaseClient,
  eid: string,
  segments: string[],
  requestId: string,
) {
  if (process.env.FEATURE_DOCUMENTS !== "true")
    throw new DomainError("NOT_FOUND", "Module not enabled", 404);
  if (!segments.length) {
    if (request.method === "GET") {
      const result = await db
        .from("event_documents")
        .select(
          "id,filename,media_type,byte_size,state,created_at,original_cleanup",
        )
        .eq("event_id", eid)
        .or("state.neq.archived,original_cleanup.eq.pending")
        .order("created_at", { ascending: false })
        .limit(100);
      if (result.error) databaseError(result.error);
      // The detail permission guard also covers an empty document list.
      const permissions = await db.rpc("event_permissions", {
        p_event_id: eid,
      });
      if (permissions.error) databaseError(permissions.error);
      if (!permissions.data.canViewContacts)
        throw new DomainError("NOT_FOUND", "Document unavailable", 404);
      const state = await snapshot(db, eid);
      return {
        eventVersion: state.event.version,
        items: result.data,
        extractionAvailable:
          process.env.FEATURE_DOCUMENT_EXTRACTION === "true" &&
          aiConfig().enabled,
      };
    }
    if (request.method !== "POST")
      throw new DomainError("NOT_FOUND", "Route not found", 404);
    const { action, expectedVersion, ...payload } = prepareDocument.parse(
      await readBody(request),
    );
    return record(
      db,
      eid,
      action,
      payload,
      expectedVersion,
      key(request),
      requestId,
    );
  }
  const did = uuid.parse(segments[0]);
  if (
    segments.length === 2 &&
    segments[1] === "upload" &&
    request.method === "POST"
  ) {
    const document = await original(db, eid, did);
    if (!["pending_upload", "ready"].includes(document.state))
      throw new DomainError(
        "DOCUMENT_NOT_READY",
        "This upload is unavailable.",
        422,
      );
    const version = z.coerce
        .number()
        .int()
        .min(1)
        .parse(request.headers.get("X-Event-Version")),
      idem = key(request);
    if (request.headers.get("content-type") !== document.media_type)
      throw new DomainError(
        "DOCUMENT_TYPE_MISMATCH",
        "The upload type changed. Prepare a new document.",
        422,
      );
    const bytes = await readDocumentBody(request);
    if (bytes.length !== document.byte_size)
      throw new DomainError(
        "DOCUMENT_TYPE_MISMATCH",
        "The file size changed. Prepare a new document.",
        422,
      );
    validateDocumentBytes(bytes, document.media_type);
    if (document.state === "ready") {
      if (!Buffer.from(await download(db, document)).equals(bytes))
        throw new DomainError(
          "PROTECTED_RESOURCE",
          "Originals cannot be overwritten.",
          422,
        );
      return {
        id: did,
        version: (await snapshot(db, eid)).event.version,
        alreadyUploaded: true,
      };
    }
    const upload = await db.storage
      .from(bucket)
      .upload(document.object_path, bytes, {
        contentType: document.media_type,
        cacheControl: "0",
        upsert: false,
      });
    if (upload.error) {
      // A network-ambiguous retry is safe only when the immutable stored bytes match.
      const existing = await db.storage
        .from(bucket)
        .download(document.object_path);
      if (
        existing.error ||
        !existing.data ||
        !Buffer.from(await existing.data.arrayBuffer()).equals(bytes)
      )
        throw new DomainError(
          "DOCUMENT_UPLOAD_FAILED",
          "The private upload was not confirmed. Retry the same file.",
          503,
        );
    }
    return record(
      db,
      eid,
      "finish",
      { documentId: did },
      version,
      idem,
      requestId,
    );
  }
  if (
    segments.length === 2 &&
    segments[1] === "download" &&
    request.method === "GET"
  ) {
    const document = await original(db, eid, did),
      bytes = await download(db, document);
    const extension = {
      "application/pdf": "pdf",
      "image/png": "png",
      "image/jpeg": "jpg",
      "text/plain": "txt",
    }[document.media_type as "application/pdf"];
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="document.${extension}"; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  }
  if (segments.length !== 1)
    throw new DomainError("NOT_FOUND", "Route not found", 404);
  if (request.method === "GET") return detail(db, eid, did);
  if (request.method !== "POST")
    throw new DomainError("NOT_FOUND", "Route not found", 404);
  const input = documentAction.parse(await readBody(request)),
    idem = key(request),
    { action, expectedVersion } = input;
  if (action === "extract_text" || action === "manual_text") {
    const document = await original(db, eid, did);
    if (document.state !== "ready")
      throw new DomainError(
        "DOCUMENT_NOT_READY",
        "Upload and verify the original first.",
        422,
      );
    const pages =
      action === "manual_text"
        ? documentPages.parse([{ page: 1, text: input.text.normalize("NFC") }])
        : await extractDocumentText(
            await download(db, document),
            document.media_type,
          );
    return record(
      db,
      eid,
      "save_text",
      {
        documentId: did,
        pages,
        sourceKind:
          action === "manual_text"
            ? "manual_transcript"
            : document.media_type === "application/pdf"
              ? "pdf_text"
              : "plain_text",
      },
      expectedVersion,
      idem,
      requestId,
    );
  }
  if (action === "suggest") {
    if (
      process.env.FEATURE_DOCUMENT_EXTRACTION !== "true" ||
      !aiConfig().enabled
    )
      throw new DomainError(
        "AI_UNAVAILABLE",
        "AI extraction is unavailable. Review the source and enter the quotation manually.",
        503,
      );
    const source = await detail(db, eid, did);
    if (!source.pages.some((p) => p.text.trim()))
      throw new DomainError(
        "MANUAL_TRANSCRIPT_REQUIRED",
        "Extract or review the source text first.",
        422,
      );
    const reservation = await command(db, {
      eventId: eid,
      action: "reserve_ai",
      payload: {
        modelId: aiConfig().models[aiConfig().primary],
        operation: "plan",
      },
      expectedVersion,
      key: idem,
      requestId,
    });
    let usage: Awaited<ReturnType<typeof generateStructured>> | undefined;
    try {
      const result = await generateStructured(
        quotationExtraction,
        {
          pages: source.pages,
          sourceSpans: quotationSourceSpans(source.pages),
        },
        { purpose: "quotation", noFallback: true, signal: request.signal },
      );
      usage = result;
      validateQuotationSources(result.payload, source.pages);
      const saved = await record(
        db,
        eid,
        "save_extraction",
        {
          documentId: did,
          payload: result.payload,
          provenance: generationMetadata(result),
        },
        expectedVersion,
        idem,
        requestId,
      );
      await command(db, {
        eventId: eid,
        action: "complete_ai",
        payload: {
          usageId: reservation.id,
          status: "success",
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          provenance: generationMetadata(result),
        },
        key: crypto.randomUUID(),
        requestId,
      });
      return saved;
    } catch (error) {
      await command(db, {
        eventId: eid,
        action: "complete_ai",
        payload: {
          usageId: reservation.id,
          status: "failed",
          ...(usage
            ? {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
              }
            : { ...failureUsage(error) }),
          provenance: usage
            ? { ...generationMetadata(usage), errorCode: "INVALID_SOURCE_SPAN" }
            : failureMetadata(error),
        },
        key: crypto.randomUUID(),
        requestId,
      }).catch(() => {});
      throw error;
    }
  }
  if (action === "cleanup_original")
    return cleanupOriginal(db, eid, did, expectedVersion, idem, requestId);
  const {
    expectedVersion: ignoredVersion,
    action: ignoredAction,
    ...payload
  } = input;
  void ignoredVersion;
  void ignoredAction;
  const result = await record(
    db,
    eid,
    action,
    { documentId: did, ...payload },
    expectedVersion,
    idem,
    requestId,
  );
  if (action === "archive") {
    return cleanupOriginal(db, eid, did, result.version, idem, requestId);
  }
  return result;
}
