import type { SQLiteDatabase } from 'expo-sqlite';

import { CATEGORY_SEEDS } from '@/constants/categories';
import {
  DEFAULT_ACTIVITY_REMINDER_MINUTES,
  DEFAULT_BILL_REMINDER_MINUTES,
} from '@/constants/reminders';
import { nowISO } from '@/utils/date';

export const DATABASE_NAME = 'nudge.db';

/** Bump this and add a matching `if (version === N)` block below for every schema change. */
export const DATABASE_VERSION = 1;

const SCHEMA_V1 = `
CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  tint TEXT NOT NULL,
  ink TEXT NOT NULL,
  icon TEXT NOT NULL,
  ringtone TEXT NOT NULL,
  vibration_enabled INTEGER NOT NULL DEFAULT 1,
  notification_enabled INTEGER NOT NULL DEFAULT 1,
  is_system INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE bills (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  provider TEXT,
  reference_number TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  due_date TEXT NOT NULL,
  due_time TEXT,
  recurrence TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'upcoming',
  ringtone TEXT,
  notes TEXT,
  parent_bill_id TEXT REFERENCES bills(id) ON DELETE SET NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_bills_due_date ON bills (due_date);
CREATE INDEX idx_bills_status ON bills (status);
CREATE INDEX idx_bills_category ON bills (category_id);
CREATE INDEX idx_bills_archived ON bills (archived_at);

CREATE TABLE bill_payments (
  id TEXT PRIMARY KEY NOT NULL,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_payments_bill ON bill_payments (bill_id);
CREATE INDEX idx_payments_date ON bill_payments (payment_date);

CREATE TABLE activities (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'meeting',
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  start_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  meeting_link TEXT,
  recurrence TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'scheduled',
  ringtone TEXT,
  notes TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_activities_start ON activities (start_date);
CREATE INDEX idx_activities_status ON activities (status);
CREATE INDEX idx_activities_category ON activities (category_id);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  minutes_before INTEGER NOT NULL DEFAULT 0,
  fire_at TEXT,
  notification_id TEXT,
  channel_id TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_reminders_entity ON reminders (entity_type, entity_id);
CREATE INDEX idx_reminders_fire_at ON reminders (fire_at);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  expense_date TEXT NOT NULL,
  payment_method TEXT,
  related_bill_id TEXT REFERENCES bills(id) ON DELETE SET NULL,
  notes TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_expenses_date ON expenses (expense_date);
CREATE INDEX idx_expenses_category ON expenses (category_id);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'monthly',
  start_date TEXT NOT NULL,
  end_date TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_budgets_category ON budgets (category_id);

-- One row per Android notification channel we have created.
-- Either category_id (the category's own channel) or tone_id (a channel used
-- when a single item overrides its category ringtone) is set, never both.
CREATE TABLE notification_channels (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  tone_id TEXT,
  channel_id TEXT NOT NULL UNIQUE,
  sound_file TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_channels_category ON notification_channels (category_id);
CREATE INDEX idx_channels_tone ON notification_channels (tone_id);

CREATE TABLE app_settings (
  setting_key TEXT PRIMARY KEY NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const DEFAULT_SETTINGS: Record<string, string> = {
  currency: 'PHP',
  currencySymbol: '₱',
  monthlyBudget: '2000000',
  appLockEnabled: '0',
  pinHash: '',
  vibrateWithRingtone: '1',
  ringInSilentMode: '1',
  notificationsEnabled: '1',
  snoozeMinutes: '10',
  defaultBillReminderMinutes: String(DEFAULT_BILL_REMINDER_MINUTES),
  defaultActivityReminderMinutes: String(DEFAULT_ACTIVITY_REMINDER_MINUTES),
};

async function seedV1(db: SQLiteDatabase): Promise<void> {
  const timestamp = nowISO();

  for (const [index, seed] of CATEGORY_SEEDS.entries()) {
    await db.runAsync(
      `INSERT INTO categories
        (id, name, color, tint, ink, icon, ringtone, vibration_enabled,
         notification_enabled, is_system, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?, ?)`,
      seed.id,
      seed.name,
      seed.color,
      seed.tint,
      seed.ink,
      seed.icon,
      seed.ringtone,
      index,
      timestamp,
      timestamp,
    );
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.runAsync(
      'INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)',
      key,
      value,
      timestamp,
    );
  }
}

/**
 * Runs on every app start through `SQLiteProvider onInit`.
 * Schema version lives in SQLite's own `user_version` pragma.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;

  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(SCHEMA_V1);
    await seedV1(db);
    version = 1;
  }

  // Future migrations go here:
  // if (version === 1) { await db.execAsync(SCHEMA_V2); version = 2; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
