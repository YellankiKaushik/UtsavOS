import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { invariant } from "./errors";
export function localToInstant(value: string, zone: string): string {
  invariant(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value),
    "INVALID_DATE",
    "Enter a local date and time.",
  );
  const date = fromZonedTime(value, zone);
  invariant(
    !Number.isNaN(date.getTime()) &&
      formatInTimeZone(date, zone, "yyyy-MM-dd'T'HH:mm") === value,
    "INVALID_DATE",
    "This local time does not exist in the selected time zone. Choose another time.",
  );
  return date.toISOString();
}
