import {
  NO_RECURRENCE,
  nextOccurrence,
  nextOccurrenceOnOrAfter,
  parseRecurrence,
  recurrenceKey,
  recurrenceLabel,
  serializeRecurrence,
} from '@/utils/recurrence';

describe('serialisation', () => {
  it('round-trips every preset', () => {
    const monthly = { type: 'monthly' as const, interval: 3 };
    expect(serializeRecurrence(monthly)).toBe('monthly:3');
    expect(parseRecurrence('monthly:3')).toEqual(monthly);
  });

  it('treats none as a bare marker', () => {
    expect(serializeRecurrence(NO_RECURRENCE)).toBe('none');
    expect(parseRecurrence('none')).toEqual(NO_RECURRENCE);
    expect(parseRecurrence(null)).toEqual(NO_RECURRENCE);
  });

  it('falls back safely on unknown values', () => {
    expect(parseRecurrence('weird:9')).toEqual(NO_RECURRENCE);
    expect(parseRecurrence('weekly:0')).toEqual({ type: 'weekly', interval: 1 });
  });
});

describe('nextOccurrence', () => {
  it('returns null when the item does not repeat', () => {
    expect(nextOccurrence('2026-11-12', NO_RECURRENCE)).toBeNull();
  });

  it('advances days and weeks', () => {
    expect(nextOccurrence('2026-11-12', { type: 'daily', interval: 1 })).toBe('2026-11-13');
    expect(nextOccurrence('2026-11-12', { type: 'weekly', interval: 2 })).toBe('2026-11-26');
  });

  it('advances months and years', () => {
    expect(nextOccurrence('2026-11-12', { type: 'monthly', interval: 1 })).toBe('2026-12-12');
    expect(nextOccurrence('2026-11-12', { type: 'monthly', interval: 3 })).toBe('2027-02-12');
    expect(nextOccurrence('2026-11-12', { type: 'yearly', interval: 1 })).toBe('2027-11-12');
  });

  it('clamps to the last day of a shorter month', () => {
    expect(nextOccurrence('2026-01-31', { type: 'monthly', interval: 1 })).toBe('2026-02-28');
    expect(nextOccurrence('2028-01-31', { type: 'monthly', interval: 1 })).toBe('2028-02-29');
    expect(nextOccurrence('2026-03-31', { type: 'monthly', interval: 1 })).toBe('2026-04-30');
  });

  it('does not drift after clamping because the series keeps its own anchor', () => {
    const first = nextOccurrence('2026-01-31', { type: 'monthly', interval: 1 });
    const second = nextOccurrence(first as string, { type: 'monthly', interval: 1 });
    expect(second).toBe('2026-03-28');
  });
});

describe('nextOccurrenceOnOrAfter', () => {
  it('rolls a stale series forward to the current period', () => {
    expect(
      nextOccurrenceOnOrAfter('2026-01-15', { type: 'monthly', interval: 1 }, '2026-06-01'),
    ).toBe('2026-06-15');
  });

  it('returns the first future date when already ahead', () => {
    expect(
      nextOccurrenceOnOrAfter('2026-07-15', { type: 'monthly', interval: 1 }, '2026-06-01'),
    ).toBe('2026-07-15');
  });

  it('returns null for non-repeating items', () => {
    expect(nextOccurrenceOnOrAfter('2026-01-15', NO_RECURRENCE, '2026-06-01')).toBeNull();
  });
});

describe('labels', () => {
  it('names the composite monthly presets', () => {
    expect(recurrenceLabel({ type: 'monthly', interval: 3 })).toBe('Every 3 months');
    expect(recurrenceKey({ type: 'monthly', interval: 6 })).toBe('semiannual');
  });

  it('falls back to a generated label for custom intervals', () => {
    expect(recurrenceKey({ type: 'monthly', interval: 5 })).toBe('custom');
    expect(recurrenceLabel({ type: 'monthly', interval: 5 })).toBe('Every 5 months');
  });
});
