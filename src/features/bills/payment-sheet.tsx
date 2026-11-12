import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/chips';
import { DatePickerSheet } from '@/components/ui/date-picker-sheet';
import { Field, TextField, ValueField } from '@/components/ui/field';
import { BottomSheet } from '@/components/ui/sheet';
import { AppText } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { useSettings } from '@/providers/settings-provider';
import type { ISODate, Minor, PaymentMethod } from '@/types/domain';
import { formatLongDate, todayISO } from '@/utils/date';
import { minorToInput, parseAmountToMinor } from '@/utils/money';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bank_transfer', label: 'Bank' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export interface PaymentDraft {
  amount: Minor;
  paymentDate: ISODate;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
}

export interface PaymentSheetProps {
  visible: boolean;
  /** Outstanding balance, prefilled as the payment amount. */
  balance: Minor;
  onClose: () => void;
  onSubmit: (draft: PaymentDraft) => Promise<void>;
}

function PaymentSheetBody({
  balance,
  onClose,
  onSubmit,
}: Pick<PaymentSheetProps, 'balance' | 'onClose' | 'onSubmit'>) {
  const { settings, money } = useSettings();
  const [amount, setAmount] = useState(() => minorToInput(balance));
  const [date, setDate] = useState<ISODate>(() => todayISO());
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsed = parseAmountToMinor(amount);
  const partial = parsed !== null && parsed > 0 && parsed < balance;

  const submit = async () => {
    if (parsed === null || parsed <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (parsed > balance) {
      setError(`That is more than the ${money(balance)} outstanding.`);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        amount: parsed,
        paymentDate: date,
        paymentMethod: method,
        referenceNumber: reference.trim() || null,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not record the payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.group}>
      <TextField
        label="Amount paid"
        value={amount}
        onChangeText={(next) => {
          setAmount(next.replace(/[^0-9.]/g, ''));
          setError(null);
        }}
        keyboardType="decimal-pad"
        prefix={settings.currencySymbol}
        error={error}
        hint={partial ? `Leaves ${money(balance - (parsed ?? 0))} remaining.` : undefined}
      />
      <ValueField
        label="Payment date"
        icon="calendar"
        value={formatLongDate(date)}
        onPress={() => setDatePickerOpen(true)}
      />
      <Field label="Paid with">
        <ChoiceChips options={METHODS} value={method} onChange={setMethod} />
      </Field>
      <TextField
        label="Reference number"
        value={reference}
        onChangeText={setReference}
        placeholder="Optional receipt or transaction id"
      />
      <AppText variant="caption" color={Colors.textSecondary}>
        Payments are kept forever. Archiving a bill never removes them.
      </AppText>
      <Button
        label={partial ? 'Record partial payment' : 'Mark as fully paid'}
        onPress={submit}
        loading={saving}
        fullWidth
      />

      <DatePickerSheet
        visible={datePickerOpen}
        title="Payment date"
        value={date}
        onChange={setDate}
        onClose={() => setDatePickerOpen(false)}
      />
    </View>
  );
}

/** Records a full or partial payment against a bill. */
export function PaymentSheet({ visible, balance, onClose, onSubmit }: PaymentSheetProps) {
  const { money } = useSettings();
  return (
    <BottomSheet
      visible={visible}
      title="Record a payment"
      subtitle={`${money(balance)} outstanding`}
      onClose={onClose}
      maxBodyHeight={460}>
      {/* Mounted only while open so the amount always starts at the balance. */}
      {visible ? (
        <PaymentSheetBody balance={balance} onClose={onClose} onSubmit={onSubmit} />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
});
