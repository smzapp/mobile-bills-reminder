import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Divider, NavRow } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { listActivities } from '@/database/repositories/activities';
import { listBills } from '@/database/repositories/bills';
import { listCategories } from '@/database/repositories/categories';
import { listExpenses } from '@/database/repositories/expenses';
import { useDbQuery } from '@/hooks/use-db-query';
import { useNotifications } from '@/providers/notification-provider';

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { permission } = useNotifications();

  const { data, loading, error } = useDbQuery(async (db) => {
    const [categories, archivedBills, archivedActivities, archivedExpenses] = await Promise.all([
      listCategories(db),
      listBills(db, { includeArchived: true, filter: 'all' }),
      listActivities(db, { includeArchived: true }),
      listExpenses(db, { includeArchived: true }),
    ]);
    return {
      categoryCount: categories.length,
      archivedCount: archivedBills.length + archivedActivities.length + archivedExpenses.length,
    };
  });

  const categoryCount = data?.categoryCount ?? 0;
  const archivedCount = data?.archivedCount ?? 0;

  const notificationHint = !permission
    ? 'Checking permission...'
    : !permission.granted
      ? 'Notifications are off'
      : !permission.exactAlarmsAllowed
        ? 'Reminders may arrive late'
        : 'Reminders are active';

  return (
    <Screen withTabBar loading={loading} error={error} contentStyle={{ paddingTop: insets.top }}>
      <View style={styles.header}>
        <AppText variant="title">More</AppText>
        <AppText variant="body" color={Colors.textSecondary}>
          Categories, archive and app settings
        </AppText>
      </View>

      <Card>
        <NavRow
          icon="music"
          label="Categories & ringtones"
          description={`${categoryCount} categories`}
          onPress={() => router.push('/categories')}
        />
        <Divider />
        <NavRow
          icon="archive"
          label="Archive"
          description={`${archivedCount} archived item${archivedCount === 1 ? '' : 's'}`}
          onPress={() => router.push('/archive')}
        />
        <Divider />
        <NavRow
          icon="settings"
          label="Settings"
          description={notificationHint}
          onPress={() => router.push('/settings')}
        />
        <Divider />
        <NavRow
          icon="info"
          label="About Nudge"
          description="Version, data and limitations"
          onPress={() => router.push('/about')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.md,
    gap: 2,
    marginBottom: Spacing.xs,
  },
});
