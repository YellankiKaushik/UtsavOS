"use client";
import { useRef, useState } from "react";
import type { EventSnapshot } from "@/domain/contracts";
import {
  MAX_DOCUMENT_BYTES,
  prepareDocument,
  type EventDocument,
  type DocumentDetail,
} from "@/domain/documents";
import { quoteFields } from "@/domain/vendor-finance";
import { minorToRupees, rupeesToMinor } from "@/domain/money";
import { ErrorNotice, Field, Loading, useMutation, useResource } from "./ui";
export function DocumentsPage({
  state,
  reload,
}: {
  state: EventSnapshot;
  reload: () => Promise<void>;
}) {
  const path = `events/${state.event.id}/documents`,
    resource = useResource<{
      eventVersion: number;
      items: EventDocument[];
      extractionAvailable: boolean;
    }>(path),
    mutation = useMutation();
  const [selected, setSelected] = useState(""),
    [notice, setNotice] = useState(""),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const pending = useRef<{
      signature: string;
      id: string;
      version: number;
      key: string;
    } | null>(null),
    controller = useRef<AbortController | null>(null);
  async function refresh() {
    await Promise.all([resource.reload(), reload()]);
  }
  async function cleanup(documentId: string) {
    const result = await mutation.mutate<{ note: string }>(
      `${path}/${documentId}`,
      {
        action: "cleanup_original",
        expectedVersion: resource.data?.eventVersion,
      },
    );
    if (result) {
      setNotice(result.note);
      await refresh();
    }
  }
  async function upload(form: HTMLFormElement) {
    setUploading(true);
    setError(null);
    controller.current = new AbortController();
    try {
      const file = new FormData(form).get("file");
      if (
        !(file instanceof File) ||
        !file.size ||
        file.size > MAX_DOCUMENT_BYTES
      )
        throw new Error(
          "Choose a PDF, PNG, JPEG or UTF-8 text file up to 2 MB.",
        );
      const input = prepareDocument.parse({
        action: "prepare",
        expectedVersion: resource.data?.eventVersion,
        filename: file.name,
        mediaType: file.type || "text/plain",
        byteSize: file.size,
      });
      const signature = JSON.stringify([
        file.name,
        file.size,
        file.type,
        file.lastModified,
      ]);
      if (pending.current?.signature !== signature) {
        const prepared = await mutation.mutate<{ id: string; version: number }>(
          path,
          input,
        );
        if (!prepared) return;
        pending.current = {
          signature,
          id: prepared.id,
          version: prepared.version,
          key: crypto.randomUUID(),
        };
      }
      const reservation = pending.current;
      setSelected(reservation.id);
      const response = await fetch(`/api/v1/${path}/${reservation.id}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": input.mediaType,
          "Idempotency-Key": reservation.key,
          "X-Event-Version": String(
            Math.max(resource.data?.eventVersion ?? 0, reservation.version),
          ),
        },
        body: file,
        signal: controller.current.signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ??
            "Upload was not confirmed. Retry the same file.",
        );
      pending.current = null;
      form.reset();
    } catch (e) {
      setError(
        e instanceof Error && e.name === "AbortError"
          ? new Error("Upload cancelled. Reload its status before retrying.")
          : e instanceof Error
            ? e
            : new Error("Upload was not confirmed."),
      );
    } finally {
      await refresh();
      setUploading(false);
      controller.current = null;
    }
  }
  if (resource.loading && !resource.data) return <Loading />;
  if (!resource.data)
    return <ErrorNotice error={resource.error} retry={resource.reload} />;
  return (
    <>
      <h2>Private quotation documents</h2>
      <p className="notice">
        Originals stay private to planners authorized to view contacts.
        Uploading sends nothing to an AI provider. PDF/text reading is local
        server processing; optional AI suggestions require separate consent and
        manual review. Images require a reviewed transcript; automatic OCR is
        unavailable.
      </p>
      <ErrorNotice error={error ?? mutation.error ?? resource.error} />
      {notice ? (
        <p role="status" className="notice">
          {notice}
        </p>
      ) : null}
      <section className="panel" style={{ padding: 24, marginBlock: 20 }}>
        <h3>Upload a private original</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void upload(e.currentTarget);
          }}
        >
          <Field label="Quotation file (up to 2 MB)" id="private-document">
            <input
              id="private-document"
              name="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              required
              disabled={uploading}
            />
          </Field>
          <button className="button primary" disabled={uploading}>
            {uploading
              ? "Uploading private original…"
              : "Upload private document"}
          </button>
          {uploading ? (
            <button
              type="button"
              className="button"
              onClick={() => controller.current?.abort()}
            >
              Cancel upload
            </button>
          ) : null}
        </form>
      </section>
      <ul>
        {resource.data.items.map((document) => (
          <li key={document.id} style={{ marginBlock: 12 }}>
            {document.state === "archived" ||
            document.state === "quarantined" ? (
              <>
                <span>{document.filename}</span>{" "}
                <button
                  className="button"
                  disabled={mutation.busy}
                  onClick={() => cleanup(document.id)}
                >
                  Retry original cleanup
                </button>
              </>
            ) : (
              <button
                className="button"
                aria-pressed={selected === document.id}
                onClick={() => setSelected(document.id)}
              >
                {document.filename}
              </button>
            )}{" "}
            · {document.state.replaceAll("_", " ")} ·{" "}
            {(document.byte_size / 1024).toFixed(1)} KB
          </li>
        ))}
      </ul>
      {selected ? (
        <DocumentReview
          key={`${selected}:${resource.data.items.find((item) => item.id === selected)?.state ?? "pending"}`}
          documentId={selected}
          eventId={state.event.id}
          version={resource.data.eventVersion}
          vendors={state.vendors}
          extractionAvailable={resource.data.extractionAvailable}
          refresh={refresh}
          close={(note) => {
            setSelected("");
            setNotice(note ?? "Archived.");
          }}
        />
      ) : null}
    </>
  );
}
function DocumentReview({
  documentId,
  eventId,
  version,
  vendors,
  extractionAvailable,
  refresh,
  close,
}: {
  documentId: string;
  eventId: string;
  version: number;
  vendors: EventSnapshot["vendors"];
  extractionAvailable: boolean;
  refresh: () => Promise<void>;
  close: (note?: string) => void;
}) {
  const path = `events/${eventId}/documents/${documentId}`,
    resource = useResource<DocumentDetail>(path),
    mutation = useMutation();
  const [working, setWorking] = useState(false),
    [error, setError] = useState<Error | null>(null),
    [message, setMessage] = useState("");
  async function perform(payload: Record<string, unknown>) {
    setWorking(true);
    setError(null);
    setMessage("");
    try {
      const result = await mutation.mutate<{
        originalCleanup?: string;
        note?: string;
      }>(path, { ...payload, expectedVersion: version });
      if (result) {
        if (payload.action === "archive") {
          setMessage(result.note ?? "Archived");
          close(result.note);
        } else await resource.reload();
        await refresh();
      }
      return result;
    } finally {
      setWorking(false);
    }
  }
  if (resource.loading && !resource.data) return <Loading />;
  if (!resource.data)
    return <ErrorNotice error={resource.error} retry={resource.reload} />;
  const detail = resource.data,
    ready = detail.document.state === "ready",
    extraction = detail.extractions.find((e) => e.state === "pending_review"),
    fields = extraction?.payload.fields;
  return (
    <section className="panel" style={{ padding: 24, marginBlock: 20 }}>
      <h3>Review {detail.document.filename}</h3>
      <ErrorNotice error={error ?? mutation.error ?? resource.error} />
      {message ? <p role="status">{message}</p> : null}
      {ready ? (
        <a className="button" href={`/api/v1/${path}/download`}>
          Download private original
        </a>
      ) : (
        <p className="notice">
          This upload is pending or unavailable. Retry the same file or archive
          the reservation.
        </p>
      )}
      <button
        className="button"
        disabled={working}
        onClick={() => perform({ action: "archive" })}
      >
        Archive original
      </button>
      {ready ? (
        <>
          <div className="actions" style={{ marginBlock: 20 }}>
            <button
              className="button"
              disabled={working || detail.extractions.length > 0}
              onClick={() => perform({ action: "extract_text" })}
            >
              Read PDF or text locally
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void perform({
                action: "manual_text",
                text: new FormData(e.currentTarget).get("text"),
              });
            }}
          >
            <Field
              label="Reviewed manual transcript (optional)"
              id="document-transcript"
            >
              <textarea
                id="document-transcript"
                name="text"
                required
                maxLength={20000}
                disabled={working || detail.extractions.length > 0}
              />
            </Field>
            <button
              className="button"
              disabled={working || detail.extractions.length > 0}
            >
              Save reviewed transcript
            </button>
          </form>
          {detail.pages.length ? (
            <details open style={{ marginBlock: 20 }}>
              <summary>
                Canonical source text ·{" "}
                {detail.sourceKind?.replaceAll("_", " ")}
              </summary>
              {detail.pages.map((page) => (
                <section key={page.page}>
                  <h4>Page {page.page}</h4>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      fontSize: 13,
                    }}
                  >
                    {page.text}
                  </pre>
                </section>
              ))}
            </details>
          ) : null}
          {extractionAvailable ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void perform({
                  action: "suggest",
                  consent:
                    new FormData(e.currentTarget).get("consent") === "on",
                });
              }}
            >
              <label style={{ display: "block", marginBlock: 16 }}>
                <input type="checkbox" name="consent" required /> I consent to
                send this document’s source text to the configured AI provider
                for unverified suggestions.
              </label>
              <button
                className="button"
                disabled={working || !detail.pages.length}
              >
                Suggest quotation fields
              </button>
            </form>
          ) : (
            <p className="notice">
              AI extraction is unavailable. You can read the original and record
              a reviewed quotation below.
            </p>
          )}
          {extraction ? (
            <section style={{ marginBlock: 20 }}>
              <h4>Unverified suggestions — review every field</h4>
              {Object.entries(extraction.payload.fields).map(
                ([name, field]) => (
                  <div key={name} style={{ marginBlock: 12 }}>
                    <strong>
                      {name}: {field.value ?? "Not found"}
                    </strong>
                    <p>
                      {field.source
                        ? `Page ${field.source.page}, text positions ${field.source.start}–${field.source.end}: “${field.source.quote}”`
                        : "No source evidence"}{" "}
                      · confidence {Math.round(field.confidence * 100)}%
                    </p>
                  </div>
                ),
              )}
              <button
                className="button"
                disabled={working}
                onClick={() =>
                  perform({
                    action: "reject_extraction",
                    extractionId: extraction.id,
                  })
                }
              >
                Reject suggestions
              </button>
            </section>
          ) : null}
          <h4>Record a manually reviewed quotation</h4>
          <p>
            This adds a quotation to vendor finance. It creates no commitment or
            payment.
          </p>
          <form
            key={extraction?.id ?? "manual"}
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const form = e.currentTarget,
                  values = new FormData(form);
                const reviewed = quoteFields.omit({ id: true }).parse({
                  vendorRequirementId: values.get("vendorRequirementId"),
                  supplierName: values.get("supplierName"),
                  reference: values.get("reference"),
                  totalMinor: rupeesToMinor(String(values.get("amount"))),
                  expiresOn: values.get("expiresOn") || null,
                  notes: values.get("notes") || "",
                });
                if (
                  await perform({
                    action: "record_quote",
                    extractionId: extraction?.id ?? null,
                    confirmed: values.get("confirmed") === "on",
                    fields: reviewed,
                  })
                ) {
                  form.reset();
                  setMessage(
                    "Reviewed quotation saved in vendor finance. No commitment or payment was created.",
                  );
                }
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e
                    : new Error("Check the reviewed fields."),
                );
              }
            }}
          >
            <Field label="Source vendor requirement" id="document-vendor">
              <select id="document-vendor" name="vendorRequirementId" required>
                <option value="">Choose a requirement</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reviewed supplier name" id="document-supplier">
              <input
                id="document-supplier"
                name="supplierName"
                required
                maxLength={160}
                defaultValue={fields?.supplierName.value ?? ""}
              />
            </Field>
            <Field label="Reviewed quotation reference" id="document-reference">
              <input
                id="document-reference"
                name="reference"
                required
                maxLength={120}
                defaultValue={fields?.reference.value ?? ""}
              />
            </Field>
            <Field
              label="Reviewed total including charges (₹)"
              id="document-total"
            >
              <input
                id="document-total"
                name="amount"
                inputMode="decimal"
                required
                defaultValue={
                  fields?.totalMinor.value
                    ? minorToRupees(fields.totalMinor.value)
                    : ""
                }
              />
            </Field>
            <Field label="Reviewed expiry date (optional)" id="document-expiry">
              <input
                id="document-expiry"
                type="date"
                name="expiresOn"
                defaultValue={fields?.expiresOn.value ?? ""}
              />
            </Field>
            <Field label="Reviewed quotation notes" id="document-notes">
              <textarea id="document-notes" name="notes" maxLength={2000} />
            </Field>
            <label style={{ display: "block", marginBlock: 16 }}>
              <input type="checkbox" name="confirmed" required /> I checked the
              original source and explicitly confirm these quotation fields.
            </label>
            <button
              className="button primary"
              disabled={working || !vendors.length}
            >
              Save reviewed quotation
            </button>
          </form>
        </>
      ) : null}
    </section>
  );
}
