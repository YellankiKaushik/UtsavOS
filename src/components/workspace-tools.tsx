"use client";
import Link from "next/link";
import { useState } from "react";
import type {
  WorkspaceDashboard,
  LifecycleStatus,
} from "@/domain/workspace-tools";
import { ErrorNotice, Loading, Field, useResource, useMutation } from "./ui";
export function AccountDataRequest() {
  const request = useResource<{
      id: string | null;
      state: string;
      requestedAt: string | null;
      completed: false;
    }>("account/data-request"),
    mutation = useMutation();
  const [confirmed, setConfirmed] = useState(false);
  async function act(action: "request" | "cancel") {
    if (
      await mutation.mutate("account/data-request", { action, confirmed: true })
    ) {
      await request.reload();
      setConfirmed(false);
    }
  }
  return (
    <section className="card section-gap">
      <h2>Account deletion review</h2>
      <ErrorNotice
        error={request.error ?? mutation.error}
        retry={request.reload}
      />
      <p>
        Download each event export first. Account deletion requires operator
        review of ownership, financial retention, provider copies and backups.
        Submitting this request does not erase your login or stop a
        subscription.
      </p>
      {request.data && (
        <>
          <p role="status">
            Request state: {request.data.state.replaceAll("_", " ")}. Completion
            has not been confirmed.
          </p>
          {request.data.state !== "pending_review" ? (
            <>
              <label className="check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I request an account deletion review and understand that no
                account erasure is confirmed.
              </label>
              <button
                className="button"
                disabled={!confirmed || mutation.busy}
                onClick={() => act("request")}
              >
                Request account deletion review
              </button>
            </>
          ) : (
            <button
              className="button"
              disabled={mutation.busy}
              onClick={() => act("cancel")}
            >
              Cancel account deletion request
            </button>
          )}
        </>
      )}
    </section>
  );
}
export function ProfessionalDashboard() {
  const me = useResource<{
    workspaces: { id: string; name: string; canCreate?: boolean }[];
    features?: { workspaceDashboard: boolean };
  }>("me");
  const [selected, setSelected] = useState("");
  if (me.loading) return <Loading />;
  if (!me.data?.features?.workspaceDashboard)
    return (
      <>
        <h1>Workspace dashboard</h1>
        <p>This preview module is unavailable.</p>
      </>
    );
  const available = me.data.workspaces.filter((w) => w.canCreate !== false),
    id = selected || available[0]?.id;
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">Professional planning</div>
        <h1>Workspace dashboard</h1>
        <p>Event progress and server enforced usage limits.</p>
      </div>
      <ErrorNotice error={me.error} retry={me.reload} />
      <Field id="dashboard-workspace" label="Dashboard workspace">
        <select
          id="dashboard-workspace"
          value={id ?? ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          {available.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </Field>
      {id ? (
        <DashboardContent key={id} id={id} />
      ) : (
        <p>No managed workspace is available.</p>
      )}
    </>
  );
}
function DashboardContent({ id }: { id: string }) {
  const resource = useResource<WorkspaceDashboard>(
    `workspaces/${id}/dashboard`,
  );
  if (resource.loading) return <Loading />;
  const d = resource.data;
  return (
    <>
      <ErrorNotice error={resource.error} retry={resource.reload} />
      {d && (
        <>
          <section className="card">
            <h2>Plan & usage</h2>
            <p>
              {d.plan} ·{" "}
              {d.validUntil
                ? `valid until ${d.validUntil}`
                : "synthetic pilot limits"}
            </p>
            <p>
              Subscription purchases are unavailable. These limits do not
              represent a paid subscription.
            </p>
            <dl>
              <dt>Active celebrations</dt>
              <dd>
                {d.usage.activeEvents} / {d.limits.activeEvents}
              </dd>
              <dt>AI attempts today (UTC, including failures)</dt>
              <dd>
                {d.usage.aiAttemptsToday} / {d.limits.aiAttemptsPerUtcDay}
              </dd>
              <dt>Active team members</dt>
              <dd>
                {d.usage.members} / {d.limits.members}
              </dd>
              <dt>Private storage, including pending cleanup</dt>
              <dd>
                {d.usage.storageBytes} / {d.limits.storageBytes} bytes
              </dd>
            </dl>
          </section>
          <section className="card section-gap">
            <h2>Celebration progress</h2>
            {d.events.length ? (
              <ul>
                {d.events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/app/events/${e.id}`}>{e.title}</Link> ·{" "}
                    {e.status} · {e.incompleteTasks} unfinished tasks ·{" "}
                    {e.overdueTasks} overdue
                  </li>
                ))}
              </ul>
            ) : (
              <p>No active celebrations.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
export function EventDataPage({ id }: { id: string }) {
  const resource = useResource<LifecycleStatus>(`events/${id}/data-lifecycle`),
    mutation = useMutation();
  const [requestConfirmed, setRequestConfirmed] = useState(false),
    [eraseConfirmed, setEraseConfirmed] = useState(false);
  if (resource.loading) return <Loading />;
  const d = resource.data;
  async function act(action: "request_deletion" | "erase") {
    const result = await mutation.mutate(`events/${id}/data-lifecycle`, {
      action,
      expectedVersion: d?.eventVersion,
      confirmed: true,
    });
    if (result) {
      await resource.reload();
      mutation.setMessage(
        action === "erase"
          ? "Live operational data and private originals removed. Retained identifiers, audit metadata and provider backups are described below."
          : "Deletion request saved. Editing is frozen and RSVP links revoked.",
      );
    }
  }
  return (
    <>
      <h2>Export & data lifecycle</h2>
      <ErrorNotice
        error={resource.error ?? mutation.error}
        retry={resource.reload}
      />
      {mutation.message && (
        <p role="status" className="notice">
          {mutation.message}
        </p>
      )}
      {d && (
        <>
          <section className="card">
            <h3>Download your event</h3>
            <p>
              JSON includes planning, contacts, functions, financial records and
              document source text. Download private originals separately from
              Documents. Guest CSV protects spreadsheet cells from formula
              execution.
            </p>
            <div className="actions">
              <a className="button" href={`/api/v1/events/${id}/export`}>
                Download event JSON
              </a>
              <a
                className="button"
                href={`/api/v1/events/${id}/export?format=guests_csv`}
              >
                Download guest CSV
              </a>
            </div>
            <p>
              Correct event and guest details in their editors; update your
              profile in Settings. Saved financial history requires reversal or
              correction records.
            </p>
          </section>
          <section className="card section-gap">
            <h3>Deletion request</h3>
            <p>
              Current state: <strong>{d.state.replaceAll("_", " ")}</strong>.
              Private originals pending cleanup: {d.originalsPending}.
            </p>
            <p>
              Deletion freezes editing and revokes invitations immediately.
              Financial commitments or an in-flight AI attempt require retention
              review. Eligible events can then be erased from live operational
              tables and private Storage.
            </p>
            <p>
              Workspace membership, account identity, event identifiers, AI
              usage and redacted audit metadata remain. This action does not
              delete your login or provider backups. Account deletion, legal
              retention and backup expiry require the service operator&apos;s
              reviewed process before customer onboarding.
            </p>
            {d.state === "none" && (
              <>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={requestConfirmed}
                    onChange={(e) => setRequestConfirmed(e.target.checked)}
                  />
                  I saved my export and understand that editing will freeze and
                  invitation links will be revoked.
                </label>
                <button
                  className="button"
                  disabled={!requestConfirmed || mutation.busy}
                  onClick={() => act("request_deletion")}
                >
                  Request event deletion
                </button>
              </>
            )}
            {d.state === "pending_cleanup" && (
              <>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={eraseConfirmed}
                    onChange={(e) => setEraseConfirmed(e.target.checked)}
                  />
                  Permanently erase this event&apos;s live operational data and
                  private originals.
                </label>
                <button
                  className="button"
                  disabled={!eraseConfirmed || mutation.busy}
                  onClick={() => act("erase")}
                >
                  Erase eligible event data
                </button>
              </>
            )}
            {d.state === "retention_review" && (
              <p role="status">
                Retention review required. Financial records and originals
                remain protected; erasure is unavailable.
              </p>
            )}
            {d.state === "erased" && (
              <p role="status">
                Live operational erasure confirmed at {d.completedAt}. This is
                not a claim of account or backup deletion.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
