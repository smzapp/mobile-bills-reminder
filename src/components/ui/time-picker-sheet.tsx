import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented';
import { BottomSheet } from '@/components/ui/sheet';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { ISOTime } from '@/types/domain';

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function parse(value: ISOTime | null): { hour: number; minute: number; meridiem: 'AM' | 'PM' } {
  const [rawHour, rawMinute] = (value ?? '09:00').split(':').map(Number);
  const hour24 = rawHour ?? 9;
  return {
    hour: hour24 % 12 || 12,
    minute: rawMinute ?? 0,
    meridiem: hour24 >= 12 ? 'PM' : 'AM',
  };
}

function toISOTime(hour: number, minute: number, meridiem: 'AM' | 'PM'): ISOTime {
  let hour24 = hour % 12;
  if (meridiem === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export interface TimePickerSheetProps {
  visible: boolean;
  title?: string;
  value: ISOTime | null;
  onClose: () => void;
  onChange: (value: ISOTime) => void;
}

function TimePickerBody({
  value,
  onClose,
  onChange,
}: Pick<TimePickerSheetProps, 'value' | 'onClose' | 'onChange'>) {
  const [state, setState] = useState(() => parse(value));

  const cell = (label: string, active: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.cell, active && styles.cellActive]}>
      <AppText variant="label" color={active ? Colors.textInverse : Colors.textPrimary}>
        {label}
      </AppText>
    </Pressable>
  );

  return (
    <>
      <AppText variant="eyebrow" color={Colors.textSecondary}>
        Hour
      </AppText>
      <View style={styles.grid}>
        {HOURS.map((hour) =>
          cell(
            String(hour),
            state.hour === hour,
            () => setState((current) => ({ ...current, hour })),
            `h${hour}`,
          ),
        )}
      </View>

      <AppText variant="eyebrow" color={Colors.textSecondary} style={styles.sectionGap}>
        Minute
      </AppText>
      <View style={styles.grid}>
        {MINUTES.map((minute) =>
          cell(
            String(minute).padStart(2, '0'),
            state.minute === minute,
            () => setState((current) => ({ ...current, minute })),
            `m${minute}`,
          ),
        )}
      </View>

      <View style={styles.sectionGap}>
        <SegmentedControl
          options={[
            { value: 'AM' as const, label: 'AM' },
            { value: 'PM' as const, label: 'PM' },
          ]}
          value={state.meridiem}
          onChange={(meridiem) => setState((current) => ({ ...current, meridiem }))}
        />
      </View>

      <View style={styles.sectionGap}>
        <Button
          label={`Set ${state.hour}:${String(state.minute).padStart(2, '0')} ${state.meridiem}`}
          fullWidth
          onPress={() => {
            onChange(toISOTime(state.hour, state.minute, state.meridiem));
            onClose();
          }}
        />
      </View>
    </>
  );
}

/** Hour / minute / AM-PM grid. Large touch targets, no native dialog needed. */
export function TimePickerSheet({
  visible,
  title = 'Pick a time',
  value,
  onClose,
  onChange,
}: TimePickerSheetProps) {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose} maxBodyHeight={480}>
      {visible ? <TimePickerBody value={value} onClose={onClose} onChange={onChange} /> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cell: {
    width: 54,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSunken,
  },
  cellActive: {
    backgroundColor: Colors.primary,
  },
  sectionGap: {
    marginTop: Spacing.md,
  },
});
