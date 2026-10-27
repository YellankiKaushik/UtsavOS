import {
  changeSchema,
  type EventSnapshot,
  type Operation,
  type Proposal,
  type Change,
} from "./contracts";
import { calculateBudget, lineTotal } from "./money";
import { invariant } from "./errors";
export function previewReplan(
  snapshot: EventSnapshot,
  input: Change,
): Omit<Proposal, "id" | "status" | "expiresAt"> {
  const change = changeSchema.parse(input),
    { event, budgetItems, tasks, vendors } = snapshot;
  const known = new Set(
    [...budgetItems, ...tasks, ...vendors].map((x) => x.id),
  );
  invariant(
    change.protectResourceIds.every((id) => known.has(id)),
    "NOT_FOUND",
  );
  const before = calculateBudget(
    budgetItems,
    event.guestCount,
    event.budgetMinor,
  );
  const guests = change.newGuestCount ?? event.guestCount;
  const ops: Operation[] = [];
  if (guests !== event.guestCount)
    ops.push({
      id: "guest-count",
      kind: "set_event_guest_count",
      oldValue: event.guestCount,
      newValue: guests,
      mandatory: true,
    });
  const ids = new Set<string>();
  const items = budgetItems.map((x) => ({ ...x }));
  for (const price of change.priceChanges) {
    invariant(!ids.has(price.budgetItemId), "INVALID_INPUT");
    ids.add(price.budgetItemId);
    const item = items.find(
      (x) => x.id === price.budgetItemId && x.state === "active",
    );
    invariant(item, "NOT_FOUND");
    invariant(
      !item.isLocked && !change.protectResourceIds.includes(item.id),
      "PROTECTED_RESOURCE",
    );
    invariant(
      item.category.toLowerCase() === "catering",
      "UNSUPPORTED_OPERATION",
      "P0 repricing supports catering only",
    );
    if (item.unitPriceMinor !== price.newUnitPriceMinor)
      ops.push({
        id: `price-${item.id}`,
        kind: "set_budget_item_unit_price",
        budgetItemId: item.id,
        oldValue: item.unitPriceMinor,
        newValue: price.newUnitPriceMinor,
        mandatory: true,
      });
    item.unitPriceMinor = price.newUnitPriceMinor;
  }
  invariant(ops.length > 0, "NO_CHANGE");
  const effects = calculateBudget(items, guests, event.budgetMinor);
  const warnings = [
    {
      code: "CAPACITY_NOT_VERIFIED",
      message:
        "Venue capacity is unknown. Confirm capacity and supplier quantities before proceeding.",
    },
  ];
  if (effects.overBudget)
    warnings.push({
      code: change.doNotExceedBudget
        ? "BUDGET_CONSTRAINT_UNRESOLVED"
        : "OVER_BUDGET",
      message: `Projected costs exceed your ceiling by ${(-BigInt(effects.remainingMinor)).toString()} paise. ${change.doNotExceedBudget ? "Approval is blocked until this constraint is resolved." : "You explicitly allowed a budget overrun."}`,
    });
  for (const item of items.filter(
    (x) =>
      x.state === "active" &&
      x.isLocked &&
      x.pricingBasis === "per_guest" &&
      guests !== event.guestCount,
  ))
    warnings.push({
      code: "LOCKED_QUANTITY_IMPACT",
      message: `${item.title}: its locked unit price stays unchanged; the estimate changes with guest count. Confirm the commitment with your supplier.`,
    });
  const affected = tasks.filter((t) => t.status !== "done").map((t) => t.id);
  const changedLines = items
    .filter(
      (x) =>
        x.state === "active" &&
        lineTotal(x, guests) !==
          lineTotal(
            budgetItems.find((b) => b.id === x.id)!,
            event.guestCount,
          ),
    )
    .map((x) => x.title);
  return {
    baseVersion: event.version,
    proposedChange: change,
    operations: ops,
    before,
    effects,
    deltaMinor: (
      BigInt(effects.projectedMinor) - BigInt(before.projectedMinor)
    ).toString(),
    warnings,
    affectedTasks: affected,
    explanation: `Guest count ${event.guestCount} → ${guests}. Recalculated ${changedLines.length ? changedLines.join(", ") : "unchanged budget lines"} from stored unit prices. Review ${affected.length} open tasks for quantity and logistics implications. Confirmed vendor selections and locked prices are preserved.`,
  };
}
export function validateApproval(
  proposal: Proposal,
  currentVersion: number,
  selected: string[],
  now = Date.now(),
) {
  invariant(proposal.status === "pending", "VERSION_CONFLICT");
  invariant(new Date(proposal.expiresAt).getTime() > now, "PROPOSAL_EXPIRED");
  invariant(proposal.baseVersion === currentVersion, "VERSION_CONFLICT");
  invariant(
    new Set(selected).size === selected.length &&
      selected.length === proposal.operations.length &&
      proposal.operations.every((o) => selected.includes(o.id)),
    "INVALID_OPERATIONS",
  );
  invariant(
    !proposal.warnings.some((w) => w.code === "BUDGET_CONSTRAINT_UNRESOLVED"),
    "UNRESOLVED_CONSTRAINT",
  );
}
