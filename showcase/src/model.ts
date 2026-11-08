import { z } from "zod";
import {
  MAX_MINOR,
  eventType,
  guestCount,
  type BudgetItem,
} from "../../src/domain/contracts";
import {
  calculateBudget,
  formatMoney,
  lineTotal,
  minorToRupees,
  rupeesToMinor,
} from "../../src/domain/money";
import { assertDag } from "../../src/domain/tasks";
import { draftSeeds, fixtures } from "./fixtures";

const maxPaise = Number(MAX_MINOR);
const maxCategories = 60;
const maxTasks = 80;
const paiseSchema = z.number().int().min(0).max(maxPaise);
const idSchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const basisSchema = z.enum(["fixed", "per_guest"]);
const prioritySchema = z.enum(["low", "normal", "high"]);
const decisionSchema = z.enum(["accepted", "rejected"]);
const dateSchema = z.string().refine((value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
});
const eventSchema = z.strictObject({
  type: eventType,
  name: z.string().trim().max(140),
  date: dateSchema,
  guests: guestCount,
  budgetPaise: paiseSchema,
  preferences: z.string().trim().max(1000),
});
const categorySchema = z.strictObject({
  id: idSchema,
  name: z.string().trim().min(1).max(80),
  basis: basisSchema,
  amountPaise: paiseSchema,
});
const taskSchema = z.strictObject({
  id: idSchema,
  title: z.string().trim().min(1).max(200),
  dueDate: dateSchema,
  priority: prioritySchema,
  completed: z.boolean(),
  dependsOn: z.array(idSchema).max(12),
});
const planSchema = z.strictObject({
  version: z.literal(1),
  event: eventSchema,
  categories: z.array(categorySchema).max(maxCategories),
  tasks: z.array(taskSchema).max(maxTasks),
  draftDecisions: z.record(idSchema, decisionSchema),
});

export type EventType = z.infer<typeof eventType>;
export type EventDetails = z.infer<typeof eventSchema>;
export type BudgetBasis = z.infer<typeof basisSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type BudgetCategory = z.infer<typeof categorySchema>;
export type Task = z.infer<typeof taskSchema>;
export type Plan = z.infer<typeof planSchema>;
type Decision = z.infer<typeof decisionSchema>;

export const STORAGE_KEY = "utsavos-showcase-v1";

export function parseEventType(value: string): EventType {
  return eventType.parse(value);
}

export function scenario(type: EventType = "wedding"): Plan {
  return structuredClone({
    version: 1,
    ...fixtures[type],
    draftDecisions: {},
  });
}

export function fresh(type: EventType = "wedding"): Plan {
  return {
    version: 1,
    event: {
      type,
      name: "",
      date: "",
      guests: 0,
      budgetPaise: 0,
      preferences: "",
    },
    categories: [],
    tasks: [],
    draftDecisions: {},
  };
}

export function parseRupees(text: string): number {
  const value = text.trim();
  try {
    if (value.length > 16) throw new RangeError();
    return Number(rupeesToMinor(value));
  } catch {
    throw new Error(
      "Enter a nonnegative rupee amount with up to two decimal places, without commas.",
    );
  }
}

export function rupeesInput(paise: number): string {
  return minorToRupees(paiseSchema.parse(paise).toString());
}

export function formatRupees(paise: number): string {
  return formatMoney(paise.toString());
}

function validateGuests(value: string | number): number {
  const input = typeof value === "string" ? value.trim() : value;
  const result = guestCount.safeParse(
    typeof input === "string" && /^\d{1,6}$/.test(input)
      ? Number(input)
      : input,
  );
  if (!result.success)
    throw new Error("Enter a whole guest count between 0 and 100,000.");
  return result.data;
}

export function validateEvent(input: {
  type: EventType;
  name: string;
  date: string;
  guests: number | string;
  budget: string;
  preferences: string;
}): EventDetails {
  if (!input.name.trim() || input.name.trim().length > 140)
    throw new Error("Enter an event name between 1 and 140 characters.");
  if (!dateSchema.safeParse(input.date).success)
    throw new Error("Enter a valid event date.");
  if (input.preferences.trim().length > 1000)
    throw new Error("Keep preferences to 1,000 characters or fewer.");
  return eventSchema.parse({
    type: input.type,
    name: input.name,
    date: input.date,
    guests: validateGuests(input.guests),
    budgetPaise: parseRupees(input.budget),
    preferences: input.preferences,
  });
}

function asBudgetItem(category: BudgetCategory): BudgetItem {
  return {
    id: category.id,
    title: category.name,
    category: category.name,
    pricingBasis: category.basis,
    unitPriceMinor: category.amountPaise.toString(),
    quantity: null,
    sourceKind: "user_estimate",
    sourceLabel: null,
    isLocked: false,
    state: "active",
  };
}

function totals(plan: Plan) {
  return calculateBudget(
    plan.categories.map(asBudgetItem),
    plan.event.guests,
    plan.event.budgetPaise.toString(),
  );
}

function percent(numerator: bigint, denominator: bigint): number {
  return Number((numerator * 100n + denominator / 2n) / denominator);
}

export function budgetSummary(plan: Plan) {
  const total = totals(plan);
  const allocated = BigInt(total.projectedMinor);
  const ceiling = BigInt(plan.event.budgetPaise);
  return {
    allocatedPaise: Number(allocated),
    remainingPaise: Number(total.remainingMinor),
    overBudget: total.overBudget,
    allocatedPercent: ceiling ? percent(allocated, ceiling) : null,
    rows: plan.categories.map((category) => {
      const amount = lineTotal(asBudgetItem(category), plan.event.guests);
      return {
        ...category,
        totalPaise: Number(amount),
        percent: allocated ? percent(amount, allocated) : 0,
      };
    }),
  };
}

function checkBudget(plan: Plan): Plan {
  try {
    totals(plan);
  } catch {
    throw new Error(
      "The projected total is too large. Reduce an allocation or the guest count.",
    );
  }
  return plan;
}

export function updateEvent(plan: Plan, event: EventDetails): Plan {
  const parsed = eventSchema.safeParse(event);
  if (!parsed.success) throw new Error("Check the event details.");
  return checkBudget({ ...plan, event: parsed.data });
}

function nextId(items: { id: string }[], prefix: string): string {
  const ids = new Set(items.map(({ id }) => id));
  let index = 1;
  while (ids.has(`${prefix}-${index}`)) index++;
  return `${prefix}-${index}`;
}

function editRow<T extends { id: string }>(
  rows: T[],
  id: string | null,
  row: T,
) {
  if (id === null) return [...rows, row];
  if (!rows.some((item) => item.id === id))
    throw new Error("This item is no longer in the plan.");
  return rows.map((item) => (item.id === id ? row : item));
}

export function editCategory(
  plan: Plan,
  id: string | null,
  input: { name: string; basis: BudgetBasis; amount: string },
): Plan {
  if (id === null && plan.categories.length >= maxCategories)
    throw new Error(
      `A demo can hold up to ${maxCategories} budget categories.`,
    );
  const category = categorySchema.safeParse({
    id: id ?? nextId(plan.categories, "category"),
    name: input.name,
    basis: input.basis,
    amountPaise: parseRupees(input.amount),
  });
  if (!category.success)
    throw new Error(
      "Enter a category name of up to 80 characters and select a pricing basis.",
    );
  return checkBudget({
    ...plan,
    categories: editRow(plan.categories, id, category.data),
  });
}

export function removeCategory(plan: Plan, id: string): Plan {
  return {
    ...plan,
    categories: plan.categories.filter((item) => item.id !== id),
  };
}

export function editTask(
  plan: Plan,
  id: string | null,
  input: Pick<Task, "title" | "dueDate" | "priority">,
): Plan {
  if (id === null && plan.tasks.length >= maxTasks)
    throw new Error(`A demo can hold up to ${maxTasks} tasks.`);
  const existing = plan.tasks.find((task) => task.id === id);
  const task = taskSchema.safeParse({
    id: id ?? nextId(plan.tasks, "task"),
    completed: existing?.completed ?? false,
    dependsOn: existing?.dependsOn ?? [],
    ...input,
  });
  if (!task.success)
    throw new Error(
      "Enter a task name of up to 200 characters, a valid date or no date, and a priority.",
    );
  return { ...plan, tasks: editRow(plan.tasks, id, task.data) };
}

export function toggleTask(plan: Plan, id: string): Plan {
  const task = plan.tasks.find((item) => item.id === id);
  if (!task) throw new Error("This task is no longer in the plan.");
  if (task.completed) {
    const dependent = plan.tasks.find(
      (item) => item.completed && item.dependsOn.includes(id),
    );
    if (dependent) throw new Error(`Reopen “${dependent.title}” first.`);
  } else {
    const prerequisite = plan.tasks.find(
      (item) => !item.completed && task.dependsOn.includes(item.id),
    );
    if (prerequisite)
      throw new Error(`Complete “${prerequisite.title}” first.`);
  }
  return {
    ...plan,
    tasks: editRow(plan.tasks, id, { ...task, completed: !task.completed }),
  };
}

export function taskProgress(plan: Plan) {
  const completed = new Set(
    plan.tasks.filter((task) => task.completed).map((task) => task.id),
  );
  const priority: Record<Priority, number> = { high: 0, normal: 1, low: 2 };
  const blocked = (task: Task) =>
    Number(task.dependsOn.some((id) => !completed.has(id)));
  const upcoming = plan.tasks
    .filter((task) => !task.completed)
    .sort(
      (a, b) =>
        blocked(a) - blocked(b) ||
        (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99") ||
        priority[a.priority] - priority[b.priority],
    );
  return {
    completed: completed.size,
    total: plan.tasks.length,
    percent: plan.tasks.length
      ? percent(BigInt(completed.size), BigInt(plan.tasks.length))
      : 0,
    upcoming,
  };
}

export function replan(
  plan: Plan,
  change: Pick<EventDetails, "guests" | "budgetPaise">,
) {
  const next = updateEvent(plan, {
    ...plan.event,
    guests: validateGuests(change.guests),
    budgetPaise: change.budgetPaise,
  });
  const before = budgetSummary(plan);
  const after = budgetSummary(next);
  const changedCategories = after.rows
    .filter((row, index) => row.totalPaise !== before.rows[index].totalPaise)
    .map((row) => row.name);
  const guestCountChanged = plan.event.guests !== next.event.guests;
  const affectedTasks = guestCountChanged ? taskProgress(plan).upcoming : [];
  const guestExplanation = guestCountChanged
    ? `Guest count changed from ${plan.event.guests} to ${next.event.guests}. Per-guest allocations use the new count. Fixed allocations stay the same.`
    : "Guest count and line estimates stay the same.";
  const ceilingExplanation =
    plan.event.budgetPaise === next.event.budgetPaise
      ? ""
      : " The new budget ceiling changes the remaining balance.";
  return {
    before,
    after,
    deltaPaise: after.allocatedPaise - before.allocatedPaise,
    changedCategories,
    affectedTasks,
    explanation: guestExplanation + ceilingExplanation,
  };
}

type DraftItem = {
  id: string;
  title: string;
  description: string;
  decision: Decision | null;
} & (
  | { kind: "budget"; category: BudgetCategory; task?: never }
  | { kind: "task"; task: Task; category?: never }
);

function draftId(type: EventType, slug: string) {
  return `draft-${type}-${slug}`;
}

export function draftFor(plan: Plan): DraftItem[] {
  return draftSeeds[plan.event.type].map((seed) => {
    const id = draftId(plan.event.type, seed.slug);
    const common = {
      id,
      title: seed.title,
      description: seed.description,
      decision: plan.draftDecisions[id] ?? null,
    };
    return seed.kind === "budget"
      ? {
          ...common,
          kind: "budget",
          category: {
            id,
            name: seed.title,
            basis: seed.basis,
            amountPaise: seed.amountPaise,
          },
        }
      : {
          ...common,
          kind: "task",
          task: {
            id,
            title: seed.title,
            dueDate: "",
            priority: seed.priority,
            completed: false,
            dependsOn: [],
          },
        };
  });
}

export function decideDraft(
  plan: Plan,
  ids: readonly string[],
  decision: Decision,
): Plan {
  const draft = draftFor(plan);
  const selected = new Set(ids);
  if ([...selected].some((id) => !draft.some((item) => item.id === id)))
    throw new Error("One of the selected suggestions is no longer available.");
  const items = draft.filter((item) => selected.has(item.id) && !item.decision);
  if (!items.length) return plan;

  const categories = [...plan.categories];
  const tasks = [...plan.tasks];
  const draftDecisions = { ...plan.draftDecisions };
  for (const item of items) {
    draftDecisions[item.id] = decision;
    if (decision === "accepted") {
      if (item.kind === "budget") categories.push(item.category);
      else tasks.push(item.task);
    }
  }
  if (categories.length > maxCategories || tasks.length > maxTasks)
    throw new Error(
      "The selected suggestions would exceed this demo's plan capacity.",
    );
  return checkBudget({ ...plan, categories, tasks, draftDecisions });
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function parseStored(raw: string): Plan {
  if (raw.length > 100_000)
    throw new Error("Stored plan exceeds its size limit.");
  const plan = planSchema.parse(JSON.parse(raw));
  if (
    new Set(plan.categories.map(({ id }) => id)).size !== plan.categories.length
  )
    throw new Error("Duplicate categories.");
  const draftKinds = new Map(
    Object.entries(draftSeeds).flatMap(([type, seeds]) =>
      seeds.map(
        ({ slug, kind }) =>
          [draftId(eventType.parse(type), slug), kind] as const,
      ),
    ),
  );
  if (Object.keys(plan.draftDecisions).some((id) => !draftKinds.has(id)))
    throw new Error("Unknown draft suggestion.");
  const hasInvalidDraftRow = (
    kind: "budget" | "task",
    rows: { id: string }[],
  ) =>
    rows.some(
      ({ id }) =>
        id.startsWith("draft-") &&
        (draftKinds.get(id) !== kind || plan.draftDecisions[id] !== "accepted"),
    );
  if (
    hasInvalidDraftRow("budget", plan.categories) ||
    hasInvalidDraftRow("task", plan.tasks)
  )
    throw new Error("Unaccepted draft suggestion.");
  const taskGraph = plan.tasks.map(({ id, dependsOn }) => ({
    id,
    dependencyIds: dependsOn,
  }));
  assertDag(taskGraph);
  const completeIds = new Set(
    plan.tasks.filter((task) => task.completed).map((task) => task.id),
  );
  if (
    plan.tasks.some(
      (task) =>
        task.completed && task.dependsOn.some((id) => !completeIds.has(id)),
    )
  )
    throw new Error("A completed task has an incomplete prerequisite.");
  return checkBudget(plan);
}

export function loadPlan(storage: StorageLike | null = browserStorage()) {
  const unavailable =
    "Browser storage is unavailable. Changes will only last in this tab.";
  if (!storage) return { plan: scenario(), warning: unavailable };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { plan: scenario(), warning: unavailable };
  }
  if (raw === null) return { plan: scenario(), warning: null };
  try {
    return { plan: parseStored(raw), warning: null };
  } catch {
    return {
      plan: scenario(),
      warning:
        "The saved demo could not be read. A fresh sample has been loaded.",
    };
  }
}

export function savePlan(
  plan: Plan,
  storage: StorageLike | null = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(plan));
    return true;
  } catch {
    return false;
  }
}
