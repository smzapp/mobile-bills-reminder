import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthGrid } from '@/components/calendar/month-grid';
import { ActivityRow, BillRow } from '@/components/items/item-row';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Divider } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented';
import { AppText } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { listActivities, listUpcomingActivities } from '@/database/repositories/activities';
import { listBills } from '@/database/repositories/bills';
import { useDbQuery } from '@/hooks/use-db-query';
import type { ISODate } from '@/types/domain';
import { formatLongDate, monthRange, relativeDayLabel, todayISO } from '@/utils/date';

const VIEWS = [
  { value: 'list' as const, label: 'List', icon: 'filter' },
  { value: 'calendar' as const, label: 'Calendar', icon: 'calendar-range' },
];

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const today = todayISO();
  const now = new Date();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<ISODate>(today);

  const { data, loading, error } = useDbQuery(
    async (db) => {
      const range = monthRange(year, month);
      const [upcoming, monthActivities, monthBills] = await Promise.all([
        listUpcomingActivities(db),
        listActivities(db, { from: range.start, to: range.end }),
        listBills(db, { filter: 'all' }),
      ]);
      return { upcoming, monthActivities, monthBills };
    },
    [year, month],
  );

  const upcoming = data?.upcoming ?? [];
  const monthActivities = data?.monthActivities ?? [];
  const monthBills = data?.monthBills ?? [];

  const markers = new Map<ISODate, string[]>();
  for (const activity of monthActivities) {
    markers.set(activity.startDate, [
      ...(markers.get(activity.startDate) ?? []),
      activity.category.color,
    ]);
  }
  for (const bill of monthBills) {
    markers.set(bill.dueDate, [...(markers.get(bill.dueDate) ?? []), bill.category.color]);
  }

  const dayActivities = monthActivities.filter((item) => item.startDate === selected);
  const dayBills = monthBills.filter((item) => item.dueDate === selected);
  const dayEmpty = dayActivities.length === 0 && dayBills.length === 0;

  const groups = upcoming.reduce<{ key: ISODate; rows: typeof upcoming }[]>((acc, activity) => {
    const group = acc.find((item) => item.key === activity.startDate);
    if (group) group.rows.push(activity);
    else acc.push({ key: activity.startDate, rows: [activity] });
    return acc;
  }, []);

  return (
    <View style={styles.root}>
      <Screen withTabBar loading={loading} error={error} contentStyle={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <AppText variant="title">Schedule</AppText>
          <AppText variant="body" color={Colors.textSecondary}>
            {upcoming.length} upcoming activit{upcoming.length === 1 ? 'y' : 'ies'}
          </AppText>
        </View>

        <SegmentedControl options={VIEWS} value={view} onChange={setView} />

        {view === 'list' ? (
          groups.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Nothing scheduled"
              body="Meetings, appointments and activities appear here once you add them."
              actionLabel="Add an activity"
              onAction={() => router.push('/activities/create')}
            />
          ) : (
            groups.map((group) => (
              <View key={group.key} style={styles.group}>
                <View style={styles.groupHeader}>
                  <AppText
                    variant="label"
                    color={group.key === today ? Colors.primary : Colors.textPrimary}>
                    {relativeDayLabel(group.key)}
                  </AppText>
                  <AppText variant="caption" color={Colors.textSecondary}>
                    {formatLongDate(group.key)}
                  </AppText>
                </View>
                <Card padded={false} style={styles.listCard}>
                  {group.rows.map((activity, index) => (
                    <View key={activity.id}>
                      {index > 0 ? <Divider /> : null}
                      <ActivityRow
                        activity={activity}
                        onPress={() => router.push(`/activities/${activity.id}`)}
                      />
                    </View>
                  ))}
                </Card>
              </View>
            ))
          )
        ) : (
          <>
            <Card>
              <MonthGrid
                year={year}
                month={month}
                selected={selected}
                markers={markers}
                onSelect={setSelected}
                onMonthChange={(nextYear, nextMonth) => {
                  setYear(nextYear);
                  setMonth(nextMonth);
                }}
              />
            </Card>

            <View style={styles.groupHeader}>
              <AppText variant="label">
                {selected === today ? 'Today' : relativeDayLabel(selected)}
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                {formatLongDate(selected)}
              </AppText>
            </View>

            {dayEmpty ? (
              <EmptyState icon="calendar" title="Nothing on this day" />
            ) : (
              <Card padded={false} style={styles.listCard}>
                {dayBills.map((bill, index) => (
                  <View key={bill.id}>
                    {index > 0 ? <Divider /> : null}
                    <BillRow bill={bill} onPress={() => router.push(`/bills/${bill.id}`)} />
                  </View>
                ))}
                {dayActivities.map((activity, index) => (
                  <View key={activity.id}>
                    {index > 0 || dayBills.length > 0 ? <Divider /> : null}
                    <ActivityRow
                      activity={activity}
                      onPress={() => router.push(`/activities/${activity.id}`)}
                    />
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </Screen>
      <Fab onPress={() => router.push('/activities/create')} />
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
  group: {
    gap: Spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  listCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
});
