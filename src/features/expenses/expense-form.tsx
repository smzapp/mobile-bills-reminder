import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/chips';
import { DatePickerSheet } from '@/components/ui/date-picker-sheet';
import { Field, TextField, ValueField } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_CATEGORY_ID } from '@/constants/categories';
import { Colors, Spacing } from '@/constants/theme';
import { listCategories } from '@/database/repositories/categories';
import { createExpense, getExpense, updateExpense } from '@/database/repositories/expenses';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDataVersion } from '@/providers/data-version';
import { useSettings } from '@/providers/settings-provider';
import type { Category, ISODate, PaymentMethod } from '@/types/domain';
import { formatLongDate, todayISO } from '@/utils/date';
import { minorToInput, parseAmountToMinor } from '@/utils/money';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bank_transfer', label: 'Bank' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

interface FormState {
  title: string;
  amount: string;
  categoryId: string;
  date: ISODate;
  method: PaymentMethod;
  notes: string;
}

interface ExpenseFormBodyProps {
  expenseId?: string;
  categories: Category[];
  initial: FormState;
}

function ExpenseFormBody({ expenseId, categories, initial }: ExpenseFormBodyProps) {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { invalidate } = useDataVersion();
  const { settings } = useSettings();
  const editing = Boolean(expenseId);

  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<{ title?: string; amount?: string }>({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const patch = (next: Partial<FormState>) => setForm((current) => ({ ...current, ...next }));

  const save = async () => {
    const nextErrors: { title?: string; amount?: string } = {};
    if (!form.title.trim()) nextErrors.title = 'Give the expense a title.';
    const parsed = parseAmountToMinor(form.amount);
    if (parsed === null || parsed <= 0) nextErrors.amount = 'Enter an amount greater than zero.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || parsed === null) return;

    setSaving(true);
    try {
      const input = {
        title: form.title,
        amount: parsed,
        currency: settings.currency,
        categoryId: form.categoryId,
        expenseDate: form.date,
        paymentMethod: form.method,
        notes: form.notes.trim() || null,
      };
      if (expenseId) await updateExpense(db, expenseId, input);
      else await createExpense(db, input);
      invalidate();
      showToast(expenseId ? 'Expense updated' : 'Expense saved');
      if (router.canGoBack()) router.back();
      else router.replace('/spending');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save the expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={editing ? 'Edit expense' : 'New expense'}
        backIcon={editing ? 'arrow-left' : 'x'}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen>
          <Card>
            <View style={styles.group}>
              <TextField
                label="What was it for"
                value={form.title}
                onChangeText={(title) => patch({ title })}
                placeholder="e.g. Groceries"
                error={errors.title}
                autoFocus={!editing}
              />
              <TextField
                label="Amount"
                value={form.amount}
                onChangeText={(next) => patch({ amount: next.replace(/[^0-9.]/g, '') })}
                placeholder="0.00"
                keyboardType="decimal-pad"
                prefix={settings.currencySymbol}
                error={errors.amount}
              />
              <ValueField
                label="Date"
                icon="calendar"
                value={formatLongDate(form.date)}
                onPress={() => setDatePickerOpen(true)}
              />
              <Field label="Category">
                <ChoiceChips
                  options={categories.map((item) => ({
                    value: item.id,
                    label: item.name,
                    dotColor: item.color,
                    tint: item.tint,
                    ink: item.ink,
                  }))}
                  value={form.categoryId}
                  onChange={(categoryId) => patch({ categoryId })}
                />
              </Field>
              <Field label="Paid with">
                <ChoiceChips
                  options={METHODS}
                  value={form.method}
                  onChange={(method) => patch({ method })}
                />
              </Field>
              <TextField
                label="Notes"
                value={form.notes}
                onChangeText={(notes) => patch({ notes })}
                placeholder="Optional"
                multiline
              />
            </View>
          </Card>

          <Button
            label={editing ? 'Save changes' : 'Save expense'}
            onPress={save}
            loading={saving}
            size="lg"
            fullWidth
          />
        </Screen>
      </KeyboardAvoidingView>

      <DatePickerSheet
        visible={datePickerOpen}
        title="Expense date"
        value={form.date}
        onChange={(date) => patch({ date })}
        onClose={() => setDatePickerOpen(false)}
      />
    </View>
  );
}

export function ExpenseForm({ expenseId }: { expenseId?: string }) {
  const { data, loading, error } = useDbQuery(
    async (database) => {
      const categories = await listCategories(database);
      const expense = expenseId ? await getExpense(database, expenseId) : null;
      return { categories, expense };
    },
    [expenseId],
  );

  if (!data) {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title={expenseId ? 'Edit expense' : 'New expense'}
          backIcon={expenseId ? 'arrow-left' : 'x'}
        />
        <Screen loading={loading} error={error}>
          {null}
        </Screen>
      </View>
    );
  }

  const expense = data.expense;
  const initial: FormState = expense
    ? {
        title: expense.title,
        amount: minorToInput(expense.amount),
        categoryId: expense.categoryId,
        date: expense.expenseDate,
        method: expense.paymentMethod ?? 'cash',
        notes: expense.notes ?? '',
      }
    : {
        title: '',
        amount: '',
        categoryId: data.categories[0]?.id ?? DEFAULT_CATEGORY_ID,
        date: todayISO(),
        method: 'cash',
        notes: '',
      };

  return <ExpenseFormBody expenseId={expenseId} categories={data.categories} initial={initial} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  group: {
    gap: Spacing.lg,
  },
});
