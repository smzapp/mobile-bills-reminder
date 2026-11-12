import { Pressable, StyleSheet, View } from 'react-native';

import { Dot } from '@/components/ui/badge';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface ChoiceChip<T> {
  value: T;
  label: string;
  dotColor?: string;
  tint?: string;
  ink?: string;
}

export interface ChoiceChipsProps<T extends string | number> {
  options: readonly ChoiceChip<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Wrapping chip group used for repeat, reminder and category choices. */
export function ChoiceChips<T extends string | number>({
  options,
  value,
  onChange,
}: ChoiceChipsProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option.value === value;
        const background = active ? (option.tint ?? Colors.textPrimary) : Colors.surface;
        const border = active ? (option.dotColor ?? Colors.textPrimary) : Colors.border;
        const text = active ? (option.ink ?? Colors.textInverse) : Colors.textPrimary;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, { backgroundColor: background, borderColor: border }]}>
            {option.dotColor ? <Dot color={option.dotColor} size={7} /> : null}
            <AppText variant="label" color={text}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface MultiChoiceChipsProps<T extends string | number> {
  options: readonly ChoiceChip<T>[];
  values: readonly T[];
  onToggle: (value: T) => void;
}

/** Multi-select variant, used for "remind me" lead times. */
export function MultiChoiceChips<T extends string | number>({
  options,
  values,
  onToggle,
}: MultiChoiceChipsProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = values.includes(option.value);
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            onPress={() => onToggle(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? Colors.primaryTint : Colors.surface,
                borderColor: active ? Colors.primary : Colors.border,
              },
            ]}>
            <AppText variant="label" color={active ? Colors.primary : Colors.textPrimary}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 1,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
