import { Colors } from '@/constants/theme';
import type { ActivityStatus, Bill, BillStatus, ISODate, Minor } from '@/types/domain';
import { daysUntil } from '@/utils/date';

export interface StatusMeta {
  label: string;
  color: string;
  tint: string;
}

/**
 * Combines the stored bill status with its payment total and due date.
 * Archived always wins; a fully-paid bill is never shown as overdue.
 */
export function deriveBillStatus(
  bill: Pick<Bill, 'status' | 'dueDate' | 'amount'>,
  paidAmount: Minor,
  today: Date = new Date(),
): BillStatus {
  if (bill.status === 'archived') return 'archived';
  if (paidAmount >= bill.amount && bill.amount > 0) return 'paid';
  if (paidAmount > 0) {
    const delta = daysUntil(bill.dueDate, today);
    return delta < 0 ? 'overdue' : 'partially_paid';
  }
  const delta = daysUntil(bill.dueDate, today);
  if (delta < 0) return 'overdue';
  if (delta === 0) return 'due_today';
  return 'upcoming';
}

export function billStatusMeta(status: BillStatus): StatusMeta {
  switch (status) {
    case 'paid':
      return { label: 'Paid', color: Colors.success, tint: Colors.successTint };
    case 'overdue':
      return { label: 'Overdue', color: Colors.danger, tint: Colors.dangerTint };
    case 'due_today':
      return { label: 'Due today', color: Colors.warning, tint: Colors.warningTint };
    case 'partially_paid':
      return { label: 'Partially paid', color: Colors.warning, tint: Colors.warningTint };
    case 'archived':
      return { label: 'Archived', color: Colors.textSecondary, tint: Colors.surfaceSunken };
    default:
      return { label: 'Upcoming', color: Colors.primary, tint: Colors.primaryTint };
  }
}

/** The longer sentence shown under a bill title, e.g. "Overdue by 3 days". */
export function billStatusDetail(
  status: BillStatus,
  dueDate: ISODate,
  today: Date = new Date(),
): string {
  const delta = daysUntil(dueDate, today);
  switch (status) {
    case 'paid':
      return 'Fully paid';
    case 'overdue':
      return `Overdue by ${-delta} day${delta === -1 ? '' : 's'}`;
    case 'due_today':
      return 'Due today';
    case 'partially_paid':
      return delta === 0 ? 'Partially paid, due today' : `Partially paid, due in ${delta} days`;
    case 'archived':
      return 'Archived';
    default:
      return delta === 1 ? 'Due tomorrow' : `Due in ${delta} days`;
  }
}

export function activityStatusMeta(status: ActivityStatus): StatusMeta {
  switch (status) {
    case 'completed':
      return { label: 'Completed', color: Colors.success, tint: Colors.successTint };
    case 'cancelled':
      return { label: 'Cancelled', color: Colors.danger, tint: Colors.dangerTint };
    case 'archived':
      return { label: 'Archived', color: Colors.textSecondary, tint: Colors.surfaceSunken };
    default:
      return { label: 'Scheduled', color: Colors.primary, tint: Colors.primaryTint };
  }
}
