"use client";
import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  GitBranch,
  Check,
  RefreshCw,
} from "lucide-react";
import type { EventSnapshot, Proposal } from "@/domain/contracts";
import type { PlanDraft } from "@/domain/ai-contract";
import {
  calculateBudget,
  formatMoney,
  minorToRupees,
  rupeesToMinor,
} from "@/domain/money";
import {
  ErrorNotice,
  Field,
  Loading,
  Modal,
  dateLabel,
  useMutation,
  useResource,
  useNow,
} from "./ui";
type Props = { state: EventSnapshot; reload: () => Promise<void> };
type AiExplanation = {
  explanation: string;
  suggestions: string[];
  questions: string[];
  provenance?: {
    provider: string;
    actualModel: string | null;
    requestedModel: string;
    fallbackOccurred: boolean;
  };
};
type DraftRecord = {
  id: string;
  base_version: number;
  payload: PlanDraft;
  status: string;
  expires_at: string;
  model_id: string;
  provider_id?: string | null;
  requested_model_id?: string | null;
  actual_model_id?: string | null;
  fallback_occurred?: boolean;
  created_at: string;
};
export function AiPage({ state, reload }: Props) {
  const now = useNow();
  const providerInfo = useResource<{
    aiProviderPrimary?: string;
    aiProviderFallback?: string;
  }>("me");
  const e = state.event,
    resource = useResource<DraftRecord[]>(`events/${e.id}/ai-drafts`),
    m = useMutation(),
    [activeId, setActiveId] = useState<string | null>(null),
    [preferences, setPreferences] = useState(e.preferences),
    [selected, setSelected] = useState<string[]>([]),
    [edits, setEdits] = useState<
      Record<string, { title?: string; unitPriceMinor?: string }>
    >({}),
    [confirmation, setConfirmation] = useState(false),
    [priceText, setPriceText] = useState<Record<string, string>>({}),
    [feedback, setFeedback] = useState("");
  const draft =
      resource.data?.find((d) => d.id === activeId) ?? resource.data?.[0],
    payload = draft?.payload;
  const stale = draft && draft.base_version !== e.version,
    expired = draft && Date.parse(draft.expires_at) <= now,
    ready = draft?.status === "ready" && !stale && !expired;
  const allIds = payload
    ? [
        ...payload.budgetSuggestions,
        ...payload.tasks,
        ...payload.vendorRequirements,
      ].map((x) => x.draftId)
    : [];
  const [generationRequest, setGenerationRequest] = useState<string | null>(
    null,
  );
  let selectedTotals: ReturnType<typeof calculateBudget> | null = null,
    selectionOverflow = false;
  try {
    selectedTotals = payload
      ? calculateBudget(
          [
            ...state.budgetItems,
            ...payload.budgetSuggestions
              .filter((b) => selected.includes(b.draftId))
              .map((b) => ({
                ...b,
                id: b.draftId,
                sourceLabel: "AI assumption — confirm",
                isLocked: false,
                state: "active" as const,
                unitPriceMinor:
                  edits[b.draftId]?.unitPriceMinor ?? b.unitPriceMinor,
              })),
          ],
          e.guestCount,
          e.budgetMinor,
        )
      : null;
  } catch {
    selectionOverflow = true;
  }
  async function generate() {
    setFeedback("");
    const clientRequestId = generationRequest ?? crypto.randomUUID();
    setGenerationRequest(clientRequestId);
    const r = await m.mutate<{ id: string }>(`events/${e.id}/ai-drafts`, {
      expectedVersion: e.version,
      preferences,
      clientRequestId,
    });
    if (r) {
      setGenerationRequest(null);
      setActiveId(r.id);
      setSelected([]);
      setEdits({});
      setPriceText({});
      await resource.reload();
    }
  }
  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }
  function editTitle(id: string, value: string) {
    setEdits((x) => ({ ...x, [id]: { ...x[id], title: value } }));
  }
  async function accept() {
    if (!draft) return;
    let validatedEdits = edits;
    try {
      validatedEdits = { ...edits };
      for (const b of draft.payload.budgetSuggestions.filter((b) =>
        selected.includes(b.draftId),
      )) {
        if (priceText[b.draftId] !== undefined)
          validatedEdits[b.draftId] = {
            ...edits[b.draftId],
            unitPriceMinor: rupeesToMinor(priceText[b.draftId]),
          };
      }
    } catch (error) {
      m.setError(error instanceof Error ? error : new Error("Invalid price"));
      return;
    }
    const r = await m.mutate(`events/${e.id}/plan-acceptances`, {
      expectedVersion: e.version,
      draftId: draft.id,
      selectedDraftItemIds: selected,
      edits: validatedEdits,
    });
    if (r) {
      setConfirmation(false);
      setFeedback("Your selected items are saved to this event.");
      setSelected([]);
      setEdits({});
      await reload();
      await resource.reload();
    }
  }
  return (
    <>
      <div className="grid two">
        <section className="card">
          <div className="eyebrow">
            <Sparkles size={12} style={{ display: "inline", marginRight: 6 }} />{" "}
            A starting point, shaped around you
          </div>
          <h2
            style={{
              fontFamily: "Georgia,serif",
              fontWeight: 400,
              fontSize: 28,
            }}
          >
            A little help with the big picture.
          </h2>
          <p className="muted">
            Generate an editable AI draft with ideas, budget estimates, tasks
            and vendor requirements. Review every part before saving.
          </p>
          <p className="notice">
            Configured provider:{" "}
            {providerInfo.data?.aiProviderPrimary ?? "server-approved AI"}.
            Fallback: {providerInfo.data?.aiProviderFallback ?? "none"}.
            OpenRouter routes requests to external model providers; only event
            planning details you choose to share are sent.
          </p>
          <Field
            label="What should this celebration feel like?"
            id="ai-preferences"
            hint="Sent to your configured AI provider with event type, date, budget and guest count. Exclude contact details and private guest information."
          >
            <textarea
              id="ai-preferences"
              value={preferences}
              onChange={(ev) => setPreferences(ev.target.value)}
              maxLength={2000}
              placeholder="Tell us what matters: food, atmosphere, traditions, accessibility…"
            />
          </Field>
          <button
            className="button primary"
            disabled={m.busy || providerInfo.loading || !providerInfo.data}
            onClick={generate}
          >
            <Sparkles size={15} />
            {m.busy ? "Working on your request…" : "Generate a planning draft"}
          </button>
          {m.busy && (
            <p className="notice" role="status">
              Waiting for the AI provider. Your current plan remains unchanged.
              You can continue manual planning in another event module.
              <br />
              <button className="button" onClick={m.cancel}>
                Stop waiting
              </button>
            </p>
          )}
        </section>
        <section className="card">
          <h2>The details we’ll work with</h2>
          <div className="list-row">
            <span className="muted">Celebration</span>
            <strong>{e.type}</strong>
          </div>
          <div className="list-row">
            <span className="muted">Guests</span>
            <strong>{e.guestCount}</strong>
          </div>
          <div className="list-row">
            <span className="muted">Budget ceiling</span>
            <strong>{formatMoney(e.budgetMinor)}</strong>
          </div>
          <div className="list-row">
            <span className="muted">When</span>
            <strong>{dateLabel(e.startsAt, e.timeZone)}</strong>
          </div>
          <p className="muted" style={{ fontSize: 11, marginTop: 20 }}>
            Every suggested cost is an unverified AI estimate. No suppliers are
            contacted or booked. Your saved records remain usable during an AI
            outage.
          </p>
        </section>
      </div>
      <ErrorNotice
        error={m.error ?? resource.error ?? providerInfo.error}
        retry={async () => {
          await reload();
          await resource.reload();
          await providerInfo.reload();
        }}
      />
      {feedback && (
        <div className="notice" role="status">
          <Check size={14} style={{ display: "inline" }} /> {feedback}
        </div>
      )}
      {resource.loading && !resource.data && <Loading />}
      {draft && payload && (
        <>
          <div className="row-between tab-header">
            <div>
              <h2 style={{ marginBottom: 5 }}>Your planning draft</h2>
              <small>
                {draft.provider_id ?? "Legacy provider metadata unavailable"} ·{" "}
                {draft.actual_model_id ?? draft.model_id} · {draft.status} ·
                Based on version {draft.base_version}
              </small>
            </div>
            <select
              className="button"
              aria-label="Select saved AI draft"
              value={draft.id}
              onChange={(ev) => {
                setActiveId(ev.target.value);
                setPriceText({});
                setSelected([]);
                setEdits({});
              }}
            >
              {resource.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {new Date(d.created_at).toLocaleDateString("en-IN")} ·{" "}
                  {d.status} · {d.id.slice(0, 6)}
                </option>
              ))}
            </select>
          </div>
          <div className="notice">
            <strong>{payload.summary}</strong>
            <p>
              AI assumption — confirm. Only selected records will be added.
              Select all task prerequisites before acceptance.
            </p>
            {selectedTotals && (
              <p>
                <strong>
                  Projected total with selected estimates:{" "}
                  {formatMoney(selectedTotals.projectedMinor)}
                </strong>
                <br />
                Remaining: {formatMoney(selectedTotals.remainingMinor)}
                {selectedTotals.overBudget
                  ? " · Needs review: selected estimates exceed your ceiling."
                  : ""}
              </p>
            )}
            {selectionOverflow && (
              <p role="alert">
                These selections exceed the supported financial range. Reduce
                the prices or deselect items before acceptance.
              </p>
            )}
          </div>
          {stale && (
            <div className="notice warning" role="alert">
              This draft is stale: the event changed after generation. Generate
              a new draft from the current version.
            </div>
          )}
          {expired && (
            <div className="notice warning">
              This draft has expired. Generate a new draft.
            </div>
          )}
          {ready && (
            <div className="row-between" style={{ marginBottom: 20 }}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={
                    selected.length === allIds.length && allIds.length > 0
                  }
                  onChange={(ev) =>
                    setSelected(ev.target.checked ? allIds : [])
                  }
                />
                Select all proposed records ({allIds.length})
              </label>
              <button
                className="button primary"
                disabled={!selected.length || m.busy}
                onClick={() => setConfirmation(true)}
              >
                Review {selected.length} selected items <ArrowRight size={15} />
              </button>
            </div>
          )}
          <div className="grid two">
            <section className="card">
              <h2>Budget suggestions</h2>
              {payload.budgetSuggestions.length ? (
                payload.budgetSuggestions.map((b) => (
                  <div className="draft-row" key={b.draftId}>
                    {ready && (
                      <input
                        type="checkbox"
                        aria-label={`Accept ${b.title}`}
                        checked={selected.includes(b.draftId)}
                        onChange={() => toggle(b.draftId)}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {ready ? (
                        <Field id={`draft-${b.draftId}`} label="Expense name">
                          <input
                            id={`draft-${b.draftId}`}
                            maxLength={140}
                            value={edits[b.draftId]?.title ?? b.title}
                            onChange={(ev) =>
                              editTitle(b.draftId, ev.target.value)
                            }
                          />
                        </Field>
                      ) : (
                        <strong>{b.title}</strong>
                      )}
                      <span className="badge warm">
                        AI estimate · {b.pricingBasis.replace("_", " ")}
                      </span>
                      <p>
                        {formatMoney(
                          edits[b.draftId]?.unitPriceMinor ?? b.unitPriceMinor,
                        )}
                        {b.pricingBasis === "per_guest"
                          ? " / guest"
                          : b.pricingBasis === "per_unit"
                            ? ` × ${b.quantity} units`
                            : ""}
                      </p>
                      {ready && (
                        <Field
                          id={`price-${b.draftId}`}
                          label="Edit unit price (₹)"
                        >
                          <input
                            id={`price-${b.draftId}`}
                            inputMode="decimal"
                            value={
                              priceText[b.draftId] ??
                              minorToRupees(b.unitPriceMinor)
                            }
                            onChange={(ev) =>
                              setPriceText((x) => ({
                                ...x,
                                [b.draftId]: ev.target.value,
                              }))
                            }
                            onBlur={(ev) => {
                              try {
                                const price = rupeesToMinor(ev.target.value);
                                setEdits((x) => ({
                                  ...x,
                                  [b.draftId]: {
                                    ...x[b.draftId],
                                    unitPriceMinor: price,
                                  },
                                }));
                              } catch (err) {
                                m.setError(
                                  err instanceof Error
                                    ? err
                                    : new Error("Invalid estimate"),
                                );
                              }
                            }}
                          />
                        </Field>
                      )}
                      <p className="muted">{b.reason}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">No budget items proposed.</p>
              )}
            </section>
            <section className="card">
              <h2>Tasks & timing</h2>
              {payload.tasks.map((t) => (
                <div className="draft-row" key={t.draftId}>
                  {ready && (
                    <input
                      type="checkbox"
                      aria-label={`Accept ${t.title}`}
                      checked={selected.includes(t.draftId)}
                      onChange={() => toggle(t.draftId)}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {ready ? (
                      <Field id={`draft-${t.draftId}`} label="Task name">
                        <input
                          id={`draft-${t.draftId}`}
                          maxLength={140}
                          value={edits[t.draftId]?.title ?? t.title}
                          onChange={(ev) =>
                            editTitle(t.draftId, ev.target.value)
                          }
                        />
                      </Field>
                    ) : (
                      <strong>{t.title}</strong>
                    )}
                    <p className="muted">
                      {t.dueAt
                        ? dateLabel(t.dueAt, e.timeZone)
                        : t.relativeTiming}{" "}
                      · {t.priority}
                    </p>
                    {t.dependsOnDraftIds.length > 0 && (
                      <p className="muted">
                        Requires: {t.dependsOnDraftIds.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <h2 className="section-gap">Vendor requirements</h2>
              {payload.vendorRequirements.map((v) => (
                <div className="draft-row" key={v.draftId}>
                  {ready && (
                    <input
                      type="checkbox"
                      aria-label={`Accept ${v.title}`}
                      checked={selected.includes(v.draftId)}
                      onChange={() => toggle(v.draftId)}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {ready ? (
                      <Field id={`draft-${v.draftId}`} label="Requirement name">
                        <input
                          id={`draft-${v.draftId}`}
                          maxLength={140}
                          value={edits[v.draftId]?.title ?? v.title}
                          onChange={(ev) =>
                            editTitle(v.draftId, ev.target.value)
                          }
                        />
                      </Field>
                    ) : (
                      <strong>{v.title}</strong>
                    )}
                    <p>{v.notes}</p>
                    <span className="badge">
                      Required category · unverified
                    </span>
                  </div>
                </div>
              ))}
            </section>
          </div>
          <section className="card section-gap">
            <h2>Ideas to make it yours</h2>
            <div className="grid three">
              {payload.ideas.map((idea, i) => (
                <article key={i}>
                  <span className="eyebrow">
                    Idea {i + 1} · Assumption based
                  </span>
                  <h3>{idea.title}</h3>
                  <p className="muted">{idea.description}</p>
                </article>
              ))}
            </div>
            <div className="grid two section-gap">
              <div>
                <h3>Assumptions & questions</h3>
                <ul>
                  {[...payload.assumptions, ...payload.questions].map(
                    (text, i) => (
                      <li key={i} className="muted">
                        {text}
                      </li>
                    ),
                  )}
                </ul>
              </div>
              <div>
                <h3>Warnings</h3>
                {payload.warnings.length ? (
                  <ul>
                    {payload.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    No additional model warnings. Verify estimates and practical
                    details yourself.
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
      <Modal
        title="Save these items to your plan?"
        description="This creates structured event records and increments the event version once. Existing records stay in place."
        open={confirmation}
        onOpenChange={setConfirmation}
      >
        <p>
          {selected.length} selected items will be added from this draft. All
          prices remain estimates.
        </p>
        <p className="muted">
          Ideas, questions, and assumptions remain in the saved draft for
          reference. Unselected records are not added.
        </p>
        <ErrorNotice error={m.error} />
        <button
          className="button primary"
          disabled={m.busy || !ready}
          onClick={accept}
        >
          {m.busy ? "Saving selected items…" : "Accept selected items"}
        </button>
      </Modal>
    </>
  );
}
type StoredProposal = {
  id: string;
  status: string;
  base_version: number;
  expires_at: string;
  calculated_effects: Omit<Proposal, "id" | "status" | "expiresAt">;
};
function deserialize(p: StoredProposal): Proposal {
  return {
    ...p.calculated_effects,
    id: p.id,
    status: p.status,
    expiresAt: p.expires_at,
  };
}
export function ReplanPage({ state, reload }: Props) {
  const now = useNow();
  const e = state.event,
    m = useMutation(),
    resource = useResource<StoredProposal[]>(`events/${e.id}/replan-proposals`),
    [guests, setGuests] = useState(String(e.guestCount)),
    [prices, setPrices] = useState<Record<string, string>>({}),
    [protect, setProtect] = useState<string[]>([]),
    [strict, setStrict] = useState(true),
    [localProposal, setLocalProposal] = useState<Proposal | null>(null),
    [confirm, setConfirm] = useState(false),
    [explanation, setExplanation] = useState<AiExplanation | null>(null),
    [feedback, setFeedback] = useState("");
  const proposal =
      localProposal ??
      (resource.data?.[0] ? deserialize(resource.data[0]) : null),
    stale = proposal && proposal.baseVersion !== e.version,
    expired = proposal && Date.parse(proposal.expiresAt) <= now,
    blocked = proposal?.warnings.some(
      (w) => w.code === "BUDGET_CONSTRAINT_UNRESOLVED",
    ),
    canApprove =
      proposal?.status === "pending" && !stale && !expired && !blocked;
  async function preview() {
    try {
      setFeedback("");
      setExplanation(null);
      const changes = Object.entries(prices)
        .filter(([, v]) => v !== "")
        .map(([budgetItemId, v]) => ({
          budgetItemId,
          newUnitPriceMinor: rupeesToMinor(v),
        }));
      const r = await m.mutate<{ proposal: Proposal }>(
        `events/${e.id}/replan-proposals`,
        {
          expectedVersion: e.version,
          change: {
            newGuestCount: Number(guests),
            priceChanges: changes,
            doNotExceedBudget: strict,
            protectResourceIds: protect,
          },
        },
      );
      if (r) {
        setLocalProposal(r.proposal);
        await resource.reload();
      }
    } catch (err) {
      m.setError(err instanceof Error ? err : new Error("Invalid change"));
    }
  }
  async function decide(action: "approve" | "reject") {
    if (!proposal) return;
    const r = await m.mutate(
      `events/${e.id}/replan-proposals/${proposal.id}/${action}`,
      {
        expectedVersion: e.version,
        selectedOperationIds: proposal.operations.map((o) => o.id),
      },
    );
    if (r) {
      setConfirm(false);
      setLocalProposal(null);
      setFeedback(
        action === "approve"
          ? "Your approved changes are saved. Budget estimates and history now reflect the new plan."
          : "Proposal rejected. The event plan was not changed.",
      );
      await reload();
      await resource.reload();
    }
  }
  async function explain() {
    if (!proposal) return;
    const r = await m.mutate<AiExplanation>(
      `events/${e.id}/replan-proposals/${proposal.id}/explain`,
      {
        expectedVersion: e.version,
      },
    );
    if (r) setExplanation(r);
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          <GitBranch size={12} style={{ display: "inline", marginRight: 6 }} />{" "}
          Plans change. Stay in the picture.
        </div>
        <h2
          style={{ fontFamily: "Georgia,serif", fontSize: 30, fontWeight: 400 }}
        >
          A change you can see before you make.
        </h2>
        <p>
          Review exact financial effects, open tasks, and constraints. Nothing
          changes in your plan until you approve.
        </p>
      </div>
      <div className="grid two">
        <section className="card">
          <h2>What’s changing?</h2>
          <Field label="New expected guest count" id="replan-guests">
            <input
              id="replan-guests"
              type="number"
              min={0}
              max={100000}
              step={1}
              value={guests}
              onChange={(ev) => setGuests(ev.target.value)}
            />
          </Field>
          {state.budgetItems
            .filter((b) => b.category.toLowerCase() === "catering")
            .map((b) => (
              <Field
                key={b.id}
                id={`price-${b.id}`}
                label={`${b.title} · new unit price (₹)`}
                hint={
                  b.isLocked
                    ? "Locked. Unlock explicitly in Budget before repricing."
                    : `Current: ${formatMoney(b.unitPriceMinor)} · ${b.pricingBasis.replace("_", " ")}. Leave blank to keep.`
                }
              >
                <input
                  id={`price-${b.id}`}
                  disabled={b.isLocked}
                  inputMode="decimal"
                  value={prices[b.id] ?? ""}
                  onChange={(ev) =>
                    setPrices((p) => ({ ...p, [b.id]: ev.target.value }))
                  }
                  placeholder={minorToRupees(b.unitPriceMinor)}
                />
              </Field>
            ))}
          <label className="check">
            <input
              type="checkbox"
              checked={strict}
              onChange={(ev) => setStrict(ev.target.checked)}
            />
            Do not exceed my event budget
          </label>
          {!strict && (
            <div className="notice warning">
              You are allowing a budget overrun. The preview will still show the
              actual shortfall.
            </div>
          )}
          <details style={{ margin: "15px 0 20px" }}>
            <summary>Additional resources to protect</summary>
            {[...state.budgetItems, ...state.tasks, ...state.vendors].map(
              (r) => (
                <label className="check" key={r.id}>
                  <input
                    type="checkbox"
                    disabled={r.isLocked}
                    checked={r.isLocked || protect.includes(r.id)}
                    onChange={(ev) =>
                      setProtect((ids) =>
                        ev.target.checked
                          ? [...ids, r.id]
                          : ids.filter((id) => id !== r.id),
                      )
                    }
                  />
                  {r.title}
                  {r.isLocked ? " · already locked" : ""}
                </label>
              ),
            )}
          </details>
          <button
            className="button primary"
            disabled={m.busy}
            onClick={preview}
          >
            <GitBranch size={15} />
            {m.busy ? "Reviewing…" : "Preview the impact"}
          </button>
        </section>
        <section className="card">
          <h2>What stays protected</h2>
          <p className="muted">
            Locked unit prices and your vendor selections remain intact.
            Per-guest estimates follow the approved guest count, including on a
            locked price line.
          </p>
          <div className="notice">
            Every approval checks the saved event version, resource locks, and
            budget constraints again inside one database transaction.
          </div>
          <p className="muted">
            If another edit changes this event, recompute the proposal.
            Reversals require a new preview and approval; history remains
            intact.
          </p>
          <p className="muted">
            Task deadlines are not automatically shifted. Open tasks are listed
            for your review.
          </p>
        </section>
      </div>
      <ErrorNotice
        error={m.error ?? resource.error}
        retry={async () => {
          await reload();
          await resource.reload();
        }}
      />
      {feedback && (
        <div className="notice" role="status">
          {feedback}
        </div>
      )}
      {proposal && (
        <section className="card section-gap">
          <div className="row-between">
            <h2>Review the proposed change</h2>
            <span className="badge">
              {proposal.status} · version {proposal.baseVersion}
            </span>
          </div>
          {stale && (
            <div className="notice error" role="alert">
              This proposal is stale. Event version {e.version} differs from
              version {proposal.baseVersion}. Recompute before approving.
            </div>
          )}
          {expired && (
            <div className="notice warning">
              This proposal has expired. Preview a fresh change.
            </div>
          )}
          <div className="compare">
            <div>
              <small>Before · projected estimate</small>
              <strong>{formatMoney(proposal.before.projectedMinor)}</strong>
              <small>
                Remaining {formatMoney(proposal.before.remainingMinor)}
              </small>
            </div>
            <ArrowRight size={20} />
            <div>
              <small>After · projected estimate</small>
              <strong>{formatMoney(proposal.effects.projectedMinor)}</strong>
              <small className={proposal.effects.overBudget ? "negative" : ""}>
                Remaining {formatMoney(proposal.effects.remainingMinor)}
              </small>
            </div>
          </div>
          <div className="notice">
            <strong>
              Estimate change: {BigInt(proposal.deltaMinor) >= 0n ? "+" : ""}
              {formatMoney(proposal.deltaMinor)}
            </strong>
            <p>{proposal.explanation}</p>
          </div>
          <h3>Exactly what will change</h3>
          {proposal.operations.map((op) => (
            <div className="list-row" key={op.id}>
              <div>
                <strong>
                  {op.kind === "set_event_guest_count"
                    ? "Expected guest count"
                    : (state.budgetItems.find((b) => b.id === op.budgetItemId)
                        ?.title ?? "Catering unit price")}
                </strong>
                <p style={{ margin: "5px 0 0" }}>
                  {op.kind === "set_event_guest_count"
                    ? `${op.oldValue} → ${op.newValue} guests`
                    : `${formatMoney(op.oldValue)} → ${formatMoney(op.newValue)}`}
                </p>
              </div>
              <span className="badge">Required operation</span>
            </div>
          ))}
          {proposal.warnings.map((w, i) => (
            <div
              className={`notice ${w.code === "BUDGET_CONSTRAINT_UNRESOLVED" ? "error" : "warning"}`}
              key={i}
            >
              <strong>{w.code.replaceAll("_", " ")}</strong>
              <p>{w.message}</p>
            </div>
          ))}
          {proposal.affectedTasks.length > 0 && (
            <div className="section-gap">
              <h3>Open tasks to review</h3>
              <ul>
                {proposal.affectedTasks.map((id) => (
                  <li key={id}>
                    {state.tasks.find((t) => t.id === id)?.title ?? id}
                  </li>
                ))}
              </ul>
              <small>
                These tasks are flagged for review; this proposal does not edit
                them.
              </small>
            </div>
          )}
          <div className="actions section-gap">
            <button
              className="button primary"
              disabled={!canApprove || m.busy}
              onClick={() => setConfirm(true)}
            >
              Review approval <ArrowRight size={15} />
            </button>
            <button
              className="button"
              disabled={
                proposal.status !== "pending" || !!stale || !!expired || m.busy
              }
              onClick={() => decide("reject")}
            >
              Reject proposal
            </button>
            <button
              className="button"
              disabled={!!stale || m.busy}
              onClick={explain}
            >
              <Sparkles size={14} />
              Ask AI to explain
            </button>
            <button
              className="button ghost"
              disabled={m.busy}
              onClick={preview}
            >
              <RefreshCw size={14} />
              Recompute
            </button>
          </div>
          {explanation && (
            <div className="notice">
              <h3>AI’s nonbinding explanation</h3>
              {explanation.provenance && (
                <small>
                  Provider: {explanation.provenance.provider} · Model:{" "}
                  {explanation.provenance.actualModel ??
                    `requested ${explanation.provenance.requestedModel}`}
                  {explanation.provenance.fallbackOccurred
                    ? " · Approved fallback used"
                    : ""}
                </small>
              )}
              <p>{explanation.explanation}</p>
              <ul>
                {[...explanation.suggestions, ...explanation.questions].map(
                  (text, i) => (
                    <li key={i}>{text}</li>
                  ),
                )}
              </ul>
              <small>
                Authoritative totals and operations are shown above.
              </small>
            </div>
          )}
        </section>
      )}
      <Modal
        title="Approve these changes?"
        description="This will atomically apply every listed operation and record the change in event history."
        open={confirm}
        onOpenChange={setConfirm}
      >
        {proposal && (
          <>
            <p>
              {proposal.operations.length} required operations · Event version{" "}
              {proposal.baseVersion}
            </p>
            <p>
              New estimate:{" "}
              <strong>{formatMoney(proposal.effects.projectedMinor)}</strong>
              <br />
              Remaining budget:{" "}
              <strong>{formatMoney(proposal.effects.remainingMinor)}</strong>
            </p>
            <ErrorNotice error={m.error} />
            <button
              className="button primary"
              disabled={!canApprove || m.busy}
              onClick={() => decide("approve")}
            >
              {m.busy ? "Applying changes…" : "Approve and save changes"}
            </button>
          </>
        )}
      </Modal>
    </>
  );
}
