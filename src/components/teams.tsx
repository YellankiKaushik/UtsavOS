"use client";
import Link from "next/link";
import { useState } from "react";
import type { TeamWorkspace } from "@/domain/teams";
import { ErrorNotice, Field, Loading, useMutation, useResource } from "./ui";
const roles = ["planner_manager", "planner_member", "client_viewer"] as const;
export function TeamsPage() {
  const resource = useResource<{ items: TeamWorkspace[] }>("team");
  const mutation = useMutation();
  const [code, setCode] = useState("");
  async function submit(input: Record<string, unknown>) {
    const result = await mutation.mutate<{ token?: string }>("team", input);
    if (result) {
      await resource.reload();
      if (result.token) setCode(result.token);
    }
    return result;
  }
  if (resource.loading && !resource.data) return <Loading />;
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">Professional planning</div>
        <h1>Teams & access</h1>
        <p>
          Owners manage membership. Event access, approvals and contact
          visibility are granted separately.
        </p>
      </div>
      <ErrorNotice
        error={resource.error ?? mutation.error}
        retry={resource.reload}
      />
      <section className="panel" style={{ padding: 24, marginBlock: 24 }}>
        <h2>Accept an invitation</h2>
        <p>
          Sign in with the invited email address and enter the private code from
          your workspace owner. Accepting records your consent to join.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (
              await submit({
                action: "accept",
                token: new FormData(form).get("token"),
              })
            )
              form.reset();
          }}
        >
          <Field label="Private team invitation code" id="team-code">
            <input
              id="team-code"
              name="token"
              type="password"
              autoComplete="off"
              required
              pattern="[a-f0-9]{64}"
            />
          </Field>
          <button className="button primary" disabled={mutation.busy}>
            Accept and join workspace
          </button>
        </form>
      </section>
      <section className="panel" style={{ padding: 24, marginBlock: 24 }}>
        <h2>Create a planning agency</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (
              await submit({
                action: "create",
                name: new FormData(form).get("name"),
              })
            )
              form.reset();
          }}
        >
          <Field label="Agency name" id="agency-name">
            <input id="agency-name" name="name" required maxLength={120} />
          </Field>
          <button className="button" disabled={mutation.busy}>
            Create agency workspace
          </button>
        </form>
      </section>
      {code ? (
        <section className="notice" role="status">
          <label>
            Private invitation code — save it now
            <textarea readOnly value={code} />
          </label>
          <p>
            Expires after 72 hours. Share it only with the invited person. No
            message has been sent.
          </p>
          <button className="button" onClick={() => setCode("")}>
            Hide invitation code
          </button>
        </section>
      ) : null}
      {resource.data?.items.map((workspace) => (
        <Workspace
          key={workspace.id}
          workspace={workspace}
          busy={mutation.busy}
          submit={(input) =>
            submit({
              ...input,
              workspaceId: workspace.id,
              expectedVersion: workspace.version,
            })
          }
        />
      ))}
    </>
  );
}
function Workspace({
  workspace: w,
  busy,
  submit,
}: {
  workspace: TeamWorkspace;
  busy: boolean;
  submit: (input: Record<string, unknown>) => Promise<unknown>;
}) {
  return (
    <section className="panel" style={{ padding: 24, marginBlock: 24 }}>
      <h2>{w.name}</h2>
      <p className="muted">
        Your role: {w.role.replaceAll("_", " ")} · Access version {w.version}
      </p>
      <h3>Assigned celebrations</h3>
      {!w.events.length ? (
        <p>No assigned events yet.</p>
      ) : (
        <ul>
          {w.events.map((event) => (
            <li key={event.id} style={{ marginBlock: 12 }}>
              {event.canOpen ? (
                <Link href={`/app/events/${event.id}`}>{event.title}</Link>
              ) : (
                <strong>{event.title}</strong>
              )}
              <p className="muted">
                {event.type} ·{" "}
                {event.startsAt
                  ? new Date(event.startsAt).toLocaleString(undefined, {
                      timeZone: event.timeZone,
                    })
                  : "Date undecided"}
                {event.canOpen
                  ? ` · ${event.canEdit ? "Can edit" : "Read only"} · ${event.canApprove ? "Approval delegated" : "Approval restricted"} · ${event.canViewContacts ? "Contacts authorized" : "Contacts private"}`
                  : " · Restricted client summary"}
              </p>
            </li>
          ))}
        </ul>
      )}
      {w.role === "owner" ? (
        <>
          <h3>Invite a collaborator</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                values = new FormData(form);
              if (
                await submit({
                  action: "invite",
                  email: values.get("email"),
                  role: values.get("role"),
                })
              )
                form.reset();
            }}
          >
            <Field
              label={`Invited email for ${w.name}`}
              id={`invite-email-${w.id}`}
            >
              <input
                id={`invite-email-${w.id}`}
                name="email"
                type="email"
                required
                maxLength={254}
              />
            </Field>
            <Field
              label={`Invited role for ${w.name}`}
              id={`invite-role-${w.id}`}
            >
              <select
                id={`invite-role-${w.id}`}
                name="role"
                defaultValue="planner_member"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <button className="button" disabled={busy}>
              Create private team invitation
            </button>
          </form>
          <h3>Members</h3>
          <ul>
            {w.members.map((member) => (
              <li key={member.userId} style={{ marginBlock: 12 }}>
                <code>{member.userId}</code> ·{" "}
                {member.role.replaceAll("_", " ")} · {member.state}
                {member.role !== "owner" ? (
                  <div className="actions">
                    <select
                      aria-label={`Role for ${member.userId}`}
                      value={member.role}
                      disabled={busy}
                      onChange={(e) =>
                        submit({
                          action: "member",
                          userId: member.userId,
                          role: e.target.value,
                          state: member.state,
                        })
                      }
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button"
                      disabled={busy || member.state === "revoked"}
                      onClick={() =>
                        submit({
                          action: "member",
                          userId: member.userId,
                          role: member.role,
                          state: "revoked",
                        })
                      }
                    >
                      Revoke member
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="muted">
            Changing a role or revoking membership clears event assignments.
            Managers can operate all workspace events; members and clients need
            assignments.
          </p>
          <h3>Delegate event access</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const values = new FormData(e.currentTarget);
              void submit({
                action: "assign",
                eventId: values.get("eventId"),
                userId: values.get("userId"),
                assigned: values.get("assigned") === "on",
                canEdit: values.get("canEdit") === "on",
                canApprove: values.get("canApprove") === "on",
                canViewContacts: values.get("canViewContacts") === "on",
              });
            }}
          >
            <Field label={`Event in ${w.name}`} id={`assign-event-${w.id}`}>
              <select id={`assign-event-${w.id}`} name="eventId" required>
                <option value="">Choose an event</option>
                {w.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Member in ${w.name}`} id={`assign-member-${w.id}`}>
              <select id={`assign-member-${w.id}`} name="userId" required>
                <option value="">Choose a member</option>
                {w.members
                  .filter(
                    (m) =>
                      m.state === "active" &&
                      ["planner_member", "client_viewer"].includes(m.role),
                  )
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.userId} · {m.role.replaceAll("_", " ")}
                    </option>
                  ))}
              </select>
            </Field>
            {[
              ["assigned", "Assigned", true],
              ["canEdit", "Allow edits", true],
              ["canApprove", "Delegate approvals", false],
              ["canViewContacts", "Allow guest contacts", false],
            ].map(([name, label, checked]) => (
              <label
                key={String(name)}
                style={{ display: "block", marginBlock: 12 }}
              >
                <input
                  type="checkbox"
                  name={String(name)}
                  defaultChecked={Boolean(checked)}
                />{" "}
                {String(label)}
              </label>
            ))}
            <button className="button" disabled={busy}>
              Save event access
            </button>
          </form>
          <ul>
            {w.assignments.map((assignment) => (
              <li key={`${assignment.eventId}:${assignment.userId}`}>
                {w.events.find((e) => e.id === assignment.eventId)?.title} ·{" "}
                <code>{assignment.userId}</code> · edits{" "}
                {String(assignment.canEdit)}, approvals{" "}
                {String(assignment.canApprove)}, contacts{" "}
                {String(assignment.canViewContacts)}
              </li>
            ))}
          </ul>
          <h3>Pending invitations</h3>
          <ul>
            {w.invitations
              .filter((i) => !i.accepted)
              .map((invite) => (
                <li key={invite.id} style={{ marginBlock: 12 }}>
                  {invite.email} · {invite.role.replaceAll("_", " ")} ·{" "}
                  {invite.revoked
                    ? "Revoked"
                    : `Expires ${new Date(invite.expiresAt).toLocaleString()}`}{" "}
                  <button
                    className="button"
                    disabled={busy || invite.revoked}
                    onClick={() =>
                      submit({ action: "revoke_invite", id: invite.id })
                    }
                  >
                    Revoke team invitation
                  </button>
                </li>
              ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
