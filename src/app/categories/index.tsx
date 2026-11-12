import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RingtoneSheet } from '@/components/items/ringtone-sheet';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { toneName } from '@/constants/tones';
import { listActivities } from '@/database/repositories/activities';
import { listBills } from '@/database/repositories/bills';
import { listCategories, updateCategory } from '@/database/repositories/categories';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTonePreview } from '@/hooks/use-tone-preview';
import { useDataVersion } from '@/providers/data-version';
import { useNotifications } from '@/providers/notification-provider';

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { invalidate } = useDataVersion();
  const { reconcile } = useNotifications();
  const preview = useTonePreview();
  const [editingTone, setEditingTone] = useState<string | null>(null);

  const { data, loading, error, reload } = useDbQuery(async (database) => {
    const [categories, bills, activities] = await Promise.all([
      listCategories(database),
      listBills(database, { filter: 'all' }),
      listActivities(database, {}),
    ]);
    const counts = new Map<string, number>();
    for (const bill of bills) counts.set(bill.categoryId, (counts.get(bill.categoryId) ?? 0) + 1);
    for (const activity of activities) {
      counts.set(activity.categoryId, (counts.get(activity.categoryId) ?? 0) + 1);
    }
    return { categories, counts };
  });

  const categories = data?.categories ?? [];
  const counts = data?.counts ?? new Map<string, number>();
  const editing = categories.find((category) => category.id === editingTone) ?? null;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Categories & ringtones"
        right={
          <IconButton
            icon="plus"
            accessibilityLabel="Add category"
            onPress={() => router.push('/categories/new')}
          />
        }
      />
      <Screen loading={loading} error={error}>
        <AppText variant="body" color={Colors.textSecondary}>
          Each category rings with its own tone. Any single bill or activity can override it.
        </AppText>

        {categories.map((category) => {
          const count = counts.get(category.id) ?? 0;
          return (
            <Card key={category.id}>
              <View style={styles.cardHeader}>
                <View style={[styles.icon, { backgroundColor: category.tint }]}>
                  <Icon name={category.icon} size={19} color={category.ink} />
                </View>
                <View style={styles.cardText}>
                  <AppText variant="subtitle">{category.name}</AppText>
                  <AppText variant="caption" color={Colors.textSecondary}>
                    {count} item{count === 1 ? '' : 's'}
                    {category.notificationEnabled ? '' : ' · notifications off'}
                  </AppText>
                </View>
                <IconButton
                  icon="pencil"
                  accessibilityLabel={`Edit ${category.name}`}
                  onPress={() => router.push(`/categories/${category.id}`)}
                />
              </View>

              <View style={[styles.toneStrip, { backgroundColor: category.tint }]}>
                <View style={styles.toneText}>
                  <Icon name="music" size={16} color={category.ink} />
                  <AppText variant="caption" color={category.ink} numberOfLines={1}>
                    {toneName(category.ringtone)}
                  </AppText>
                </View>
                <View style={styles.toneActions}>
                  <IconButton
                    icon={preview.playingId === category.ringtone ? 'pause' : 'play'}
                    accessibilityLabel={`Preview ${category.name} ringtone`}
                    size={32}
                    background={Colors.surface}
                    color={category.ink}
                    onPress={() => preview.play(category.ringtone)}
                  />
                  <Button
                    label="Change"
                    variant="secondary"
                    onPress={() => setEditingTone(category.id)}
                  />
                </View>
              </View>
            </Card>
          );
        })}
      </Screen>

      <RingtoneSheet
        visible={editing !== null}
        title={editing ? `${editing.name} ringtone` : 'Ringtone'}
        subtitle="Used by every item in this category unless overridden."
        value={editing?.ringtone ?? null}
        onChange={async (ringtone) => {
          if (!editing || !ringtone) return;
          await updateCategory(db, editing.id, { ringtone });
          // Changing a ringtone re-versions the Android channel, so every
          // scheduled reminder for this category must be rebuilt.
          await reconcile();
          reload();
          invalidate();
          showToast(`${editing.name} now rings with ${toneName(ringtone)}`);
        }}
        onClose={() => setEditingTone(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  toneStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  toneText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toneActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
