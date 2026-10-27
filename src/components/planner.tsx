"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Plus,
  Flower2,
  Cake,
  Users,
  CalendarDays,
  Coins,
  CheckCheck,
  Sparkles,
  GitBranch,
  ArrowUpRight,
  Settings,
  LockKeyhole,
} from "lucide-react";
import { localToInstant } from "@/domain/dates";
import type {
  EventFields,
  EventRecord,
  EventSnapshot,
} from "@/domain/contracts";
import { eventFields } from "@/domain/contracts";
import {
  calculateBudget,
  formatMoney,
  minorToRupees,
  rupeesToMinor,
} from "@/domain/money";
import { BudgetPage, TasksPage, VendorsPage } from "./resources";
import { AiPage, ReplanPage } from "./planning";
import { EventFunctionsPage } from "./event-functions";
import { GuestsPage } from "./guests";
import { TeamsPage } from "./teams";
import {
  dateLabel,
  localDateValue,
  Field,
  Modal,
  ErrorNotice,
  Loading,
  useResource,
  useMutation,
} from "./ui";
const typeIcons = { wedding: Flower2, birthday: Cake, community: Users };
type Me = {
  user: { email: string; id: string; displayName?: string | null };
  workspaces: { id: string; name: string; canCreate?: boolean }[];
  usage: {
    id: string;
    operation: string;
    status: string;
    input_tokens: number | null;
    output_tokens: number | null;
    created_at: string;
  }[];
  aiConfigured: boolean;
  aiProviderPrimary?: string;
  aiProviderFallback?: string;
};
export function Planner({ path }: { path: string[] }) {
  if (path[0] === "team") return <TeamsPage />;
  if (path[0] === "settings") return <SettingsPage />;
  if (path.length === 0 || (path[0] === "events" && path.length === 1))
    return <EventList />;
  if (path[0] === "events" && path[1] === "new") return <EventWizard />;
  if (path[0] === "events" && path[1] && path.length <= 3)
    return (
      <EventWorkspace key={path[1]} id={path[1]} tab={path[2] ?? "overview"} />
    );
  return (
    <div className="empty">
      <h1>Page not found</h1>
      <Link className="button" href="/app/events">
        Back to celebrations
      </Link>
    </div>
  );
}
function EventList() {
  const { data, error, loading, reload } = useResource<{
      items: EventRecord[];
      nextCursor: string | null;
    }>("events"),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [extra, setExtra] = useState<EventRecord[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [moreBusy, setMoreBusy] = useState(false);
  const [moreError, setMoreError] = useState<Error | null>(null);
  if (loading && !data) return <Loading />;
  const items = [...(data?.items ?? []), ...extra].filter(
    (e) =>
      (filter === "all" || e.type === filter) &&
      e.title.toLowerCase().includes(search.toLowerCase()),
  );
  async function loadMore() {
    setMoreBusy(true);
    const { api } = await import("./ui");
    try {
      const r = await api<{ items: EventRecord[]; nextCursor: string | null }>(
        `events?cursor=${encodeURIComponent(cursor ?? data?.nextCursor ?? "")}`,
      );
      setExtra((x) => [...x, ...r.items]);
      setCursor(r.nextCursor ?? "");
    } catch (err) {
      setMoreError(
        err instanceof Error ? err : new Error("Could not load more events"),
      );
    } finally {
      setMoreBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading row-between">
        <div>
          <div className="eyebrow">A little clarity, a lot of possibility</div>
          <h1>
            My celebrations<span style={{ color: "#a9b49b" }}>.</span>
          </h1>
          <p>Every detail in its place. Every moment, yours to enjoy.</p>
        </div>
        <Link className="button primary" href="/app/events/new">
          <Plus size={16} />
          New celebration
        </Link>
      </div>
      <ErrorNotice error={error ?? moreError} retry={reload} />
      <div className="hero-panel">
        <div>
          <div className="eyebrow" style={{ color: "#57704a" }}>
            Made for the way plans change
          </div>
          <h2>
            Big ideas. Thoughtful details.
            <br />
            <em>One beautiful plan.</em>
          </h2>
          <p>
            Keep budgets, tasks, and vendor requirements together. When the
            guest count changes, see the impact before you decide.
          </p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="hero-orbit-inner">
            <Flower2 size={50} strokeWidth={1} />
          </div>
        </div>
      </div>
      <div className="row-between tab-header">
        <h2 style={{ margin: 0 }}>
          Your events{" "}
          <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
            ({(data?.items.length ?? 0) + extra.length})
          </span>
        </h2>
        <div className="actions">
          <input
            aria-label="Find a celebration"
            placeholder="Find a celebration…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--white)",
              maxWidth: 200,
            }}
          />
          <select
            aria-label="Filter event type"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="button"
          >
            <option value="all">All celebrations</option>
            <option value="wedding">Weddings</option>
            <option value="birthday">Birthdays</option>
            <option value="community">Community</option>
          </select>
        </div>
      </div>
      {items.length ? (
        <div className="grid three">
          {items.map((e) => {
            const Icon = typeIcons[e.type];
            return (
              <Link
                key={e.id}
                href={`/app/events/${e.id}`}
                className="card event-card"
              >
                <div className={`event-art ${e.type}`} aria-hidden="true">
                  <Icon
                    className="type-illustration"
                    size={62}
                    strokeWidth={1}
                  />
                </div>
                <div className="event-card-body">
                  <div className="row-between">
                    <span className="badge">{e.type}</span>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {e.status}
                    </span>
                  </div>
                  <h2>{e.title}</h2>
                  <div className="event-meta">
                    <CalendarDays size={14} />
                    {dateLabel(e.startsAt, e.timeZone)}
                  </div>
                  <div className="event-meta">
                    <Users size={14} />
                    {e.guestCount} guests · {e.timeZone}
                  </div>
                  <div className="event-card-bottom">
                    <span>
                      <small>Budget ceiling</small>
                      <br />
                      <strong>{formatMoney(e.budgetMinor)}</strong>
                    </span>
                    <ArrowUpRight size={18} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card empty">
          <Flower2 size={35} />
          <h2>
            {search || filter !== "all"
              ? "No matching celebrations"
              : "Your next celebration starts here"}
          </h2>
          <p className="muted">
            {search || filter !== "all"
              ? "Try another name or event type."
              : "Choose an event, set your budget, and bring the details together at your pace."}
          </p>
          <Link className="button primary" href="/app/events/new">
            Create a celebration <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {(cursor === null ? data?.nextCursor : cursor) && (
        <button
          className="button section-gap"
          disabled={moreBusy}
          onClick={loadMore}
        >
          {moreBusy ? "Loading…" : "Load more celebrations"}
        </button>
      )}
      <p className="muted" style={{ fontSize: 11, marginTop: 30 }}>
        A plan is a starting point, not a commitment. Vendor statuses and
        estimates need your confirmation.
      </p>
    </>
  );
}
export function EventWizard() {
  const router = useRouter(),
    { data: me, error: meError } = useResource<Me>("me"),
    { mutate, error, busy, setError } = useMutation();
  const [step, setStep] = useState(0),
    [type, setType] = useState<EventFields["type"]>("wedding"),
    [title, setTitle] = useState(""),
    [guests, setGuests] = useState("150"),
    [tbd, setTbd] = useState(true),
    [date, setDate] = useState(""),
    [zone, setZone] = useState("Asia/Kolkata"),
    [budget, setBudget] = useState("500000"),
    [preferences, setPreferences] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const editableWorkspaces =
    me?.workspaces.filter((w) => w.canCreate !== false) ?? [];
  function next() {
    try {
      if (step === 0 && !title.trim())
        throw new Error("Give your celebration a name.");
      if (step === 1) {
        if (
          !Number.isInteger(Number(guests)) ||
          Number(guests) < 0 ||
          Number(guests) > 100000
        )
          throw new Error(
            "Guest count must be a whole number from 0 to 100,000.",
          );
        new Intl.DateTimeFormat("en", { timeZone: zone });
        if (!tbd && !date)
          throw new Error("Choose a date and time, or mark it undecided.");
      }
      setError(null);
      setStep(step + 1);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Check your details"));
    }
  }
  async function save() {
    try {
      const fields = eventFields.parse({
        type,
        title,
        dateStatus: tbd ? "tbd" : "scheduled",
        startsAt: tbd ? null : localToInstant(date, zone),
        timeZone: zone,
        guestCount: Number(guests),
        currency: "INR",
        budgetMinor: rupeesToMinor(budget),
        preferences,
        status: "planning",
      });
      const workspace =
        editableWorkspaces.find((w) => w.id === workspaceId) ??
        editableWorkspaces[0];
      if (!workspace)
        throw new Error(
          "Your workspace is not provisioned. Sign in again to finish setup.",
        );
      const result = await mutate<{ eventId: string }>("events", {
        workspaceId: workspace.id,
        fields,
      });
      if (result) router.push(`/app/events/${result.eventId}`);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Check your event details"));
    }
  }
  return (
    <div className="wizard">
      <Link className="muted" href="/app/events">
        ← Back to celebrations
      </Link>
      <div className="page-heading" style={{ marginTop: 26 }}>
        <div className="eyebrow">A new beginning</div>
        <h1>Let’s make it memorable.</h1>
        <p>A few details now. A celebration that feels like you.</p>
      </div>
      <div className="steps">
        {["The occasion", "Date & people", "Budget & priorities"].map(
          (s, i) => (
            <div className={`step ${i <= step ? "active" : ""}`} key={s}>
              0{i + 1} · {s}
            </div>
          ),
        )}
      </div>
      <ErrorNotice error={error ?? meError} />
      <div className="card">
        {step === 0 ? (
          <>
            <h2>What are we celebrating?</h2>
            {editableWorkspaces.length > 1 ? (
              <Field label="Planning workspace" id="planning-workspace">
                <select
                  id="planning-workspace"
                  value={workspaceId || editableWorkspaces[0]?.id}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                >
                  {editableWorkspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <div className="grid three" role="group" aria-label="Event type">
              {(["wedding", "birthday", "community"] as const).map((t) => {
                const Icon = typeIcons[t];
                return (
                  <button
                    type="button"
                    key={t}
                    aria-pressed={type === t}
                    onClick={() => setType(t)}
                    className={`type-option ${type === t ? "selected" : ""}`}
                  >
                    <Icon size={32} />
                    <strong>{t[0].toUpperCase() + t.slice(1)}</strong>
                    <small>
                      {t === "wedding"
                        ? "A day, a lifetime of memories."
                        : t === "birthday"
                          ? "Another year, your kind of joy."
                          : "Bring your people together."}
                    </small>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 26 }}>
              <Field label="Celebration name" id="title">
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your celebration a name"
                  required
                  maxLength={140}
                />
              </Field>
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h2>The when. The who.</h2>
            <Field
              label="Expected guests"
              id="guests"
              hint="You can review the impact of guest changes later."
            >
              <input
                id="guests"
                type="number"
                min={0}
                max={100000}
                step={1}
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
              />
            </Field>
            <label className="check">
              <input
                type="checkbox"
                checked={tbd}
                onChange={(e) => setTbd(e.target.checked)}
              />
              The date is still being decided
            </label>
            {!tbd && (
              <Field label="Local date and time" id="event-date">
                <input
                  id="event-date"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
            )}
            <Field
              label="Event time zone"
              id="zone"
              hint="Dates are stored as instants and displayed in this time zone."
            >
              <input
                id="zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                list="zones"
              />
              <datalist id="zones">
                <option>Asia/Kolkata</option>
                <option>Europe/London</option>
                <option>America/New_York</option>
                <option>Asia/Dubai</option>
              </datalist>
            </Field>
          </>
        ) : (
          <>
            <h2>Plan around what matters.</h2>
            <Field
              label="Total budget ceiling (INR ₹)"
              id="budget"
              hint="Your spending ceiling. Estimates will remain separate from commitments."
            >
              <input
                id="budget"
                type="text"
                inputMode="decimal"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </Field>
            <Field
              label="Priorities, style & preferences"
              id="preferences"
              hint="Optional. If you request AI planning, these preferences are sent to the configured AI provider. Keep personal contact details out."
            >
              <textarea
                id="preferences"
                maxLength={2000}
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="Great food, an intimate atmosphere, accessible venue…"
              />
            </Field>
            <div className="notice">
              <strong>{title}</strong>
              <br />
              {type} · {guests} guests ·{" "}
              {tbd ? "Date undecided" : `${date.replace("T", " ")} · ${zone}`}
              <p style={{ marginTop: 8 }}>
                You can start manually. AI generation is a separate action after
                your event is saved.
              </p>
            </div>
          </>
        )}
        <div className="wizard-foot row-between">
          <button
            className="button"
            disabled={step === 0 || busy}
            onClick={() => {
              setStep(step - 1);
              setError(null);
            }}
          >
            Back
          </button>
          {step < 2 ? (
            <button className="button primary" onClick={next}>
              Continue <ArrowRight size={15} />
            </button>
          ) : (
            <button
              className="button primary"
              disabled={busy || !me}
              onClick={save}
            >
              {busy ? "Saving your celebration…" : "Create celebration"}
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 15 }}>
        Details in this form are not saved until you create the event.
      </p>
    </div>
  );
}
function EventWorkspace({ id, tab }: { id: string; tab: string }) {
  const capabilities = useResource<{
    features?: { eventFunctions?: boolean; guests?: boolean };
  }>("me");
  const resource = useResource<EventSnapshot>(`events/${id}`),
    [editing, setEditing] = useState(false);
  if (resource.loading && !resource.data) return <Loading />;
  if (!resource.data)
    return <ErrorNotice error={resource.error} retry={resource.reload} />;
  const state = resource.data,
    e = state.event,
    Icon = typeIcons[e.type];
  const pages = [
    ["overview", "Overview"],
    ["budget", "Budget"],
    ["timeline", "Tasks & timeline"],
    ["vendors", "Vendors"],
    ["ai-plan", "AI planning"],
    ["replan", "Replan"],
    ["history", "History"],
    ...(capabilities.data?.features?.guests &&
    state.permissions?.canViewContacts !== false
      ? [["guests", "Guests & RSVP"]]
      : []),
    ...(capabilities.data?.features?.eventFunctions
      ? [["functions", "Functions · preview"]]
      : []),
  ];
  return (
    <>
      <Link className="muted" style={{ fontSize: 12 }} href="/app/events">
        ← All celebrations
      </Link>
      <div className="page-heading row-between" style={{ marginTop: 22 }}>
        <div>
          <div className="actions" style={{ marginBottom: 12 }}>
            <span className="badge">
              <Icon size={12} />
              {e.type}
            </span>
            <span className="badge warm">{e.status}</span>
            <small>Version {e.version}</small>
          </div>
          <h1>{e.title}</h1>
          <p>
            {dateLabel(e.startsAt, e.timeZone)} · {e.guestCount} guests
          </p>
        </div>
        <div className="actions">
          <button
            className="button"
            disabled={state.permissions?.canEdit === false}
            onClick={() => setEditing(true)}
          >
            <Settings size={15} />
            Event details
          </button>
          <Link className="button primary" href={`/app/events/${id}/replan`}>
            <GitBranch size={15} />
            Review a change
          </Link>
        </div>
      </div>
      <nav className="event-nav" aria-label="Event modules">
        {pages.map(([key, label]) => (
          <Link
            className={tab === key ? "active" : ""}
            key={key}
            href={`/app/events/${id}${key === "overview" ? "" : `/${key}`}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <ErrorNotice error={resource.error} retry={resource.reload} />
      {state.permissions?.canEdit === false ? (
        <p className="notice">
          You have read-only access to this event. Ask the workspace owner to
          change your assignment.
        </p>
      ) : null}
      <fieldset
        disabled={state.permissions?.canEdit === false}
        style={{ border: 0, padding: 0, minWidth: 0 }}
      >
        {tab === "overview" ? (
          <Overview state={state} />
        ) : tab === "budget" ? (
          <BudgetPage state={state} reload={resource.reload} />
        ) : tab === "timeline" ? (
          <TasksPage state={state} reload={resource.reload} />
        ) : tab === "vendors" ? (
          <VendorsPage state={state} reload={resource.reload} />
        ) : tab === "ai-plan" ? (
          <AiPage state={state} reload={resource.reload} />
        ) : tab === "replan" ? (
          <ReplanPage state={state} reload={resource.reload} />
        ) : tab === "history" ? (
          <History id={id} zone={e.timeZone} />
        ) : tab === "guests" && capabilities.data?.features?.guests ? (
          <GuestsPage state={state} reload={resource.reload} />
        ) : tab === "functions" &&
          capabilities.data?.features?.eventFunctions ? (
          <EventFunctionsPage state={state} reload={resource.reload} />
        ) : (
          <div className="notice error">Unknown event module.</div>
        )}
        <Modal
          title="Your celebration details"
          description="Changes are saved with version protection. Guest changes use the Replan workflow."
          open={editing}
          onOpenChange={setEditing}
        >
          <EventEditor
            key={`${e.id}-${e.version}`}
            event={e}
            onSaved={async () => {
              setEditing(false);
              await resource.reload();
            }}
          />
        </Modal>
      </fieldset>
    </>
  );
}
export function BudgetStats({ state }: { state: EventSnapshot }) {
  const b = calculateBudget(
    state.budgetItems,
    state.event.guestCount,
    state.event.budgetMinor,
  );
  return (
    <div className="grid four">
      {[
        {
          label: "Budget ceiling",
          value: formatMoney(state.event.budgetMinor),
          note: "Your planned spending limit",
          icon: Coins,
        },
        {
          label: "Projected estimate",
          value: formatMoney(b.projectedMinor),
          note: `${state.budgetItems.length} active estimate lines`,
          icon: ArrowUpRight,
        },
        {
          label: b.overBudget ? "Budget shortfall" : "Remaining budget",
          value: formatMoney(b.remainingMinor),
          note: b.overBudget
            ? "Review costs before committing"
            : "Available within your ceiling",
          icon: Coins,
          negative: b.overBudget,
        },
        {
          label: "Expected guests",
          value: state.event.guestCount.toLocaleString("en-IN"),
          note: "Replan to review guest changes",
          icon: Users,
        },
      ].map((s) => (
        <div className="card" key={s.label}>
          <div className="stat-label">
            {s.label}
            <s.icon size={15} />
          </div>
          <div className={`stat-value ${s.negative ? "negative" : ""}`}>
            {s.value}
          </div>
          <div className="stat-note">{s.note}</div>
        </div>
      ))}
    </div>
  );
}
function Overview({ state }: { state: EventSnapshot }) {
  const { event: e, tasks, vendors } = state,
    done = tasks.filter((t) => t.status === "done").length;
  return (
    <>
      <BudgetStats state={state} />
      <div className="grid two section-gap">
        <section className="card">
          <div className="row-between">
            <h2>What’s next</h2>
            <Link className="muted" href={`/app/events/${e.id}/timeline`}>
              View timeline →
            </Link>
          </div>
          {tasks.length ? (
            <>
              <div className="row-between" style={{ marginBottom: 14 }}>
                <small>
                  {done} of {tasks.length} tasks complete
                </small>
                <CheckCheck size={16} />
              </div>
              <div className="progress">
                <span style={{ width: `${(done / tasks.length) * 100}%` }} />
              </div>
              {tasks
                .filter((t) => t.status !== "done")
                .slice(0, 4)
                .map((t) => (
                  <div className="list-row" key={t.id}>
                    <div className="timeline-dot" />
                    <div className="list-main">
                      <h3>{t.title}</h3>
                      <small>{dateLabel(t.dueAt, e.timeZone)}</small>
                    </div>
                    <span className="badge">{t.status.replace("_", " ")}</span>
                  </div>
                ))}
            </>
          ) : (
            <div className="empty">
              <CalendarDays size={28} />
              <h3>One step at a time.</h3>
              <p className="muted">
                Add a first task and give your celebration a little structure.
              </p>
              <Link className="button" href={`/app/events/${e.id}/timeline`}>
                Add a task
              </Link>
            </div>
          )}
        </section>
        <section className="card">
          <div className="row-between">
            <h2>Your vendor checklist</h2>
            <Link className="muted" href={`/app/events/${e.id}/vendors`}>
              View all →
            </Link>
          </div>
          {vendors.length ? (
            vendors.slice(0, 4).map((v) => (
              <div className="list-row" key={v.id}>
                <div className="list-main">
                  <h3>{v.title}</h3>
                  <small>
                    {v.category}
                    {v.isLocked ? " · Locked" : ""}
                  </small>
                </div>
                <span
                  className={`badge ${v.status === "confirmed" ? "warm" : ""}`}
                >
                  {v.status === "confirmed"
                    ? "Confirmed by you"
                    : v.status.replace("_", " ")}
                </span>
              </div>
            ))
          ) : (
            <div className="empty">
              <Users size={28} />
              <h3>Build your circle of support.</h3>
              <p className="muted">
                Keep track of the people and services your celebration needs.
              </p>
              <Link className="button" href={`/app/events/${e.id}/vendors`}>
                Start your checklist
              </Link>
            </div>
          )}
        </section>
      </div>
      <div className="hero-panel section-gap">
        <div>
          <div className="eyebrow">
            <Sparkles size={12} style={{ display: "inline", marginRight: 7 }} />{" "}
            A little inspiration
          </div>
          <h2>A plan that starts with you.</h2>
          <p>
            Ask AI for personalized ideas, planning tasks, and initial
            estimates. Choose what fits before saving anything to your plan.
          </p>
        </div>
        <Link className="button primary" href={`/app/events/${e.id}/ai-plan`}>
          Explore AI planning <ArrowRight size={15} />
        </Link>
      </div>
    </>
  );
}
function EventEditor({
  event: e,
  onSaved,
}: {
  event: EventRecord;
  onSaved: () => Promise<void>;
}) {
  const { mutate, busy, error, setError } = useMutation();
  async function submit(form: FormData) {
    try {
      const tbd = form.get("tbd") === "on",
        zone = String(form.get("zone"));
      const {
        id: existingId,
        workspaceId,
        createdAt,
        version,
        ...currentFields
      } = e;
      void existingId;
      void workspaceId;
      void createdAt;
      void version;
      const fields = eventFields.parse({
        ...currentFields,
        title: form.get("title"),
        budgetMinor: rupeesToMinor(String(form.get("budget"))),
        timeZone: zone,
        dateStatus: tbd ? "tbd" : "scheduled",
        startsAt: tbd ? null : localToInstant(String(form.get("date")), zone),
        preferences: form.get("preferences"),
        status: form.get("status"),
      });
      const r = await mutate(
        `events/${e.id}`,
        { expectedVersion: e.version, fields },
        "PATCH",
      );
      if (r) await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Invalid details"));
    }
  }
  return (
    <form action={submit}>
      <Field label="Celebration name" id="edit-title">
        <input
          id="edit-title"
          name="title"
          defaultValue={e.title}
          required
          maxLength={140}
        />
      </Field>
      <div className="grid two">
        <Field label="Budget ceiling (₹)" id="edit-budget">
          <input
            id="edit-budget"
            name="budget"
            inputMode="decimal"
            defaultValue={minorToRupees(e.budgetMinor)}
            required
          />
        </Field>
        <Field label="Status" id="event-status">
          <select id="event-status" name="status" defaultValue={e.status}>
            {["planning", "active", "completed", "archived"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <label className="check">
        <input
          name="tbd"
          type="checkbox"
          defaultChecked={e.dateStatus === "tbd"}
        />
        Date still undecided
      </label>
      <Field label="Event local date & time" id="edit-date">
        <input
          id="edit-date"
          type="datetime-local"
          name="date"
          defaultValue={localDateValue(e.startsAt, e.timeZone)}
        />
      </Field>
      <Field label="Event time zone" id="edit-zone">
        <input id="edit-zone" name="zone" required defaultValue={e.timeZone} />
      </Field>
      <Field label="Preferences" id="edit-preferences">
        <textarea
          id="edit-preferences"
          name="preferences"
          maxLength={2000}
          defaultValue={e.preferences}
        />
      </Field>
      <p className="muted">
        {e.guestCount} expected guests. Use Replan to preview changes to this
        number.
      </p>
      <ErrorNotice error={error} />
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : "Save event details"}
      </button>
    </form>
  );
}
function History({ id, zone }: { id: string; zone: string }) {
  type Row = {
    id: string;
    action: string;
    actor_id: string;
    occurred_at: string;
    safe_diff: Record<string, unknown>;
    request_id: string;
  };
  const { data, error, loading, reload } = useResource<{
    items: Row[];
    nextCursor: string | null;
  }>(`events/${id}/history`);
  if (loading) return <Loading />;
  return (
    <section className="card">
      <h2>A clear history of your plan</h2>
      <p className="muted">
        Each saved change records an actor, version, and request reference.
      </p>
      <ErrorNotice error={error} retry={reload} />
      {data?.items.map((row) => (
        <article className="list-row" key={row.id}>
          <div className="timeline-dot" />
          <div className="list-main">
            <h3>{row.action.replaceAll("_", " ")}</h3>
            <small>
              {dateLabel(row.occurred_at, zone)} · Actor{" "}
              {row.actor_id.slice(0, 8)}
            </small>
            <details style={{ marginTop: 10 }}>
              <summary>View recorded changes</summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontSize: 11,
                }}
              >
                {JSON.stringify(row.safe_diff, null, 2)}
              </pre>
              <small>Reference {row.request_id}</small>
            </details>
          </div>
        </article>
      ))}
      {!data?.items.length && <p className="muted">No history records yet.</p>}
      {data?.nextCursor && (
        <HistoryOlder id={id} zone={zone} cursor={data.nextCursor} />
      )}
    </section>
  );
}
function HistoryOlder({
  id,
  zone,
  cursor,
}: {
  id: string;
  zone: string;
  cursor: string;
}) {
  const [show, setShow] = useState(false);
  return show ? (
    <HistoryPage id={id} zone={zone} cursor={cursor} />
  ) : (
    <button className="button section-gap" onClick={() => setShow(true)}>
      Load earlier changes
    </button>
  );
}
function HistoryPage({
  id,
  zone,
  cursor,
}: {
  id: string;
  zone: string;
  cursor: string;
}) {
  const { data, error } = useResource<{
    items: { id: string; action: string; occurred_at: string }[];
    nextCursor: string | null;
  }>(`events/${id}/history?cursor=${encodeURIComponent(cursor)}`);
  return (
    <>
      <ErrorNotice error={error} />
      {data?.items.map((r) => (
        <div className="list-row" key={r.id}>
          <div>
            <strong>{r.action.replaceAll("_", " ")}</strong>
            <br />
            <small>{dateLabel(r.occurred_at, zone)}</small>
          </div>
        </div>
      ))}
      {data?.nextCursor && (
        <HistoryOlder id={id} zone={zone} cursor={data.nextCursor} />
      )}
    </>
  );
}
function SettingsPage() {
  const { data, error, loading, reload } = useResource<Me>("me"),
    m = useMutation(),
    [saving, setSaving] = useState(false);
  if (loading) return <Loading />;
  async function save(form: FormData) {
    setSaving(true);
    m.setError(null);
    m.setMessage("");
    try {
      const response = await fetch("/auth/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "profile",
          displayName: form.get("name"),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        m.setError(new Error(result.error?.message ?? "Save failed"));
      else {
        m.setMessage("Profile saved.");
        await reload();
      }
    } catch {
      m.setError(
        new Error("Network unavailable. Profile save was not confirmed."),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">Your personal workspace</div>
        <h1>Settings & account.</h1>
        <p>A few details that make this space yours.</p>
      </div>
      <ErrorNotice error={error ?? m.error} retry={reload} />
      {m.message && (
        <div className="notice" role="status">
          {m.message}
        </div>
      )}
      <div className="grid two">
        <section className="card">
          <h2>Profile</h2>
          <p>{data?.user.email}</p>
          <form action={save}>
            <Field label="Display name" id="display-name">
              <input
                id="display-name"
                name="name"
                required
                maxLength={80}
                defaultValue={data?.user.displayName ?? ""}
              />
            </Field>
            <button className="button primary" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
          <h3 className="section-gap">Workspace</h3>
          <p className="muted">
            {data?.workspaces[0]?.name ?? "No workspace provisioned"}
          </p>
          <span className="badge">
            <LockKeyhole size={12} />
            Personal owner
          </span>
        </section>
        <section className="card">
          <h2>AI & your data</h2>
          <p className="muted">
            Primary provider: {data?.aiProviderPrimary ?? "server configured"}.
            Approved fallback: {data?.aiProviderFallback ?? "none"}.
          </p>
          <span className={`badge ${data?.aiConfigured ? "" : "warm"}`}>
            {data?.aiConfigured ? "AI configured" : "AI configuration required"}
          </span>
          <p className="muted" style={{ marginTop: 18 }}>
            Generation sends event type, date, budget, guest count and the
            preferences you enter to the configured provider (Gemini or
            OpenRouter). Your title, email, vendor notes and account identity
            are excluded.
          </p>
          <p className="muted">
            The workspace allows up to 20 generation or explanation attempts per
            UTC day, including failures. Manual planning remains available
            during AI outages.
          </p>
          <p className="muted">
            All suggested prices are unverified estimates. Vendor confirmation
            is your own checklist state.
          </p>
        </section>
      </div>
      <section className="card section-gap">
        <h2>Recent AI usage</h2>
        {data?.usage.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Operation</th>
                  <th>Status</th>
                  <th>Input tokens</th>
                  <th>Output tokens</th>
                </tr>
              </thead>
              <tbody>
                {data.usage.map((u) => (
                  <tr key={u.id}>
                    <td>{dateLabel(u.created_at, "UTC")} UTC</td>
                    <td>{u.operation}</td>
                    <td>{u.status}</td>
                    <td>{u.input_tokens ?? "—"}</td>
                    <td>{u.output_tokens ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No AI requests have been made.</p>
        )}
      </section>
    </>
  );
}
