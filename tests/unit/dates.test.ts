import { describe, it, expect } from "vitest";
import { localToInstant } from "@/domain/dates";
describe("event local time handling", () => {
  it("preserves Kolkata local wall time across UTC conversion", () => {
    expect(localToInstant("2027-01-01T18:00", "Asia/Kolkata")).toBe(
      "2027-01-01T12:30:00.000Z",
    );
  });
  it("rejects invalid dates and nonexistent daylight-saving times", () => {
    expect(() =>
      localToInstant("2027-03-14T02:30", "America/New_York"),
    ).toThrow("This local time does not exist");
    expect(() => localToInstant("not-a-date", "Asia/Kolkata")).toThrow();
  });
  it("uses an explicit zone regardless of host location", () => {
    expect(localToInstant("2027-06-10T12:00", "Europe/London")).toBe(
      "2027-06-10T11:00:00.000Z",
    );
  });
});
