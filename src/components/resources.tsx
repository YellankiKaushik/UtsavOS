"use client";
import { useState } from "react";
import { localToInstant } from "@/domain/dates";
import {
  Plus,
  Pencil,
  LockKeyhole,
  LockOpen,
  Trash2,
  Coins,
  CalendarDays,
} from "lucide-react";
import {
  budgetFields,
  taskFields,
  vendorFields,
  type BudgetItem,
  type EventSnapshot,
  type Task,
  type Vendor,
} from "@/domain/contracts";
import {
  formatMoney,
  lineTotal,
  minorToRupees,
  rupeesToMinor,
} from "@/domain/money";
import { BudgetStats } from "./planner";
import {
  dateLabel,
  localDateValue,
  Modal,
  Field,
  Empty,
  ErrorNotice,
  useMutation,
} from "./ui";
type Props = { state: EventSnapshot; reload: () => Promise<void> };
export function BudgetPage({ state, reload }: Props) {
  const [editing, setEditing] = useState<BudgetItem | null | undefined>(
      undefined,
    ),
    [filter, setFilter] = useState("all"),
    m = useMutation();
  const e = state.event,
    items = state.budgetItems.filter(
      (b) => filter === "all" || b.category === filter,
    );
  async function unlock(item: BudgetItem) {
    const r = await m.mutate(
      `events/${e.id}/budget-items/${item.id}`,
      { expectedVersion: e.version, fields: { isLocked: false } },
      "PATCH",
    );
    if (r) await reload();
  }
  async function remove(item: BudgetItem) {
    if (
      !window.confirm(
        `Archive “${item.title}” from the active estimate? This will be recorded in history.`,
      )
    )
      return;
    const r = await m.mutate(
      `events/${e.id}/budget-items/${item.id}`,
      { expectedVersion: e.version },
      "DELETE",
    );
    if (r) await reload();
  }
  return (
    <>
      <BudgetStats state={state} />
      <div className="row-between tab-header">
        <div>
          <h2 style={{ marginBottom: 4 }}>A budget with breathing room.</h2>
          <small>Estimates only. No payments or bookings are recorded.</small>
        </div>
        <div className="actions">
          <select
            className="button"
            aria-label="Filter budget category"
            value={filter}
            onChange={(ev) => setFilter(ev.target.value)}
          >
            <option value="all">All categories</option>
            {[...new Set(state.budgetItems.map((i) => i.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button className="button primary" onClick={() => setEditing(null)}>
            <Plus size={15} />
            Add expense
          </button>
        </div>
      </div>
      <ErrorNotice error={m.error} retry={reload} />
      {items.length ? (
        <section className="card" style={{ padding: 0 }}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Expense / source</th>
                  <th>Basis</th>
                  <th>Unit price</th>
                  <th>Quantity</th>
                  <th>Estimate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="cell-title">{b.title}</span>
                      <span className="cell-note">
                        {b.category} ·{" "}
                        {b.sourceKind === "ai_estimate"
                          ? "AI assumption — confirm"
                          : b.sourceKind === "vendor_quote"
                            ? "User-supplied quote"
                            : "Your estimate"}
                      </span>
                      {b.sourceLabel && (
                        <span className="cell-note">{b.sourceLabel}</span>
                      )}
                      {b.isLocked && (
                        <span className="badge" style={{ marginTop: 5 }}>
                          <LockKeyhole size={11} />
                          Locked
                        </span>
                      )}
                    </td>
                    <td>{b.pricingBasis.replace("_", " ")}</td>
                    <td>{formatMoney(b.unitPriceMinor)}</td>
                    <td>
                      {b.pricingBasis === "fixed"
                        ? 1
                        : b.pricingBasis === "per_guest"
                          ? e.guestCount
                          : b.quantity}
                    </td>
                    <td>
                      <strong>
                        {formatMoney(lineTotal(b, e.guestCount).toString())}
                      </strong>
                    </td>
                    <td>
                      <div className="actions">
                        {b.isLocked ? (
                          <button
                            className="icon-button"
                            disabled={m.busy}
                            onClick={() => unlock(b)}
                            aria-label={`Unlock ${b.title}`}
                          >
                            <LockOpen size={15} />
                          </button>
                        ) : (
                          <>
                            <button
                              className="icon-button"
                              onClick={() => setEditing(b)}
                              aria-label={`Edit ${b.title}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-button"
                              disabled={m.busy}
                              onClick={() => remove(b)}
                              aria-label={`Archive ${b.title}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <Empty
          title="Start with what you know."
          text="Add a fixed cost, a per-guest estimate, or a per-unit expense. Totals are calculated from your saved details."
          onAdd={() => setEditing(null)}
          label="Add an expense"
        />
      )}
      <div className="notice">
        <Coins size={15} style={{ display: "inline", marginRight: 7 }} />
        Locked prices stay protected. Per-guest totals still change when you
        approve a guest-count replan.
      </div>
      <Modal
        title={editing ? "Edit expense" : "A new expense"}
        description="Enter a planning estimate or a user-supplied quote. Every amount is stored exactly in paise."
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        {editing !== undefined && (
          <BudgetEditor
            key={`${editing?.id ?? "new"}-${e.version}`}
            state={state}
            item={editing}
            onSaved={async () => {
              setEditing(undefined);
              await reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}
function BudgetEditor({
  state,
  item,
  onSaved,
}: {
  state: EventSnapshot;
  item: BudgetItem | null;
  onSaved: () => Promise<void>;
}) {
  const [basis, setBasis] = useState(item?.pricingBasis ?? "fixed"),
    m = useMutation();
  async function submit(f: FormData) {
    try {
      const fields = budgetFields.parse({
        title: f.get("title"),
        category: f.get("category"),
        pricingBasis: basis,
        unitPriceMinor: rupeesToMinor(String(f.get("price"))),
        quantity: basis === "per_unit" ? Number(f.get("quantity")) : null,
        sourceKind: f.get("source"),
        sourceLabel: String(f.get("sourceLabel")) || null,
        isLocked: f.get("locked") === "on",
      });
      const r = await m.mutate(
        `events/${state.event.id}/budget-items${item ? `/${item.id}` : ""}`,
        { expectedVersion: state.event.version, fields },
        item ? "PATCH" : "POST",
      );
      if (r) await onSaved();
    } catch (e) {
      m.setError(e instanceof Error ? e : new Error("Invalid expense"));
    }
  }
  return (
    <form action={submit}>
      <Field label="Expense name" id="b-title">
        <input
          id="b-title"
          name="title"
          required
          maxLength={140}
          defaultValue={item?.title}
        />
      </Field>
      <Field label="Category" id="b-category">
        <input
          id="b-category"
          name="category"
          required
          maxLength={80}
          defaultValue={item?.category ?? "catering"}
          list="budget-categories"
        />
        <datalist id="budget-categories">
          {[
            "catering",
            "venue",
            "decor",
            "photography",
            "music",
            "transport",
            "gifts",
            "other",
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </datalist>
      </Field>
      <div className="grid two">
        <Field label="Pricing basis" id="b-basis">
          <select
            id="b-basis"
            value={basis}
            onChange={(e) => setBasis(e.target.value as typeof basis)}
          >
            <option value="fixed">Fixed total</option>
            <option value="per_guest">Per guest</option>
            <option value="per_unit">Per unit</option>
          </select>
        </Field>
        <Field
          label={basis === "fixed" ? "Total estimate (₹)" : "Unit price (₹)"}
          id="b-price"
        >
          <input
            id="b-price"
            name="price"
            required
            inputMode="decimal"
            defaultValue={minorToRupees(item?.unitPriceMinor ?? "0")}
          />
        </Field>
      </div>
      {basis === "per_unit" && (
        <Field label="Quantity" id="b-quantity">
          <input
            id="b-quantity"
            name="quantity"
            type="number"
            min={0}
            max={100000}
            step={1}
            required
            defaultValue={item?.quantity ?? 1}
          />
        </Field>
      )}
      {basis === "per_guest" && (
        <p className="notice">
          Quantity comes from your {state.event.guestCount} expected guests.
        </p>
      )}
      <Field label="Estimate source" id="b-source">
        <select
          id="b-source"
          name="source"
          defaultValue={item?.sourceKind ?? "user_estimate"}
        >
          <option value="user_estimate">My estimate</option>
          <option value="vendor_quote">User-supplied quote</option>
          {item?.sourceKind === "ai_estimate" && (
            <option value="ai_estimate">AI estimate — unverified</option>
          )}
        </select>
      </Field>
      <Field label="Source reference (optional)" id="b-reference">
        <input
          id="b-reference"
          name="sourceLabel"
          maxLength={500}
          defaultValue={item?.sourceLabel ?? ""}
        />
      </Field>
      <label className="check">
        <input type="checkbox" name="locked" defaultChecked={item?.isLocked} />
        Lock this expense against automatic price changes
      </label>
      <ErrorNotice error={m.error} />
      <button className="button primary" disabled={m.busy}>
        {m.busy ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}
export function TasksPage({ state, reload }: Props) {
  const [editing, setEditing] = useState<Task | null | undefined>(undefined),
    [filter, setFilter] = useState("all"),
    m = useMutation(),
    e = state.event;
  const tasks = state.tasks.filter(
      (t) => filter === "all" || t.status === filter,
    ),
    groups = [
      {
        label: `Scheduled · ${e.timeZone}`,
        items: tasks
          .filter((t) => t.dueAt)
          .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!)),
      },
      { label: "Date to be decided", items: tasks.filter((t) => !t.dueAt) },
    ];
  async function toggle(task: Task) {
    const { id, ...fields } = task;
    const r = await m.mutate(
      `events/${e.id}/tasks/${id}`,
      {
        expectedVersion: e.version,
        fields: { ...fields, status: task.status === "done" ? "todo" : "done" },
      },
      "PATCH",
    );
    if (r) await reload();
  }
  async function unlock(task: Task) {
    const r = await m.mutate(
      `events/${e.id}/tasks/${task.id}`,
      { expectedVersion: e.version, fields: { isLocked: false } },
      "PATCH",
    );
    if (r) await reload();
  }
  async function remove(task: Task) {
    if (
      !window.confirm(
        `Delete “${task.title}”? Remove dependent task links first.`,
      )
    )
      return;
    const r = await m.mutate(
      `events/${e.id}/tasks/${task.id}`,
      { expectedVersion: e.version },
      "DELETE",
    );
    if (r) await reload();
  }
  return (
    <>
      <div className="row-between tab-header">
        <div>
          <h2 style={{ marginBottom: 5 }}>One thoughtful step at a time.</h2>
          <small>
            {state.tasks.filter((t) => t.status === "done").length} of{" "}
            {state.tasks.length} tasks complete · No reminders are sent.
          </small>
        </div>
        <div className="actions">
          <select
            aria-label="Filter task status"
            className="button"
            value={filter}
            onChange={(ev) => setFilter(ev.target.value)}
          >
            {["all", "todo", "in_progress", "done", "blocked"].map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button className="button primary" onClick={() => setEditing(null)}>
            <Plus size={15} />
            Add task
          </button>
        </div>
      </div>
      <ErrorNotice error={m.error} retry={reload} />
      {!tasks.length ? (
        <Empty
          title="Make the next step a clear one."
          text="Add tasks, set deadlines, and connect dependencies. Tasks without a date have their own place."
          onAdd={() => setEditing(null)}
          label="Add a task"
        />
      ) : (
        groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section className="card section-gap" key={g.label}>
              <div className="eyebrow">{g.label}</div>
              {g.items.map((t) => (
                <article className="list-row" key={t.id}>
                  <button
                    className="icon-button"
                    disabled={t.isLocked || m.busy}
                    onClick={() => toggle(t)}
                    aria-label={`${t.status === "done" ? "Reopen" : "Complete"} ${t.title}`}
                  >
                    <span aria-hidden="true">
                      {t.status === "done" ? "✓" : "○"}
                    </span>
                  </button>
                  <div className="list-main">
                    <h3
                      style={{
                        textDecoration:
                          t.status === "done" ? "line-through" : "none",
                      }}
                    >
                      {t.title}
                    </h3>
                    <small>
                      {t.dueAt
                        ? dateLabel(t.dueAt, e.timeZone)
                        : "Deadline undecided"}{" "}
                      · {t.priority} priority
                    </small>
                    {t.description && (
                      <p style={{ fontSize: 12, margin: "8px 0 0" }}>
                        {t.description}
                      </p>
                    )}
                    {t.dependencyIds.length > 0 && (
                      <p
                        className="muted"
                        style={{ fontSize: 11, margin: "7px 0 0" }}
                      >
                        Depends on:{" "}
                        {t.dependencyIds
                          .map(
                            (id) =>
                              state.tasks.find((x) => x.id === id)?.title ?? id,
                          )
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="badge">{t.status.replace("_", " ")}</span>
                  <div className="actions">
                    {t.isLocked ? (
                      <button
                        className="icon-button"
                        disabled={m.busy}
                        onClick={() => unlock(t)}
                        aria-label={`Unlock ${t.title}`}
                      >
                        <LockOpen size={15} />
                      </button>
                    ) : (
                      <>
                        <button
                          className="icon-button"
                          onClick={() => setEditing(t)}
                          aria-label={`Edit ${t.title}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={m.busy}
                          onClick={() => remove(t)}
                          aria-label={`Delete ${t.title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </section>
          ))
      )}
      <Modal
        title={editing ? "Edit task" : "A new step in the plan"}
        description={`Deadlines are entered in ${e.timeZone}. Dependency cycles are rejected before saving.`}
        open={editing !== undefined}
        onOpenChange={(v) => {
          if (!v) setEditing(undefined);
        }}
      >
        {editing !== undefined && (
          <TaskEditor
            key={`${editing?.id ?? "new"}-${e.version}`}
            item={editing}
            state={state}
            onSaved={async () => {
              setEditing(undefined);
              await reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}
function TaskEditor({
  state,
  item,
  onSaved,
}: {
  state: EventSnapshot;
  item: Task | null;
  onSaved: () => Promise<void>;
}) {
  const m = useMutation();
  async function submit(f: FormData) {
    try {
      const fields = taskFields.parse({
        title: f.get("title"),
        description: String(f.get("description")) || null,
        status: f.get("status"),
        priority: f.get("priority"),
        dueAt: f.get("due")
          ? localToInstant(String(f.get("due")), state.event.timeZone)
          : null,
        isLocked: f.get("locked") === "on",
        dependencyIds: f.getAll("dependencies"),
      });
      const r = await m.mutate(
        `events/${state.event.id}/tasks${item ? `/${item.id}` : ""}`,
        { expectedVersion: state.event.version, fields },
        item ? "PATCH" : "POST",
      );
      if (r) await onSaved();
    } catch (e) {
      m.setError(e instanceof Error ? e : new Error("Invalid task"));
    }
  }
  return (
    <form action={submit}>
      <Field label="Task name" id="t-title">
        <input
          id="t-title"
          name="title"
          required
          maxLength={200}
          defaultValue={item?.title}
        />
      </Field>
      <Field label="Details (optional)" id="t-description">
        <textarea
          id="t-description"
          name="description"
          maxLength={4000}
          defaultValue={item?.description ?? ""}
        />
      </Field>
      <div className="grid two">
        <Field label="Status" id="t-status">
          <select
            id="t-status"
            name="status"
            defaultValue={item?.status ?? "todo"}
          >
            {["todo", "in_progress", "done", "blocked"].map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority" id="t-priority">
          <select
            id="t-priority"
            name="priority"
            defaultValue={item?.priority ?? "normal"}
          >
            {["low", "normal", "high"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        label={`Deadline (${state.event.timeZone})`}
        id="t-due"
        hint="Leave empty if undecided."
      >
        <input
          id="t-due"
          name="due"
          type="datetime-local"
          defaultValue={localDateValue(
            item?.dueAt ?? null,
            state.event.timeZone,
          )}
        />
      </Field>
      <fieldset
        style={{
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: 15,
          marginBottom: 18,
        }}
      >
        <legend>Depends on</legend>
        {state.tasks.filter((t) => t.id !== item?.id).length ? (
          state.tasks
            .filter((t) => t.id !== item?.id)
            .map((t) => (
              <label className="check" key={t.id}>
                <input
                  name="dependencies"
                  type="checkbox"
                  value={t.id}
                  defaultChecked={item?.dependencyIds.includes(t.id)}
                />
                {t.title}
              </label>
            ))
        ) : (
          <small>No other tasks yet.</small>
        )}
      </fieldset>
      <label className="check">
        <input name="locked" type="checkbox" defaultChecked={item?.isLocked} />
        Lock this task
      </label>
      <ErrorNotice error={m.error} />
      <button className="button primary" disabled={m.busy}>
        {m.busy ? "Saving…" : "Save task"}
      </button>
    </form>
  );
}
export function VendorsPage({ state, reload }: Props) {
  const [editing, setEditing] = useState<Vendor | null | undefined>(undefined),
    m = useMutation(),
    e = state.event;
  async function unlock(v: Vendor) {
    const r = await m.mutate(
      `events/${e.id}/vendor-requirements/${v.id}`,
      { expectedVersion: e.version, fields: { isLocked: false } },
      "PATCH",
    );
    if (r) await reload();
  }
  async function remove(v: Vendor) {
    if (!window.confirm(`Remove “${v.title}” from the checklist?`)) return;
    const r = await m.mutate(
      `events/${e.id}/vendor-requirements/${v.id}`,
      { expectedVersion: e.version },
      "DELETE",
    );
    if (r) await reload();
  }
  return (
    <>
      <div className="row-between tab-header">
        <div>
          <h2 style={{ marginBottom: 5 }}>
            The people behind your celebration.
          </h2>
          <small>
            Manual requirements and user-entered statuses. No availability
            checks or bookings.
          </small>
        </div>
        <button className="button primary" onClick={() => setEditing(null)}>
          <Plus size={15} />
          Add vendor requirement
        </button>
      </div>
      <ErrorNotice error={m.error} retry={reload} />
      {state.vendors.length ? (
        <div className="grid two">
          {state.vendors.map((v) => (
            <article className="card" key={v.id}>
              <div className="row-between">
                <span className="badge">{v.category}</span>
                {v.isLocked && <LockKeyhole size={15} aria-label="Locked" />}
              </div>
              <h2 style={{ margin: "18px 0 12px" }}>{v.title}</h2>
              <span className="badge warm">
                {v.status === "confirmed"
                  ? "Confirmed by you"
                  : v.status.replaceAll("_", " ")}
              </span>
              {v.notes && (
                <p className="muted" style={{ margin: "18px 0", fontSize: 12 }}>
                  {v.notes}
                </p>
              )}
              <p className="muted" style={{ fontSize: 11 }}>
                {v.quoteSource
                  ? `Source: ${v.quoteSource}`
                  : "No quote source supplied"}
              </p>
              {v.estimatedCostMinor && (
                <p style={{ fontSize: 12 }}>
                  Checklist estimate: {formatMoney(v.estimatedCostMinor)}
                  <br />
                  <small>
                    Add a budget line to include this in your projected total.
                  </small>
                </p>
              )}
              {v.dueAt && (
                <p className="muted" style={{ fontSize: 11 }}>
                  <CalendarDays
                    size={12}
                    style={{ display: "inline", marginRight: 6 }}
                  />
                  {dateLabel(v.dueAt, e.timeZone)}
                </p>
              )}
              <div className="actions section-gap">
                {v.isLocked ? (
                  <button
                    className="button"
                    disabled={m.busy}
                    onClick={() => unlock(v)}
                  >
                    <LockOpen size={14} />
                    Unlock requirement
                  </button>
                ) : (
                  <>
                    <button className="button" onClick={() => setEditing(v)}>
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      className="icon-button"
                      disabled={m.busy}
                      onClick={() => remove(v)}
                      aria-label={`Remove ${v.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="A place for every requirement."
          text="Start with a caterer, venue, or photographer. Keep research and confirmations in one checklist."
          onAdd={() => setEditing(null)}
          label="Add a vendor requirement"
        />
      )}
      <Modal
        title={
          editing
            ? "Edit vendor requirement"
            : "Who does your celebration need?"
        }
        description="This checklist does not verify a provider’s availability, quote, or legal commitment."
        open={editing !== undefined}
        onOpenChange={(v) => {
          if (!v) setEditing(undefined);
        }}
      >
        {editing !== undefined && (
          <VendorEditor
            key={`${editing?.id ?? "new"}-${e.version}`}
            item={editing}
            state={state}
            onSaved={async () => {
              setEditing(undefined);
              await reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}
function VendorEditor({
  state,
  item,
  onSaved,
}: {
  state: EventSnapshot;
  item: Vendor | null;
  onSaved: () => Promise<void>;
}) {
  const m = useMutation();
  async function submit(f: FormData) {
    try {
      const fields = vendorFields.parse({
        title: f.get("title"),
        category: f.get("category"),
        status: f.get("status"),
        notes: String(f.get("notes")) || null,
        quoteSource: String(f.get("source")) || null,
        isLocked: f.get("locked") === "on",
        estimatedCostMinor: f.get("estimate")
          ? rupeesToMinor(String(f.get("estimate")))
          : null,
        dueAt: f.get("due")
          ? localToInstant(String(f.get("due")), state.event.timeZone)
          : null,
      });
      const r = await m.mutate(
        `events/${state.event.id}/vendor-requirements${item ? `/${item.id}` : ""}`,
        { expectedVersion: state.event.version, fields },
        item ? "PATCH" : "POST",
      );
      if (r) await onSaved();
    } catch (e) {
      m.setError(e instanceof Error ? e : new Error("Invalid requirement"));
    }
  }
  return (
    <form action={submit}>
      <Field label="Requirement name" id="v-title">
        <input
          id="v-title"
          name="title"
          required
          maxLength={140}
          defaultValue={item?.title}
        />
      </Field>
      <Field label="Category" id="v-category">
        <input
          id="v-category"
          name="category"
          required
          maxLength={80}
          defaultValue={item?.category ?? "catering"}
        />
      </Field>
      <Field label="Checklist status" id="v-status">
        <select
          id="v-status"
          name="status"
          defaultValue={item?.status ?? "needed"}
        >
          {[
            "needed",
            "researching",
            "shortlisted",
            "confirmed",
            "not_needed",
          ].map((s) => (
            <option key={s} value={s}>
              {s === "confirmed"
                ? "Confirmed by me (user-entered)"
                : s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes (optional)" id="v-notes">
        <textarea
          id="v-notes"
          name="notes"
          maxLength={4000}
          defaultValue={item?.notes ?? ""}
        />
      </Field>
      <Field label="Quote source (optional)" id="v-source">
        <input
          id="v-source"
          name="source"
          maxLength={500}
          defaultValue={item?.quoteSource ?? ""}
        />
      </Field>
      <Field
        label="Checklist estimate (₹, optional)"
        id="v-estimate"
        hint="This does not create a budget expense. Add one in Budget when ready."
      >
        <input
          id="v-estimate"
          name="estimate"
          inputMode="decimal"
          defaultValue={
            item?.estimatedCostMinor
              ? minorToRupees(item.estimatedCostMinor)
              : ""
          }
        />
      </Field>
      <Field label={`Deadline (${state.event.timeZone}, optional)`} id="v-due">
        <input
          id="v-due"
          name="due"
          type="datetime-local"
          defaultValue={localDateValue(
            item?.dueAt ?? null,
            state.event.timeZone,
          )}
        />
      </Field>
      <label className="check">
        <input type="checkbox" name="locked" defaultChecked={item?.isLocked} />
        Protect this selection from changes
      </label>
      <ErrorNotice error={m.error} />
      <button className="button primary" disabled={m.busy}>
        {m.busy ? "Saving…" : "Save requirement"}
      </button>
    </form>
  );
}
