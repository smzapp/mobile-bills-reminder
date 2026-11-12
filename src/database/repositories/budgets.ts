import type { SQLiteDatabase } from 'expo-sqlite';

import type { BudgetRow } from '@/database/schema/rows';
import type { Budget, ISODate, Minor } from '@/types/domain';
import { nowISO, todayISO } from '@/utils/date';
import { newId } from '@/utils/id';

function mapBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    categoryId: row.category_id,
    period: row.period === 'yearly' ? 'yearly' : 'monthly',
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  };
}

export async function listBudgets(db: SQLiteDatabase): Promise<Budget[]> {
  const rows = await db.getAllAsync<BudgetRow>(
    'SELECT * FROM budgets ORDER BY category_id IS NOT NULL, name ASC',
  );
  return rows.map(mapBudget);
}

export async function listCategoryBudgets(db: SQLiteDatabase): Promise<Budget[]> {
  const rows = await db.getAllAsync<BudgetRow>(
    'SELECT * FROM budgets WHERE category_id IS NOT NULL ORDER BY name ASC',
  );
  return rows.map(mapBudget);
}

export interface BudgetInput {
  name: string;
  amount: Minor;
  categoryId: string | null;
  period?: 'monthly' | 'yearly';
  startDate?: ISODate;
  endDate?: ISODate | null;
}

export async function upsertCategoryBudget(
  db: SQLiteDatabase,
  input: BudgetInput,
): Promise<string> {
  const existing = input.categoryId
    ? await db.getFirstAsync<BudgetRow>(
        'SELECT * FROM budgets WHERE category_id = ?',
        input.categoryId,
      )
    : null;

  if (existing) {
    await db.runAsync(
      'UPDATE budgets SET name = ?, amount = ?, period = ? WHERE id = ?',
      input.name,
      input.amount,
      input.period ?? 'monthly',
      existing.id,
    );
    return existing.id;
  }

  const id = newId();
  await db.runAsync(
    `INSERT INTO budgets (id, name, amount, category_id, period, start_date, end_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.amount,
    input.categoryId,
    input.period ?? 'monthly',
    input.startDate ?? todayISO(),
    input.endDate ?? null,
    nowISO(),
  );
  return id;
}

export async function deleteBudget(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM budgets WHERE id = ?', id);
}
