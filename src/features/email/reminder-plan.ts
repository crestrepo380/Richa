/**
 * Reminder cadence — pure scheduling policy, no I/O, so it is unit-tested and
 * the cron job stays a thin executor of these decisions.
 *
 *   Monday    → Reminder #1
 *   Wednesday → Reminder #2
 *   Friday    → Reminder #3
 *   Saturday  → mark still-missing dealers Overdue
 *
 * Other days do nothing, so the endpoint is safe to hit daily.
 */

export type ReminderEmailType =
  | "REMINDER_1"
  | "REMINDER_2"
  | "REMINDER_3";

export interface ReminderPlan {
  /** The reminder to send today, if any. */
  emailType: ReminderEmailType | null;
  /** 1, 2, or 3 — used in copy ("Reminder 2 of 3"). */
  reminderNumber: number | null;
  /** After the final reminder, flip unsubmitted dealers to overdue. */
  markOverdue: boolean;
}

const NOTHING: ReminderPlan = {
  emailType: null,
  reminderNumber: null,
  markOverdue: false,
};

/** Plan for a given weekday (0 = Sunday … 6 = Saturday), in UTC. */
export function reminderPlanForWeekday(weekday: number): ReminderPlan {
  switch (weekday) {
    case 1: // Monday
      return { emailType: "REMINDER_1", reminderNumber: 1, markOverdue: false };
    case 3: // Wednesday
      return { emailType: "REMINDER_2", reminderNumber: 2, markOverdue: false };
    case 5: // Friday
      return { emailType: "REMINDER_3", reminderNumber: 3, markOverdue: false };
    case 6: // Saturday
      return { emailType: null, reminderNumber: null, markOverdue: true };
    default:
      return NOTHING;
  }
}

export function reminderPlanForDate(date: Date = new Date()): ReminderPlan {
  return reminderPlanForWeekday(date.getUTCDay());
}
