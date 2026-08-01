import { describe, expect, it } from "vitest";
import {
  addWeeks,
  formatWeekKey,
  formatWeekRange,
  getWeekStart,
  parseWeekKey,
  recentWeekStarts,
} from "./week";

describe("getWeekStart", () => {
  it("returns the same Monday for every day of that week", () => {
    // 2026-07-27 is a Monday.
    const monday = "2026-07-27";
    for (const day of [
      "2026-07-27",
      "2026-07-29",
      "2026-08-01",
      "2026-08-02", // Sunday — still belongs to the Monday-start week
    ]) {
      expect(formatWeekKey(getWeekStart(new Date(`${day}T12:00:00Z`)))).toBe(monday);
    }
  });

  it("rolls a Sunday back to the preceding Monday, not forward", () => {
    expect(formatWeekKey(getWeekStart(new Date("2026-08-02T00:00:00Z")))).toBe(
      "2026-07-27",
    );
  });

  it("normalizes to midnight UTC", () => {
    const start = getWeekStart(new Date("2026-07-29T23:45:00Z"));
    expect(start.toISOString()).toBe("2026-07-27T00:00:00.000Z");
  });
});

describe("addWeeks", () => {
  it("moves forward and backward in whole weeks", () => {
    const week = parseWeekKey("2026-07-27");
    expect(formatWeekKey(addWeeks(week, 1))).toBe("2026-08-03");
    expect(formatWeekKey(addWeeks(week, -2))).toBe("2026-07-13");
  });
});

describe("parseWeekKey", () => {
  it("round-trips with formatWeekKey", () => {
    expect(formatWeekKey(parseWeekKey("2026-07-27"))).toBe("2026-07-27");
  });

  it("rejects garbage input", () => {
    expect(() => parseWeekKey("not-a-date")).toThrow();
  });
});

describe("formatWeekRange", () => {
  it("omits the repeated month within a single month", () => {
    expect(formatWeekRange(parseWeekKey("2026-07-06"))).toBe("Jul 6 – 12, 2026");
  });

  it("shows both months when the week straddles a boundary", () => {
    expect(formatWeekRange(parseWeekKey("2026-07-27"))).toBe("Jul 27 – Aug 2, 2026");
  });
});

describe("recentWeekStarts", () => {
  it("lists weeks newest first, starting with the current week", () => {
    const weeks = recentWeekStarts(3, new Date("2026-07-29T00:00:00Z"));
    expect(weeks.map(formatWeekKey)).toEqual([
      "2026-07-27",
      "2026-07-20",
      "2026-07-13",
    ]);
  });
});
