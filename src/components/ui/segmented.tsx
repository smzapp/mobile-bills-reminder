import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Dot } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label?: string;
  icon?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** The pill-in-a-trough control used for Unpaid / Paid / All and list / calendar. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.segmentTrack}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}>
            {option.icon ? (
              <Icon
                name={option.icon}
                size={18}
                color={active ? Colors.textPrimary : Colors.textSecondary}
              />
            ) : null}
            {option.label ? (
              <AppText
                variant="label"
                color={active ? Colors.textPrimary : Colors.textSecondary}>
                {option.label}
              </AppText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export interface FilterPill {
  key: string;
  label: string;
  dotColor?: string;
}

export interface FilterPillsProps {
  pills: readonly FilterPill[];
  value: string;
  onChange: (key: string) => void;
}

/** Horizontally scrolling category filter row. */
export function FilterPills({ pills, value, onChange }: FilterPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pillRow}>
      {pills.map((pill) => {
        const active = pill.key === value;
        return (
          <Pressable
            key={pill.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(pill.key)}
            style={[styles.pill, active && styles.pillActive]}>
            {pill.dotColor ? <Dot color={pill.dotColor} size={7} /> : null}
            <AppText variant="label" color={active ? Colors.textInverse : Colors.textPrimary}>
              {pill.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    paddingVertical: Spacing.sm + 1,
    borderRadius: Radius.sm,
  },
  segmentActive: {
    backgroundColor: Colors.surface,
  },
  pillRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
});
