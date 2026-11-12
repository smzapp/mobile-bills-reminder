import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RingtoneSheet } from '@/components/items/ringtone-sheet';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Divider, InfoRow, SectionHeader } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { reminderLabel } from '@/constants/reminders';
import { Colors, Spacing } from '@/constants/theme';
import { toneName } from '@/constants/tones';
import {
  archiveBill,
  getBill,
  listPayments,
  recordPayment,
  restoreBill,
} from '@/database/repositories/bills';
import { listRemindersFor } from '@/database/repositories/reminders';
import { PaymentSheet } from '@/features/bills/payment-sheet';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDataVersion } from '@/providers/data-version';
import { useSettings } from '@/providers/settings-provider';
import { syncBillReminders } from '@/services/notifications/scheduler';
import { formatLongDate, formatShortDate, formatTime12 } from '@/utils/date';
import { percentOf } from '@/utils/money';
import { recurrenceLabel } from '@/utils/recurrence';
import { billStatusDetail } from '@/utils/status';

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { money } = useSettings();
  const { showToast } = useToast();
  const { invalidate } = useDataVersion();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [ringtoneOpen, setRingtoneOpen] = useState(false);

  const { data, loading, error, reload } = useDbQuery(
    async (database) => {
      const bill = await getBill(database, id);
      if (!bill) return null;
      const [payments, reminders] = await Promise.all([
        listPayments(database, id),
        listRemindersFor(database, 'bill', id),
      ]);
      return { bill, payments, reminders };
    },
    [id],
  );

  const bill = data?.bill ?? null;
  const payments = data?.payments ?? [];
  const reminders = data?.reminders ?? [];

  const refresh = () => {
    reload();
    invalidate();
  };

  const onArchive = async () => {
    if (!bill) return;
    await archiveBill(db, bill.id);
    await syncBillReminders(db, bill.id);
    invalidate();
    showToast(`Archived "${bill.title}"`, {
      onUndo: async () => {
        await restoreBill(db, bill.id);
        await syncBillReminders(db, bill.id);
        invalidate();
      },
    });
    if (router.canGoBack()) router.back();
    else router.replace('/bills');
  };

  if (!loading && !bill) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Bill" />
        <Screen>
          <EmptyState icon="receipt" title="This bill no longer exists" />
        </Screen>
      </View>
    );
  }

  const reminderText =
    reminders.length === 0
      ? 'No reminder'
      : reminders.map((item) => reminderLabel(item.minutesBefore)).join(', ');
  const toneId = bill?.ringtone ?? bill?.category.ringtone ?? null;
  const toneText = bill?.ringtone
    ? `${toneName(bill.ringtone)} (custom)`
    : `${toneName(toneId)} (category)`;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Bill"
        right={
          bill ? (
            <>
              <IconButton
                icon="pencil"
                accessibilityLabel="Edit bill"
                onPress={() => router.push(`/bills/edit/${bill.id}`)}
              />
              <IconButton
                icon="archive"
                accessibilityLabel="Archive bill"
                onPress={onArchive}
              />
            </>
          ) : null
        }
      />
      <Screen loading={loading} error={error}>
        {bill ? (
          <>
            <Card>
              <View style={styles.badgeRow}>
                <Badge
                  label={bill.category.name}
                  color={bill.category.ink}
                  tint={bill.category.tint}
                />
                <StatusBadge status={bill.displayStatus} />
              </View>
              <AppText variant="heading" style={styles.title}>
                {bill.title}
              </AppText>
              <AppText variant="display" style={styles.amount}>
                {money(bill.balance > 0 ? bill.balance : bill.amount)}
              </AppText>
              <AppText variant="body" color={Colors.textSecondary}>
                {billStatusDetail(bill.displayStatus, bill.dueDate)}
                {bill.provider ? ` · ${bill.provider}` : ''}
              </AppText>

              {bill.paidAmount > 0 && bill.balance > 0 ? (
                <View style={styles.progress}>
                  <ProgressBar percent={percentOf(bill.paidAmount, bill.amount)} />
                  <AppText variant="caption" color={Colors.textSecondary}>
                    {money(bill.paidAmount)} paid of {money(bill.amount)}
                  </AppText>
                </View>
              ) : null}

              {bill.balance > 0 ? (
                <View style={styles.actions}>
                  <Button
                    label={bill.paidAmount > 0 ? 'Record another payment' : 'Record a payment'}
                    icon="banknote"
                    onPress={() => setPaymentOpen(true)}
                    fullWidth
                  />
                </View>
              ) : (
                <View style={styles.actions}>
                  <View style={styles.paidNote}>
                    <AppText variant="bodyStrong" color={Colors.success}>
                      Fully paid
                    </AppText>
                    <AppText variant="caption" color={Colors.textSecondary}>
                      {bill.lastPaymentDate
                        ? `Settled on ${formatLongDate(bill.lastPaymentDate)}`
                        : ''}
                    </AppText>
                  </View>
                </View>
              )}
            </Card>

            <Card>
              <InfoRow icon="calendar" label="Due date" value={formatLongDate(bill.dueDate)} />
              <Divider />
              <InfoRow
                icon="clock"
                label="Due time"
                value={bill.dueTime ? formatTime12(bill.dueTime) : '9:00 AM'}
              />
              <Divider />
              <InfoRow icon="repeat" label="Repeats" value={recurrenceLabel(bill.recurrence)} />
              <Divider />
              <InfoRow icon="bell" label="Remind me" value={reminderText} />
              <Divider />
              <InfoRow
                icon="music"
                label="Ringtone"
                value={toneText}
                onPress={() => setRingtoneOpen(true)}
              />
              {bill.referenceNumber ? (
                <>
                  <Divider />
                  <InfoRow icon="info" label="Reference" value={bill.referenceNumber} />
                </>
              ) : null}
            </Card>

            {bill.notes ? (
              <Card>
                <AppText variant="eyebrow" color={Colors.textSecondary}>
                  Notes
                </AppText>
                <AppText variant="body" style={styles.notes}>
                  {bill.notes}
                </AppText>
              </Card>
            ) : null}

            <SectionHeader
              title="Payment history"
              actionLabel={payments.length > 3 ? 'See all' : undefined}
              onAction={() => router.push(`/bills/payments/${bill.id}`)}
            />
            {payments.length === 0 ? (
              <EmptyState
                icon="banknote"
                title="No payments yet"
                body="Recorded payments appear here and feed the spending totals."
              />
            ) : (
              <Card>
                {payments.slice(0, 3).map((payment, index) => (
                  <View key={payment.id}>
                    {index > 0 ? <Divider /> : null}
                    <View style={styles.paymentRow}>
                      <View>
                        <AppText variant="bodyStrong">{money(payment.amount)}</AppText>
                        <AppText variant="caption" color={Colors.textSecondary}>
                          {formatShortDate(payment.paymentDate)}
                          {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ''}
                        </AppText>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        ) : null}
      </Screen>

      {bill ? (
        <>
          <PaymentSheet
            visible={paymentOpen}
            balance={bill.balance}
            onClose={() => setPaymentOpen(false)}
            onSubmit={async (draft) => {
              const result = await recordPayment(db, { billId: bill.id, ...draft });
              await syncBillReminders(db, bill.id);
              if (result.nextBillId) await syncBillReminders(db, result.nextBillId);
              refresh();
              showToast(
                result.nextBillId
                  ? 'Paid. The next occurrence has been scheduled.'
                  : result.fullyPaid
                    ? `${bill.title} marked as paid`
                    : 'Partial payment recorded',
              );
            }}
          />
          <RingtoneSheet
            visible={ringtoneOpen}
            title="Ringtone for this bill"
            subtitle={bill.title}
            value={bill.ringtone}
            categoryToneId={bill.category.ringtone}
            onChange={async (ringtone) => {
              await db.runAsync(
                'UPDATE bills SET ringtone = ?, updated_at = ? WHERE id = ?',
                ringtone,
                new Date().toISOString(),
                bill.id,
              );
              await syncBillReminders(db, bill.id);
              refresh();
            }}
            onClose={() => setRingtoneOpen(false)}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  title: {
    marginTop: Spacing.md,
  },
  amount: {
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  progress: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  actions: {
    marginTop: Spacing.lg,
  },
  paidNote: {
    gap: 2,
  },
  notes: {
    marginTop: Spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
});
