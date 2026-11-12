import type { SQLiteDatabase } from 'expo-sqlite';

import { mapCategory } from '@/database/repositories/categories';
import type { ActivityRow, CategoryRow } from '@/database/schema/rows';
import type {
  Activity,
  ActivityKind,
  ActivityStatus,
  ActivityWithCategory,
  Category,
  ISODate,
  Recurrence,
} from '@/types/domain';
import { minutesOfDay, nowISO, todayISO } from '@/utils/date';
import { newId } from '@/utils/id';
import { parseRecurrence, serializeRecurrence } from '@/utils/recurrence';

function mapActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind as ActivityKind,
    categoryId: row.category_id,
    startDate: row.start_date,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    meetingLink: row.meeting_link,
    recurrence: parseRecurrence(row.recurrence),
    status: row.status as ActivityStatus,
    ringtone: row.ringtone,
    notes: row.notes,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function categoryMap(db: SQLiteDatabase): Promise<Map<string, Category>> {
  const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories');
  return new Map(rows.map((row) => [row.id, mapCategory(row)]));
}

function withCategory(row: ActivityRow, categories: Map<string, Category>): ActivityWithCategory {
  const activity = mapActivity(row);
  const category = categories.get(activity.categoryId);
  if (!category) throw new Error(`Category ${activity.categoryId} missing for activity ${activity.id}`);
  return { ...activity, category };
}

export interface ListActivitiesOptions {
  includeArchived?: boolean;
  categoryId?: string | null;
  from?: ISODate;
  to?: ISODate;
  status?: ActivityStatus | null;
}

export async function listActivities(
  db: SQLiteDatabase,
  options: ListActivitiesOptions = {},
): Promise<ActivityWithCategory[]> {
  const { includeArchived = false, categoryId = null, from, to, status = null } = options;
  const where: string[] = [includeArchived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL'];
  const params: string[] = [];

  if (categoryId) {
    where.push('category_id = ?');
    params.push(categoryId);
  }
  if (from) {
    where.push('start_date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('start_date <= ?');
    params.push(to);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const rows = await db.getAllAsync<ActivityRow>(
    `SELECT * FROM activities WHERE ${where.join(' AND ')}
     ORDER BY start_date ASC, COALESCE(start_time, '99:99') ASC, title ASC`,
    params,
  );
  const categories = await categoryMap(db);
  return rows.map((row) => withCategory(row, categories));
}

/** Scheduled activities that have not started yet, nearest first. */
export async function listUpcomingActivities(
  db: SQLiteDatabase,
  now: Date = new Date(),
): Promise<ActivityWithCategory[]> {
  const today = todayISO(now);
  const activities = await listActivities(db, { from: today, status: 'scheduled' });
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return activities.filter((activity) => {
    if (activity.startDate > today) return true;
    return minutesOfDay(activity.startTime) >= nowMinutes;
  });
}

export async function getActivity(
  db: SQLiteDatabase,
  id: string,
): Promise<ActivityWithCategory | null> {
  const row = await db.getFirstAsync<ActivityRow>('SELECT * FROM activities WHERE id = ?', id);
  if (!row) return null;
  const categories = await categoryMap(db);
  return withCategory(row, categories);
}

export interface ActivityInput {
  title: string;
  description?: string | null;
  kind: ActivityKind;
  categoryId: string;
  startDate: ISODate;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  meetingLink?: string | null;
  recurrence: Recurrence;
  ringtone?: string | null;
  notes?: string | null;
}

export async function createActivity(
  db: SQLiteDatabase,
  input: ActivityInput,
): Promise<string> {
  const id = newId();
  const timestamp = nowISO();
  await db.runAsync(
    `INSERT INTO activities
      (id, title, description, kind, category_id, start_date, start_time, end_time,
       location, meeting_link, recurrence, status, ringtone, notes, archived_at,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, NULL, ?, ?)`,
    id,
    input.title.trim(),
    input.description ?? null,
    input.kind,
    input.categoryId,
    input.startDate,
    input.startTime ?? null,
    input.endTime ?? null,
    input.location ?? null,
    input.meetingLink ?? null,
    serializeRecurrence(input.recurrence),
    input.ringtone ?? null,
    input.notes ?? null,
    timestamp,
    timestamp,
  );
  return id;
}

export async function updateActivity(
  db: SQLiteDatabase,
  id: string,
  input: ActivityInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE activities SET
      title = ?, description = ?, kind = ?, category_id = ?, start_date = ?,
      start_time = ?, end_time = ?, location = ?, meeting_link = ?, recurrence = ?,
      ringtone = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    input.title.trim(),
    input.description ?? null,
    input.kind,
    input.categoryId,
    input.startDate,
    input.startTime ?? null,
    input.endTime ?? null,
    input.location ?? null,
    input.meetingLink ?? null,
    serializeRecurrence(input.recurrence),
    input.ringtone ?? null,
    input.notes ?? null,
    nowISO(),
    id,
  );
}

export async function setActivityStatus(
  db: SQLiteDatabase,
  id: string,
  status: ActivityStatus,
): Promise<void> {
  await db.runAsync(
    'UPDATE activities SET status = ?, updated_at = ? WHERE id = ?',
    status,
    nowISO(),
    id,
  );
}

export async function archiveActivity(db: SQLiteDatabase, id: string): Promise<void> {
  const timestamp = nowISO();
  await db.runAsync(
    "UPDATE activities SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ?",
    timestamp,
    timestamp,
    id,
  );
}

export async function restoreActivity(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    "UPDATE activities SET status = 'scheduled', archived_at = NULL, updated_at = ? WHERE id = ?",
    nowISO(),
    id,
  );
}

export async function deleteActivity(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "DELETE FROM reminders WHERE entity_type = 'activity' AND entity_id = ?",
      id,
    );
    await db.runAsync('DELETE FROM activities WHERE id = ?', id);
  });
}
