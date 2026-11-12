import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillRow } from '@/components/items/item-row';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Divider } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { FilterPills, SegmentedControl } from '@/components/ui/segmented';
import { AppText } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { type BillFilter, listBills } from '@/database/repositories/bills';
import { listCategories } from '@/database/repositories/categories';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/providers/settings-provider';
import { sumMinor } from '@/utils/money';

const FILTERS = [
  { value: 'unpaid' as const, label: 'Unpaid' },
  { value: 'paid' as const, label: 'Paid' },
  { value: 'all' as const, label: 'All' },
];

export default function BillsScreen() {
  const insets = useSafeAreaInsets();
  const { money } = useSettings();
  const [filter, setFilter] = useState<BillFilter>('unpaid');
  const [categoryId, setCategoryId] = useState<string>('all');

  const { data, loading, error } = useDbQuery(
    async (db) => {
      const [bills, categories] = await Promise.all([
        listBills(db, { filter, categoryId: categoryId === 'all' ? null : categoryId }),
        listCategories(db),
      ]);
      return { bills, categories };
    },
    [filter, categoryId],
  );

  const bills = data?.bills ?? [];
  const categories = data?.categories ?? [];
  const outstanding = sumMinor(bills.filter((bill) => bill.balance > 0).map((b) => b.balance));

  const pills = [
    { key: 'all', label: 'All' },
    ...categories.map((category) => ({
      key: category.id,
      label: category.name,
      dotColor: category.color,
    })),
  ];

  return (
    <View style={styles.root}>
      <Screen withTabBar loading={loading} error={error} contentStyle={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <AppText variant="title">Bills</AppText>
          <AppText variant="body" color={Colors.textSecondary}>
            {bills.length} {filter === 'paid' ? 'paid' : 'shown'}
            {outstanding > 0 ? ` · ${money(outstanding)} outstanding` : ''}
          </AppText>
        </View>

        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
        <FilterPills pills={pills} value={categoryId} onChange={setCategoryId} />

        {bills.length === 0 ? (
          <EmptyState
            icon="receipt"
            title={filter === 'paid' ? 'No paid bills yet' : 'No bills here'}
            body={
              filter === 'paid'
                ? 'Bills you settle will be listed here with their payment history.'
                : 'Add a bill to track its due date, payments and reminders.'
            }
            actionLabel="Add a bill"
            onAction={() => router.push('/bills/create')}
          />
        ) : (
          <Card padded={false} style={styles.listCard}>
            {bills.map((bill, index) => (
              <View key={bill.id}>
                {index > 0 ? <Divider /> : null}
                <BillRow bill={bill} onPress={() => router.push(`/bills/${bill.id}`)} />
              </View>
            ))}
          </Card>
        )}
      </Screen>
      <Fab onPress={() => router.push('/bills/create')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: Spacing.md,
    gap: 2,
    marginBottom: Spacing.xs,
  },
  listCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
});
