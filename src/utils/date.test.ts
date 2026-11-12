import {
  addMonths,
  combineDateTime,
  currentMonthKey,
  daysUntil,
  formatTime12,
  minutesOfDay,
  monthRange,
  parseISODate,
  relativeDayLabel,
  toISODate,
} from '@/utils/date';

const TODAY = new Date(2026, 10, 12); // 12 Nov 2026

describe('parseISODate', () => {
  it('builds a local-midnight date, not a UTC one', () => {
    const date = parseISODate('2026-11-12');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10);
    expect(date.getDate()).toBe(12);
    expect(date.getHours()).toBe(0);
  });

  it('round-trips through toISODate regardless of timezone offset', () => {
    expect(toISODate(parseISODate('2026-01-01'))).toBe('2026-01-01');
    expect(toISODate(parseISODate('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('daysUntil', () => {
  it('counts forwards and backwards from today', () => {
    expect(daysUntil('2026-11-12', TODAY)).toBe(0);
    expect(daysUntil('2026-11-13', TODAY)).toBe(1);
    expect(daysUntil('2026-11-05', TODAY)).toBe(-7);
  });

  it('ignores the time of day on the reference date', () => {
    const lateEvening = new Date(2026, 10, 12, 23, 59);
    expect(daysUntil('2026-11-13', lateEvening)).toBe(1);
  });
});

describe('addMonths', () => {
  it('clamps to the end of a shorter month', () => {
    expect(toISODate(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
  });

  it('handles leap years', () => {
    expect(toISODate(addMonths(new Date(2028, 0, 31), 1))).toBe('2028-02-29');
  });

  it('crosses year boundaries', () => {
    expect(toISODate(addMonths(new Date(2026, 10, 12), 3))).toBe('2027-02-12');
  });
});

describe('combineDateTime', () => {
  it('applies the given time', () => {
    const moment = combineDateTime('2026-11-12', '15:30');
    expect(moment.getHours()).toBe(15);
    expect(moment.getMinutes()).toBe(30);
  });

  it('defaults to 9am when no time is set', () => {
    const moment = combineDateTime('2026-11-12', null);
    expect(moment.getHours()).toBe(9);
    expect(moment.getMinutes()).toBe(0);
  });
});

describe('formatting', () => {
  it('formats 12-hour times with the right meridiem', () => {
    expect(formatTime12('00:05')).toBe('12:05 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
    expect(formatTime12('15:30')).toBe('3:30 PM');
    expect(formatTime12(null)).toBe('');
  });

  it('converts times to minutes of the day', () => {
    expect(minutesOfDay('15:30')).toBe(930);
    expect(minutesOfDay(null)).toBe(0);
  });

  it('labels nearby days in words', () => {
    expect(relativeDayLabel('2026-11-12', TODAY)).toBe('Today');
    expect(relativeDayLabel('2026-11-13', TODAY)).toBe('Tomorrow');
    expect(relativeDayLabel('2026-11-11', TODAY)).toBe('Yesterday');
    expect(relativeDayLabel('2026-12-25', TODAY)).toBe('Dec 25');
  });
});

describe('month helpers', () => {
  it('builds the month key with a padded month', () => {
    expect(currentMonthKey(new Date(2026, 0, 5))).toBe('2026-01');
    expect(currentMonthKey(TODAY)).toBe('2026-11');
  });

  it('returns inclusive month boundaries', () => {
    expect(monthRange(2026, 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange(2026, 10)).toEqual({ start: '2026-11-01', end: '2026-11-30' });
  });
});
