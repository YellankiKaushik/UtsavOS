import { MAX_MINOR, moneySchema, type BudgetItem } from "./contracts";
import { invariant } from "./errors";
declare const moneyMinorBrand: unique symbol;
export type MoneyMinor = bigint & { readonly [moneyMinorBrand]: "MoneyMinor" };
export function assertMinor(value: bigint) {
  invariant(value >= 0n && value <= MAX_MINOR, "BUDGET_OVERFLOW");
  return value as MoneyMinor;
}
export function parseMinor(value: string) {
  invariant(moneySchema.safeParse(value).success, "INVALID_MONEY");
  return assertMinor(BigInt(value));
}
export function count(value: number) {
  invariant(
    Number.isSafeInteger(value) && value >= 0 && value <= 100000,
    "INVALID_QUANTITY",
  );
  return BigInt(value);
}
export function lineTotal(item: BudgetItem, guests: number): bigint {
  const unit = parseMinor(item.unitPriceMinor);
  const quantity =
    item.pricingBasis === "fixed"
      ? 1n
      : item.pricingBasis === "per_guest"
        ? count(guests)
        : count(item.quantity ?? -1);
  invariant(
    item.pricingBasis === "per_unit"
      ? item.quantity !== null
      : item.quantity === null,
    "INVALID_QUANTITY",
  );
  return assertMinor(unit * quantity);
}
export function calculateBudget(
  items: BudgetItem[],
  guests: number,
  ceiling: string,
) {
  count(guests);
  const projected = assertMinor(
    items
      .filter((x) => x.state === "active")
      .reduce((s, x) => s + lineTotal(x, guests), 0n),
  );
  const remaining = parseMinor(ceiling) - projected;
  return {
    projectedMinor: projected.toString(),
    remainingMinor: remaining.toString(),
    overBudget: remaining < 0n,
  };
}
export function rupeesToMinor(value: string): string {
  invariant(
    /^(0|[1-9]\d*)(\.\d{1,2})?$/.test(value),
    "INVALID_MONEY",
    "Enter a nonnegative amount with up to two decimal places",
  );
  const [whole, fraction = ""] = value.split(".");
  return assertMinor(
    BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")),
  ).toString();
}
export function minorToRupees(value: string) {
  const n = BigInt(value);
  return `${n / 100n}.${(n % 100n).toString().padStart(2, "0")}`;
}
export function formatMoney(value: string) {
  const n = BigInt(value),
    abs = n < 0n ? -n : n;
  return `${n < 0n ? "−" : ""}₹${new Intl.NumberFormat("en-IN").format(abs / 100n)}.${(abs % 100n).toString().padStart(2, "0")}`;
}
