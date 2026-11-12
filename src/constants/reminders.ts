/** Reminder lead-time options offered in the add/edit forms. */

export interface ReminderOption {
  minutes: number;
  label: string;
  shortLabel: string;
}

export const REMINDER_OPTIONS: readonly ReminderOption[] = [
  { minutes: 0, label: 'At the scheduled time', shortLabel: 'On time' },
  { minutes: 5, label: '5 minutes before', shortLabel: '5 min' },
  { minutes: 10, label: '10 minutes before', shortLabel: '10 min' },
  { minutes: 15, label: '15 minutes before', shortLabel: '15 min' },
  { minutes: 30, label: '30 minutes before', shortLabel: '30 min' },
  { minutes: 60, label: '1 hour before', shortLabel: '1 hour' },
  { minutes: 120, label: '2 hours before', shortLabel: '2 hours' },
  { minutes: 60 * 24, label: '1 day before', shortLabel: '1 day' },
  { minutes: 60 * 24 * 3, label: '3 days before', shortLabel: '3 days' },
  { minutes: 60 * 24 * 7, label: '1 week before', shortLabel: '1 week' },
] as const;

export const DEFAULT_BILL_REMINDER_MINUTES = 60 * 24;
export const DEFAULT_ACTIVITY_REMINDER_MINUTES = 60;

export function reminderLabel(minutes: number): string {
  const option = REMINDER_OPTIONS.find((item) => item.minutes === minutes);
  if (option) return option.label;
  if (minutes < 60) return `${minutes} minutes before`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hours before`;
  return `${Math.round(minutes / (60 * 24))} days before`;
}

export function reminderShortLabel(minutes: number): string {
  return REMINDER_OPTIONS.find((item) => item.minutes === minutes)?.shortLabel ?? `${minutes}m`;
}

export const SNOOZE_OPTIONS: readonly number[] = [5, 10, 15, 30, 60];
