import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart, Breakdown } from '@/components/charts/bar-chart';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Divider, SectionHeader } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { listBills } from '@/database/repositories/bills';
import { listCategories } from '@/database/repositories/categories';
import {
  listTransactions,
  monthlySpendSeries,
  monthSpendByCategory,
  monthSpendTotal,
} from '@/database/repositories/expenses';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/providers/settings-provider';
import { currentMonthKey, MONTHS_SHORT, formatShortDate, monthRange } from '@/utils/date';
import { percentOf, sumMinor } from '@/utils/money';

export default function SpendingScreen() {
  const insets = useSafeAreaInsets();
  const { settings, money, moneyCompact } = useSettings();
  const now = new Date();
  const month = currentMonthKey(now);

  const { data, loading, error } = useDbQuery(async (db) => {
    const range = monthRange(now.getFullYear(), now.getMonth());
    const [spent, series, byCategory, categories, transactions, unpaid] = await Promise.all([
      monthSpendTotal(db, month),
      monthlySpendSeries(db, 6, now),
      monthSpendByCategory(db, month),
      listCategories(db),
      listTransactions(db, { from: range.start, to: range.end, limit: 8 }),
      listBills(db, { filter: 'unpaid' }),
    ]);
    return { spent, series, byCategory, categories, transactions, unpaid };
  });

  const spent = data?.spent ?? 0;
  const series = data?.series ?? [];
  const byCategory = data?.byCategory ?? [];
  const categories = data?.categories ?? [];
  const transactions = data?.transactions ?? [];
  const unpaid = data?.unpaid ?? [];

  const budget = settings.monthlyBudget;
  const overBudget = spent > budget;
  const stillDue = sumMinor(
    unpaid.filter((bill) => bill.dueDate.startsWith(month)).map((bill) => bill.balance),
  );

  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  const bars = series.map((item) => {
    const monthIndex = Number.parseInt(item.month.slice(5), 10) - 1;
    return {
      key: item.month,
      label: MONTHS_SHORT[monthIndex] ?? item.month,
      value: item.total,
      display: moneyCompact(item.total),
      highlighted: item.month === month,
    };
  });

  const breakdown = byCategory
    .map((item) => {
      const category = categoryMap.get(item.categoryId);
      return {
        key: item.categoryId,
        label: category?.name ?? 'Uncategorised',
        value: item.total,
        display: money(item.total),
        percent: spent > 0 ? (item.total / spent) * 100 : 0,
        color: category?.color ?? Colors.textSecondary,
      };
    })
    .filter((item) => item.value > 0);

  return (
    <View style={styles.root}>
      <Screen withTabBar loading={loading} error={error} contentStyle={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <AppText variant="title">Spending</AppText>
          <AppText variant="body" color={Colors.textSecondary}>
            Bill payments and recorded expenses
          </AppText>
        </View>

        <Card>
          <AppText variant="eyebrow" color={Colors.textSecondary}>
            This month
          </AppText>
          <AppText variant="display" style={styles.total}>
            {money(spent)}
          </AppText>
          <View style={styles.budgetBar}>
            <ProgressBar percent={percentOf(spent, budget)} over={overBudget} />
          </View>
          <View style={styles.budgetMeta}>
            <AppText variant="caption" color={overBudget ? Colors.danger : Colors.textSecondary}>
              {Math.round(percentOf(spent, budget))}% of {money(budget, false)} budget
            </AppText>
            {stillDue > 0 ? (
              <AppText variant="caption" color={Colors.textSecondary}>
                {money(stillDue)} still due
              </AppText>
            ) : null}
          </View>
        </Card>

        <SectionHeader title="Last 6 months" />
        <Card>
          <BarChart data={bars} />
        </Card>

        <SectionHeader title="By category" />
        {breakdown.length === 0 ? (
          <EmptyState
            icon="pie-chart"
            title="Nothing spent yet this month"
            body="Record a payment or an expense and the breakdown appears here."
          />
        ) : (
          <Card>
            <Breakdown data={breakdown} />
          </Card>
        )}

        <SectionHeader title="Recent transactions" />
        {transactions.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="No transactions this month"
            actionLabel="Add an expense"
            onAction={() => router.push('/expenses/create')}
          />
        ) : (
          <Card>
            {transactions.map((transaction, index) => {
              const category = categoryMap.get(transaction.categoryId);
              return (
                <View key={`${transaction.source}-${transaction.id}`}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.transaction}>
                    <View
                      style={[
                        styles.transactionIcon,
                        { backgroundColor: category?.tint ?? Colors.surfaceSunken },
                      ]}>
                      <Icon
                        name={transaction.source === 'bill' ? 'receipt' : 'wallet'}
                        size={16}
                        color={category?.ink ?? Colors.textSecondary}
                      />
                    </View>
                    <View style={styles.transactionText}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {transaction.title}
                      </AppText>
                      <AppText variant="caption" color={Colors.textSecondary}>
                        {formatShortDate(transaction.date)}
                        {category ? ` · ${category.name}` : ''}
                      </AppText>
                    </View>
                    <AppText variant="bodyStrong">{money(transaction.amount)}</AppText>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        <Button
          label="Add an expense"
          icon="plus"
          variant="secondary"
          onPress={() => router.push('/expenses/create')}
          fullWidth
        />
      </Screen>
      <Fab onPress={() => router.push('/expenses/create')} />
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
  total: {
    marginTop: Spacing.xs,
  },
  budgetBar: {
    marginTop: Spacing.lg,
  },
  budgetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  transactionIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionText: {
    flex: 1,
    gap: 2,
  },
});
