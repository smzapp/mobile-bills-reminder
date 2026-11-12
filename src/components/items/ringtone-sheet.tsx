import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/sheet';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { TONES, toneName } from '@/constants/tones';
import { useTonePreview } from '@/hooks/use-tone-preview';

export interface RingtoneSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** null means "inherit the category ringtone". */
  value: string | null;
  /** Pass the category's tone to offer an explicit inherit option. */
  categoryToneId?: string | null;
  onChange: (value: string | null) => void;
  onClose: () => void;
}

/**
 * Ringtone picker. Selecting a tone previews it immediately, and playback is
 * stopped when the sheet closes so audio never leaks between screens.
 */
export function RingtoneSheet({
  visible,
  title,
  subtitle,
  value,
  categoryToneId,
  onChange,
  onClose,
}: RingtoneSheetProps) {
  const preview = useTonePreview();

  useEffect(() => {
    if (!visible) preview.stop();
  }, [visible, preview]);

  const options: { id: string | null; name: string; description: string; playId: string }[] = [];
  if (categoryToneId) {
    options.push({
      id: null,
      name: 'Category default',
      description: toneName(categoryToneId),
      playId: categoryToneId,
    });
  }
  for (const tone of TONES) {
    options.push({ id: tone.id, name: tone.name, description: tone.description, playId: tone.id });
  }

  return (
    <BottomSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={() => {
        preview.stop();
        onClose();
      }}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id ?? 'inherit'}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(option.id);
              preview.play(option.playId);
            }}
            style={[styles.row, selected && styles.rowSelected]}>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={styles.text}>
              <AppText variant="bodyStrong">{option.name}</AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                {option.description}
              </AppText>
            </View>
            <IconButton
              icon={preview.playingId === option.playId ? 'pause' : 'play'}
              accessibilityLabel={`Preview ${option.name}`}
              size={34}
              background={Colors.surfaceSunken}
              color={Colors.primary}
              onPress={() => preview.play(option.playId)}
            />
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  rowSelected: {
    backgroundColor: Colors.primaryTint,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  text: {
    flex: 1,
    gap: 1,
  },
});
