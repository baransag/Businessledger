// src/utils/dateUtils.ts
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

/** Format ISO date string to "31-Aug-2026" */
export function formatDisplayDate(dateStr: string): string {
  return dayjs(dateStr).format('DD-MMM-YYYY');
}

/** Format ISO date string to "Aug 2026" */
export function formatMonthYear(dateStr: string): string {
  return dayjs(dateStr).format('MMM YYYY');
}

/** Get today as ISO date string YYYY-MM-DD */
export function todayISO(): string {
  return dayjs().format('YYYY-MM-DD');
}

/** Parse display date back to ISO YYYY-MM-DD */
export function parseToISO(displayDate: string): string {
  return dayjs(displayDate, 'DD-MMM-YYYY').format('YYYY-MM-DD');
}

/** Check if a date is within a range (inclusive) */
export function isInRange(dateStr: string, from: string | null, to: string | null): boolean {
  const d = dayjs(dateStr);
  if (from && d.isBefore(dayjs(from))) return false;
  if (to && d.isAfter(dayjs(to))) return false;
  return true;
}

/** Get start of current month as ISO */
export function startOfMonth(): string {
  return dayjs().startOf('month').format('YYYY-MM-DD');
}

/** Get end of current month as ISO */
export function endOfMonth(): string {
  return dayjs().endOf('month').format('YYYY-MM-DD');
}

/** Get start of current week as ISO */
export function startOfWeek(): string {
  return dayjs().startOf('week').format('YYYY-MM-DD');
}

/** Get start of current year as ISO */
export function startOfYear(): string {
  return dayjs().startOf('year').format('YYYY-MM-DD');
}

export { dayjs };
