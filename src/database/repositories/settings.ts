import type { SQLiteDatabase } from 'expo-sqlite';

import type { SettingRow } from '@/database/schema/rows';
import type { AppSettings } from '@/types/domain';
import { nowISO } from '@/utils/date';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  currency: 'PHP',
  currencySymbol: '₱',
  monthlyBudget: 2_000_000,
  appLockEnabled: false,
  pinHash: null,
  vibrateWithRingtone: true,
  ringInSilentMode: true,
  notificationsEnabled: true,
  snoozeMinutes: 10,
  defaultBillReminderMinutes: 60 * 24,
  defaultActivityReminderMinutes: 60,
};

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function readSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<SettingRow>('SELECT * FROM app_settings');
  const map = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
  const pinHash = map.get('pinHash');
  return {
    currency: map.get('currency') ?? DEFAULT_APP_SETTINGS.currency,
    currencySymbol: map.get('currencySymbol') ?? DEFAULT_APP_SETTINGS.currencySymbol,
    monthlyBudget: parseNumber(map.get('monthlyBudget'), DEFAULT_APP_SETTINGS.monthlyBudget),
    appLockEnabled: map.get('appLockEnabled') === '1',
    pinHash: pinHash && pinHash.length > 0 ? pinHash : null,
    vibrateWithRingtone: (map.get('vibrateWithRingtone') ?? '1') === '1',
    ringInSilentMode: (map.get('ringInSilentMode') ?? '1') === '1',
    notificationsEnabled: (map.get('notificationsEnabled') ?? '1') === '1',
    snoozeMinutes: parseNumber(map.get('snoozeMinutes'), DEFAULT_APP_SETTINGS.snoozeMinutes),
    defaultBillReminderMinutes: parseNumber(
      map.get('defaultBillReminderMinutes'),
      DEFAULT_APP_SETTINGS.defaultBillReminderMinutes,
    ),
    defaultActivityReminderMinutes: parseNumber(
      map.get('defaultActivityReminderMinutes'),
      DEFAULT_APP_SETTINGS.defaultActivityReminderMinutes,
    ),
  };
}

function serialize(value: string | number | boolean | null): string {
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value);
}

export async function writeSettings(
  db: SQLiteDatabase,
  patch: Partial<AppSettings>,
): Promise<void> {
  const timestamp = nowISO();
  const entries = Object.entries(patch) as [keyof AppSettings, AppSettings[keyof AppSettings]][];
  if (entries.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const [key, value] of entries) {
      await db.runAsync(
        `INSERT INTO app_settings (setting_key, setting_value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value,
                                                updated_at = excluded.updated_at`,
        key,
        serialize(value ?? null),
        timestamp,
      );
    }
  });
}
