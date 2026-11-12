import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MonthGrid } from '@/components/calendar/month-grid';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import type { ISODate } from '@/types/domain';
import { parseISODate, todayISO } from '@/utils/date';

export interface DatePickerSheetProps {
  visible: boolean;
  title?: string;
  value: ISODate;
  onClose: () => void;
  onChange: (value: ISODate) => void;
}

function DatePickerBody({
  value,
  onClose,
  onChange,
}: Pick<DatePickerSheetProps, 'value' | 'onClose' | 'onChange'>) {
  const initial = parseISODate(value);
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [selected, setSelected] = useState<ISODate>(value);

  return (
    <>
      <MonthGrid
        year={year}
        month={month}
        selected={selected}
        onSelect={setSelected}
        onMonthChange={(nextYear, nextMonth) => {
          setYear(nextYear);
          setMonth(nextMonth);
        }}
      />
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            label="Today"
            variant="secondary"
            fullWidth
            onPress={() => {
              const today = todayISO();
              const date = parseISODate(today);
              setYear(date.getFullYear());
              setMonth(date.getMonth());
              setSelected(today);
            }}
          />
        </View>
        <View style={styles.action}>
          <Button
            label="Done"
            fullWidth
            onPress={() => {
              onChange(selected);
              onClose();
            }}
          />
        </View>
      </View>
    </>
  );
}

/** In-app calendar picker, so the app keeps one date UI on every Android version. */
export function DatePickerSheet({
  visible,
  title = 'Pick a date',
  value,
  onClose,
  onChange,
}: DatePickerSheetProps) {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose} maxBodyHeight={520}>
      {/* Mounted only while open, so it always opens on the current value. */}
      {visible ? <DatePickerBody value={value} onClose={onClose} onChange={onChange} /> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  action: {
    flex: 1,
  },
});
