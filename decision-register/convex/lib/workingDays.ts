// Working-day arithmetic for nudges. Weekends (Saturday, Sunday) are skipped.
// Public holidays are not handled yet; that belongs with configurable schedules
// (out of scope for version one).

const DAY_MS = 24 * 60 * 60 * 1000;

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Number of whole working days that have passed between `from` and `to`.
 * A decision sent on Monday reaches 1 working day on Tuesday at the same time,
 * and 2 on Wednesday. Days are counted in UTC.
 */
export function workingDaysBetween(fromMs: number, toMs: number): number {
  if (toMs <= fromMs) return 0;
  let count = 0;
  let cursor = fromMs + DAY_MS;
  while (cursor <= toMs) {
    if (!isWeekend(new Date(cursor))) count++;
    cursor += DAY_MS;
  }
  return count;
}
