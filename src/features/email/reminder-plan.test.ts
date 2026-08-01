import { describe, expect, it } from "vitest";
import { reminderPlanForWeekday, reminderPlanForDate } from "./reminder-plan";

describe("reminderPlanForWeekday", () => {
  it("sends reminder 1 on Monday", () => {
    expect(reminderPlanForWeekday(1)).toEqual({
      emailType: "REMINDER_1",
      reminderNumber: 1,
      markOverdue: false,
    });
  });

  it("sends reminder 2 on Wednesday", () => {
    expect(reminderPlanForWeekday(3).emailType).toBe("REMINDER_2");
  });

  it("sends reminder 3 on Friday", () => {
    expect(reminderPlanForWeekday(5).emailType).toBe("REMINDER_3");
  });

  it("marks overdue on Saturday and sends nothing", () => {
    expect(reminderPlanForWeekday(6)).toEqual({
      emailType: null,
      reminderNumber: null,
      markOverdue: true,
    });
  });

  it("does nothing on Sunday, Tuesday, or Thursday", () => {
    for (const day of [0, 2, 4]) {
      expect(reminderPlanForWeekday(day)).toEqual({
        emailType: null,
        reminderNumber: null,
        markOverdue: false,
      });
    }
  });
});

describe("reminderPlanForDate", () => {
  it("reads the UTC weekday from a date", () => {
    // 2026-08-03 is a Monday.
    expect(reminderPlanForDate(new Date("2026-08-03T09:00:00Z")).emailType).toBe(
      "REMINDER_1",
    );
  });
});
