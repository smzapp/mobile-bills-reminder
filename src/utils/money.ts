import type { Minor } from '@/types/domain';

/** Parse user input ("1,250.75") into integer minor units. Returns null when invalid. */
export function parseAmountToMinor(input: string): Minor | null {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.') return null;
  const parts = cleaned.split('.');
  if (parts.length > 2) return null;
  const whole = parts[0] === '' ? 0 : Number.parseInt(parts[0], 10);
  if (!Number.isFinite(whole)) return null;
  const fractionRaw = (parts[1] ?? '').slice(0, 2).padEnd(2, '0');
  const fraction = Number.parseInt(fractionRaw, 10);
  if (!Number.isFinite(fraction)) return null;
  return whole * 100 + fraction;
}

/** Minor units -> a plain decimal string ("1250.75"), for prefilling inputs. */
export function minorToInput(amount: Minor): string {
  return (amount / 100).toFixed(2);
}

/** Minor units -> display string with grouping and currency symbol. */
export function formatMoney(amount: Minor, symbol = '₱', withDecimals = true): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.trunc(abs / 100);
  const cents = abs % 100;
  const grouped = whole.toLocaleString('en-US');
  const body = withDecimals ? `${grouped}.${String(cents).padStart(2, '0')}` : grouped;
  return `${negative ? '-' : ''}${symbol}${body}`;
}

/** Short form for chart axes, e.g. P12.4k */
export function formatMoneyCompact(amount: Minor, symbol = '₱'): string {
  const units = Math.round(amount / 100);
  if (Math.abs(units) >= 1000) return `${symbol}${(units / 1000).toFixed(1)}k`;
  return `${symbol}${units}`;
}

export function sumMinor(values: readonly Minor[]): Minor {
  return values.reduce<Minor>((total, value) => total + value, 0);
}

/** Percentage (0-100, clamped) of `part` against `whole`. */
export function percentOf(part: Minor, whole: Minor): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}
