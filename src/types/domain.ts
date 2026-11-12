/** Core domain types for Nudge. Money is always stored in integer minor units. */

/** Integer minor units (centavos for PHP). Never a float. */
export type Minor = number;

export type ISODate = string; // 'YYYY-MM-DD'
export type ISOTime = string; // 'HH:mm'
export type ISODateTime = string; // 'YYYY-MM-DDTHH:mm:ss.sssZ'

export type EntityType = 'bill' | 'activity' | 'expense';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  type: RecurrenceType;
  /** Every N units of `type`. Monthly/2 = bi-monthly, monthly/3 = quarterly, monthly/6 = semi-annual. */
  interval: number;
}

export type BillStatus =
  | 'upcoming'
  | 'due_today'
  | 'overdue'
  | 'partially_paid'
  | 'paid'
  | 'archived';

export type ActivityStatus = 'scheduled' | 'completed' | 'cancelled' | 'archived';

export type ActivityKind =
  | 'meeting'
  | 'appointment'
  | 'event'
  | 'task'
  | 'class'
  | 'service';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'gcash'
  | 'maya'
  | 'card'
  | 'cheque'
  | 'other';

export interface Category {
  id: string;
  name: string;
  /** Primary colour used for dots, chips and calendar markers. */
  color: string;
  /** Pale background used behind the category chip. */
  tint: string;
  /** Readable foreground on top of `tint`. */
  ink: string;
  /** Lucide icon name, resolved through `src/components/ui/icon.tsx`. */
  icon: string;
  /** Tone id from the bundled tone registry. */
  ringtone: string;
  vibrationEnabled: boolean;
  notificationEnabled: boolean;
  isSystem: boolean;
  sortOrder: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Bill {
  id: string;
  title: string;
  description: string | null;
  provider: string | null;
  referenceNumber: string | null;
  /** Total obligation in minor units. */
  amount: Minor;
  currency: string;
  categoryId: string;
  dueDate: ISODate;
  dueTime: ISOTime | null;
  recurrence: Recurrence;
  /** Stored status; derived display status also considers the due date. */
  status: Exclude<BillStatus, 'due_today' | 'overdue'>;
  /** Overrides the category ringtone when set. */
  ringtone: string | null;
  notes: string | null;
  /** Set when this bill was generated from a recurring parent. */
  parentBillId: string | null;
  archivedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface BillPayment {
  id: string;
  billId: string;
  amount: Minor;
  paymentDate: ISODate;
  paymentMethod: PaymentMethod | null;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: ISODateTime;
}

/** A bill plus its computed payment state. */
export interface BillWithState extends Bill {
  category: Category;
  paidAmount: Minor;
  balance: Minor;
  /** Status including date-derived values (due_today / overdue). */
  displayStatus: BillStatus;
  lastPaymentDate: ISODate | null;
  paymentCount: number;
}

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  kind: ActivityKind;
  categoryId: string;
  startDate: ISODate;
  startTime: ISOTime | null;
  endTime: ISOTime | null;
  location: string | null;
  meetingLink: string | null;
  recurrence: Recurrence;
  status: ActivityStatus;
  ringtone: string | null;
  notes: string | null;
  archivedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ActivityWithCategory extends Activity {
  category: Category;
}

export interface Reminder {
  id: string;
  entityType: Exclude<EntityType, 'expense'>;
  entityId: string;
  /** Minutes before the due/start moment. 0 = at the exact time. */
  minutesBefore: number;
  /** Absolute moment the OS should fire, recomputed on every reschedule. */
  fireAt: ISODateTime | null;
  notificationId: string | null;
  channelId: string | null;
  isEnabled: boolean;
  createdAt: ISODateTime;
}

export interface Expense {
  id: string;
  title: string;
  description: string | null;
  amount: Minor;
  currency: string;
  categoryId: string;
  expenseDate: ISODate;
  paymentMethod: PaymentMethod | null;
  relatedBillId: string | null;
  notes: string | null;
  archivedAt: ISODateTime | null;
  createdAt: ISODateTime;
}

export interface ExpenseWithCategory extends Expense {
  category: Category;
}

export interface Budget {
  id: string;
  name: string;
  amount: Minor;
  /** null = overall budget. */
  categoryId: string | null;
  period: 'monthly' | 'yearly';
  startDate: ISODate;
  endDate: ISODate | null;
  createdAt: ISODateTime;
}

export interface NotificationChannelRecord {
  id: string;
  categoryId: string | null;
  toneId: string | null;
  channelId: string;
  soundFile: string | null;
  version: number;
  createdAt: ISODateTime;
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  monthlyBudget: Minor;
  appLockEnabled: boolean;
  pinHash: string | null;
  vibrateWithRingtone: boolean;
  ringInSilentMode: boolean;
  notificationsEnabled: boolean;
  snoozeMinutes: number;
  defaultBillReminderMinutes: number;
  defaultActivityReminderMinutes: number;
}
