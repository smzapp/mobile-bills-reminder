import type { SQLiteDatabase } from 'expo-sqlite';

import { fromBool, type ReminderRow, toBool } from '@/database/schema/rows';
import type { Reminder } from '@/types/domain';
import { nowISO } from '@/utils/date';
import { newId } from '@/utils/id';

export type ReminderEntityType = Reminder['entityType'];

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    entityType: row.entity_type as ReminderEntityType,
    entityId: row.entity_id,
    minutesBefore: row.minutes_before,
    fireAt: row.fire_at,
    notificationId: row.notification_id,
    channelId: row.channel_id,
    isEnabled: toBool(row.is_enabled),
    createdAt: row.created_at,
  };
}

export async function listRemindersFor(
  db: SQLiteDatabase,
  entityType: ReminderEntityType,
  entityId: string,
): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM reminders WHERE entity_type = ? AND entity_id = ? ORDER BY minutes_before ASC',
    entityType,
    entityId,
  );
  return rows.map(mapReminder);
}

export async function listAllReminders(db: SQLiteDatabase): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>('SELECT * FROM reminders');
  return rows.map(mapReminder);
}

/** Replaces the whole reminder set for an entity. Returns the new rows. */
export async function replaceReminders(
  db: SQLiteDatabase,
  entityType: ReminderEntityType,
  entityId: string,
  minutesBefore: readonly number[],
): Promise<Reminder[]> {
  const timestamp = nowISO();
  const unique = [...new Set(minutesBefore)].sort((a, b) => a - b);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM reminders WHERE entity_type = ? AND entity_id = ?',
      entityType,
      entityId,
    );
    for (const minutes of unique) {
      await db.runAsync(
        `INSERT INTO reminders
          (id, entity_type, entity_id, minutes_before, fire_at, notification_id,
           channel_id, is_enabled, created_at)
         VALUES (?, ?, ?, ?, NULL, NULL, NULL, 1, ?)`,
        newId(),
        entityType,
        entityId,
        minutes,
        timestamp,
      );
    }
  });
  return listRemindersFor(db, entityType, entityId);
}

/** Stores what the OS gave us back after scheduling. */
export async function markReminderScheduled(
  db: SQLiteDatabase,
  reminderId: string,
  notificationId: string | null,
  channelId: string | null,
  fireAt: string | null,
): Promise<void> {
  await db.runAsync(
    'UPDATE reminders SET notification_id = ?, channel_id = ?, fire_at = ? WHERE id = ?',
    notificationId,
    channelId,
    fireAt,
    reminderId,
  );
}

export async function clearReminderSchedule(
  db: SQLiteDatabase,
  reminderId: string,
): Promise<void> {
  await db.runAsync(
    'UPDATE reminders SET notification_id = NULL, fire_at = NULL WHERE id = ?',
    reminderId,
  );
}

export async function setReminderEnabled(
  db: SQLiteDatabase,
  reminderId: string,
  enabled: boolean,
): Promise<void> {
  await db.runAsync(
    'UPDATE reminders SET is_enabled = ? WHERE id = ?',
    fromBool(enabled),
    reminderId,
  );
}

export async function deleteRemindersFor(
  db: SQLiteDatabase,
  entityType: ReminderEntityType,
  entityId: string,
): Promise<void> {
  await db.runAsync(
    'DELETE FROM reminders WHERE entity_type = ? AND entity_id = ?',
    entityType,
    entityId,
  );
}
