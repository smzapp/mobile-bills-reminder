import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { toneFileName } from '@/constants/tones';
import { getActivity, listActivities } from '@/database/repositories/activities';
import { getBill, listBills } from '@/database/repositories/bills';
import {
  clearReminderSchedule,
  listRemindersFor,
  markReminderScheduled,
  type ReminderEntityType,
} from '@/database/repositories/reminders';
import { readSettings } from '@/database/repositories/settings';
import type {
  ActivityWithCategory,
  BillWithState,
  Category,
  Reminder,
} from '@/types/domain';
import { combineDateTime, formatShortDate, formatTime12, nowISO } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import {
  ensureCategoryChannel,
  ensureToneChannel,
} from '@/services/notifications/channels';
import { getPermissionState } from '@/services/notifications/permissions';

export interface ScheduledPayload {
  entityType: ReminderEntityType;
  entityId: string;
  reminderId: string;
  toneId: string;
}

interface SchedulePlan {
  dueAt: Date;
  title: string;
  body: string;
  toneId: string;
  category: Category;
  /** False when the item is archived, paid, completed or muted. */
  active: boolean;
}

async function cancelNotificationIds(ids: readonly (string | null)[]): Promise<void> {
  await Promise.all(
    ids
      .filter((id): id is string => Boolean(id))
      .map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {
          // Already fired or cancelled - nothing to undo.
        }),
      ),
  );
}

/** Cancels every OS notification for an entity and clears the stored ids. */
export async function cancelEntityReminders(
  db: SQLiteDatabase,
  entityType: ReminderEntityType,
  entityId: string,
): Promise<void> {
  const reminders = await listRemindersFor(db, entityType, entityId);
  await cancelNotificationIds(reminders.map((reminder) => reminder.notificationId));
  for (const reminder of reminders) {
    await clearReminderSchedule(db, reminder.id);
  }
}

function billPlan(bill: BillWithState, symbol: string): SchedulePlan {
  const active =
    bill.archivedAt === null && bill.balance > 0 && bill.category.notificationEnabled;
  return {
    dueAt: combineDateTime(bill.dueDate, bill.dueTime),
    title: `${bill.title} is due`,
    body: `${formatMoney(bill.balance, symbol)} due ${formatShortDate(bill.dueDate)} · ${bill.category.name}`,
    toneId: bill.ringtone ?? bill.category.ringtone,
    category: bill.category,
    active,
  };
}

function activityPlan(activity: ActivityWithCategory): SchedulePlan {
  const active =
    activity.archivedAt === null &&
    activity.status === 'scheduled' &&
    activity.category.notificationEnabled;
  const time = formatTime12(activity.startTime);
  const where = activity.location ? ` · ${activity.location}` : '';
  return {
    dueAt: combineDateTime(activity.startDate, activity.startTime),
    title: activity.title,
    body: `${time || formatShortDate(activity.startDate)}${where}`,
    toneId: activity.ringtone ?? activity.category.ringtone,
    category: activity.category,
    active,
  };
}

async function scheduleOne(
  db: SQLiteDatabase,
  plan: SchedulePlan,
  reminder: Reminder,
  entityType: ReminderEntityType,
  entityId: string,
  vibrate: boolean,
  soundEnabled: boolean,
): Promise<boolean> {
  const fireAt = new Date(plan.dueAt.getTime() - reminder.minutesBefore * 60_000);
  if (fireAt.getTime() <= Date.now()) return false;

  // An item-level ringtone override needs its own Android channel, because the
  // channel - not the notification - decides the sound on Android 8+.
  const usesOverride = plan.toneId !== plan.category.ringtone;
  const channelId = usesOverride
    ? await ensureToneChannel(db, plan.toneId, vibrate)
    : await ensureCategoryChannel(db, plan.category, vibrate, soundEnabled);

  const data: ScheduledPayload = {
    entityType,
    entityId,
    reminderId: reminder.id,
    toneId: plan.toneId,
  };

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: plan.title,
      body: plan.body,
      data: data as unknown as Record<string, unknown>,
      // Android 8+ takes the sound from the channel; this covers older devices.
      sound: soundEnabled ? toneFileName(plan.toneId) : undefined,
      vibrate: vibrate ? [0, 250, 250, 250] : undefined,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      ...(channelId ? { channelId } : {}),
    },
  });

  await markReminderScheduled(
    db,
    reminder.id,
    notificationId,
    channelId,
    fireAt.toISOString(),
  );
  return true;
}

async function syncEntity(
  db: SQLiteDatabase,
  entityType: ReminderEntityType,
  entityId: string,
  plan: SchedulePlan,
): Promise<number> {
  await cancelEntityReminders(db, entityType, entityId);

  const settings = await readSettings(db);
  if (!settings.notificationsEnabled || !plan.active) return 0;

  const permission = await getPermissionState();
  if (!permission.granted) return 0;

  const reminders = await listRemindersFor(db, entityType, entityId);
  let scheduled = 0;
  for (const reminder of reminders) {
    if (!reminder.isEnabled) continue;
    const ok = await scheduleOne(
      db,
      plan,
      reminder,
      entityType,
      entityId,
      settings.vibrateWithRingtone && plan.category.vibrationEnabled,
      settings.ringInSilentMode,
    );
    if (ok) scheduled += 1;
  }
  return scheduled;
}

/** Re-reads a bill and rebuilds all of its OS notifications. */
export async function syncBillReminders(
  db: SQLiteDatabase,
  billId: string,
): Promise<number> {
  const bill = await getBill(db, billId);
  if (!bill) {
    await cancelEntityReminders(db, 'bill', billId);
    return 0;
  }
  const settings = await readSettings(db);
  return syncEntity(db, 'bill', billId, billPlan(bill, settings.currencySymbol));
}

/** Re-reads an activity and rebuilds all of its OS notifications. */
export async function syncActivityReminders(
  db: SQLiteDatabase,
  activityId: string,
): Promise<number> {
  const activity = await getActivity(db, activityId);
  if (!activity) {
    await cancelEntityReminders(db, 'activity', activityId);
    return 0;
  }
  return syncEntity(db, 'activity', activityId, activityPlan(activity));
}

export interface ReconcileResult {
  scheduled: number;
  cancelled: number;
  permissionGranted: boolean;
  exactAlarmsAllowed: boolean;
}

/**
 * Rebuilds the whole notification set from the database.
 *
 * Called on every app start, because scheduled notifications do not survive a
 * reinstall, a permission change, a timezone change or an OS that quietly
 * dropped them. Anything the OS still holds that we no longer want is removed
 * first, so the database is always the source of truth.
 */
export async function reconcileAllReminders(db: SQLiteDatabase): Promise<ReconcileResult> {
  const permission = await getPermissionState();
  const existing = await Notifications.getAllScheduledNotificationsAsync();

  if (!permission.granted) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return {
      scheduled: 0,
      cancelled: existing.length,
      permissionGranted: false,
      exactAlarmsAllowed: permission.exactAlarmsAllowed,
    };
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const bills = await listBills(db, { filter: 'unpaid' });
  const activities = await listActivities(db, { status: 'scheduled' });
  const settings = await readSettings(db);

  let scheduled = 0;
  for (const bill of bills) {
    scheduled += await syncEntity(db, 'bill', bill.id, billPlan(bill, settings.currencySymbol));
  }
  for (const activity of activities) {
    scheduled += await syncEntity(db, 'activity', activity.id, activityPlan(activity));
  }

  return {
    scheduled,
    cancelled: existing.length,
    permissionGranted: true,
    exactAlarmsAllowed: permission.exactAlarmsAllowed,
  };
}

/** Re-fires a notification after the user's snooze interval. */
export async function snoozeNotification(
  title: string,
  body: string,
  minutes: number,
  channelId: string | null,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(60, minutes * 60),
      ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
    },
  });
}

export function scheduledAtLabel(): string {
  return nowISO();
}
