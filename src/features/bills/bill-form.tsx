import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { RingtoneSheet } from '@/components/items/ringtone-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips, MultiChoiceChips } from '@/components/ui/chips';
import { DatePickerSheet } from '@/components/ui/date-picker-sheet';
import { Field, TextField, ValueField } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AppText } from '@/components/ui/text';
import { TimePickerSheet } from '@/components/ui/time-picker-sheet';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_CATEGORY_ID } from '@/constants/categories';
import { REMINDER_OPTIONS } from '@/constants/reminders';
import { Colors, Spacing } from '@/constants/theme';
import { toneName } from '@/constants/tones';
import { createBill, getBill, updateBill } from '@/database/repositories/bills';
import { listCategories } from '@/database/repositories/categories';
import { listRemindersFor, replaceReminders } from '@/database/repositories/reminders';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDataVersion } from '@/providers/data-version';
import { useSettings } from '@/providers/settings-provider';
import { syncBillReminders } from '@/services/notifications/scheduler';
import type { Category, ISODate, ISOTime, Recurrence } from '@/types/domain';
import { formatLongDate, formatTime12, todayISO } from '@/utils/date';
import { minorToInput, parseAmountToMinor } from '@/utils/money';
import { NO_RECURRENCE, RECURRENCE_PRESETS, recurrenceKey } from '@/utils/recurrence';

interface FormState {
  title: string;
  amount: string;
  categoryId: string;
  dueDate: ISODate;
  dueTime: ISOTime | null;
  recurrence: Recurrence;
  reminders: number[];
  ringtone: string | null;
  provider: string;
  referenceNumber: string;
  notes: string;
}

type SheetKind = 'date' | 'time' | 'ringtone' | null;

interface BillFormBodyProps {
  billId?: string;
  categories: Category[];
  initial: FormState;
}

function BillFormBody({ billId, categories, initial }: BillFormBodyProps) {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { invalidate } = useDataVersion();
  const { settings } = useSettings();
  const editing = Boolean(billId);

  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<{ title?: string; amount?: string }>({});
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [saving, setSaving] = useState(false);

  const category = categories.find((item) => item.id === form.categoryId) ?? categories[0];

  const patch = (next: Partial<FormState>) => setForm((current) => ({ ...current, ...next }));

  const toggleReminder = (minutes: number) =>
    setForm((current) => ({
      ...current,
      reminders: current.reminders.includes(minutes)
        ? current.reminders.filter((item) => item !== minutes)
        : [...current.reminders, minutes],
    }));

  const save = async () => {
    const nextErrors: { title?: string; amount?: string } = {};
    if (!form.title.trim()) nextErrors.title = 'Give the bill a title.';
    const amount = parseAmountToMinor(form.amount);
    if (amount === null || amount <= 0) nextErrors.amount = 'Enter an amount greater than zero.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || amount === null) return;

    setSaving(true);
    try {
      const input = {
        title: form.title,
        amount,
        currency: settings.currency,
        categoryId: form.categoryId,
        dueDate: form.dueDate,
        dueTime: form.dueTime,
        recurrence: form.recurrence,
        ringtone: form.ringtone,
        provider: form.provider.trim() || null,
        referenceNumber: form.referenceNumber.trim() || null,
        notes: form.notes.trim() || null,
      };

      const id = billId ?? (await createBill(db, input));
      if (billId) await updateBill(db, billId, input);

      await replaceReminders(db, 'bill', id, form.reminders);
      await syncBillReminders(db, id);
      invalidate();
      showToast(billId ? 'Bill updated' : 'Bill saved');

      if (router.canGoBack()) router.back();
      else router.replace('/bills');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save the bill.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={editing ? 'Edit bill' : 'New bill'}
        backIcon={editing ? 'arrow-left' : 'x'}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen>
          <Card>
            <View style={styles.group}>
              <TextField
                label="Title"
                value={form.title}
                onChangeText={(title) => patch({ title })}
                placeholder="e.g. Meralco electricity"
                error={errors.title}
                autoFocus={!editing}
              />
              <TextField
                label="Amount"
                value={form.amount}
                onChangeText={(amount) => patch({ amount: amount.replace(/[^0-9.]/g, '') })}
                placeholder="0.00"
                keyboardType="decimal-pad"
                prefix={settings.currencySymbol}
                error={errors.amount}
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
            </View>
          </Card>

          <Card>
            <View style={styles.group}>
              <ValueField
                label="Due date"
                icon="calendar"
                value={formatLongDate(form.dueDate)}
                onPress={() => setSheet('date')}
              />
              <ValueField
                label="Remind at"
                icon="clock"
                value={form.dueTime ? formatTime12(form.dueTime) : '9:00 AM (default)'}
                onPress={() => setSheet('time')}
              />
              <Field label="Repeats">
                <ChoiceChips
                  options={RECURRENCE_PRESETS.map((preset) => ({
                    value: preset.key,
                    label: preset.shortLabel,
                  }))}
                  value={recurrenceKey(form.recurrence)}
                  onChange={(key) => {
                    const preset = RECURRENCE_PRESETS.find((item) => item.key === key);
                    if (preset) patch({ recurrence: preset.value });
                  }}
                />
              </Field>
            </View>
          </Card>

          <Card>
            <View style={styles.group}>
              <Field
                label="Remind me"
                hint={
                  form.reminders.length === 0
                    ? 'No reminder will be scheduled for this bill.'
                    : `${form.reminders.length} reminder${form.reminders.length === 1 ? '' : 's'} will be scheduled.`
                }>
                <MultiChoiceChips
                  options={REMINDER_OPTIONS.map((option) => ({
                    value: option.minutes,
                    label: option.shortLabel,
                  }))}
                  values={form.reminders}
                  onToggle={toggleReminder}
                />
              </Field>
              <ValueField
                label="Ringtone"
                icon="music"
                value={
                  form.ringtone
                    ? `${toneName(form.ringtone)} (custom)`
                    : `${toneName(category?.ringtone)} · ${category?.name ?? 'category'} default`
                }
                onPress={() => setSheet('ringtone')}
              />
            </View>
          </Card>

          <Card>
            <View style={styles.group}>
              <AppText variant="eyebrow" color={Colors.textSecondary}>
                Optional details
              </AppText>
              <TextField
                label="Provider or payee"
                value={form.provider}
                onChangeText={(provider) => patch({ provider })}
                placeholder="e.g. Converge ICT"
              />
              <TextField
                label="Reference number"
                value={form.referenceNumber}
                onChangeText={(referenceNumber) => patch({ referenceNumber })}
                placeholder="Account or billing reference"
              />
              <TextField
                label="Notes"
                value={form.notes}
                onChangeText={(notes) => patch({ notes })}
                placeholder="Anything worth remembering"
                multiline
              />
            </View>
          </Card>

          <Button
            label={editing ? 'Save changes' : 'Save bill'}
            onPress={save}
            loading={saving}
            size="lg"
            fullWidth
          />
        </Screen>
      </KeyboardAvoidingView>

      <DatePickerSheet
        visible={sheet === 'date'}
        title="Due date"
        value={form.dueDate}
        onChange={(dueDate) => patch({ dueDate })}
        onClose={() => setSheet(null)}
      />
      <TimePickerSheet
        visible={sheet === 'time'}
        title="Remind at"
        value={form.dueTime}
        onChange={(dueTime) => patch({ dueTime })}
        onClose={() => setSheet(null)}
      />
      <RingtoneSheet
        visible={sheet === 'ringtone'}
        title="Ringtone"
        subtitle={`Defaults to the ${category?.name ?? 'category'} tone.`}
        value={form.ringtone}
        categoryToneId={category?.ringtone ?? null}
        onChange={(ringtone) => patch({ ringtone })}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

export function BillForm({ billId }: { billId?: string }) {
  const { settings } = useSettings();

  const { data, loading, error } = useDbQuery(
    async (database) => {
      const categories = await listCategories(database);
      if (!billId) return { categories, bill: null, reminders: [] as number[] };
      const [bill, reminders] = await Promise.all([
        getBill(database, billId),
        listRemindersFor(database, 'bill', billId),
      ]);
      return { categories, bill, reminders: reminders.map((item) => item.minutesBefore) };
    },
    [billId],
  );

  // The body mounts only once its initial values are known, so the form state
  // can be seeded directly instead of being patched in from an effect.
  if (!data) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={billId ? 'Edit bill' : 'New bill'} backIcon={billId ? 'arrow-left' : 'x'} />
        <Screen loading={loading} error={error}>
          {null}
        </Screen>
      </View>
    );
  }

  const bill = data.bill;
  const initial: FormState = bill
    ? {
        title: bill.title,
        amount: minorToInput(bill.amount),
        categoryId: bill.categoryId,
        dueDate: bill.dueDate,
        dueTime: bill.dueTime,
        recurrence: bill.recurrence,
        reminders:
          data.reminders.length > 0 ? data.reminders : [settings.defaultBillReminderMinutes],
        ringtone: bill.ringtone,
        provider: bill.provider ?? '',
        referenceNumber: bill.referenceNumber ?? '',
        notes: bill.notes ?? '',
      }
    : {
        title: '',
        amount: '',
        categoryId: data.categories[0]?.id ?? DEFAULT_CATEGORY_ID,
        dueDate: todayISO(),
        dueTime: null,
        recurrence: NO_RECURRENCE,
        reminders: [settings.defaultBillReminderMinutes],
        ringtone: null,
        provider: '',
        referenceNumber: '',
        notes: '',
      };

  return <BillFormBody billId={billId} categories={data.categories} initial={initial} />;
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
