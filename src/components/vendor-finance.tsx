"use client";
import Link from "next/link";
import { useState } from "react";
import type { EventSnapshot } from "@/domain/contracts";
import type { VendorFinance } from "@/domain/vendor-finance";
import { formatMoney, minorToRupees, rupeesToMinor } from "@/domain/money";
import { ErrorNotice, Field, Loading, useMutation, useResource } from "./ui";
type Quote = VendorFinance["quotes"][number];
const today = () => new Date().toISOString().slice(0, 10);
export function VendorFinancePage({
  state,
  reload,
}: {
  state: EventSnapshot;
  reload: () => Promise<void>;
}) {
  const resource = useResource<VendorFinance>(
      `events/${state.event.id}/finance`,
    ),
    mutation = useMutation();
  const [tab, setTab] = useState("quotes"),
    [editing, setEditing] = useState<Quote | null>(null),
    [validation, setValidation] = useState<Error | null>(null);
  const canApprove = state.permissions?.canApprove !== false;
  async function submit(action: string, payload: Record<string, unknown>) {
    const result = await mutation.mutate(`events/${state.event.id}/finance`, {
      action,
      ...payload,
      expectedVersion: resource.data?.eventVersion,
    });
    if (result) await Promise.all([resource.reload(), reload()]);
    return result;
  }
  async function save(form: HTMLFormElement, action: string) {
    try {
      setValidation(null);
      const values = new FormData(form),
        text = (name: string) => String(values.get(name) ?? "");
      let payload: Record<string, unknown>;
      if (action === "quote")
        payload = {
          id: editing?.id ?? null,
          vendorRequirementId: text("vendorRequirementId"),
          supplierName: text("supplierName"),
          reference: text("reference"),
          totalMinor: rupeesToMinor(text("amount")),
          expiresOn: text("expiresOn") || null,
          notes: text("notes"),
        };
      else if (action === "commit")
        payload = {
          quoteId: text("quoteId"),
          depositDueMinor: rupeesToMinor(text("deposit")),
          confirmed: values.get("confirmed") === "on",
        };
      else if (action === "invoice")
        payload = {
          commitmentId: text("commitmentId"),
          reference: text("reference"),
          amountMinor: rupeesToMinor(text("amount")),
          issuedOn: text("issuedOn"),
          dueOn: text("dueOn") || null,
        };
      else
        payload = {
          invoiceId: text("invoiceId"),
          reference: text("reference"),
          amountMinor: rupeesToMinor(text("amount")),
          paidOn: text("paidOn"),
          method: text("method"),
          confirmed: values.get("confirmed") === "on",
        };
      if (await submit(action, payload)) {
        form.reset();
        setEditing(null);
      }
    } catch (error) {
      setValidation(
        error instanceof Error
          ? error
          : new Error("Check the financial record."),
      );
    }
  }
  async function correct(action: string, id: string) {
    const reason = window.prompt(
      "Reason for this correction (preserved in the financial record)",
    );
    if (reason?.trim()) await submit(action, { id, reason: reason.trim() });
  }
  if (resource.loading && !resource.data) return <Loading />;
  if (!resource.data)
    return <ErrorNotice error={resource.error} retry={resource.reload} />;
  const data = resource.data,
    activeCommitments = data.commitments.filter((c) => c.state === "active");
  return (
    <>
      <h2>Vendor finance</h2>
      <p className="notice">
        These are planning and bookkeeping records. UtsavOS does not send
        payments, verify settlement, sign supplier contracts or book services.
        Commitment totals are separate from budget estimates and are never added
        to them automatically.
      </p>
      <div className="grid three">
        {[
          ["Recorded commitments", data.summary.committedMinor],
          ["Issued invoices", data.summary.invoicedMinor],
          ["Recorded payments", data.summary.paidMinor],
        ].map(([label, value]) => (
          <div className="panel" style={{ padding: 20 }} key={label}>
            <p className="muted">{label}</p>
            <strong>{formatMoney(value)}</strong>
          </div>
        ))}
      </div>
      <ErrorNotice error={validation ?? mutation.error ?? resource.error} />
      <nav className="event-nav" aria-label="Vendor financial records">
        {["quotes", "commitments", "invoices", "payments"].map((item) => (
          <button
            className="button"
            key={item}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>
      {tab === "quotes" ? (
        <>
          <section className="panel" style={{ padding: 24, marginBlock: 20 }}>
            <h3>{editing ? "Correct quotation" : "Record a quotation"}</h3>
            <form
              key={editing?.id ?? "new"}
              onSubmit={(e) => {
                e.preventDefault();
                void save(e.currentTarget, "quote");
              }}
            >
              <Field label="Vendor requirement" id="quote-vendor">
                <select
                  id="quote-vendor"
                  name="vendorRequirementId"
                  required
                  defaultValue={editing?.vendorRequirementId}
                >
                  <option value="">Choose a requirement</option>
                  {state.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Supplier name" id="quote-supplier">
                <input
                  id="quote-supplier"
                  name="supplierName"
                  required
                  maxLength={160}
                  defaultValue={editing?.supplierName}
                />
              </Field>
              <Field label="Quotation reference" id="quote-reference">
                <input
                  id="quote-reference"
                  name="reference"
                  required
                  maxLength={120}
                  defaultValue={editing?.reference}
                />
              </Field>
              <Field
                label="Quoted total including charges (₹)"
                id="quote-total"
              >
                <input
                  id="quote-total"
                  name="amount"
                  required
                  inputMode="decimal"
                  defaultValue={
                    editing ? minorToRupees(editing.totalMinor) : ""
                  }
                />
              </Field>
              <Field label="Quote expiry (optional)" id="quote-expiry">
                <input
                  id="quote-expiry"
                  name="expiresOn"
                  type="date"
                  defaultValue={editing?.expiresOn ?? ""}
                />
              </Field>
              <Field label="Quotation notes" id="quote-notes">
                <textarea
                  id="quote-notes"
                  name="notes"
                  maxLength={2000}
                  defaultValue={editing?.notes}
                />
              </Field>
              <button
                className="button primary"
                disabled={mutation.busy || !state.vendors.length}
              >
                {editing ? "Save corrected quotation" : "Save quotation"}
              </button>
              {editing ? (
                <button
                  className="button"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  Cancel correction
                </button>
              ) : null}
            </form>
          </section>
          {data.quotes.map((quote) => (
            <article
              className="panel"
              style={{ padding: 20, marginBlock: 16 }}
              key={quote.id}
            >
              <h3>{quote.supplierName}</h3>
              <p>
                {quote.reference} · {formatMoney(quote.totalMinor)} ·{" "}
                {quote.state}
              </p>
              <p className="muted">
                {quote.expiresOn
                  ? `Expires ${quote.expiresOn}`
                  : "No expiry entered"}
              </p>
              <p>{quote.notes}</p>
              {quote.sourceDocumentId &&
              state.permissions?.canViewContacts !== false ? (
                <Link
                  className="button"
                  href={`/app/events/${state.event.id}/documents`}
                >
                  Review linked private original
                </Link>
              ) : null}
              <div className="actions">
                <button
                  className="button"
                  disabled={
                    mutation.busy ||
                    quote.state !== "received" ||
                    data.commitments.some((c) => c.quoteId === quote.id)
                  }
                  onClick={() => setEditing(quote)}
                >
                  Correct quotation
                </button>
                <button
                  className="button"
                  disabled={
                    mutation.busy ||
                    quote.state !== "received" ||
                    activeCommitments.some((c) => c.quoteId === quote.id)
                  }
                  onClick={() => submit("withdraw_quote", { id: quote.id })}
                >
                  Withdraw quotation
                </button>
              </div>
            </article>
          ))}
        </>
      ) : null}
      {tab === "commitments" ? (
        <>
          <fieldset
            disabled={!canApprove || mutation.busy}
            className="panel"
            style={{ padding: 24, marginBlock: 20 }}
          >
            <legend>Record a commitment</legend>
            <p>
              This records your explicit decision based on a reviewed quotation.
              A deposit due is part of the committed total, not evidence of
              payment.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save(e.currentTarget, "commit");
              }}
            >
              <Field label="Reviewed quotation" id="commit-quote">
                <select id="commit-quote" name="quoteId" required>
                  <option value="">Choose a quotation</option>
                  {data.quotes
                    .filter(
                      (q) =>
                        q.state === "received" &&
                        !data.commitments.some((c) => c.quoteId === q.id),
                    )
                    .map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.supplierName} · {q.reference} ·{" "}
                        {formatMoney(q.totalMinor)}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Deposit due (₹)" id="commit-deposit">
                <input
                  id="commit-deposit"
                  name="deposit"
                  inputMode="decimal"
                  defaultValue="0"
                  required
                />
              </Field>
              <label style={{ display: "block", marginBlock: 16 }}>
                <input type="checkbox" name="confirmed" required /> I reviewed
                this quotation and confirm the commitment record.
              </label>
              <button className="button primary">Record commitment</button>
            </form>
          </fieldset>
          {data.commitments.map((c) => (
            <article
              className="panel"
              style={{ padding: 20, marginBlock: 16 }}
              key={c.id}
            >
              <h3>
                {data.quotes.find((q) => q.id === c.quoteId)?.supplierName}
              </h3>
              <p>
                {formatMoney(c.totalMinor)} committed ·{" "}
                {formatMoney(c.depositDueMinor)} deposit due · {c.state}
              </p>
              {c.cancellationReason ? <p>{c.cancellationReason}</p> : null}
              <button
                className="button"
                disabled={!canApprove || mutation.busy || c.state !== "active"}
                onClick={() => correct("cancel_commitment", c.id)}
              >
                Cancel commitment record
              </button>
            </article>
          ))}
        </>
      ) : null}
      {tab === "invoices" ? (
        <>
          <fieldset
            disabled={!canApprove || mutation.busy}
            className="panel"
            style={{ padding: 24, marginBlock: 20 }}
          >
            <legend>Record an invoice</legend>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save(e.currentTarget, "invoice");
              }}
            >
              <Field label="Invoice commitment" id="invoice-commitment">
                <select id="invoice-commitment" name="commitmentId" required>
                  <option value="">Choose a commitment</option>
                  {activeCommitments.map((c) => (
                    <option key={c.id} value={c.id}>
                      {
                        data.quotes.find((q) => q.id === c.quoteId)
                          ?.supplierName
                      }{" "}
                      · {formatMoney(c.totalMinor)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Invoice reference" id="invoice-reference">
                <input
                  id="invoice-reference"
                  name="reference"
                  required
                  maxLength={120}
                />
              </Field>
              <Field label="Invoice amount (₹)" id="invoice-amount">
                <input
                  id="invoice-amount"
                  name="amount"
                  inputMode="decimal"
                  required
                />
              </Field>
              <Field label="Invoice issue date" id="invoice-issued">
                <input
                  id="invoice-issued"
                  name="issuedOn"
                  type="date"
                  required
                  defaultValue={today()}
                />
              </Field>
              <Field label="Invoice due date (optional)" id="invoice-due">
                <input id="invoice-due" name="dueOn" type="date" />
              </Field>
              <button className="button primary">Save invoice record</button>
            </form>
          </fieldset>
          {data.invoices.map((i) => (
            <article
              className="panel"
              style={{ padding: 20, marginBlock: 16 }}
              key={i.id}
            >
              <h3>{i.reference}</h3>
              <p>
                {formatMoney(i.amountMinor)} · {i.state} · issued {i.issuedOn}
                {i.dueOn ? ` · due ${i.dueOn}` : ""}
              </p>
              {i.voidReason ? <p>{i.voidReason}</p> : null}
              <button
                className="button"
                disabled={!canApprove || mutation.busy || i.state !== "issued"}
                onClick={() => correct("void_invoice", i.id)}
              >
                Void invoice record
              </button>
            </article>
          ))}
        </>
      ) : null}
      {tab === "payments" ? (
        <>
          <fieldset
            disabled={!canApprove || mutation.busy}
            className="panel"
            style={{ padding: 24, marginBlock: 20 }}
          >
            <legend>Record an external payment</legend>
            <p>
              Record only a payment that already happened through your own bank,
              cash or provider. This form never charges a card or transfers
              funds.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save(e.currentTarget, "payment");
              }}
            >
              <Field label="Paid invoice" id="payment-invoice">
                <select id="payment-invoice" name="invoiceId" required>
                  <option value="">Choose an invoice</option>
                  {data.invoices
                    .filter((i) => i.state === "issued")
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.reference} · {formatMoney(i.amountMinor)}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Payment reference" id="payment-reference">
                <input
                  id="payment-reference"
                  name="reference"
                  required
                  maxLength={120}
                />
              </Field>
              <Field label="Payment amount (₹)" id="payment-amount">
                <input
                  id="payment-amount"
                  name="amount"
                  inputMode="decimal"
                  required
                />
              </Field>
              <Field label="Payment date" id="payment-date">
                <input
                  id="payment-date"
                  name="paidOn"
                  type="date"
                  required
                  defaultValue={today()}
                />
              </Field>
              <Field label="Payment method" id="payment-method">
                <select id="payment-method" name="method">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card (already paid externally)</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <label style={{ display: "block", marginBlock: 16 }}>
                <input type="checkbox" name="confirmed" required /> I confirm
                this payment already occurred outside UtsavOS.
              </label>
              <button className="button primary">Save payment record</button>
            </form>
          </fieldset>
          {data.payments.map((p) => (
            <article
              className="panel"
              style={{ padding: 20, marginBlock: 16 }}
              key={p.id}
            >
              <h3>{p.reference}</h3>
              <p>
                {formatMoney(p.amountMinor)} · {p.paidOn} ·{" "}
                {p.method.replaceAll("_", " ")} · {p.state}
              </p>
              {p.reversalReason ? <p>{p.reversalReason}</p> : null}
              <button
                className="button"
                disabled={
                  !canApprove || mutation.busy || p.state !== "recorded"
                }
                onClick={() => correct("reverse_payment", p.id)}
              >
                Reverse payment record
              </button>
            </article>
          ))}
        </>
      ) : null}
      {!canApprove ? (
        <p className="notice">
          Commitments, invoices and payment corrections require delegated
          approval permission from the workspace owner.
        </p>
      ) : null}
    </>
  );
}
