import { describe, it, expect } from "vitest";
import {
  calculateBudget,
  lineTotal,
  rupeesToMinor,
  formatMoney,
} from "@/domain/money";
import { previewReplan, validateApproval } from "@/domain/replan";
import { assertDag } from "@/domain/tasks";
import {
  eventFields,
  moneySchema,
  type BudgetItem,
  type EventSnapshot,
} from "@/domain/contracts";
const catering: BudgetItem = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Catering",
  category: "catering",
  pricingBasis: "per_guest",
  unitPriceMinor: "85000",
  quantity: null,
  sourceKind: "user_estimate",
  sourceLabel: null,
  isLocked: false,
  state: "active",
};
const fixed: BudgetItem = {
  ...catering,
  id: "fixed",
  pricingBasis: "fixed",
  unitPriceMinor: "30000000",
  category: "other",
};
const snapshot: EventSnapshot = {
  event: {
    id: "event",
    workspaceId: "workspace",
    type: "wedding",
    title: "Synthetic",
    dateStatus: "tbd",
    startsAt: null,
    timeZone: "Asia/Kolkata",
    guestCount: 150,
    currency: "INR",
    budgetMinor: "50000000",
    preferences: "",
    version: 7,
    status: "planning",
    createdAt: "",
  },
  budgetItems: [catering, fixed],
  tasks: [],
  vendors: [],
};
describe("FIN golden vectors and invariants", () => {
  it("FIN-V01–08 exact paise totals", () => {
    expect(lineTotal({ ...fixed, unitPriceMinor: "4000000" }, 150)).toBe(
      4000000n,
    );
    expect(lineTotal(catering, 150)).toBe(12750000n);
    expect(
      lineTotal(
        {
          ...fixed,
          pricingBasis: "per_unit",
          quantity: 12,
          unitPriceMinor: "25000",
        },
        0,
      ),
    ).toBe(300000n);
    expect(calculateBudget([fixed, catering], 150, "50000000")).toEqual({
      projectedMinor: "42750000",
      remainingMinor: "7250000",
      overBudget: false,
    });
    expect(calculateBudget([fixed, catering], 180, "50000000")).toEqual({
      projectedMinor: "45300000",
      remainingMinor: "4700000",
      overBudget: false,
    });
    expect(calculateBudget([fixed, catering], 300, "50000000")).toEqual({
      projectedMinor: "55500000",
      remainingMinor: "-5500000",
      overBudget: true,
    });
    expect(lineTotal(catering, 0)).toBe(0n);
  });
  it("FIN-V10 rejects overflow, negatives and malformed money", () => {
    expect(() =>
      lineTotal({ ...catering, unitPriceMinor: "9000000000000" }, 100000),
    ).toThrow("BUDGET_OVERFLOW");
    for (const value of ["-1", "1.5", "1e5", "01", "9000000000001", "NaN"])
      expect(moneySchema.safeParse(value).success).toBe(false);
    expect(() => calculateBudget([fixed], -1, "0")).toThrow();
    expect(() =>
      calculateBudget(
        [{ ...fixed, unitPriceMinor: "9000000000000" }, fixed],
        1,
        "0",
      ),
    ).toThrow();
  });
  it("parses rupees without floating point", () => {
    expect(rupeesToMinor("850.01")).toBe("85001");
    expect(() => rupeesToMinor("0.001")).toThrow();
    expect(formatMoney("12750000")).toBe("₹1,27,500.00");
  });
  it("monotonic costs, fixed invariance and signed remainder over 300 counts", () => {
    let last = 0n;
    for (let guests = 0; guests <= 300; guests++) {
      const b = calculateBudget([catering, fixed], guests, "50000000");
      expect(BigInt(b.projectedMinor)).toBeGreaterThanOrEqual(last);
      expect(lineTotal(fixed, guests)).toBe(30000000n);
      expect(BigInt(b.projectedMinor) + BigInt(b.remainingMinor)).toBe(
        50000000n,
      );
      last = BigInt(b.projectedMinor);
    }
  });
});
describe("proposal and task safety", () => {
  it("preview computes +2550000 without mutating state", () => {
    const before = JSON.stringify(snapshot);
    const p = previewReplan(snapshot, {
      newGuestCount: 180,
      priceChanges: [],
      doNotExceedBudget: true,
      protectResourceIds: [],
    });
    expect(p.deltaMinor).toBe("2550000");
    expect(p.effects.remainingMinor).toBe("4700000");
    expect(JSON.stringify(snapshot)).toBe(before);
  });
  it("combined guest and catering prices recompute", () => {
    const p = previewReplan(snapshot, {
      newGuestCount: 180,
      priceChanges: [{ budgetItemId: catering.id, newUnitPriceMinor: "90000" }],
      doNotExceedBudget: true,
      protectResourceIds: [],
    });
    expect(p.effects.projectedMinor).toBe("46200000");
    expect(p.operations).toHaveLength(2);
  });
  it("preserves locked price and rejects its modification", () => {
    const state = {
      ...snapshot,
      budgetItems: [{ ...catering, isLocked: true }, fixed],
    };
    expect(
      previewReplan(state, {
        newGuestCount: 180,
        priceChanges: [],
        doNotExceedBudget: true,
        protectResourceIds: [],
      }).warnings.some((w) => w.code === "LOCKED_QUANTITY_IMPACT"),
    ).toBe(true);
    expect(() =>
      previewReplan(state, {
        priceChanges: [{ budgetItemId: catering.id, newUnitPriceMinor: "1" }],
        doNotExceedBudget: true,
        protectResourceIds: [],
      }),
    ).toThrow("PROTECTED_RESOURCE");
  });
  it("rejects stale, expired, incomplete or unresolved approvals", () => {
    const p = {
      ...previewReplan(snapshot, {
        newGuestCount: 180,
        priceChanges: [],
        doNotExceedBudget: true,
        protectResourceIds: [],
      }),
      id: "proposal",
      status: "pending",
      expiresAt: new Date(Date.now() + 10000).toISOString(),
    };
    expect(() => validateApproval(p, 8, ["guest-count"])).toThrow(
      "VERSION_CONFLICT",
    );
    expect(() => validateApproval(p, 7, [])).toThrow("INVALID_OPERATIONS");
    expect(() =>
      validateApproval({ ...p, expiresAt: "2000-01-01" }, 7, ["guest-count"]),
    ).toThrow("PROPOSAL_EXPIRED");
    expect(() =>
      validateApproval(
        {
          ...p,
          warnings: [{ code: "BUDGET_CONSTRAINT_UNRESOLVED", message: "" }],
        },
        7,
        ["guest-count"],
      ),
    ).toThrow("UNRESOLVED_CONSTRAINT");
  });
  it("rejects missing task references and cycles", () => {
    expect(() =>
      assertDag([
        { id: "a", dependencyIds: ["b"] },
        { id: "b", dependencyIds: ["a"] },
      ]),
    ).toThrow("DEPENDENCY_CYCLE");
    expect(() => assertDag([{ id: "a", dependencyIds: ["unknown"] }])).toThrow(
      "UNKNOWN_DEPENDENCY",
    );
    expect(() =>
      assertDag([
        { id: "a", dependencyIds: [] },
        { id: "b", dependencyIds: ["a"] },
      ]),
    ).not.toThrow();
  });
  it("validates dates, timezones and strict event fields", () => {
    expect(
      eventFields.safeParse({ ...snapshot.event, timeZone: "Moon/Base" })
        .success,
    ).toBe(false);
    expect(
      eventFields.safeParse({ ...snapshot.event, isAdmin: true }).success,
    ).toBe(false);
  });
});
