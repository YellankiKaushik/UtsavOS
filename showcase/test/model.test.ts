import { describe, expect, it } from "vitest";
import type { BudgetItem, EventSnapshot } from "../../src/domain/contracts";
import { calculateBudget, rupeesToMinor } from "../../src/domain/money";
import { previewReplan } from "../../src/domain/replan";
import {
  STORAGE_KEY,
  budgetSummary,
  decideDraft,
  draftFor,
  editCategory,
  editTask,
  formatRupees,
  fresh,
  loadPlan,
  parseRupees,
  removeCategory,
  replan,
  rupeesInput,
  savePlan,
  scenario,
  taskProgress,
  toggleTask,
  updateEvent,
  validateEvent,
  type Plan,
} from "../src/model";

const weddingEvent = {
  type: "wedding",
  name: "  Courtyard dinner  ",
  date: "2028-02-29",
  guests: "42",
  budget: "18000.10",
  preferences: "  Seasonal flowers  ",
} as const;

function inMemoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
}

function domainItems(plan: Plan): BudgetItem[] {
  return plan.categories.map((category) => ({
    id: category.id,
    title: category.name,
    category: category.name,
    pricingBasis: category.basis,
    unitPriceMinor: String(category.amountPaise),
    quantity: null,
    sourceKind: "user_estimate",
    sourceLabel: null,
    isLocked: false,
    state: "active",
  }));
}

describe("event setup and scenario reset", () => {
  it("creates an event from input and edits it without changing the original plan", () => {
    const empty = fresh();
    expect(empty.categories).toHaveLength(0);
    expect(empty.tasks).toHaveLength(0);
    const updated = updateEvent(empty, validateEvent(weddingEvent));
    expect(updated.event).toEqual({
      type: "wedding",
      name: "Courtyard dinner",
      date: "2028-02-29",
      guests: 42,
      budgetPaise: 1_800_010,
      preferences: "Seasonal flowers",
    });
    const edited = updateEvent(updated, {
      ...updated.event,
      name: "Dinner in the courtyard",
    });
    expect(edited.event.name).toBe("Dinner in the courtyard");
    expect(updated.event.name).toBe("Courtyard dinner");
    expect(empty.event.name).toBe("");
  });

  it.each([
    "2027-02-29",
    "2028-04-31",
    "02/11/2027",
    "2027-13-01",
    "0000-01-01",
  ])("rejects the malformed date %s", (date) => {
    expect(() => validateEvent({ ...weddingEvent, date })).toThrow(
      "valid event date",
    );
  });

  it.each(["", "4.5", "-1", "1e3", "100001", 100001, NaN])(
    "rejects the invalid guest count %s",
    (guests) => {
      expect(() => validateEvent({ ...weddingEvent, guests })).toThrow(
        "whole guest count",
      );
    },
  );

  it("requires a name, limits preferences, and permits an unscheduled event", () => {
    expect(() => validateEvent({ ...weddingEvent, name: " " })).toThrow(
      "event name",
    );
    expect(() =>
      validateEvent({ ...weddingEvent, preferences: "x".repeat(1001) }),
    ).toThrow("preferences");
    expect(validateEvent({ ...weddingEvent, date: "", guests: 0 }).date).toBe(
      "",
    );
  });

  it("resets to a fresh copy of each named sample", () => {
    const initial = scenario();
    const edited = updateEvent(initial, { ...initial.event, guests: 80 });
    expect(edited.event.guests).toBe(80);
    expect(scenario().event.guests).toBe(120);
    expect(scenario("birthday").event.name).toBe("Paper Lantern Birthday");
    expect(scenario("community").event.name).toBe("Courtyard Community Day");
    initial.categories[0].name = "Changed fixture copy";
    expect(scenario().categories[0].name).toBe("Venue");
  });
});

describe("money and deterministic replanning", () => {
  it.each(["0", "0.01", "0.10", "100", "90000000000"])(
    "parses %s rupees to the same minor units as the full-stack domain",
    (value) => {
      expect(String(parseRupees(value))).toBe(rupeesToMinor(value));
    },
  );

  it.each(["", "-2", ".01", "1e6", "1,500", "2.999", "90000000000.01"])(
    "rejects the malformed or out-of-range amount %s",
    (value) => {
      expect(() => parseRupees(value)).toThrow("rupee amount");
    },
  );

  it("calculates fixed and guest-linked totals exactly, with whole percent rounding", () => {
    let plan = updateEvent(fresh(), {
      ...fresh().event,
      guests: 3,
      budgetPaise: 10,
    });
    plan = editCategory(plan, null, {
      name: "Room",
      basis: "fixed",
      amount: "0.01",
    });
    plan = editCategory(plan, null, {
      name: "Meals",
      basis: "per_guest",
      amount: "0.02",
    });
    expect(budgetSummary(plan)).toMatchObject({
      allocatedPaise: 7,
      remainingPaise: 3,
      allocatedPercent: 70,
      rows: [
        { totalPaise: 1, percent: 14 },
        { totalPaise: 6, percent: 86 },
      ],
    });
    const id = plan.categories[0].id;
    const over = editCategory(plan, id, {
      name: "Room",
      basis: "fixed",
      amount: "0.06",
    });
    expect(budgetSummary(over)).toMatchObject({
      allocatedPaise: 12,
      remainingPaise: -2,
      overBudget: true,
    });
    expect(budgetSummary(removeCategory(over, id)).allocatedPaise).toBe(6);
    expect(rupeesInput(12345)).toBe("123.45");
    expect(formatRupees(-2)).toBe("−₹0.02");
    expect(budgetSummary(fresh()).allocatedPercent).toBeNull();
  });

  it("keeps the prior plan when an edit or a guest change would overflow", () => {
    const plan = updateEvent(fresh(), { ...fresh().event, guests: 2 });
    expect(() =>
      editCategory(plan, null, {
        name: "Large meal line",
        basis: "per_guest",
        amount: "90000000000",
      }),
    ).toThrow("projected total is too large");
    expect(plan.categories).toEqual([]);
    const oneGuest = updateEvent(plan, { ...plan.event, guests: 1 });
    const edge = editCategory(oneGuest, null, {
      name: "Meals",
      basis: "per_guest",
      amount: "90000000000",
    });
    expect(() => replan(edge, { guests: 2, budgetPaise: 0 })).toThrow(
      "projected total is too large",
    );
    expect(edge.event.guests).toBe(1);
  });

  it("matches full-stack budget and guest-count replan calculations", () => {
    const plan = scenario();
    const snapshot: EventSnapshot = {
      event: {
        id: "showcase",
        workspaceId: "showcase",
        type: plan.event.type,
        title: plan.event.name,
        dateStatus: "tbd",
        startsAt: null,
        timeZone: "UTC",
        guestCount: plan.event.guests,
        currency: "INR",
        budgetMinor: String(plan.event.budgetPaise),
        preferences: plan.event.preferences,
        status: "planning",
        version: 1,
        createdAt: "2026-01-01T00:00:00Z",
      },
      budgetItems: domainItems(plan),
      tasks: [],
      vendors: [],
    };
    const guests = 160;
    const original = previewReplan(snapshot, {
      newGuestCount: guests,
      priceChanges: [],
      doNotExceedBudget: true,
      protectResourceIds: [],
    });
    const preview = replan(plan, {
      guests,
      budgetPaise: plan.event.budgetPaise,
    });
    expect(preview.before.allocatedPaise).toBe(
      Number(original.before.projectedMinor),
    );
    expect(preview.after.allocatedPaise).toBe(
      Number(original.effects.projectedMinor),
    );
    expect(preview.after.remainingPaise).toBe(
      Number(original.effects.remainingMinor),
    );
    expect(preview.deltaPaise).toBe(Number(original.deltaMinor));
    expect(preview.changedCategories).toEqual(["Catering"]);
    expect(preview.affectedTasks).toHaveLength(3);
    const tight = replan(plan, { guests, budgetPaise: 20_000_000 });
    const expected = calculateBudget(snapshot.budgetItems, guests, "20000000");
    expect(tight.after.remainingPaise).toBe(Number(expected.remainingMinor));
    expect(tight.after.overBudget).toBe(true);
    expect(tight.explanation).toContain("new budget ceiling");
    expect(plan.event.guests).toBe(120);
  });
});

describe("tasks and sample draft review", () => {
  it("enforces prerequisite order while tracking checklist progress", () => {
    const plan = scenario();
    expect(taskProgress(plan)).toMatchObject({
      completed: 1,
      total: 4,
      percent: 25,
    });
    expect(() => toggleTask(plan, "diet")).toThrow("Finalize the menu");
    const menuDone = toggleTask(plan, "menu");
    expect(taskProgress(menuDone)).toMatchObject({ completed: 2, percent: 50 });
    expect(() => toggleTask(menuDone, "venue")).toThrow("Finalize the menu");
    expect(taskProgress(toggleTask(menuDone, "menu")).completed).toBe(1);
  });

  it("adds and edits a task and preserves an existing task's dependencies", () => {
    const plan = scenario();
    const edited = editTask(plan, "menu", {
      title: "Update meal plan",
      dueDate: "2027-01-18",
      priority: "low",
    });
    expect(edited.tasks.find((task) => task.id === "menu")).toMatchObject({
      title: "Update meal plan",
      dependsOn: ["venue"],
      priority: "low",
    });
    const expanded = editTask(edited, null, {
      title: "Bring place cards",
      dueDate: "",
      priority: "normal",
    });
    expect(expanded.tasks.at(-1)).toMatchObject({
      title: "Bring place cards",
      completed: false,
      dependsOn: [],
    });
    expect(() =>
      editTask(plan, "menu", {
        title: "New",
        dueDate: "2027-02-29",
        priority: "low",
      }),
    ).toThrow("valid date");
  });

  it("accepts only selected suggestions, records rejection, and stays idempotent", () => {
    const plan = scenario();
    const [refreshments, signs, arrivals, weather] = draftFor(plan);
    const selected = decideDraft(
      plan,
      [refreshments.id, arrivals.id, arrivals.id],
      "accepted",
    );
    const reviewed = decideDraft(selected, [signs.id], "rejected");
    expect(
      budgetSummary(reviewed).allocatedPaise -
        budgetSummary(plan).allocatedPaise,
    ).toBe(2_880_000);
    expect(reviewed.tasks.at(-1)?.title).toBe("Review arrival timings");
    expect(draftFor(reviewed).map((item) => item.decision)).toEqual([
      "accepted",
      "rejected",
      "accepted",
      null,
    ]);
    expect(decideDraft(reviewed, [refreshments.id, signs.id], "accepted")).toBe(
      reviewed,
    );
    expect(reviewed.draftDecisions[weather.id]).toBeUndefined();
    expect(() => decideDraft(plan, ["unknown"], "accepted")).toThrow(
      "no longer available",
    );
  });

  it("preserves the whole plan when a selected budget suggestion would overflow", () => {
    const plan = editCategory(scenario(), null, {
      name: "Large line",
      basis: "fixed",
      amount: "89999296000",
    });
    const [refreshments, , arrivals] = draftFor(plan);
    expect(() =>
      decideDraft(plan, [refreshments.id, arrivals.id], "accepted"),
    ).toThrow("projected total is too large");
    expect(plan.draftDecisions).toEqual({});
    expect(plan.tasks).toHaveLength(4);
  });
});

describe("browser persistence", () => {
  it("persists edits and review decisions and supports a sample reset or a fresh start", () => {
    const storage = inMemoryStorage();
    expect(loadPlan(storage)).toEqual({ plan: scenario(), warning: null });
    const edited = updateEvent(scenario(), { ...scenario().event, guests: 50 });
    const [draft] = draftFor(edited);
    const accepted = decideDraft(edited, [draft.id], "accepted");
    expect(savePlan(accepted, storage)).toBe(true);
    expect(loadPlan(storage)).toEqual({ plan: accepted, warning: null });
    expect(savePlan(scenario(), storage)).toBe(true);
    expect(loadPlan(storage).plan).toEqual(scenario());
    expect(savePlan(fresh("birthday"), storage)).toBe(true);
    expect(loadPlan(storage).plan).toEqual(fresh("birthday"));
  });

  it("recovers from malformed JSON, foreign schemas, cyclic dependencies and forged draft rows", () => {
    const storage = inMemoryStorage();
    const plan = scenario();
    const cyclic = scenario();
    cyclic.tasks[0].dependsOn = ["menu"];
    const [draft] = draftFor(plan);
    for (const raw of [
      "{",
      JSON.stringify({ ...plan, version: 9 }),
      JSON.stringify({ ...plan, event: { ...plan.event, guests: "120" } }),
      JSON.stringify({
        ...plan,
        categories: [...plan.categories, plan.categories[0]],
      }),
      JSON.stringify(cyclic),
      JSON.stringify({
        ...plan,
        categories: [...plan.categories, draft.category],
      }),
    ]) {
      storage.setItem(STORAGE_KEY, raw);
      expect(loadPlan(storage)).toEqual({
        plan: scenario(),
        warning: expect.stringContaining("could not be read"),
      });
    }
  });

  it("uses an in-memory sample when storage reads or writes fail", () => {
    const storage = {
      getItem() {
        throw new Error("Denied");
      },
      setItem() {
        throw new Error("Denied");
      },
    };
    expect(loadPlan(storage)).toEqual({
      plan: scenario(),
      warning: expect.stringContaining("unavailable"),
    });
    expect(savePlan(scenario(), storage)).toBe(false);
    expect(savePlan(scenario(), null)).toBe(false);
  });
});
