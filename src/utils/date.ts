import type { ISODate, ISODateTime, ISOTime } from '@/types/domain';

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

/** Local-midnight Date for an ISO date string, avoiding the UTC shift of new Date(string). */
export function parseISODate(value: ISODate): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function toISODate(date: Date): ISODate {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function nowISO(now: Date = new Date()): ISODateTime {
  return now.toISOString();
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Adds months, clamping to the last valid day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

/** Whole days between today and the given date (negative means in the past). */
export function daysUntil(value: ISODate, today: Date = new Date()): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((parseISODate(value).getTime() - start) / 86_400_000);
}

/** Combines an ISO date with an optional HH:mm into a local Date. Defaults to 09:00. */
export function combineDateTime(date: ISODate, time: ISOTime | null): Date {
  const base = parseISODate(date);
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    base.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  } else {
    base.setHours(9, 0, 0, 0);
  }
  return base;
}

export function minutesOfDay(time: ISOTime | null): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** Nov 12 */
export function formatShortDate(value: ISODate): string {
  const date = parseISODate(value);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** Thursday, Nov 12 */
export function formatLongDate(value: ISODate): string {
  const date = parseISODate(value);
  return `${WEEKDAYS_LONG[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** 3:30 PM */
export function formatTime12(time: ISOTime | null): string {
  if (!time) return '';
  const [rawHours, rawMinutes] = time.split(':').map(Number);
  const suffix = (rawHours ?? 0) >= 12 ? 'PM' : 'AM';
  const hours = (rawHours ?? 0) % 12 || 12;
  return `${hours}:${String(rawMinutes ?? 0).padStart(2, '0')} ${suffix}`;
}

/** The YYYY-MM key used for month grouping. */
export function monthKey(value: ISODate): string {
  return value.slice(0, 7);
}

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(year: number, month: number): { start: ISODate; end: ISODate } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function greetingFor(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Thursday, 12 November - the dashboard header line. */
export function formatHeaderDate(now: Date = new Date()): string {
  return `${WEEKDAYS_LONG[now.getDay()]}, ${now.getDate()} ${MONTHS_LONG[now.getMonth()]}`;
}

/** Relative label used in lists: Today, Tomorrow, 3 days ago, Nov 20. */
export function relativeDayLabel(value: ISODate, today: Date = new Date()): string {
  const delta = daysUntil(value, today);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';
  if (delta < 0) return `${-delta} days ago`;
  if (delta <= 6) return WEEKDAYS_LONG[parseISODate(value).getDay()];
  return formatShortDate(value);
}
