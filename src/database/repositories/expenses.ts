import type { SQLiteDatabase } from 'expo-sqlite';

import { mapCategory } from '@/database/repositories/categories';
import type { CategoryRow, ExpenseRow } from '@/database/schema/rows';
import type {
  Category,
  Expense,
  ExpenseWithCategory,
  ISODate,
  Minor,
  PaymentMethod,
} from '@/types/domain';
import { nowISO } from '@/utils/date';
import { newId } from '@/utils/id';

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    categoryId: row.category_id,
    expenseDate: row.expense_date,
    paymentMethod: (row.payment_method as PaymentMethod | null) ?? null,
    relatedBillId: row.related_bill_id,
    notes: row.notes,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

async function categoryMap(db: SQLiteDatabase): Promise<Map<string, Category>> {
  const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories');
  return new Map(rows.map((row) => [row.id, mapCategory(row)]));
}

export interface ListExpensesOptions {
  from?: ISODate;
  to?: ISODate;
  categoryId?: string | null;
  includeArchived?: boolean;
  limit?: number;
}

export async function listExpenses(
  db: SQLiteDatabase,
  options: ListExpensesOptions = {},
): Promise<ExpenseWithCategory[]> {
  const { from, to, categoryId = null, includeArchived = false, limit } = options;
  const where: string[] = [includeArchived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL'];
  const params: (string | number)[] = [];

  if (from) {
    where.push('expense_date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('expense_date <= ?');
    params.push(to);
  }
  if (categoryId) {
    where.push('category_id = ?');
    params.push(categoryId);
  }

  let sql = `SELECT * FROM expenses WHERE ${where.join(' AND ')}
    ORDER BY expense_date DESC, created_at DESC`;
  if (limit) {
    sql += ' LIMIT ?';
    params.push(limit);
  }

  const rows = await db.getAllAsync<ExpenseRow>(sql, params);
  const categories = await categoryMap(db);
  return rows.map((row) => {
    const expense = mapExpense(row);
    const category = categories.get(expense.categoryId);
    if (!category) throw new Error(`Category ${expense.categoryId} missing for expense ${expense.id}`);
    return { ...expense, category };
  });
}

export async function getExpense(
  db: SQLiteDatabase,
  id: string,
): Promise<ExpenseWithCategory | null> {
  const rows = await listExpenses(db, {});
  return rows.find((expense) => expense.id === id) ?? null;
}

export interface ExpenseInput {
  title: string;
  description?: string | null;
  amount: Minor;
  currency?: string;
  categoryId: string;
  expenseDate: ISODate;
  paymentMethod?: PaymentMethod | null;
  relatedBillId?: string | null;
  notes?: string | null;
}

export async function createExpense(
  db: SQLiteDatabase,
  input: ExpenseInput,
): Promise<string> {
  const id = newId();
  await db.runAsync(
    `INSERT INTO expenses
      (id, title, description, amount, currency, category_id, expense_date,
       payment_method, related_bill_id, notes, archived_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    id,
    input.title.trim(),
    input.description ?? null,
    input.amount,
    input.currency ?? 'PHP',
    input.categoryId,
    input.expenseDate,
    input.paymentMethod ?? null,
    input.relatedBillId ?? null,
    input.notes ?? null,
    nowISO(),
  );
  return id;
}

export async function updateExpense(
  db: SQLiteDatabase,
  id: string,
  input: ExpenseInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE expenses SET
      title = ?, description = ?, amount = ?, currency = ?, category_id = ?,
      expense_date = ?, payment_method = ?, related_bill_id = ?, notes = ?
     WHERE id = ?`,
    input.title.trim(),
    input.description ?? null,
    input.amount,
    input.currency ?? 'PHP',
    input.categoryId,
    input.expenseDate,
    input.paymentMethod ?? null,
    input.relatedBillId ?? null,
    input.notes ?? null,
    id,
  );
}

export async function archiveExpense(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE expenses SET archived_at = ? WHERE id = ?', nowISO(), id);
}

export async function restoreExpense(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE expenses SET archived_at = NULL WHERE id = ?', id);
}

export async function deleteExpense(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
}

/**
 * Total money actually spent in a month: recorded expenses plus bill payments.
 * A bill that merely exists is never counted - only payments against it are.
 */
export async function monthSpendTotal(db: SQLiteDatabase, month: string): Promise<Minor> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT
       (SELECT COALESCE(SUM(amount), 0) FROM expenses
         WHERE substr(expense_date, 1, 7) = ? AND archived_at IS NULL) +
       (SELECT COALESCE(SUM(amount), 0) FROM bill_payments
         WHERE substr(payment_date, 1, 7) = ?) AS total`,
    month,
    month,
  );
  return row?.total ?? 0;
}

export interface MonthSpend {
  /** YYYY-MM */
  month: string;
  total: Minor;
}

/** Totals for the last `count` months, oldest first, for the trend chart. */
export async function monthlySpendSeries(
  db: SQLiteDatabase,
  count: number,
  now: Date = new Date(),
): Promise<MonthSpend[]> {
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  const totals = await Promise.all(months.map((month) => monthSpendTotal(db, month)));
  return months.map((month, index) => ({ month, total: totals[index] }));
}

export interface Transaction {
  id: string;
  title: string;
  amount: Minor;
  date: ISODate;
  categoryId: string;
  source: 'bill' | 'expense';
  /** Bill id for bill payments, so the row can link to the bill. */
  billId: string | null;
}

/** Recorded expenses and bill payments in one list, newest first. */
export async function listTransactions(
  db: SQLiteDatabase,
  options: { from?: ISODate; to?: ISODate; categoryId?: string | null; limit?: number } = {},
): Promise<Transaction[]> {
  const { from, to, categoryId = null, limit = 50 } = options;
  const params: (string | number)[] = [];
  const clauses = (dateColumn: string) => {
    const parts: string[] = [];
    if (from) {
      parts.push(`${dateColumn} >= ?`);
      params.push(from);
    }
    if (to) {
      parts.push(`${dateColumn} <= ?`);
      params.push(to);
    }
    return parts;
  };

  const expenseWhere = ['e.archived_at IS NULL', ...clauses('e.expense_date')];
  if (categoryId) {
    expenseWhere.push('e.category_id = ?');
    params.push(categoryId);
  }
  const paymentWhere = clauses('p.payment_date');
  if (categoryId) {
    paymentWhere.push('b.category_id = ?');
    params.push(categoryId);
  }

  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    amount: number;
    date: string;
    category_id: string;
    source: string;
    bill_id: string | null;
  }>(
    `SELECT e.id, e.title, e.amount, e.expense_date AS date, e.category_id,
            'expense' AS source, e.related_bill_id AS bill_id
       FROM expenses e
      WHERE ${expenseWhere.join(' AND ')}
      UNION ALL
     SELECT p.id, b.title, p.amount, p.payment_date AS date, b.category_id,
            'bill' AS source, b.id AS bill_id
       FROM bill_payments p
       JOIN bills b ON b.id = p.bill_id
      ${paymentWhere.length > 0 ? `WHERE ${paymentWhere.join(' AND ')}` : ''}
      ORDER BY date DESC
      LIMIT ?`,
    [...params, limit],
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    amount: row.amount,
    date: row.date,
    categoryId: row.category_id,
    source: row.source === 'bill' ? 'bill' : 'expense',
    billId: row.bill_id,
  }));
}

export interface CategorySpend {
  categoryId: string;
  total: Minor;
}

/** Spend per category for a month, combining expenses and bill payments. */
export async function monthSpendByCategory(
  db: SQLiteDatabase,
  month: string,
): Promise<CategorySpend[]> {
  const rows = await db.getAllAsync<{ category_id: string; total: number }>(
    `SELECT category_id, SUM(total) AS total FROM (
       SELECT category_id, SUM(amount) AS total FROM expenses
         WHERE substr(expense_date, 1, 7) = ? AND archived_at IS NULL
         GROUP BY category_id
       UNION ALL
       SELECT b.category_id, SUM(p.amount) AS total FROM bill_payments p
         JOIN bills b ON b.id = p.bill_id
         WHERE substr(p.payment_date, 1, 7) = ?
         GROUP BY b.category_id
     )
     GROUP BY category_id
     ORDER BY total DESC`,
    month,
    month,
  );
  return rows.map((row) => ({ categoryId: row.category_id, total: row.total }));
}
