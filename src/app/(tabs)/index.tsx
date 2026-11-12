import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityRow, BillRow } from '@/components/items/item-row';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Divider, SectionHeader } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { toneName } from '@/constants/tones';
import { listUpcomingActivities } from '@/database/repositories/activities';
import { listBills, listBillsDueWithin } from '@/database/repositories/bills';
import { monthSpendTotal } from '@/database/repositories/expenses';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTonePreview } from '@/hooks/use-tone-preview';
import { useSettings } from '@/providers/settings-provider';
import { currentMonthKey, formatHeaderDate, formatTime12, greetingFor } from '@/utils/date';
import { percentOf, sumMinor } from '@/utils/money';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { settings, money } = useSettings();
  const preview = useTonePreview();

  const { data, loading, error } = useDbQuery(async (db) => {
    const [dueSoon, unpaid, activities, spent] = await Promise.all([
      listBillsDueWithin(db, 7),
      listBills(db, { filter: 'unpaid' }),
      listUpcomingActivities(db),
      monthSpendTotal(db, currentMonthKey()),
    ]);
    return { dueSoon, unpaid, activities, spent };
  });

  const dueSoon = data?.dueSoon ?? [];
  const unpaid = data?.unpaid ?? [];
  const activities = data?.activities ?? [];
  const spent = data?.spent ?? 0;

  const dueSoonTotal = sumMinor(dueSoon.map((bill) => bill.balance));
  const overdueCount = dueSoon.filter((bill) => bill.displayStatus === 'overdue').length;
  const budget = settings.monthlyBudget;
  const overBudget = spent > budget;
  const next = activities[0] ?? null;
  const nextTone = next ? (next.ringtone ?? next.category.ringtone) : null;

  return (
    <View style={styles.root}>
      <Screen withTabBar loading={loading} error={error} contentStyle={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="label" color={Colors.textSecondary}>
              {formatHeaderDate()}
            </AppText>
            <AppText variant="title">{greetingFor()}</AppText>
          </View>
          <IconButton
            icon="settings"
            accessibilityLabel="Open settings"
            onPress={() => router.push('/settings')}
          />
        </View>

        {next ? (
          <Card onPress={() => router.push(`/activities/${next.id}`)}>
            <View style={styles.nextTop}>
              <AppText variant="eyebrow" color={next.category.ink}>
                Next up
              </AppText>
              <Badge
                label={next.category.name}
                color={next.category.ink}
                tint={next.category.tint}
              />
            </View>
            <AppText variant="heading" style={styles.nextTitle}>
              {next.title}
            </AppText>
            <AppText variant="body" color={Colors.textSecondary}>
              {[formatTime12(next.startTime), next.location].filter(Boolean).join(' · ')}
            </AppText>
            <View style={[styles.toneStrip, { backgroundColor: next.category.tint }]}>
              <View style={styles.toneText}>
                <Icon name="bell-ring" size={17} color={next.category.ink} />
                <AppText variant="caption" color={next.category.ink} numberOfLines={1}>
                  Rings with {toneName(nextTone)}
                </AppText>
              </View>
              <IconButton
                icon={preview.playingId === nextTone ? 'pause' : 'play'}
                accessibilityLabel="Preview ringtone"
                size={32}
                background={Colors.surface}
                color={next.category.ink}
                onPress={() => nextTone && preview.play(nextTone)}
              />
            </View>
          </Card>
        ) : (
          <Card>
            <AppText variant="eyebrow" color={Colors.textSecondary}>
              Next up
            </AppText>
            <AppText variant="bodyStrong" style={styles.nextTitle}>
              Nothing scheduled
            </AppText>
            <AppText variant="caption" color={Colors.textSecondary}>
              Add a meeting or appointment and it will show here.
            </AppText>
          </Card>
        )}

        <View style={styles.statRow}>
          <Card style={styles.statCard} onPress={() => router.push('/bills')}>
            <AppText variant="eyebrow" color={Colors.textSecondary}>
              Due in 7 days
            </AppText>
            <AppText variant="amount" style={styles.statValue}>
              {money(dueSoonTotal, false)}
            </AppText>
            <AppText
              variant="caption"
              color={overdueCount > 0 ? Colors.danger : Colors.textSecondary}>
              {dueSoon.length} bill{dueSoon.length === 1 ? '' : 's'}
              {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
            </AppText>
          </Card>
          <Card style={styles.statCard} onPress={() => router.push('/spending')}>
            <AppText variant="eyebrow" color={Colors.textSecondary}>
              Spent this month
            </AppText>
            <AppText variant="amount" style={styles.statValue}>
              {money(spent, false)}
            </AppText>
            <AppText variant="caption" color={overBudget ? Colors.danger : Colors.textSecondary}>
              {overBudget
                ? `${money(spent - budget, false)} over budget`
                : `${money(budget - spent, false)} left`}
            </AppText>
            <View style={styles.statProgress}>
              <ProgressBar percent={percentOf(spent, budget)} height={6} over={overBudget} />
            </View>
          </Card>
        </View>

        <SectionHeader
          title="Bills due soon"
          actionLabel={unpaid.length > 0 ? 'See all' : undefined}
          onAction={() => router.push('/bills')}
        />
        {unpaid.length === 0 ? (
          <EmptyState
            icon="receipt"
            title="No unpaid bills"
            body="Everything is settled. Add a bill to start tracking it."
            actionLabel="Add a bill"
            onAction={() => router.push('/bills/create')}
          />
        ) : (
          <Card padded={false} style={styles.listCard}>
            {unpaid.slice(0, 4).map((bill, index) => (
              <View key={bill.id}>
                {index > 0 ? <Divider /> : null}
                <BillRow bill={bill} onPress={() => router.push(`/bills/${bill.id}`)} />
              </View>
            ))}
          </Card>
        )}

        <SectionHeader
          title="Coming up"
          actionLabel={activities.length > 0 ? 'See all' : undefined}
          onAction={() => router.push('/schedule')}
        />
        {activities.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Nothing coming up"
            body="Meetings, appointments and activities appear here."
            actionLabel="Add an activity"
            onAction={() => router.push('/activities/create')}
          />
        ) : (
          <Card padded={false} style={styles.listCard}>
            {activities.slice(0, 4).map((activity, index) => (
              <View key={activity.id}>
                {index > 0 ? <Divider /> : null}
                <ActivityRow
                  activity={activity}
                  onPress={() => router.push(`/activities/${activity.id}`)}
                />
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  nextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  nextTitle: {
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  toneStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    borderRadius: Radius.md,
  },
  toneText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    marginTop: Spacing.xs,
  },
  statProgress: {
    marginTop: Spacing.sm,
  },
  listCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
});
