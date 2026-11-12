import {
  formatMoney,
  formatMoneyCompact,
  minorToInput,
  parseAmountToMinor,
  percentOf,
  sumMinor,
} from '@/utils/money';

describe('parseAmountToMinor', () => {
  it('parses whole amounts', () => {
    expect(parseAmountToMinor('1250')).toBe(125000);
  });

  it('parses two decimal places exactly', () => {
    expect(parseAmountToMinor('1250.75')).toBe(125075);
    expect(parseAmountToMinor('0.05')).toBe(5);
  });

  it('pads a single decimal place', () => {
    expect(parseAmountToMinor('10.5')).toBe(1050);
  });

  it('truncates beyond two decimal places', () => {
    expect(parseAmountToMinor('10.999')).toBe(1099);
  });

  it('ignores grouping characters', () => {
    expect(parseAmountToMinor('1,250.75')).toBe(125075);
  });

  it('rejects empty and malformed input', () => {
    expect(parseAmountToMinor('')).toBeNull();
    expect(parseAmountToMinor('.')).toBeNull();
    expect(parseAmountToMinor('1.2.3')).toBeNull();
    expect(parseAmountToMinor('abc')).toBeNull();
  });

  it('round-trips through minorToInput', () => {
    expect(parseAmountToMinor(minorToInput(123456))).toBe(123456);
  });
});

describe('formatMoney', () => {
  it('groups thousands and always shows cents', () => {
    expect(formatMoney(125075, 'P')).toBe('P1,250.75');
    expect(formatMoney(5, 'P')).toBe('P0.05');
  });

  it('can omit the decimals', () => {
    expect(formatMoney(125075, 'P', false)).toBe('P1,250');
  });

  it('keeps the sign outside the symbol', () => {
    expect(formatMoney(-2500, 'P')).toBe('-P25.00');
  });
});

describe('formatMoneyCompact', () => {
  it('uses k above a thousand units', () => {
    expect(formatMoneyCompact(1_240_000, 'P')).toBe('P12.4k');
  });

  it('keeps small values whole', () => {
    expect(formatMoneyCompact(45_000, 'P')).toBe('P450');
  });
});

describe('arithmetic helpers', () => {
  it('sums without floating point drift', () => {
    expect(sumMinor([1033, 2067, 10])).toBe(3110);
  });

  it('clamps percentages and guards divide-by-zero', () => {
    expect(percentOf(50, 200)).toBe(25);
    expect(percentOf(400, 200)).toBe(100);
    expect(percentOf(100, 0)).toBe(0);
  });
});
