/** Raw SQLite row shapes. SQLite has no boolean, so flags come back as 0/1. */

export interface CategoryRow {
  id: string;
  name: string;
  color: string;
  tint: string;
  ink: string;
  icon: string;
  ringtone: string;
  vibration_enabled: number;
  notification_enabled: number;
  is_system: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BillRow {
  id: string;
  title: string;
  description: string | null;
  provider: string | null;
  reference_number: string | null;
  amount: number;
  currency: string;
  category_id: string;
  due_date: string;
  due_time: string | null;
  recurrence: string;
  status: string;
  ringtone: string | null;
  notes: string | null;
  parent_bill_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillWithStateRow extends BillRow {
  paid_amount: number | null;
  payment_count: number | null;
  last_payment_date: string | null;
}

export interface BillPaymentRow {
  id: string;
  bill_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface ActivityRow {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  category_id: string;
  start_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  meeting_link: string | null;
  recurrence: string;
  status: string;
  ringtone: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderRow {
  id: string;
  entity_type: string;
  entity_id: string;
  minutes_before: number;
  fire_at: string | null;
  notification_id: string | null;
  channel_id: string | null;
  is_enabled: number;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  category_id: string;
  expense_date: string;
  payment_method: string | null;
  related_bill_id: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface BudgetRow {
  id: string;
  name: string;
  amount: number;
  category_id: string | null;
  period: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface NotificationChannelRow {
  id: string;
  category_id: string | null;
  tone_id: string | null;
  channel_id: string;
  sound_file: string | null;
  version: number;
  created_at: string;
}

export interface SettingRow {
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

export const toBool = (value: number | null | undefined): boolean => value === 1;
export const fromBool = (value: boolean): number => (value ? 1 : 0);
