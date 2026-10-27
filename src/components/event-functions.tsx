"use client";
import { useState } from "react";
import type { EventSnapshot } from "@/domain/contracts";
import {
  functionFields,
  type EventFunction,
  type FunctionList,
} from "@/domain/event-functions";
import { localToInstant } from "@/domain/dates";
import {
  Field,
  Modal,
  ErrorNotice,
  Loading,
  Empty,
  dateLabel,
  localDateValue,
  useResource,
  useMutation,
} from "./ui";
export function EventFunctionsPage({
  state,
  reload,
}: {
  state: EventSnapshot;
  reload: () => Promise<void>;
}) {
  const list = useResource<FunctionList>(`events/${state.event.id}/functions`);
  const [editing, setEditing] = useState<EventFunction | null | undefined>();
  const m = useMutation();
  const [pendingLink, setPendingLink] = useState<{
    functionId: string;
    resourceId: string;
    assigned: boolean;
  } | null>(null);
  async function refresh() {
    await Promise.all([list.reload(), reload()]);
  }
  async function archive(f: EventFunction) {
    if (!window.confirm(`Archive “${f.title}”? Unassign its resources first.`))
      return;
    if (
      await m.mutate(
        `events/${state.event.id}/functions/${f.id}`,
        { expectedVersion: list.data?.eventVersion },
        "DELETE",
      )
    )
      await refresh();
  }
  async function link(
    f: EventFunction,
    kind: string,
    resourceId: string,
    assigned: boolean,
  ) {
    setPendingLink({ functionId: f.id, resourceId, assigned });
    try {
      if (
        await m.mutate(`events/${state.event.id}/functions/${f.id}/resources`, {
          expectedVersion: list.data?.eventVersion,
          kind,
          resourceId,
          assigned,
        })
      )
        await refresh();
    } finally {
      setPendingLink(null);
    }
  }
  if (list.loading && !list.data) return <Loading />;
  return (
    <>
      <div className="notice">
        P1 preview · Separate schedules share this event’s budget. Assigning
        resources does not duplicate costs or change task deadlines. Each
        resource belongs to one function; assigning it here moves its previous
        assignment.
      </div>
      <div className="row-between tab-header">
        <h2>Celebration functions</h2>
        <button
          className="button primary"
          disabled={m.busy}
          onClick={() => setEditing(null)}
        >
          Add function
        </button>
      </div>
      <ErrorNotice error={list.error ?? m.error} retry={refresh} />
      {m.busy && <p role="status">Saving function changes…</p>}
      {!list.data?.items.length ? (
        <Empty
          title="Plan each part of your celebration"
          text="Add a ceremony, reception or community activity with its own schedule."
        />
      ) : (
        list.data.items.map((f) => (
          <section className="card" key={f.id} style={{ marginBottom: 16 }}>
            <div className="row-between">
              <div>
                <h3>{f.title}</h3>
                <span className="badge">{f.status}</span>
              </div>
              <div className="actions">
                <button
                  className="button"
                  disabled={m.busy}
                  onClick={() => setEditing(f)}
                >
                  Edit <span className="sr-only">{f.title}</span>
                </button>
                <button
                  className="button"
                  disabled={m.busy}
                  onClick={() => archive(f)}
                >
                  Archive <span className="sr-only">{f.title}</span>
                </button>
              </div>
            </div>
            <p>
              {dateLabel(f.startsAt, f.timeZone)}
              {f.endsAt ? ` → ${dateLabel(f.endsAt, f.timeZone)}` : ""} ·{" "}
              {f.timeZone}
            </p>
            <p>{f.notes}</p>
            {(
              [
                ["task", "Tasks", state.tasks, f.resources.tasks],
                [
                  "budget",
                  "Expenses",
                  state.budgetItems.filter((b) => b.state === "active"),
                  f.resources.budgetItems,
                ],
                ["vendor", "Vendors", state.vendors, f.resources.vendors],
              ] as const
            ).map(([kind, label, records, assigned]) => (
              <fieldset key={kind} style={{ marginTop: 16, padding: 12 }}>
                <legend>{label}</legend>
                {records.length ? (
                  records.map((r) => (
                    <label className="check" key={r.id}>
                      <input
                        type="checkbox"
                        checked={
                          pendingLink?.functionId === f.id &&
                          pendingLink.resourceId === r.id
                            ? pendingLink.assigned
                            : assigned.includes(r.id)
                        }
                        disabled={m.busy || ("isLocked" in r && r.isLocked)}
                        onChange={(ev) =>
                          link(f, kind, r.id, ev.target.checked)
                        }
                      />
                      {r.title}
                      {"isLocked" in r && r.isLocked ? " · locked" : ""}
                    </label>
                  ))
                ) : (
                  <small>No {label.toLowerCase()} added yet.</small>
                )}
              </fieldset>
            ))}
          </section>
        ))
      )}
      <Modal
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
        title={editing ? "Edit function" : "Add function"}
        description="Use an independent schedule and time zone; leave dates undecided when unknown."
      >
        <FunctionEditor
          key={editing?.id ?? "new"}
          initial={editing ?? null}
          zone={state.event.timeZone}
          busy={m.busy}
          save={async (fields) => {
            const result = await m.mutate(
              `events/${state.event.id}/functions${editing ? `/${editing.id}` : ""}`,
              { expectedVersion: list.data?.eventVersion, fields },
              editing ? "PATCH" : "POST",
            );
            if (result) {
              setEditing(undefined);
              await refresh();
            }
          }}
          error={m.error}
        />
      </Modal>
    </>
  );
}
function FunctionEditor({
  initial,
  zone,
  busy,
  save,
  error,
}: {
  initial: EventFunction | null;
  zone: string;
  busy: boolean;
  save: (fields: ReturnType<typeof functionFields.parse>) => Promise<void>;
  error: Error | null;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [timeZone, setTimeZone] = useState(initial?.timeZone ?? zone);
  const [start, setStart] = useState(
    localDateValue(initial?.startsAt ?? null, timeZone),
  );
  const [end, setEnd] = useState(
    localDateValue(initial?.endsAt ?? null, timeZone),
  );
  const [status, setStatus] = useState(initial?.status ?? "planned");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [validation, setValidation] = useState<Error | null>(null);
  return (
    <form
      onSubmit={async (ev) => {
        ev.preventDefault();
        try {
          const fields = functionFields.parse({
            title,
            timeZone,
            startsAt: start ? localToInstant(start, timeZone) : null,
            endsAt: end ? localToInstant(end, timeZone) : null,
            status,
            notes,
          });
          setValidation(null);
          await save(fields);
        } catch {
          setValidation(
            new Error(
              "Check the title, time zone and schedule. The end must follow the start.",
            ),
          );
        }
      }}
    >
      <ErrorNotice error={validation ?? error} />
      <Field label="Function name" id="function-title">
        <input
          id="function-title"
          required
          maxLength={140}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="Function time zone" id="function-zone">
        <input
          id="function-zone"
          required
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          maxLength={100}
        />
      </Field>
      <Field label="Starts (optional local time)" id="function-start">
        <input
          id="function-start"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </Field>
      <Field label="Ends (optional local time)" id="function-end">
        <input
          id="function-end"
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </Field>
      <Field label="Function status" id="function-status">
        <select
          id="function-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          {["planned", "active", "completed", "cancelled"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Function notes" id="function-notes">
        <textarea
          id="function-notes"
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <button className="button primary" disabled={busy} type="submit">
        {busy ? "Saving…" : "Save function"}
      </button>
    </form>
  );
}
