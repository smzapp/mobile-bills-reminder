import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RingtoneSheet } from '@/components/items/ringtone-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Field, TextField, ValueField } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Divider, ToggleRow } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { CATEGORY_ICONS, CATEGORY_PALETTE } from '@/constants/categories';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DEFAULT_TONE_ID, toneName } from '@/constants/tones';
import {
  countCategoryUsage,
  createCategory,
  deleteCategory,
  getCategory,
  updateCategory,
} from '@/database/repositories/categories';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDataVersion } from '@/providers/data-version';
import { useNotifications } from '@/providers/notification-provider';

interface FormState {
  name: string;
  paletteIndex: number;
  icon: string;
  ringtone: string;
  notificationEnabled: boolean;
  vibrationEnabled: boolean;
}

interface CategoryFormBodyProps {
  categoryId: string | null;
  isSystem: boolean;
  usage: number;
  initial: FormState;
}

function CategoryFormBody({ categoryId, isSystem, usage, initial }: CategoryFormBodyProps) {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { invalidate } = useDataVersion();
  const { reconcile } = useNotifications();
  const confirm = useConfirm();

  const [form, setForm] = useState<FormState>(initial);
  const [nameError, setNameError] = useState<string | null>(null);
  const [ringtoneOpen, setRingtoneOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isNew = categoryId === null;
  const palette = CATEGORY_PALETTE[form.paletteIndex] ?? CATEGORY_PALETTE[0];
  const patch = (next: Partial<FormState>) => setForm((current) => ({ ...current, ...next }));

  const save = async () => {
    if (!form.name.trim()) {
      setNameError('Give the category a name.');
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      const input = {
        name: form.name,
        color: palette.color,
        tint: palette.tint,
        ink: palette.ink,
        icon: form.icon,
        ringtone: form.ringtone,
        notificationEnabled: form.notificationEnabled,
        vibrationEnabled: form.vibrationEnabled,
      };
      if (categoryId) await updateCategory(db, categoryId, input);
      else await createCategory(db, input);
      // A ringtone or mute change re-versions the Android channel, so every
      // reminder in this category has to be rebuilt.
      await reconcile();
      invalidate();
      showToast(isNew ? 'Category created' : 'Category updated');
      if (router.canGoBack()) router.back();
      else router.replace('/categories');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save the category.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!categoryId) return;
    const ok = await confirm({
      title: `Delete ${form.name}?`,
      message: 'The category will be removed. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(db, categoryId);
      invalidate();
      showToast('Category deleted');
      if (router.canGoBack()) router.back();
      else router.replace('/categories');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not delete the category.');
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={isNew ? 'New category' : 'Edit category'}
        backIcon={isNew ? 'x' : 'arrow-left'}
      />
      <Screen>
        <Card>
          <View style={styles.group}>
            <TextField
              label="Name"
              value={form.name}
              onChangeText={(name) => patch({ name })}
              placeholder="e.g. Health"
              error={nameError}
              autoFocus={isNew}
            />

            <Field label="Colour">
              <View style={styles.swatchRow}>
                {CATEGORY_PALETTE.map((entry, index) => (
                  <Pressable
                    key={entry.color}
                    accessibilityRole="button"
                    accessibilityLabel={`Colour ${index + 1}`}
                    accessibilityState={{ selected: index === form.paletteIndex }}
                    onPress={() => patch({ paletteIndex: index })}
                    style={[
                      styles.swatch,
                      { backgroundColor: entry.color },
                      index === form.paletteIndex && styles.swatchActive,
                    ]}
                  />
                ))}
              </View>
            </Field>

            <Field label="Icon">
              <View style={styles.iconRow}>
                {CATEGORY_ICONS.map((iconName) => {
                  const active = iconName === form.icon;
                  return (
                    <Pressable
                      key={iconName}
                      accessibilityRole="button"
                      accessibilityLabel={`Icon ${iconName}`}
                      accessibilityState={{ selected: active }}
                      onPress={() => patch({ icon: iconName })}
                      style={[
                        styles.iconCell,
                        active && { backgroundColor: palette.tint, borderColor: palette.color },
                      ]}>
                      <Icon
                        name={iconName}
                        size={18}
                        color={active ? palette.ink : Colors.textSecondary}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          </View>
        </Card>

        <Card>
          <ValueField
            label="Ringtone"
            icon="music"
            value={toneName(form.ringtone)}
            onPress={() => setRingtoneOpen(true)}
          />
          <Divider />
          <ToggleRow
            label="Notifications"
            description="Turn off to silence every item in this category"
            value={form.notificationEnabled}
            onValueChange={(notificationEnabled) => patch({ notificationEnabled })}
          />
          <Divider />
          <ToggleRow
            label="Vibrate"
            description="Vibrate alongside the ringtone"
            value={form.vibrationEnabled}
            onValueChange={(vibrationEnabled) => patch({ vibrationEnabled })}
            disabled={!form.notificationEnabled}
          />
        </Card>

        <Button
          label={isNew ? 'Create category' : 'Save changes'}
          onPress={save}
          loading={saving}
          size="lg"
          fullWidth
        />

        {!isNew && !isSystem ? (
          <Button
            label={usage > 0 ? `In use by ${usage} item${usage === 1 ? '' : 's'}` : 'Delete category'}
            variant="danger"
            onPress={remove}
            disabled={usage > 0}
            fullWidth
          />
        ) : null}

        {!isNew && isSystem ? (
          <AppText variant="caption" color={Colors.textSecondary}>
            Built-in categories can be renamed and restyled, but not deleted.
          </AppText>
        ) : null}
      </Screen>

      <RingtoneSheet
        visible={ringtoneOpen}
        title="Category ringtone"
        subtitle="Every item in this category uses it unless overridden."
        value={form.ringtone}
        onChange={(next) => next && patch({ ringtone: next })}
        onClose={() => setRingtoneOpen(false)}
      />
    </View>
  );
}

export function CategoryForm({ categoryId }: { categoryId: string | null }) {
  const { data, loading, error } = useDbQuery(
    async (database) => {
      if (!categoryId) return { category: null, usage: 0 };
      const [category, usage] = await Promise.all([
        getCategory(database, categoryId),
        countCategoryUsage(database, categoryId),
      ]);
      return { category, usage };
    },
    [categoryId],
  );

  if (!data) {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title={categoryId ? 'Edit category' : 'New category'}
          backIcon={categoryId ? 'arrow-left' : 'x'}
        />
        <Screen loading={loading} error={error}>
          {null}
        </Screen>
      </View>
    );
  }

  const category = data.category;
  const paletteIndex = category
    ? Math.max(
        0,
        CATEGORY_PALETTE.findIndex((entry) => entry.color === category.color),
      )
    : 0;

  const initial: FormState = category
    ? {
        name: category.name,
        paletteIndex,
        icon: category.icon,
        ringtone: category.ringtone,
        notificationEnabled: category.notificationEnabled,
        vibrationEnabled: category.vibrationEnabled,
      }
    : {
        name: '',
        paletteIndex: 0,
        icon: CATEGORY_ICONS[0],
        ringtone: DEFAULT_TONE_ID,
        notificationEnabled: true,
        vibrationEnabled: true,
      };

  return (
    <CategoryFormBody
      categoryId={category ? category.id : null}
      isSystem={category?.isSystem ?? false}
      usage={data.usage}
      initial={initial}
    />
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
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: Colors.textPrimary,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
