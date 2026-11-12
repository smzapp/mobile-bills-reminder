import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityRow, BillRow, ExpenseRow } from '@/components/items/item-row';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Divider } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { FilterPills } from '@/components/ui/segmented';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Spacing } from '@/constants/theme';
import {
  deleteActivity,
  listActivities,
  restoreActivity,
} from '@/database/repositories/activities';
import { deleteBill, listBills, restoreBill } from '@/database/repositories/bills';
import { deleteExpense, listExpenses, restoreExpense } from '@/database/repositories/expenses';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDataVersion } from '@/providers/data-version';
import { syncActivityReminders, syncBillReminders } from '@/services/notifications/scheduler';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'bill', label: 'Bills' },
  { key: 'activity', label: 'Activities' },
  { key: 'expense', label: 'Expenses' },
];

export default function ArchiveScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { invalidate } = useDataVersion();
  const confirm = useConfirm();
  const [filter, setFilter] = useState('all');

  const { data, loading, error, reload } = useDbQuery(async (database) => {
    const [bills, activities, expenses] = await Promise.all([
      listBills(database, { includeArchived: true, filter: 'all' }),
      listActivities(database, { includeArchived: true }),
      listExpenses(database, { includeArchived: true }),
    ]);
    return { bills, activities, expenses };
  });

  const bills = data?.bills ?? [];
  const activities = data?.activities ?? [];
  const expenses = data?.expenses ?? [];

  const showBills = filter === 'all' || filter === 'bill';
  const showActivities = filter === 'all' || filter === 'activity';
  const showExpenses = filter === 'all' || filter === 'expense';

  const visibleCount =
    (showBills ? bills.length : 0) +
    (showActivities ? activities.length : 0) +
    (showExpenses ? expenses.length : 0);

  const refresh = () => {
    reload();
    invalidate();
  };

  const confirmDelete = async (title: string, extra: string) => {
    return confirm({
      title: `Permanently delete "${title}"?`,
      message: extra,
      confirmLabel: 'Delete forever',
      destructive: true,
    });
  };

  const actions = (onRestore: () => void, onDelete: () => void) => (
    <View style={styles.actions}>
      <IconButton
        icon="restore"
        accessibilityLabel="Restore"
        size={34}
        color={Colors.primary}
        background={Colors.primaryTint}
        onPress={onRestore}
      />
      <IconButton
        icon="trash"
        accessibilityLabel="Delete permanently"
        size={34}
        color={Colors.danger}
        background={Colors.dangerTint}
        onPress={onDelete}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title="Archive" />
      <Screen loading={loading} error={error}>
        <AppText variant="body" color={Colors.textSecondary}>
          Archived items stop sending reminders but keep their history. Restoring brings them back
          exactly as they were.
        </AppText>

        <FilterPills pills={FILTERS} value={filter} onChange={setFilter} />

        {visibleCount === 0 ? (
          <EmptyState
            icon="archive"
            title="Nothing archived"
            body="Archive a bill or activity and it will wait here until you need it."
          />
        ) : (
          <Card padded={false} style={styles.listCard}>
            {showBills &&
              bills.map((bill, index) => (
                <View key={bill.id}>
                  {index > 0 ? <Divider /> : null}
                  <BillRow
                    bill={bill}
                    onPress={() => router.push(`/bills/${bill.id}`)}
                    trailing={actions(
                      async () => {
                        await restoreBill(db, bill.id);
                        await syncBillReminders(db, bill.id);
                        refresh();
                        showToast(`Restored "${bill.title}"`);
                      },
                      async () => {
                        const ok = await confirmDelete(
                          bill.title,
                          `This removes the bill and its ${bill.paymentCount} payment record${bill.paymentCount === 1 ? '' : 's'}. This cannot be undone.`,
                        );
                        if (!ok) return;
                        await deleteBill(db, bill.id);
                        refresh();
                        showToast('Deleted permanently');
                      },
                    )}
                  />
                </View>
              ))}

            {showActivities &&
              activities.map((activity, index) => (
                <View key={activity.id}>
                  {index > 0 || (showBills && bills.length > 0) ? <Divider /> : null}
                  <ActivityRow
                    activity={activity}
                    onPress={() => router.push(`/activities/${activity.id}`)}
                    trailing={actions(
                      async () => {
                        await restoreActivity(db, activity.id);
                        await syncActivityReminders(db, activity.id);
                        refresh();
                        showToast(`Restored "${activity.title}"`);
                      },
                      async () => {
                        const ok = await confirmDelete(
                          activity.title,
                          'This removes the activity and its reminders. This cannot be undone.',
                        );
                        if (!ok) return;
                        await deleteActivity(db, activity.id);
                        refresh();
                        showToast('Deleted permanently');
                      },
                    )}
                  />
                </View>
              ))}

            {showExpenses &&
              expenses.map((expense, index) => (
                <View key={expense.id}>
                  {index > 0 ||
                  (showBills && bills.length > 0) ||
                  (showActivities && activities.length > 0) ? (
                    <Divider />
                  ) : null}
                  <ExpenseRow
                    expense={expense}
                    trailing={actions(
                      async () => {
                        await restoreExpense(db, expense.id);
                        refresh();
                        showToast(`Restored "${expense.title}"`);
                      },
                      async () => {
                        const ok = await confirmDelete(
                          expense.title,
                          'This removes the expense from your spending history. This cannot be undone.',
                        );
                        if (!ok) return;
                        await deleteExpense(db, expense.id);
                        refresh();
                        showToast('Deleted permanently');
                      },
                    )}
                  />
                </View>
              ))}
          </Card>
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
  listCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
});
