/**
 * Week helpers. A "week" in this system is identified by the UTC date of its
 * Monday, which keeps weekly reports groupable, sortable, and free of timezone
 * drift (all comparisons happen in UTC; the DB column is a bare `date`).
 */

const MS_PER_DAY = 86_400_000;

/** Monday 00:00:00 UTC of the week containing `date`. */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // getUTCDay(): 0 = Sunday. Shift so Monday is the first day of the week.
  const dayOffset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayOffset);
  return d;
}

export function getCurrentWeekStart(): Date {
  return getWeekStart(new Date());
}

export function addWeeks(weekStart: Date, count: number): Date {
  return new Date(weekStart.getTime() + count * 7 * MS_PER_DAY);
}

/** "2026-07-27" — stable key for a week, safe for URLs and DB `date` columns. */
export function formatWeekKey(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}

export function parseWeekKey(key: string): Date {
  const parsed = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid week key: ${key}`);
  }
  return getWeekStart(parsed);
}

/**
 * "Jul 27 – Aug 2, 2026" — human-readable range for headings and emails.
 * The end month is dropped when the week sits inside a single month.
 *
 * Parts are assembled by hand rather than via a second `toLocaleDateString`
 * call: asking Intl for {day, year} without a month yields malformed output
 * such as "Jul 6 – 2026 (day: 12)".
 */
export function formatWeekRange(weekStart: Date, locale = "en-US"): string {
  const end = new Date(weekStart.getTime() + 6 * MS_PER_DAY);
  const sameMonth = weekStart.getUTCMonth() === end.getUTCMonth();

  const startLabel = weekStart.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  const endMonth = end.toLocaleDateString(locale, {
    month: "short",
    timeZone: "UTC",
  });
  const endDay = end.getUTCDate();
  const endLabel = sameMonth
    ? `${endDay}, ${end.getUTCFullYear()}`
    : `${endMonth} ${endDay}, ${end.getUTCFullYear()}`;

  return `${startLabel} – ${endLabel}`;
}

/** Most recent `count` week starts, newest first, including the current week. */
export function recentWeekStarts(count: number, from: Date = new Date()): Date[] {
  const current = getWeekStart(from);
  return Array.from({ length: count }, (_, i) => addWeeks(current, -i));
}
