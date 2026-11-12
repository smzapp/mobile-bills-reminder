import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { RingtoneSheet } from '@/components/items/ringtone-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips, MultiChoiceChips } from '@/components/ui/chips';
import { DatePickerSheet } from '@/components/ui/date-picker-sheet';
import { Field, TextField, ValueField } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AppText } from '@/components/ui/text';
import { TimePickerSheet } from '@/components/ui/time-picker-sheet';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_CATEGORY_ID } from '@/constants/categories';
import { REMINDER_OPTIONS } from '@/constants/reminders';
import { Colors, Spacing } from '@/constants/theme';
import { toneName } from '@/constants/tones';
import { createActivity, getActivity, updateActivity } from '@/database/repositories/activities';
import { listCategories } from '@/database/repositories/categories';
import { listRemindersFor, replaceReminders } from '@/database/repositories/reminders';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDataVersion } from '@/providers/data-version';
import { useSettings } from '@/providers/settings-provider';
import { syncActivityReminders } from '@/services/notifications/scheduler';
import type { ActivityKind, Category, ISODate, ISOTime, Recurrence } from '@/types/domain';
import { formatLongDate, formatTime12, todayISO } from '@/utils/date';
import { NO_RECURRENCE, RECURRENCE_PRESETS, recurrenceKey } from '@/utils/recurrence';

const KINDS: { value: ActivityKind; label: string }[] = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'class', label: 'Class' },
  { value: 'service', label: 'Service' },
  { value: 'event', label: 'Event' },
  { value: 'task', label: 'Task' },
];

interface FormState {
  title: string;
  kind: ActivityKind;
  categoryId: string;
  startDate: ISODate;
  startTime: ISOTime | null;
  endTime: ISOTime | null;
  location: string;
  meetingLink: string;
  recurrence: Recurrence;
  reminders: number[];
  ringtone: string | null;
  notes: string;
}

type SheetKind = 'date' | 'startTime' | 'endTime' | 'ringtone' | null;

interface ActivityFormBodyProps {
  activityId?: string;
  categories: Category[];
  initial: FormState;
}

function ActivityFormBody({ activityId, categories, initial }: ActivityFormBodyProps) {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { invalidate } = useDataVersion();
  const editing = Boolean(activityId);

  const [form, setForm] = useState<FormState>(initial);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [saving, setSaving] = useState(false);

  const category = categories.find((item) => item.id === form.categoryId) ?? categories[0];

  const patch = (next: Partial<FormState>) => setForm((current) => ({ ...current, ...next }));

  const toggleReminder = (minutes: number) =>
    setForm((current) => ({
      ...current,
      reminders: current.reminders.includes(minutes)
        ? current.reminders.filter((item) => item !== minutes)
        : [...current.reminders, minutes],
    }));

  const save = async () => {
    if (!form.title.trim()) {
      setTitleError('Give the activity a title.');
      return;
    }
    setTitleError(null);
    setSaving(true);
    try {
      const input = {
        title: form.title,
        kind: form.kind,
        categoryId: form.categoryId,
        startDate: form.startDate,
        startTime: form.startTime,
        endTime: form.endTime,
        location: form.location.trim() || null,
        meetingLink: form.meetingLink.trim() || null,
        recurrence: form.recurrence,
        ringtone: form.ringtone,
        notes: form.notes.trim() || null,
      };

      const id = activityId ?? (await createActivity(db, input));
      if (activityId) await updateActivity(db, activityId, input);

      await replaceReminders(db, 'activity', id, form.reminders);
      await syncActivityReminders(db, id);
      invalidate();
      showToast(activityId ? 'Activity updated' : 'Activity saved');

      if (router.canGoBack()) router.back();
      else router.replace('/schedule');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save the activity.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={editing ? 'Edit activity' : 'New activity'}
        backIcon={editing ? 'arrow-left' : 'x'}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen>
          <Card>
            <View style={styles.group}>
              <TextField
                label="Title"
                value={form.title}
                onChangeText={(title) => patch({ title })}
                placeholder="e.g. Choir rehearsal"
                error={titleError}
                autoFocus={!editing}
              />
              <Field label="Type">
                <ChoiceChips options={KINDS} value={form.kind} onChange={(kind) => patch({ kind })} />
              </Field>
              <Field label="Category">
                <ChoiceChips
                  options={categories.map((item) => ({
                    value: item.id,
                    label: item.name,
                    dotColor: item.color,
                    tint: item.tint,
                    ink: item.ink,
                  }))}
                  value={form.categoryId}
                  onChange={(categoryId) => patch({ categoryId })}
                />
              </Field>
            </View>
          </Card>

          <Card>
            <View style={styles.group}>
              <ValueField
                label="Date"
                icon="calendar"
                value={formatLongDate(form.startDate)}
                onPress={() => setSheet('date')}
              />
              <ValueField
                label="Starts"
                icon="clock"
                value={form.startTime ? formatTime12(form.startTime) : 'All day'}
                onPress={() => setSheet('startTime')}
              />
              <ValueField
                label="Ends"
                icon="clock"
                value={form.endTime ? formatTime12(form.endTime) : 'Not set'}
                onPress={() => setSheet('endTime')}
              />
              <Field label="Repeats">
                <ChoiceChips
                  options={RECURRENCE_PRESETS.map((preset) => ({
                    value: preset.key,
                    label: preset.shortLabel,
                  }))}
                  value={recurrenceKey(form.recurrence)}
                  onChange={(key) => {
                    const preset = RECURRENCE_PRESETS.find((item) => item.key === key);
                    if (preset) patch({ recurrence: preset.value });
                  }}
                />
              </Field>
            </View>
          </Card>

          <Card>
            <View style={styles.group}>
              <Field
                label="Remind me"
                hint={
                  form.reminders.length === 0
                    ? 'No reminder will be scheduled.'
                    : `${form.reminders.length} reminder${form.reminders.length === 1 ? '' : 's'} will be scheduled.`
                }>
                <MultiChoiceChips
                  options={REMINDER_OPTIONS.map((option) => ({
                    value: option.minutes,
                    label: option.shortLabel,
                  }))}
                  values={form.reminders}
                  onToggle={toggleReminder}
                />
              </Field>
              <ValueField
                label="Ringtone"
                icon="music"
                value={
                  form.ringtone
                    ? `${toneName(form.ringtone)} (custom)`
                    : `${toneName(category?.ringtone)} · ${category?.name ?? 'category'} default`
                }
                onPress={() => setSheet('ringtone')}
              />
            </View>
          </Card>

          <Card>
            <View style={styles.group}>
              <AppText variant="eyebrow" color={Colors.textSecondary}>
                Where
              </AppText>
              <TextField
                label="Location"
                value={form.location}
                onChangeText={(location) => patch({ location })}
                placeholder="e.g. Main sanctuary"
              />
              <TextField
                label="Meeting link"
                value={form.meetingLink}
                onChangeText={(meetingLink) => patch({ meetingLink })}
                placeholder="https://"
                autoCapitalize="none"
                keyboardType="url"
              />
              <TextField
                label="Notes"
                value={form.notes}
                onChangeText={(notes) => patch({ notes })}
                placeholder="Anything worth remembering"
                multiline
              />
            </View>
          </Card>

          <Button
            label={editing ? 'Save changes' : 'Save activity'}
            onPress={save}
            loading={saving}
            size="lg"
            fullWidth
          />
        </Screen>
      </KeyboardAvoidingView>

      <DatePickerSheet
        visible={sheet === 'date'}
        title="Date"
        value={form.startDate}
        onChange={(startDate) => patch({ startDate })}
        onClose={() => setSheet(null)}
      />
      <TimePickerSheet
        visible={sheet === 'startTime'}
        title="Start time"
        value={form.startTime}
        onChange={(startTime) => patch({ startTime })}
        onClose={() => setSheet(null)}
      />
      <TimePickerSheet
        visible={sheet === 'endTime'}
        title="End time"
        value={form.endTime}
        onChange={(endTime) => patch({ endTime })}
        onClose={() => setSheet(null)}
      />
      <RingtoneSheet
        visible={sheet === 'ringtone'}
        title="Ringtone"
        subtitle={`Defaults to the ${category?.name ?? 'category'} tone.`}
        value={form.ringtone}
        categoryToneId={category?.ringtone ?? null}
        onChange={(ringtone) => patch({ ringtone })}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

export function ActivityForm({ activityId }: { activityId?: string }) {
  const { settings } = useSettings();

  const { data, loading, error } = useDbQuery(
    async (database) => {
      const categories = await listCategories(database);
      if (!activityId) return { categories, activity: null, reminders: [] as number[] };
      const [activity, reminders] = await Promise.all([
        getActivity(database, activityId),
        listRemindersFor(database, 'activity', activityId),
      ]);
      return { categories, activity, reminders: reminders.map((item) => item.minutesBefore) };
    },
    [activityId],
  );

  if (!data) {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title={activityId ? 'Edit activity' : 'New activity'}
          backIcon={activityId ? 'arrow-left' : 'x'}
        />
        <Screen loading={loading} error={error}>
          {null}
        </Screen>
      </View>
    );
  }

  const activity = data.activity;
  const initial: FormState = activity
    ? {
        title: activity.title,
        kind: activity.kind,
        categoryId: activity.categoryId,
        startDate: activity.startDate,
        startTime: activity.startTime,
        endTime: activity.endTime,
        location: activity.location ?? '',
        meetingLink: activity.meetingLink ?? '',
        recurrence: activity.recurrence,
        reminders:
          data.reminders.length > 0 ? data.reminders : [settings.defaultActivityReminderMinutes],
        ringtone: activity.ringtone,
        notes: activity.notes ?? '',
      }
    : {
        title: '',
        kind: 'meeting',
        categoryId: data.categories[0]?.id ?? DEFAULT_CATEGORY_ID,
        startDate: todayISO(),
        startTime: '09:00',
        endTime: null,
        location: '',
        meetingLink: '',
        recurrence: NO_RECURRENCE,
        reminders: [settings.defaultActivityReminderMinutes],
        ringtone: null,
        notes: '',
      };

  return (
    <ActivityFormBody activityId={activityId} categories={data.categories} initial={initial} />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  group: {
    gap: Spacing.lg,
  },
});
