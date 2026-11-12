import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { ISODate } from '@/types/domain';
import { MONTHS_LONG, toISODate, todayISO } from '@/utils/date';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface MonthGridProps {
  year: number;
  month: number;
  selected: ISODate | null;
  /** Per-day dot colours, keyed by ISO date. */
  markers?: Map<ISODate, string[]>;
  onSelect: (date: ISODate) => void;
  onMonthChange: (year: number, month: number) => void;
}

export function MonthGrid({
  year,
  month,
  selected,
  markers,
  onSelect,
  onMonthChange,
}: MonthGridProps) {
  const today = todayISO();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ date: ISODate; day: number } | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: toISODate(new Date(year, month, day)), day });
  }

  const shift = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    onMonthChange(next.getFullYear(), next.getMonth());
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-left"
          accessibilityLabel="Previous month"
          size={34}
          background={Colors.surfaceSunken}
          onPress={() => shift(-1)}
        />
        <AppText variant="subtitle">
          {MONTHS_LONG[month]} {year}
        </AppText>
        <IconButton
          icon="chevron-right"
          accessibilityLabel="Next month"
          size={34}
          background={Colors.surfaceSunken}
          onPress={() => shift(1)}
        />
      </View>

      <View style={styles.weekdays}>
        {WEEKDAY_INITIALS.map((initial, index) => (
          <AppText
            key={`${initial}-${index}`}
            variant="caption"
            color={Colors.textSecondary}
            style={styles.weekday}>
            {initial}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell) return <View key={`blank-${index}`} style={styles.cell} />;
          const isSelected = cell.date === selected;
          const isToday = cell.date === today;
          const dots = markers?.get(cell.date) ?? [];
          return (
            <Pressable
              key={cell.date}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(cell.date)}
              style={styles.cell}>
              <View
                style={[
                  styles.dayCircle,
                  isToday && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}>
                <AppText
                  variant="label"
                  color={
                    isSelected
                      ? Colors.textInverse
                      : isToday
                        ? Colors.primary
                        : Colors.textPrimary
                  }>
                  {cell.day}
                </AppText>
              </View>
              <View style={styles.dots}>
                {dots.slice(0, 3).map((color, dotIndex) => (
                  <View
                    key={`${cell.date}-${dotIndex}`}
                    style={[styles.dot, { backgroundColor: isSelected ? Colors.surface : color }]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    backgroundColor: Colors.primaryTint,
  },
  daySelected: {
    backgroundColor: Colors.primary,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

export const MonthGridRadius = Radius.md;
