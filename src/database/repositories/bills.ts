import type { SQLiteDatabase } from 'expo-sqlite';

import { mapCategory } from '@/database/repositories/categories';
import type {
  BillPaymentRow,
  BillWithStateRow,
  CategoryRow,
} from '@/database/schema/rows';
import type {
  Bill,
  BillPayment,
  BillWithState,
  Category,
  ISODate,
  Minor,
  PaymentMethod,
  Recurrence,
} from '@/types/domain';
import { nowISO, toISODate, todayISO } from '@/utils/date';
import { newId } from '@/utils/id';
import { nextOccurrence, parseRecurrence, serializeRecurrence } from '@/utils/recurrence';
import { deriveBillStatus } from '@/utils/status';

const BILL_WITH_STATE_SELECT = `
  SELECT b.*,
         COALESCE(SUM(p.amount), 0) AS paid_amount,
         COUNT(p.id) AS payment_count,
         MAX(p.payment_date) AS last_payment_date
  FROM bills b
  LEFT JOIN bill_payments p ON p.bill_id = b.id
`;

function mapBill(row: BillWithStateRow): Bill {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    provider: row.provider,
    referenceNumber: row.reference_number,
    amount: row.amount,
    currency: row.currency,
    categoryId: row.category_id,
    dueDate: row.due_date,
    dueTime: row.due_time,
    recurrence: parseRecurrence(row.recurrence),
    status: row.status as Bill['status'],
    ringtone: row.ringtone,
    notes: row.notes,
    parentBillId: row.parent_bill_id,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBillWithState(
  row: BillWithStateRow,
  categories: Map<string, Category>,
  today: Date,
): BillWithState {
  const bill = mapBill(row);
  const paidAmount = row.paid_amount ?? 0;
  const category = categories.get(bill.categoryId);
  if (!category) throw new Error(`Category ${bill.categoryId} missing for bill ${bill.id}`);
  return {
    ...bill,
    category,
    paidAmount,
    balance: Math.max(0, bill.amount - paidAmount),
    displayStatus: deriveBillStatus(bill, paidAmount, today),
    lastPaymentDate: row.last_payment_date,
    paymentCount: row.payment_count ?? 0,
  };
}

async function categoryMap(db: SQLiteDatabase): Promise<Map<string, Category>> {
  const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories');
  return new Map(rows.map((row) => [row.id, mapCategory(row)]));
}

export type BillFilter = 'unpaid' | 'paid' | 'all';

export interface ListBillsOptions {
  filter?: BillFilter;
  categoryId?: string | null;
  includeArchived?: boolean;
  today?: Date;
}

export async function listBills(
  db: SQLiteDatabase,
  options: ListBillsOptions = {},
): Promise<BillWithState[]> {
  const { filter = 'all', categoryId = null, includeArchived = false, today = new Date() } = options;
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (!includeArchived) where.push('b.archived_at IS NULL');
  else where.push('b.archived_at IS NOT NULL');

  if (categoryId) {
    where.push('b.category_id = ?');
    params.push(categoryId);
  }

  const having =
    filter === 'unpaid'
      ? 'HAVING COALESCE(SUM(p.amount), 0) < b.amount'
      : filter === 'paid'
        ? 'HAVING COALESCE(SUM(p.amount), 0) >= b.amount'
        : '';

  const sql = `${BILL_WITH_STATE_SELECT}
    WHERE ${where.join(' AND ')}
    GROUP BY b.id
    ${having}
    ORDER BY b.due_date ASC, b.title ASC`;

  const rows = await db.getAllAsync<BillWithStateRow>(sql, params);
  const categories = await categoryMap(db);
  return rows.map((row) => mapBillWithState(row, categories, today));
}

export async function getBill(
  db: SQLiteDatabase,
  id: string,
  today: Date = new Date(),
): Promise<BillWithState | null> {
  const row = await db.getFirstAsync<BillWithStateRow>(
    `${BILL_WITH_STATE_SELECT} WHERE b.id = ? GROUP BY b.id`,
    id,
  );
  if (!row) return null;
  const categories = await categoryMap(db);
  return mapBillWithState(row, categories, today);
}

/** Unpaid bills falling due within `days` (includes already-overdue ones). */
export async function listBillsDueWithin(
  db: SQLiteDatabase,
  days: number,
  today: Date = new Date(),
): Promise<BillWithState[]> {
  const bills = await listBills(db, { filter: 'unpaid', today });
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + days);
  const horizonISO = toISODate(horizon);
  return bills.filter((bill) => bill.dueDate <= horizonISO);
}

export interface BillInput {
  title: string;
  description?: string | null;
  provider?: string | null;
  referenceNumber?: string | null;
  amount: Minor;
  currency?: string;
  categoryId: string;
  dueDate: ISODate;
  dueTime?: string | null;
  recurrence: Recurrence;
  ringtone?: string | null;
  notes?: string | null;
  parentBillId?: string | null;
}

export async function createBill(db: SQLiteDatabase, input: BillInput): Promise<string> {
  const id = newId();
  const timestamp = nowISO();
  await db.runAsync(
    `INSERT INTO bills
      (id, title, description, provider, reference_number, amount, currency, category_id,
       due_date, due_time, recurrence, status, ringtone, notes, parent_bill_id,
       archived_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?, NULL, ?, ?)`,
    id,
    input.title.trim(),
    input.description ?? null,
    input.provider ?? null,
    input.referenceNumber ?? null,
    input.amount,
    input.currency ?? 'PHP',
    input.categoryId,
    input.dueDate,
    input.dueTime ?? null,
    serializeRecurrence(input.recurrence),
    input.ringtone ?? null,
    input.notes ?? null,
    input.parentBillId ?? null,
    timestamp,
    timestamp,
  );
  return id;
}

export async function updateBill(
  db: SQLiteDatabase,
  id: string,
  input: BillInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE bills SET
       title = ?, description = ?, provider = ?, reference_number = ?, amount = ?,
       currency = ?, category_id = ?, due_date = ?, due_time = ?, recurrence = ?,
       ringtone = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    input.title.trim(),
    input.description ?? null,
    input.provider ?? null,
    input.referenceNumber ?? null,
    input.amount,
    input.currency ?? 'PHP',
    input.categoryId,
    input.dueDate,
    input.dueTime ?? null,
    serializeRecurrence(input.recurrence),
    input.ringtone ?? null,
    input.notes ?? null,
    nowISO(),
    id,
  );
}

export async function archiveBill(db: SQLiteDatabase, id: string): Promise<void> {
  const timestamp = nowISO();
  await db.runAsync(
    "UPDATE bills SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ?",
    timestamp,
    timestamp,
    id,
  );
}

export async function restoreBill(db: SQLiteDatabase, id: string): Promise<void> {
  const timestamp = nowISO();
  await db.runAsync(
    "UPDATE bills SET status = 'upcoming', archived_at = NULL, updated_at = ? WHERE id = ?",
    timestamp,
    id,
  );
}

/** Hard delete. Payments cascade; this is only reachable from the Archive screen. */
export async function deleteBill(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "DELETE FROM reminders WHERE entity_type = 'bill' AND entity_id = ?",
      id,
    );
    await db.runAsync('DELETE FROM bills WHERE id = ?', id);
  });
}

export interface PaymentInput {
  billId: string;
  amount: Minor;
  paymentDate: ISODate;
  paymentMethod?: PaymentMethod | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface RecordPaymentResult {
  paymentId: string;
  fullyPaid: boolean;
  /** Id of the bill generated for the next cycle, when the series rolled over. */
  nextBillId: string | null;
}

/**
 * Records a payment, updates the stored status and, when a recurring bill is
 * settled in full, generates the next occurrence. The new bill carries no
 * payment rows of its own, so history is never duplicated or overwritten.
 */
export async function recordPayment(
  db: SQLiteDatabase,
  input: PaymentInput,
): Promise<RecordPaymentResult> {
  const paymentId = newId();
  const timestamp = nowISO();
  let fullyPaid = false;
  let nextBillId: string | null = null;

  await db.withTransactionAsync(async () => {
    const bill = await db.getFirstAsync<BillWithStateRow>(
      `${BILL_WITH_STATE_SELECT} WHERE b.id = ? GROUP BY b.id`,
      input.billId,
    );
    if (!bill) throw new Error(`Bill ${input.billId} not found`);

    await db.runAsync(
      `INSERT INTO bill_payments
        (id, bill_id, amount, payment_date, payment_method, reference_number, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      paymentId,
      input.billId,
      input.amount,
      input.paymentDate,
      input.paymentMethod ?? null,
      input.referenceNumber ?? null,
      input.notes ?? null,
      timestamp,
    );

    const paidAmount = (bill.paid_amount ?? 0) + input.amount;
    fullyPaid = paidAmount >= bill.amount;

    await db.runAsync(
      'UPDATE bills SET status = ?, updated_at = ? WHERE id = ?',
      fullyPaid ? 'paid' : 'partially_paid',
      timestamp,
      input.billId,
    );

    if (!fullyPaid) return;

    const recurrence = parseRecurrence(bill.recurrence);
    if (recurrence.type === 'none') return;

    const nextDue = nextOccurrence(bill.due_date, recurrence);
    if (!nextDue) return;

    const seriesRoot = bill.parent_bill_id ?? bill.id;
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM bills
       WHERE due_date = ? AND (id = ? OR parent_bill_id = ?)`,
      nextDue,
      seriesRoot,
      seriesRoot,
    );
    if (existing) return;

    nextBillId = newId();
    await db.runAsync(
      `INSERT INTO bills
        (id, title, description, provider, reference_number, amount, currency, category_id,
         due_date, due_time, recurrence, status, ringtone, notes, parent_bill_id,
         archived_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?, NULL, ?, ?)`,
      nextBillId,
      bill.title,
      bill.description,
      bill.provider,
      bill.reference_number,
      bill.amount,
      bill.currency,
      bill.category_id,
      nextDue,
      bill.due_time,
      bill.recurrence,
      bill.ringtone,
      bill.notes,
      seriesRoot,
      timestamp,
      timestamp,
    );
  });

  return { paymentId, fullyPaid, nextBillId };
}

/** Settles the remaining balance in one payment. */
export async function payRemainingBalance(
  db: SQLiteDatabase,
  billId: string,
  paymentMethod: PaymentMethod | null = null,
): Promise<RecordPaymentResult> {
  const bill = await getBill(db, billId);
  if (!bill) throw new Error(`Bill ${billId} not found`);
  return recordPayment(db, {
    billId,
    amount: bill.balance,
    paymentDate: todayISO(),
    paymentMethod,
  });
}

function mapPayment(row: BillPaymentRow): BillPayment {
  return {
    id: row.id,
    billId: row.bill_id,
    amount: row.amount,
    paymentDate: row.payment_date,
    paymentMethod: (row.payment_method as PaymentMethod | null) ?? null,
    referenceNumber: row.reference_number,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function listPayments(
  db: SQLiteDatabase,
  billId: string,
): Promise<BillPayment[]> {
  const rows = await db.getAllAsync<BillPaymentRow>(
    'SELECT * FROM bill_payments WHERE bill_id = ? ORDER BY payment_date DESC, created_at DESC',
    billId,
  );
  return rows.map(mapPayment);
}

/** Removes a payment and recomputes the bill status. Never touches other rows. */
export async function deletePayment(
  db: SQLiteDatabase,
  paymentId: string,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const payment = await db.getFirstAsync<BillPaymentRow>(
      'SELECT * FROM bill_payments WHERE id = ?',
      paymentId,
    );
    if (!payment) return;
    await db.runAsync('DELETE FROM bill_payments WHERE id = ?', paymentId);
    const bill = await db.getFirstAsync<BillWithStateRow>(
      `${BILL_WITH_STATE_SELECT} WHERE b.id = ? GROUP BY b.id`,
      payment.bill_id,
    );
    if (!bill) return;
    const paidAmount = bill.paid_amount ?? 0;
    const status = paidAmount >= bill.amount ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'upcoming';
    await db.runAsync(
      'UPDATE bills SET status = ?, updated_at = ? WHERE id = ?',
      status,
      nowISO(),
      payment.bill_id,
    );
  });
}

/** Every payment inside a month key such as "2026-11", newest first. */
export async function listPaymentsInMonth(
  db: SQLiteDatabase,
  month: string,
): Promise<(BillPayment & { billTitle: string; categoryId: string })[]> {
  const rows = await db.getAllAsync<BillPaymentRow & { title: string; category_id: string }>(
    `SELECT p.*, b.title, b.category_id
     FROM bill_payments p
     JOIN bills b ON b.id = p.bill_id
     WHERE substr(p.payment_date, 1, 7) = ?
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    month,
  );
  return rows.map((row) => ({
    ...mapPayment(row),
    billTitle: row.title,
    categoryId: row.category_id,
  }));
}
