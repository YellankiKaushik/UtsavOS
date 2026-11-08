import { useState, type FormEvent, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import {
  budgetSummary,
  decideDraft,
  draftFor,
  editCategory,
  editTask,
  formatRupees,
  parseEventType,
  parseRupees,
  removeCategory,
  replan,
  rupeesInput,
  taskProgress,
  toggleTask,
  updateEvent,
  validateEvent,
  type BudgetBasis,
  type BudgetCategory,
  type EventType,
  type Plan,
  type Priority,
  type Task,
} from "./model";

export const scenarioNames: Record<EventType, string> = {
  wedding: "Wedding celebration",
  birthday: "Birthday celebration",
  community: "Community gathering",
};

export const plannerSections = [
  { name: "Overview", icon: "grid" },
  { name: "Event setup", icon: "calendar" },
  { name: "Budget", icon: "budget" },
  { name: "Tasks", icon: "tasks" },
  { name: "Replan", icon: "replan" },
  { name: "Sample draft", icon: "sparkle" },
] as const satisfies readonly { name: string; icon: IconName }[];

export type Section = (typeof plannerSections)[number]["name"];

type Commit = (change: (plan: Plan) => Plan, message: string) => boolean;

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function readableDate(date: string) {
  return date
    ? dateFormat.format(new Date(`${date}T00:00:00Z`))
    : "Date to be set";
}

const countFormat = new Intl.NumberFormat("en-IN");
const percentFormat = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

function percent(value: number | null) {
  return value === null ? "No budget set" : `${percentFormat.format(value)}%`;
}

function textField(form: FormData, name: string) {
  return String(form.get(name) ?? "");
}

function onFormSubmit(
  event: FormEvent<HTMLFormElement>,
  action: (values: FormData) => void,
) {
  event.preventDefault();
  action(new FormData(event.currentTarget));
}

function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="panel-heading">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}

export function Overview({
  plan,
  navigate,
}: {
  plan: Plan;
  navigate: (section: Section) => void;
}) {
  const budget = budgetSummary(plan);
  const tasks = taskProgress(plan);
  return (
    <>
      <PanelHeading
        title="Overview"
        description={`${scenarioNames[plan.event.type]} · ${readableDate(plan.event.date)}`}
        action={
          <button
            className="button button-secondary"
            onClick={() => navigate("Event setup")}
          >
            Edit event
            <Icon name="arrow" />
          </button>
        }
      />
      <div className="metric-grid">
        <div className="metric">
          <Icon name="calendar" />
          <span>Guest count</span>
          <strong>{countFormat.format(plan.event.guests)}</strong>
          <small>Expected attendance</small>
        </div>
        <div className="metric">
          <Icon name="budget" />
          <span>Budget allocated</span>
          <strong>{formatRupees(budget.allocatedPaise)}</strong>
          <small>
            {percent(budget.allocatedPercent)}
            {budget.allocatedPercent !== null && " of total budget"}
          </small>
        </div>
        <div className={budget.overBudget ? "metric metric-warning" : "metric"}>
          <Icon name="replan" />
          <span>{budget.overBudget ? "Over budget" : "Budget remaining"}</span>
          <strong>{formatRupees(Math.abs(budget.remainingPaise))}</strong>
          <small>Of {formatRupees(plan.event.budgetPaise)} total</small>
        </div>
        <div className="metric">
          <Icon name="tasks" />
          <span>Task completion</span>
          <strong>
            {tasks.completed} of {tasks.total}
          </strong>
          <progress
            aria-label="Task completion"
            value={tasks.completed}
            max={Math.max(tasks.total, 1)}
          />
        </div>
      </div>
      <div className="overview-grid">
        <section className="soft-panel" aria-labelledby="breakdown-title">
          <div className="subheading">
            <h4 id="breakdown-title">Category breakdown</h4>
            <button className="text-button" onClick={() => navigate("Budget")}>
              View budget <Icon name="arrow" />
            </button>
          </div>
          {budget.rows.length ? (
            <ul className="breakdown-list">
              {budget.rows.map((row) => (
                <li key={row.id}>
                  <div>
                    <span>{row.name}</span>
                    <strong>{formatRupees(row.totalPaise)}</strong>
                  </div>
                  <div className="breakdown-track" aria-hidden="true">
                    <span style={{ width: `${row.percent}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Add a category to start allocating your budget.</Empty>
          )}
        </section>
        <section className="soft-panel" aria-labelledby="upcoming-title">
          <div className="subheading">
            <h4 id="upcoming-title">Upcoming tasks</h4>
            <button className="text-button" onClick={() => navigate("Tasks")}>
              View tasks <Icon name="arrow" />
            </button>
          </div>
          {tasks.upcoming.length ? (
            <ul className="upcoming-list">
              {tasks.upcoming.slice(0, 3).map((task) => (
                <li key={task.id}>
                  <span className="task-dot" aria-hidden="true" />
                  <span>
                    <strong>{task.title}</strong>
                    <small>{readableDate(task.dueDate)}</small>
                  </span>
                  <PriorityChip value={task.priority} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              {tasks.total
                ? "Every task is complete."
                : "Add a task or use a bundled sample draft."}
            </Empty>
          )}
          <div className="priority-note">
            <Icon name="sparkle" />
            <p>
              <strong>Planning priority</strong>
              <br />
              {budget.overBudget
                ? "Review per-guest allocations and adjust your budget."
                : tasks.upcoming[0]
                  ? `Next on your list: ${tasks.upcoming[0].title}.`
                  : "Review your event details and add the first next step."}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

export function EventSetup({
  plan,
  commit,
  onScenario,
}: {
  plan: Plan;
  commit: Commit;
  onScenario: (type: EventType) => void;
}) {
  const event = plan.event;
  return (
    <>
      <PanelHeading
        title="Event setup"
        description="Set the details your budget and task list are built around."
      />
      <form
        className="form-grid"
        onSubmit={(event) =>
          onFormSubmit(event, (values) => {
            commit(
              (current) =>
                updateEvent(
                  current,
                  validateEvent({
                    type: parseEventType(textField(values, "type")),
                    name: textField(values, "name"),
                    date: textField(values, "date"),
                    guests: textField(values, "guests"),
                    budget: textField(values, "budget"),
                    preferences: textField(values, "preferences"),
                  }),
                ),
              "Event saved.",
            );
          })
        }
      >
        <label>
          Event type
          <select name="type" defaultValue={event.type}>
            {Object.entries(scenarioNames).map(([type, name]) => (
              <option key={type} value={type}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Event name
          <input
            name="name"
            type="text"
            defaultValue={event.name}
            maxLength={100}
            required
          />
        </label>
        <label>
          Event date
          <input name="date" type="date" defaultValue={event.date} />
        </label>
        <label>
          Guest count
          <input
            name="guests"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={event.guests}
            required
          />
        </label>
        <label>
          Total budget (₹)
          <input
            name="budget"
            type="text"
            inputMode="decimal"
            defaultValue={rupeesInput(event.budgetPaise)}
            required
          />
        </label>
        <label className="form-wide">
          Planning preferences
          <textarea
            name="preferences"
            rows={3}
            maxLength={500}
            defaultValue={event.preferences}
            placeholder="For example, an afternoon event with a simple menu"
          />
        </label>
        <p className="field-note form-wide">
          Keep this plan synthetic and leave out personal or contact details.
        </p>
        <div className="form-actions form-wide">
          <button className="button button-primary" type="submit">
            Save event
          </button>
        </div>
      </form>
      <div className="scenario-picker">
        <h4>Try a different sample</h4>
        <p>Opening a sample replaces this browser’s plan.</p>
        <div className="scenario-options">
          {Object.entries(scenarioNames).map(([type, name]) => (
            <button
              key={type}
              className="button button-secondary"
              onClick={() => onScenario(type as EventType)}
            >
              {name}
              <Icon name="arrow" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function CategoryEditor({
  category,
  onSave,
  onCancel,
}: {
  category?: BudgetCategory;
  onSave: (value: { name: string; basis: BudgetBasis; amount: string }) => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="form-grid editor"
      onSubmit={(event) =>
        onFormSubmit(event, (values) =>
          onSave({
            name: textField(values, "name"),
            basis: textField(values, "basis") as BudgetBasis,
            amount: textField(values, "amount"),
          }),
        )
      }
    >
      <label>
        Category name
        <input
          name="name"
          type="text"
          defaultValue={category?.name ?? ""}
          maxLength={80}
          required
        />
      </label>
      <label>
        Pricing basis
        <select name="basis" defaultValue={category?.basis ?? "fixed"}>
          <option value="fixed">Fixed amount</option>
          <option value="per_guest">Per guest</option>
        </select>
      </label>
      <label>
        Amount (₹)
        <input
          name="amount"
          type="text"
          inputMode="decimal"
          defaultValue={category ? rupeesInput(category.amountPaise) : ""}
          required
        />
      </label>
      <div className="form-actions form-wide">
        <button className="button button-primary" type="submit">
          Save category
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function Budget({ plan, commit }: { plan: Plan; commit: Commit }) {
  const [editor, setEditor] = useState<string | null | undefined>();
  const summary = budgetSummary(plan);
  const saveCategory = (
    id: string | null,
    values: Parameters<typeof editCategory>[2],
  ) => {
    if (
      commit(
        (current) => editCategory(current, id, values),
        "Budget category saved.",
      )
    ) {
      setEditor(undefined);
    }
  };
  return (
    <>
      <PanelHeading
        title="Budget"
        description="Plan fixed amounts or set a cost per guest. The amounts below are planned allocations."
        action={
          <button
            className="button button-primary"
            onClick={() => setEditor(null)}
          >
            <Icon name="plus" /> Add category
          </button>
        }
      />
      <div className="budget-summary">
        <div>
          <span>Total budget</span>
          <strong>{formatRupees(plan.event.budgetPaise)}</strong>
        </div>
        <div>
          <span>Allocated</span>
          <strong>{formatRupees(summary.allocatedPaise)}</strong>
          <small>{percent(summary.allocatedPercent)}</small>
        </div>
        <div className={summary.overBudget ? "warning-text" : ""}>
          <span>{summary.overBudget ? "Over budget" : "Remaining"}</span>
          <strong>{formatRupees(Math.abs(summary.remainingPaise))}</strong>
        </div>
      </div>
      {editor === null && (
        <CategoryEditor
          onSave={(values) => saveCategory(null, values)}
          onCancel={() => setEditor(undefined)}
        />
      )}
      {summary.rows.length ? (
        <ul className="detail-list">
          {summary.rows.map((row) => (
            <li key={row.id}>
              <div className="detail-row">
                <div className="detail-copy">
                  <strong>{row.name}</strong>
                  <small>
                    {row.basis === "per_guest"
                      ? `${formatRupees(row.amountPaise)} per guest × ${countFormat.format(plan.event.guests)}`
                      : "Fixed amount"}
                  </small>
                </div>
                <div className="detail-value">
                  <strong>{formatRupees(row.totalPaise)}</strong>
                  <small>{percent(row.percent)} of allocation</small>
                </div>
                <div className="row-actions">
                  <button
                    className="button button-secondary button-small"
                    aria-label={`Edit ${row.name}`}
                    onClick={() => setEditor(row.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-button"
                    aria-label={`Remove ${row.name}`}
                    onClick={() =>
                      commit(
                        (current) => removeCategory(current, row.id),
                        "Budget category removed.",
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
              {editor === row.id && (
                <CategoryEditor
                  key={row.id}
                  category={row}
                  onSave={(values) => saveCategory(row.id, values)}
                  onCancel={() => setEditor(undefined)}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          There are no budget categories yet. Add your first allocation to
          begin.
        </Empty>
      )}
    </>
  );
}

function PriorityChip({ value }: { value: Priority }) {
  return (
    <span className={`priority-chip priority-${value}`}>
      {value[0].toUpperCase() + value.slice(1)}
    </span>
  );
}

function TaskEditor({
  task,
  onSave,
  onCancel,
}: {
  task?: Task;
  onSave: (value: {
    title: string;
    dueDate: string;
    priority: Priority;
  }) => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="form-grid editor"
      onSubmit={(event) =>
        onFormSubmit(event, (values) =>
          onSave({
            title: textField(values, "title"),
            dueDate: textField(values, "date"),
            priority: textField(values, "priority") as Priority,
          }),
        )
      }
    >
      <label>
        Task title
        <input
          name="title"
          type="text"
          defaultValue={task?.title ?? ""}
          maxLength={120}
          required
        />
      </label>
      <label>
        Due date
        <input name="date" type="date" defaultValue={task?.dueDate ?? ""} />
      </label>
      <label>
        Priority
        <select name="priority" defaultValue={task?.priority ?? "normal"}>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </label>
      <div className="form-actions form-wide">
        <button className="button button-primary" type="submit">
          Save task
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function Tasks({ plan, commit }: { plan: Plan; commit: Commit }) {
  const [editor, setEditor] = useState<string | null | undefined>();
  const progress = taskProgress(plan);
  const taskById = new Map(plan.tasks.map((task) => [task.id, task]));
  const saveTask = (
    id: string | null,
    values: Parameters<typeof editTask>[2],
  ) => {
    if (commit((current) => editTask(current, id, values), "Task saved.")) {
      setEditor(undefined);
    }
  };
  return (
    <>
      <PanelHeading
        title="Tasks"
        description="Follow priorities and finish prerequisites before completing dependent tasks."
        action={
          <button
            className="button button-primary"
            onClick={() => setEditor(null)}
          >
            <Icon name="plus" /> Add task
          </button>
        }
      />
      <div className="task-progress">
        <strong>
          {progress.completed} of {progress.total} complete
        </strong>
        <progress
          aria-label="Checklist progress"
          value={progress.completed}
          max={Math.max(progress.total, 1)}
        />
      </div>
      {editor === null && (
        <TaskEditor
          onSave={(values) => saveTask(null, values)}
          onCancel={() => setEditor(undefined)}
        />
      )}
      {plan.tasks.length ? (
        <ul className="detail-list">
          {plan.tasks.map((task) => {
            const prerequisites = task.dependsOn
              .map((id) => taskById.get(id))
              .filter((value) => value !== undefined);
            return (
              <li key={task.id}>
                <div className="detail-row task-row">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() =>
                        commit(
                          (current) => toggleTask(current, task.id),
                          task.completed ? "Task reopened." : "Task completed.",
                        )
                      }
                    />
                    <strong>{task.title}</strong>
                  </label>
                  <div className="task-meta">
                    <PriorityChip value={task.priority} />
                    <small>{readableDate(task.dueDate)}</small>
                  </div>
                  <div className="row-actions">
                    <button
                      className="button button-secondary button-small"
                      aria-label={`Edit ${task.title}`}
                      onClick={() => setEditor(task.id)}
                    >
                      Edit
                    </button>
                  </div>
                  {prerequisites.length > 0 && (
                    <p className="dependency">
                      <strong>Depends on:</strong>{" "}
                      {prerequisites.map((item) => item.title).join(", ")}
                      {prerequisites.some((item) => !item.completed) && (
                        <span className="dependency-status">
                          {" "}
                          · Waiting for prerequisite
                        </span>
                      )}
                    </p>
                  )}
                </div>
                {editor === task.id && (
                  <TaskEditor
                    key={task.id}
                    task={task}
                    onSave={(values) => saveTask(task.id, values)}
                    onCancel={() => setEditor(undefined)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>
          There are no tasks yet. Add one here or review a bundled sample draft.
        </Empty>
      )}
    </>
  );
}

export function Replan({ plan, commit }: { plan: Plan; commit: Commit }) {
  const [preview, setPreview] = useState<{
    guests: number;
    budgetPaise: number;
    result: ReturnType<typeof replan>;
  }>();
  const [error, setError] = useState("");
  return (
    <>
      <PanelHeading
        title="Replan"
        description="Preview how a different guest count or budget would affect the plan. The calculations follow fixed rules."
      />
      <form
        className="form-grid"
        onChange={() => {
          setPreview(undefined);
          setError("");
        }}
        onSubmit={(event) =>
          onFormSubmit(event, (values) => {
            try {
              const guests = Number(textField(values, "guests"));
              const budgetPaise = parseRupees(textField(values, "budget"));
              setPreview({
                guests,
                budgetPaise,
                result: replan(plan, { guests, budgetPaise }),
              });
              setError("");
            } catch (error) {
              setPreview(undefined);
              setError(
                error instanceof Error
                  ? error.message
                  : "Check the guest count and budget.",
              );
            }
          })
        }
      >
        <label>
          New guest count
          <input
            name="guests"
            type="number"
            inputMode="numeric"
            defaultValue={plan.event.guests}
            min={0}
            step={1}
            required
          />
        </label>
        <label>
          New total budget (₹)
          <input
            name="budget"
            type="text"
            inputMode="decimal"
            defaultValue={rupeesInput(plan.event.budgetPaise)}
            required
          />
        </label>
        <div className="form-actions form-wide">
          <button className="button button-primary" type="submit">
            Preview changes
          </button>
        </div>
      </form>
      {error && (
        <p className="inline-alert" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section className="replan-preview" aria-labelledby="preview-title">
          <h4 id="preview-title">Before and after</h4>
          <p>{preview.result.explanation}</p>
          <table className="comparison-table">
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col">Before</th>
                <th scope="col">After</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Guests</th>
                <td>{countFormat.format(plan.event.guests)}</td>
                <td>{countFormat.format(preview.guests)}</td>
              </tr>
              <tr>
                <th scope="row">Budget</th>
                <td>{formatRupees(plan.event.budgetPaise)}</td>
                <td>{formatRupees(preview.budgetPaise)}</td>
              </tr>
              <tr>
                <th scope="row">Allocated</th>
                <td>{formatRupees(preview.result.before.allocatedPaise)}</td>
                <td>{formatRupees(preview.result.after.allocatedPaise)}</td>
              </tr>
              <tr>
                <th scope="row">Remaining</th>
                <td>{formatRupees(preview.result.before.remainingPaise)}</td>
                <td>{formatRupees(preview.result.after.remainingPaise)}</td>
              </tr>
            </tbody>
          </table>
          <p>
            <strong>Allocation change:</strong>{" "}
            {formatRupees(preview.result.deltaPaise)}
          </p>
          {preview.result.changedCategories.length > 0 && (
            <p>
              <strong>Categories to review:</strong>{" "}
              {preview.result.changedCategories.join(", ")}
            </p>
          )}
          {preview.result.affectedTasks.length > 0 && (
            <p>
              <strong>Tasks to review:</strong>{" "}
              {preview.result.affectedTasks
                .map((task) => task.title)
                .join(", ")}
            </p>
          )}
          <button
            className="button button-primary"
            onClick={() => {
              if (
                commit(
                  (current) =>
                    updateEvent(current, {
                      ...current.event,
                      guests: preview.guests,
                      budgetPaise: preview.budgetPaise,
                    }),
                  "Changes applied to your plan.",
                )
              ) {
                setPreview(undefined);
              }
            }}
          >
            Apply changes
          </button>
        </section>
      )}
    </>
  );
}

export function Draft({ plan, commit }: { plan: Plan; commit: Commit }) {
  const suggestions = draftFor(plan);
  const [loaded, setLoaded] = useState(() =>
    suggestions.some((item) => item.decision !== null),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const applyDecision = (decision: "accepted" | "rejected") => {
    if (
      commit(
        (current) => decideDraft(current, selected, decision),
        decision === "accepted"
          ? "Selected suggestions added to your plan."
          : "Selected suggestions rejected.",
      )
    ) {
      setSelected([]);
    }
  };
  return (
    <>
      <PanelHeading
        title="Sample draft"
        description="Sample AI planning experience — bundled example, no live model call."
      />
      <p className="field-note">
        Review the sample budget and tasks for this event type. Only accepted
        suggestions are added to this browser’s plan.
      </p>
      {!loaded ? (
        <button
          className="button button-primary"
          onClick={() => setLoaded(true)}
        >
          <Icon name="sparkle" /> Load sample draft
        </button>
      ) : (
        <>
          <ul className="detail-list draft-list">
            {suggestions.map((item) => (
              <li key={item.id}>
                <div className="draft-row">
                  {item.decision ? (
                    <div className="draft-copy">
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </div>
                  ) : (
                    <label className="check-label">
                      <input
                        type="checkbox"
                        aria-label={item.title}
                        checked={selected.includes(item.id)}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setSelected((current) =>
                            checked
                              ? [...current, item.id]
                              : current.filter((id) => id !== item.id),
                          );
                        }}
                      />
                      <span className="draft-copy">
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>
                    </label>
                  )}
                  <span
                    className={`priority-chip draft-${item.decision ?? "pending"}`}
                  >
                    {item.decision === "accepted"
                      ? "Accepted"
                      : item.decision === "rejected"
                        ? "Rejected"
                        : item.kind === "budget"
                          ? "Budget"
                          : "Task"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="form-actions draft-actions">
            <button
              className="button button-primary"
              disabled={selected.length === 0}
              onClick={() => applyDecision("accepted")}
            >
              Accept selected
            </button>
            <button
              className="button button-secondary"
              disabled={selected.length === 0}
              onClick={() => applyDecision("rejected")}
            >
              Reject selected
            </button>
          </div>
        </>
      )}
    </>
  );
}
