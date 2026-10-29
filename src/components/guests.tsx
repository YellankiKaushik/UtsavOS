"use client";
import { useState } from "react";
import type { EventSnapshot } from "@/domain/contracts";
import type { GuestDirectory } from "@/domain/guests";
import { guestFields, householdFields } from "@/domain/guests";
import {
  ErrorNotice,
  Field,
  Loading,
  Modal,
  useMutation,
  useResource,
} from "./ui";

type Guest = GuestDirectory["guests"][number];
export function GuestsPage({
  state,
  reload,
}: {
  state: EventSnapshot;
  reload: () => Promise<void>;
}) {
  const resource = useResource<GuestDirectory>(
    `events/${state.event.id}/guests`,
  );
  const mutation = useMutation();
  const [editing, setEditing] = useState<Guest | null | undefined>();
  const [scope, setScope] = useState("");
  const [invitation, setInvitation] = useState("");
  const [includeEvent, setIncludeEvent] = useState(true);
  const [functionIds, setFunctionIds] = useState<string[]>([]);
  const [validation, setValidation] = useState<Error | null>(null);
  async function submit(action: Record<string, unknown>) {
    const result = await mutation.mutate<{ token?: string }>(
      `events/${state.event.id}/guests`,
      {
        ...action,
        expectedVersion: resource.data?.eventVersion,
      },
    );
    if (result) await Promise.all([resource.reload(), reload()]);
    return result;
  }
  if (resource.loading && !resource.data) return <Loading />;
  if (!resource.data)
    return <ErrorNotice error={resource.error} retry={resource.reload} />;
  const directory = resource.data;
  return (
    <>
      <div className="notice">
        Guest responses are separate from your planned guest count. Review a
        Replan before changing budget quantities. Invitation links are private;
        share them only with the intended household.
      </div>
      <ErrorNotice error={mutation.error ?? validation ?? resource.error} />
      <section className="panel" style={{ padding: 24, marginBlock: 20 }}>
        <h2>Households</h2>
        <form
          className="actions"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            const parsed = householdFields.safeParse({
              name: values.get("name"),
              notes: "",
            });
            if (!parsed.success)
              return setValidation(
                new Error("Enter a household name up to 120 characters."),
              );
            setValidation(null);
            if (
              await submit({
                action: "household",
                id: null,
                fields: parsed.data,
              })
            )
              form.reset();
          }}
        >
          <label>
            Household name <input name="name" required maxLength={120} />
          </label>
          <button className="button" disabled={mutation.busy}>
            Add household
          </button>
        </form>
        <ul>
          {directory.households.map((household) => (
            <li key={household.id} style={{ marginBlock: 12 }}>
              <strong>{household.name}</strong>{" "}
              <button
                className="button"
                disabled={mutation.busy}
                onClick={async () => {
                  const name = window.prompt("Household name", household.name);
                  if (name?.trim())
                    await submit({
                      action: "household",
                      id: household.id,
                      fields: { name: name.trim(), notes: household.notes },
                    });
                }}
              >
                Edit household
              </button>{" "}
              <button
                className="button"
                disabled={
                  mutation.busy ||
                  directory.guests.some((g) => g.householdId === household.id)
                }
                onClick={() =>
                  submit({ action: "archive_household", id: household.id })
                }
              >
                Archive household
              </button>
            </li>
          ))}
        </ul>
      </section>
      <div className="row-between tab-header">
        <h2>Guests</h2>
        <button
          className="button primary"
          disabled={!directory.households.length || mutation.busy}
          onClick={() => setEditing(null)}
        >
          Add guest
        </button>
      </div>
      <label>
        Attendance scope{" "}
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="">Whole event</option>
          {directory.functions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
      </label>
      {!directory.guests.length ? (
        <p>No guests yet. Create a household, then add its guests.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <caption className="muted">Private guest directory</caption>
            <thead>
              <tr>
                <th scope="col">Guest</th>
                <th scope="col">Household</th>
                <th scope="col">Contact</th>
                <th scope="col">Attendance</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {directory.guests.map((guest) => (
                <tr key={guest.id}>
                  <th scope="row">{guest.displayName}</th>
                  <td>
                    {
                      directory.households.find(
                        (h) => h.id === guest.householdId,
                      )?.name
                    }
                  </td>
                  <td>{guest.email ?? guest.phone ?? "Not supplied"}</td>
                  <td>
                    <select
                      aria-label={`Attendance for ${guest.displayName}`}
                      disabled={mutation.busy}
                      value={
                        directory.attendance.find(
                          (a) =>
                            a.guestId === guest.id &&
                            a.functionId === (scope || null),
                        )?.status ?? "uninvited"
                      }
                      onChange={(e) =>
                        submit({
                          action: "attendance",
                          guestId: guest.id,
                          functionId: scope || null,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="uninvited">Not invited</option>
                      <option value="pending">Awaiting reply</option>
                      <option value="accepted">Attending</option>
                      <option value="declined">Not attending</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="button"
                      onClick={() => setEditing(guest)}
                    >
                      Edit guest
                    </button>{" "}
                    <button
                      className="button"
                      disabled={mutation.busy}
                      onClick={async () => {
                        if (
                          window.confirm(
                            `Archive ${guest.displayName} and revoke their invitations?`,
                          )
                        )
                          await submit({
                            action: "archive_guest",
                            id: guest.id,
                          });
                      }}
                    >
                      Archive guest
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <section className="panel" style={{ padding: 24, marginBlock: 24 }}>
        <h2>Private RSVP invitations</h2>
        <p>
          Choose one household and its attendance scopes. A link expires after
          72 hours and can be revoked at any time. Creating a link sends no
          message.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const householdId = String(form.get("householdId"));
            const result = await submit({
              action: "invite",
              householdId,
              guestIds: directory.guests
                .filter((g) => g.householdId === householdId)
                .map((g) => g.id),
              functionIds,
              includeEvent,
              expiresInHours: 72,
            });
            if (result?.token)
              setInvitation(`${window.location.origin}/rsvp#${result.token}`);
          }}
        >
          <Field label="Invited household" id="invite-household">
            <select id="invite-household" name="householdId" required>
              <option value="">Choose a household</option>
              {directory.households
                .filter((h) =>
                  directory.guests.some((g) => g.householdId === h.id),
                )
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
            </select>
          </Field>
          <label>
            <input
              type="checkbox"
              checked={includeEvent}
              onChange={(e) => setIncludeEvent(e.target.checked)}
            />{" "}
            Whole event
          </label>
          {directory.functions.map((f) => (
            <label key={f.id} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={functionIds.includes(f.id)}
                onChange={(e) =>
                  setFunctionIds((ids) =>
                    e.target.checked
                      ? [...ids, f.id]
                      : ids.filter((id) => id !== f.id),
                  )
                }
              />{" "}
              {f.title}
            </label>
          ))}
          <button
            className="button primary"
            disabled={mutation.busy || (!includeEvent && !functionIds.length)}
          >
            Create invitation link
          </button>
        </form>
        {invitation ? (
          <div className="notice" role="status">
            <label>
              Invitation link — save it now
              <textarea readOnly value={invitation} />
            </label>
            <button
              className="button"
              onClick={() => {
                setInvitation("");
              }}
            >
              Hide link
            </button>
          </div>
        ) : null}
        <ul>
          {directory.invitations.map((invite) => (
            <li key={invite.id} style={{ marginBlock: 12 }}>
              {directory.households.find((h) => h.id === invite.householdId)
                ?.name ?? "Archived household"}{" "}
              · expires {new Date(invite.expiresAt).toLocaleString()} ·{" "}
              {invite.revoked ? "Revoked" : "Issued"}{" "}
              <button
                className="button"
                disabled={invite.revoked || mutation.busy}
                onClick={() =>
                  submit({ action: "revoke_invite", id: invite.id })
                }
              >
                Revoke invitation
              </button>
            </li>
          ))}
        </ul>
      </section>
      <Modal
        title={editing ? "Edit guest" : "Add guest"}
        description="Contact details stay in your private planning workspace and are never included in event-planning AI requests."
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <form
          key={editing?.id ?? "new"}
          onSubmit={async (event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            const fields = guestFields.safeParse({
              householdId: values.get("householdId"),
              displayName: values.get("displayName"),
              email: values.get("email") || null,
              phone: values.get("phone") || null,
              notes: values.get("notes") || "",
            });
            if (!fields.success)
              return setValidation(
                new Error("Check the name, household and contact details."),
              );
            setValidation(null);
            if (
              await submit({
                action: "guest",
                id: editing?.id ?? null,
                fields: fields.data,
              })
            )
              setEditing(undefined);
          }}
        >
          <Field label="Guest name" id="guest-name">
            <input
              id="guest-name"
              name="displayName"
              required
              maxLength={120}
              defaultValue={editing?.displayName}
            />
          </Field>
          <Field label="Household" id="guest-household">
            <select
              id="guest-household"
              name="householdId"
              required
              defaultValue={editing?.householdId ?? directory.households[0]?.id}
            >
              {directory.households.map((h) => (
                <option value={h.id} key={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email (optional)" id="guest-email">
            <input
              id="guest-email"
              name="email"
              type="email"
              maxLength={254}
              defaultValue={editing?.email ?? ""}
            />
          </Field>
          <Field label="Phone (optional)" id="guest-phone">
            <input
              id="guest-phone"
              name="phone"
              type="tel"
              maxLength={32}
              defaultValue={editing?.phone ?? ""}
            />
          </Field>
          <Field label="Private notes" id="guest-notes">
            <textarea
              id="guest-notes"
              name="notes"
              maxLength={500}
              defaultValue={editing?.notes ?? ""}
            />
          </Field>
          <ErrorNotice error={mutation.error ?? validation} />
          <button className="button primary" disabled={mutation.busy}>
            Save guest
          </button>
        </form>
      </Modal>
    </>
  );
}
