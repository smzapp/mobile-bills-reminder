import type { SQLiteDatabase } from 'expo-sqlite';

import { type CategoryRow, fromBool, toBool } from '@/database/schema/rows';
import type { Category } from '@/types/domain';
import { nowISO } from '@/utils/date';
import { newId } from '@/utils/id';

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    tint: row.tint,
    ink: row.ink,
    icon: row.icon,
    ringtone: row.ringtone,
    vibrationEnabled: toBool(row.vibration_enabled),
    notificationEnabled: toBool(row.notification_enabled),
    isSystem: toBool(row.is_system),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY sort_order ASC, name ASC',
  );
  return rows.map(mapCategory);
}

export async function getCategory(
  db: SQLiteDatabase,
  id: string,
): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', id);
  return row ? mapCategory(row) : null;
}

export interface CategoryInput {
  name: string;
  color: string;
  tint: string;
  ink: string;
  icon: string;
  ringtone: string;
  vibrationEnabled?: boolean;
  notificationEnabled?: boolean;
}

export async function createCategory(
  db: SQLiteDatabase,
  input: CategoryInput,
): Promise<string> {
  const id = newId();
  const timestamp = nowISO();
  const next = await db.getFirstAsync<{ next_order: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM categories',
  );
  await db.runAsync(
    `INSERT INTO categories
      (id, name, color, tint, ink, icon, ringtone, vibration_enabled,
       notification_enabled, is_system, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    id,
    input.name.trim(),
    input.color,
    input.tint,
    input.ink,
    input.icon,
    input.ringtone,
    fromBool(input.vibrationEnabled ?? true),
    fromBool(input.notificationEnabled ?? true),
    next?.next_order ?? 0,
    timestamp,
    timestamp,
  );
  return id;
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<CategoryInput>,
): Promise<void> {
  const current = await getCategory(db, id);
  if (!current) throw new Error(`Category ${id} not found`);
  await db.runAsync(
    `UPDATE categories SET
      name = ?, color = ?, tint = ?, ink = ?, icon = ?, ringtone = ?,
      vibration_enabled = ?, notification_enabled = ?, updated_at = ?
     WHERE id = ?`,
    (patch.name ?? current.name).trim(),
    patch.color ?? current.color,
    patch.tint ?? current.tint,
    patch.ink ?? current.ink,
    patch.icon ?? current.icon,
    patch.ringtone ?? current.ringtone,
    fromBool(patch.vibrationEnabled ?? current.vibrationEnabled),
    fromBool(patch.notificationEnabled ?? current.notificationEnabled),
    nowISO(),
    id,
  );
}

/** Number of non-archived bills and activities pointing at this category. */
export async function countCategoryUsage(
  db: SQLiteDatabase,
  id: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT
       (SELECT COUNT(*) FROM bills WHERE category_id = ? AND archived_at IS NULL) +
       (SELECT COUNT(*) FROM activities WHERE category_id = ? AND archived_at IS NULL) +
       (SELECT COUNT(*) FROM expenses WHERE category_id = ? AND archived_at IS NULL) AS total`,
    id,
    id,
    id,
  );
  return row?.total ?? 0;
}

/** Refuses to delete a system category or one still in use. */
export async function deleteCategory(db: SQLiteDatabase, id: string): Promise<void> {
  const category = await getCategory(db, id);
  if (!category) return;
  if (category.isSystem) throw new Error('Built-in categories cannot be deleted.');
  const usage = await countCategoryUsage(db, id);
  if (usage > 0) {
    throw new Error(`This category is still used by ${usage} item${usage === 1 ? '' : 's'}.`);
  }
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
}
