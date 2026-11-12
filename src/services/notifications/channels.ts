import {
  AndroidImportance,
  AndroidNotificationVisibility,
  deleteNotificationChannelAsync,
  setNotificationChannelAsync,
} from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { toneFileName, toneName } from '@/constants/tones';
import type { NotificationChannelRow } from '@/database/schema/rows';
import type { Category } from '@/types/domain';
import { nowISO } from '@/utils/date';
import { newId } from '@/utils/id';

export const DEFAULT_CHANNEL_ID = 'default';

const VIBRATION_PATTERN = [0, 250, 250, 250];

/**
 * Android notification channels are immutable once created: only name and
 * description can be changed, never the sound. So every channel id carries a
 * version, and changing a ringtone mints `<key>_v<n+1>` rather than trying to
 * mutate the existing channel. The superseded channel is deleted so the user's
 * Android settings do not fill up with dead entries.
 */
function channelIdFor(key: string, version: number): string {
  return `${key}_v${version}`;
}

async function readRow(
  db: SQLiteDatabase,
  column: 'category_id' | 'tone_id',
  value: string,
): Promise<NotificationChannelRow | null> {
  return db.getFirstAsync<NotificationChannelRow>(
    `SELECT * FROM notification_channels WHERE ${column} = ? ORDER BY version DESC LIMIT 1`,
    value,
  );
}

interface EnsureArgs {
  db: SQLiteDatabase;
  column: 'category_id' | 'tone_id';
  key: string;
  channelKey: string;
  name: string;
  description: string;
  soundFile: string | null;
  vibrate: boolean;
}

async function ensureChannel(args: EnsureArgs): Promise<string> {
  const { db, column, key, channelKey, name, description, soundFile, vibrate } = args;
  const existing = await readRow(db, column, key);

  if (existing && existing.sound_file === soundFile) {
    return existing.channel_id;
  }

  const version = (existing?.version ?? 0) + 1;
  const channelId = channelIdFor(channelKey, version);

  await setNotificationChannelAsync(channelId, {
    name,
    description,
    importance: AndroidImportance.HIGH,
    sound: soundFile ?? undefined,
    enableVibrate: vibrate,
    vibrationPattern: vibrate ? VIBRATION_PATTERN : undefined,
    lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
    showBadge: true,
  });

  if (existing) {
    try {
      await deleteNotificationChannelAsync(existing.channel_id);
    } catch {
      // The old channel may never have been created on this device.
    }
    await db.runAsync(
      'UPDATE notification_channels SET channel_id = ?, sound_file = ?, version = ? WHERE id = ?',
      channelId,
      soundFile,
      version,
      existing.id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO notification_channels
         (id, category_id, tone_id, channel_id, sound_file, version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      column === 'category_id' ? key : null,
      column === 'tone_id' ? key : null,
      channelId,
      soundFile,
      version,
      nowISO(),
    );
  }

  return channelId;
}

/** The channel a category's items use by default. Null off Android. */
export async function ensureCategoryChannel(
  db: SQLiteDatabase,
  category: Category,
  vibrate: boolean,
  soundEnabled: boolean,
): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  return ensureChannel({
    db,
    column: 'category_id',
    key: category.id,
    channelKey: category.id,
    name: `${category.name} reminders`,
    description: `Reminders for ${category.name} bills and activities`,
    soundFile: soundEnabled ? toneFileName(category.ringtone) : null,
    vibrate,
  });
}

/**
 * The channel used when a single bill or activity overrides its category
 * ringtone. Android picks the sound from the channel, so an override needs a
 * channel of its own.
 */
export async function ensureToneChannel(
  db: SQLiteDatabase,
  toneId: string,
  vibrate: boolean,
): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  return ensureChannel({
    db,
    column: 'tone_id',
    key: toneId,
    channelKey: `tone_${toneId}`,
    name: `Custom ringtone: ${toneName(toneId)}`,
    description: 'Used by individual items that override their category ringtone',
    soundFile: toneFileName(toneId),
    vibrate,
  });
}

/** Baseline channel so Android always has somewhere to put a notification. */
export async function ensureDefaultChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: 'General',
    importance: AndroidImportance.DEFAULT,
    enableVibrate: true,
  });
}

export async function listKnownChannels(db: SQLiteDatabase): Promise<NotificationChannelRow[]> {
  return db.getAllAsync<NotificationChannelRow>('SELECT * FROM notification_channels');
}
