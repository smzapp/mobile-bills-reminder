import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { RingtoneSheet } from '@/components/items/ringtone-sheet';
import { Badge } from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Divider, InfoRow } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { reminderLabel } from '@/constants/reminders';
import { Colors, Spacing } from '@/constants/theme';
import { toneName } from '@/constants/tones';
import {
  archiveActivity,
  getActivity,
  restoreActivity,
  setActivityStatus,
} from '@/database/repositories/activities';
import { listRemindersFor } from '@/database/repositories/reminders';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDataVersion } from '@/providers/data-version';
import { syncActivityReminders } from '@/services/notifications/scheduler';
import { formatLongDate, formatTime12 } from '@/utils/date';
import { recurrenceLabel } from '@/utils/recurrence';
import { activityStatusMeta } from '@/utils/status';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { invalidate } = useDataVersion();
  const [ringtoneOpen, setRingtoneOpen] = useState(false);

  const { data, loading, error, reload } = useDbQuery(
    async (database) => {
      const activity = await getActivity(database, id);
      if (!activity) return null;
      const reminders = await listRemindersFor(database, 'activity', id);
      return { activity, reminders };
    },
    [id],
  );

  const activity = data?.activity ?? null;
  const reminders = data?.reminders ?? [];

  const refresh = () => {
    reload();
    invalidate();
  };

  const changeStatus = async (status: 'completed' | 'cancelled' | 'scheduled') => {
    if (!activity) return;
    await setActivityStatus(db, activity.id, status);
    await syncActivityReminders(db, activity.id);
    refresh();
    showToast(
      status === 'completed'
        ? 'Marked as completed'
        : status === 'cancelled'
          ? 'Marked as cancelled'
          : 'Back on the schedule',
    );
  };

  const onArchive = async () => {
    if (!activity) return;
    await archiveActivity(db, activity.id);
    await syncActivityReminders(db, activity.id);
    invalidate();
    showToast(`Archived "${activity.title}"`, {
      onUndo: async () => {
        await restoreActivity(db, activity.id);
        await syncActivityReminders(db, activity.id);
        invalidate();
      },
    });
    if (router.canGoBack()) router.back();
    else router.replace('/schedule');
  };

  if (!loading && !activity) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Activity" />
        <Screen>
          <EmptyState icon="calendar" title="This activity no longer exists" />
        </Screen>
      </View>
    );
  }

  const reminderText =
    reminders.length === 0
      ? 'No reminder'
      : reminders.map((item) => reminderLabel(item.minutesBefore)).join(', ');
  const toneId = activity?.ringtone ?? activity?.category.ringtone ?? null;
  const toneText = activity?.ringtone
    ? `${toneName(activity.ringtone)} (custom)`
    : `${toneName(toneId)} (category)`;
  const statusMeta = activity ? activityStatusMeta(activity.status) : null;
  const timeRange = activity
    ? [formatTime12(activity.startTime), formatTime12(activity.endTime)]
        .filter(Boolean)
        .join(' – ')
    : '';

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Activity"
        right={
          activity ? (
            <>
              <IconButton
                icon="pencil"
                accessibilityLabel="Edit activity"
                onPress={() => router.push(`/activities/edit/${activity.id}`)}
              />
              <IconButton icon="archive" accessibilityLabel="Archive activity" onPress={onArchive} />
            </>
          ) : null
        }
      />
      <Screen loading={loading} error={error}>
        {activity && statusMeta ? (
          <>
            <Card>
              <View style={styles.badgeRow}>
                <Badge
                  label={activity.category.name}
                  color={activity.category.ink}
                  tint={activity.category.tint}
                />
                <Badge
                  label={statusMeta.label}
                  color={statusMeta.color}
                  tint={statusMeta.tint}
                />
              </View>
              <AppText variant="heading" style={styles.title}>
                {activity.title}
              </AppText>
              <AppText variant="amount" style={styles.time}>
                {timeRange || 'All day'}
              </AppText>
              <AppText variant="body" color={Colors.textSecondary}>
                {formatLongDate(activity.startDate)}
              </AppText>

              {activity.status === 'scheduled' ? (
                <View style={styles.actionRow}>
                  <View style={styles.action}>
                    <Button
                      label="Completed"
                      icon="check"
                      onPress={() => changeStatus('completed')}
                      fullWidth
                    />
                  </View>
                  <View style={styles.action}>
                    <Button
                      label="Cancel"
                      variant="secondary"
                      onPress={() => changeStatus('cancelled')}
                      fullWidth
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <View style={styles.action}>
                    <Button
                      label="Put back on schedule"
                      variant="secondary"
                      onPress={() => changeStatus('scheduled')}
                      fullWidth
                    />
                  </View>
                </View>
              )}
            </Card>

            <Card>
              <InfoRow icon="calendar" label="When" value={formatLongDate(activity.startDate)} />
              <Divider />
              <InfoRow icon="map-pin" label="Where" value={activity.location || '—'} />
              {activity.meetingLink ? (
                <>
                  <Divider />
                  <InfoRow
                    icon="link"
                    label="Meeting link"
                    value={activity.meetingLink}
                    onPress={() => {
                      Linking.openURL(activity.meetingLink ?? '').catch(() =>
                        showToast('Could not open that link.'),
                      );
                    }}
                  />
                </>
              ) : null}
              <Divider />
              <InfoRow icon="repeat" label="Repeats" value={recurrenceLabel(activity.recurrence)} />
              <Divider />
              <InfoRow icon="bell" label="Remind me" value={reminderText} />
              <Divider />
              <InfoRow
                icon="music"
                label="Ringtone"
                value={toneText}
                onPress={() => setRingtoneOpen(true)}
              />
            </Card>

            {activity.notes ? (
              <Card>
                <AppText variant="eyebrow" color={Colors.textSecondary}>
                  Notes
                </AppText>
                <AppText variant="body" style={styles.notes}>
                  {activity.notes}
                </AppText>
              </Card>
            ) : null}
          </>
        ) : null}
      </Screen>

      {activity ? (
        <RingtoneSheet
          visible={ringtoneOpen}
          title="Ringtone for this activity"
          subtitle={activity.title}
          value={activity.ringtone}
          categoryToneId={activity.category.ringtone}
          onChange={async (ringtone) => {
            await db.runAsync(
              'UPDATE activities SET ringtone = ?, updated_at = ? WHERE id = ?',
              ringtone,
              new Date().toISOString(),
              activity.id,
            );
            await syncActivityReminders(db, activity.id);
            refresh();
          }}
          onClose={() => setRingtoneOpen(false)}
        />
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
  time: {
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  action: {
    flex: 1,
  },
  notes: {
    marginTop: Spacing.sm,
  },
});
