import type { ISODate, Recurrence, RecurrenceType } from '@/types/domain';
import { addDays, addMonths, parseISODate, toISODate } from '@/utils/date';

export const NO_RECURRENCE: Recurrence = { type: 'none', interval: 1 };

export interface RecurrencePreset {
  key: string;
  label: string;
  shortLabel: string;
  value: Recurrence;
}

/**
 * The presets the UI offers. Bi-monthly, quarterly and semi-annual are all
 * monthly recurrences with a wider interval, which keeps month-end clamping
 * in one place.
 */
export const RECURRENCE_PRESETS: readonly RecurrencePreset[] = [
  { key: 'none', label: 'Does not repeat', shortLabel: 'Once', value: { type: 'none', interval: 1 } },
  { key: 'daily', label: 'Daily', shortLabel: 'Daily', value: { type: 'daily', interval: 1 } },
  { key: 'weekly', label: 'Weekly', shortLabel: 'Weekly', value: { type: 'weekly', interval: 1 } },
  { key: 'fortnightly', label: 'Every 2 weeks', shortLabel: '2 weeks', value: { type: 'weekly', interval: 2 } },
  { key: 'monthly', label: 'Monthly', shortLabel: 'Monthly', value: { type: 'monthly', interval: 1 } },
  { key: 'bimonthly', label: 'Every 2 months', shortLabel: '2 months', value: { type: 'monthly', interval: 2 } },
  { key: 'quarterly', label: 'Every 3 months', shortLabel: 'Quarterly', value: { type: 'monthly', interval: 3 } },
  { key: 'semiannual', label: 'Every 6 months', shortLabel: '6 months', value: { type: 'monthly', interval: 6 } },
  { key: 'yearly', label: 'Yearly', shortLabel: 'Yearly', value: { type: 'yearly', interval: 1 } },
] as const;

export function recurrenceKey(recurrence: Recurrence): string {
  const match = RECURRENCE_PRESETS.find(
    (preset) =>
      preset.value.type === recurrence.type && preset.value.interval === recurrence.interval,
  );
  return match?.key ?? 'custom';
}

export function recurrenceLabel(recurrence: Recurrence): string {
  const match = RECURRENCE_PRESETS.find(
    (preset) =>
      preset.value.type === recurrence.type && preset.value.interval === recurrence.interval,
  );
  if (match) return match.label;
  const unit = recurrence.type === 'yearly' ? 'year' : recurrence.type.replace('ly', '');
  return `Every ${recurrence.interval} ${unit}s`;
}

/** DB representation: "none" or "monthly:3". */
export function serializeRecurrence(recurrence: Recurrence): string {
  if (recurrence.type === 'none') return 'none';
  return `${recurrence.type}:${recurrence.interval}`;
}

export function parseRecurrence(value: string | null): Recurrence {
  if (!value || value === 'none') return NO_RECURRENCE;
  const [type, rawInterval] = value.split(':');
  const interval = Number.parseInt(rawInterval ?? '1', 10);
  const validTypes: RecurrenceType[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
  if (!validTypes.includes(type as RecurrenceType)) return NO_RECURRENCE;
  return {
    type: type as RecurrenceType,
    interval: Number.isFinite(interval) && interval > 0 ? interval : 1,
  };
}

export function isRecurring(recurrence: Recurrence): boolean {
  return recurrence.type !== 'none';
}

/** The next date after `from`, or null when the item does not repeat. */
export function nextOccurrence(from: ISODate, recurrence: Recurrence): ISODate | null {
  if (recurrence.type === 'none') return null;
  const base = parseISODate(from);
  const step = Math.max(1, recurrence.interval);
  switch (recurrence.type) {
    case 'daily':
      return toISODate(addDays(base, step));
    case 'weekly':
      return toISODate(addDays(base, step * 7));
    case 'monthly':
      return toISODate(addMonths(base, step));
    case 'yearly':
      return toISODate(addMonths(base, step * 12));
    default:
      return null;
  }
}

/**
 * Rolls a date forward until it is on or after `reference`. Used when the app
 * has been closed for a while and a recurring item is several periods behind.
 */
export function nextOccurrenceOnOrAfter(
  from: ISODate,
  recurrence: Recurrence,
  reference: ISODate,
  maxIterations = 240,
): ISODate | null {
  if (recurrence.type === 'none') return null;
  let candidate: ISODate | null = from;
  let iterations = 0;
  while (candidate !== null && candidate < reference && iterations < maxIterations) {
    candidate = nextOccurrence(candidate, recurrence);
    iterations += 1;
  }
  return candidate;
}
