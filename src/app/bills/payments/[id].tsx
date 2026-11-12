import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Divider } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Spacing } from '@/constants/theme';
import { deletePayment, getBill, listPayments } from '@/database/repositories/bills';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDataVersion } from '@/providers/data-version';
import { useSettings } from '@/providers/settings-provider';
import { syncBillReminders } from '@/services/notifications/scheduler';
import { formatLongDate } from '@/utils/date';
import { sumMinor } from '@/utils/money';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  cheque: 'Cheque',
  other: 'Other',
};

export default function PaymentHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { money } = useSettings();
  const { showToast } = useToast();
  const { invalidate } = useDataVersion();
  const confirm = useConfirm();

  const { data, loading, error, reload } = useDbQuery(
    async (database) => {
      const [bill, payments] = await Promise.all([
        getBill(database, id),
        listPayments(database, id),
      ]);
      return { bill, payments };
    },
    [id],
  );

  const bill = data?.bill ?? null;
  const payments = data?.payments ?? [];
  const total = sumMinor(payments.map((payment) => payment.amount));

  const onDelete = async (paymentId: string, amount: number) => {
    const ok = await confirm({
      title: 'Delete this payment?',
      message: `${money(amount)} will be removed from the payment history and from your spending totals. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await deletePayment(db, paymentId);
    await syncBillReminders(db, id);
    reload();
    invalidate();
    showToast('Payment deleted');
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Payment history" subtitle={bill?.title} />
      <Screen loading={loading} error={error}>
        {payments.length === 0 ? (
          <EmptyState
            icon="banknote"
            title="No payments recorded"
            body="Payments you record against this bill will be listed here."
          />
        ) : (
          <>
            <Card>
              <AppText variant="eyebrow" color={Colors.textSecondary}>
                Total paid
              </AppText>
              <AppText variant="amount" style={styles.total}>
                {money(total)}
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                {payments.length} payment{payments.length === 1 ? '' : 's'}
                {bill ? ` · ${money(bill.amount)} billed` : ''}
              </AppText>
            </Card>

            <Card>
              {payments.map((payment, index) => (
                <View key={payment.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.row}>
                    <View style={styles.rowText}>
                      <AppText variant="bodyStrong">{money(payment.amount)}</AppText>
                      <AppText variant="caption" color={Colors.textSecondary}>
                        {formatLongDate(payment.paymentDate)}
                        {payment.paymentMethod
                          ? ` · ${METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}`
                          : ''}
                      </AppText>
                      {payment.referenceNumber ? (
                        <AppText variant="caption" color={Colors.textTertiary}>
                          Ref {payment.referenceNumber}
                        </AppText>
                      ) : null}
                    </View>
                    <IconButton
                      icon="trash"
                      accessibilityLabel="Delete payment"
                      size={36}
                      color={Colors.danger}
                      background={Colors.dangerTint}
                      onPress={() => onDelete(payment.id, payment.amount)}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  total: {
    marginTop: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
