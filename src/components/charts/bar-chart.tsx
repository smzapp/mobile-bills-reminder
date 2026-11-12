import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Formatted value shown above the bar. */
  display: string;
  highlighted?: boolean;
}

export interface BarChartProps {
  data: readonly BarDatum[];
  height?: number;
}

/** Plain View-based bar chart: no chart dependency, no SVG, works everywhere. */
export function BarChart({ data, height = 110 }: BarChartProps) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <View style={styles.wrapper}>
      {data.map((item) => {
        const barHeight = Math.max(6, Math.round((item.value / max) * height));
        return (
          <View key={item.key} style={styles.column}>
            <AppText
              variant="caption"
              color={item.highlighted ? Colors.primary : Colors.textSecondary}
              numberOfLines={1}>
              {item.display}
            </AppText>
            <View style={[styles.track, { height }]}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: item.highlighted ? Colors.primary : Colors.surfaceSunken,
                  },
                ]}
              />
            </View>
            <AppText
              variant="caption"
              color={item.highlighted ? Colors.textPrimary : Colors.textSecondary}>
              {item.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

export interface BreakdownDatum {
  key: string;
  label: string;
  value: number;
  display: string;
  percent: number;
  color: string;
}

/** Horizontal share-of-total rows used for the category breakdown. */
export function Breakdown({ data }: { data: readonly BreakdownDatum[] }) {
  return (
    <View style={styles.breakdown}>
      {data.map((item) => (
        <View key={item.key} style={styles.breakdownRow}>
          <View style={styles.breakdownHeader}>
            <View style={styles.breakdownLabel}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <AppText variant="bodyStrong">{item.label}</AppText>
            </View>
            <View style={styles.breakdownValue}>
              <AppText variant="bodyStrong">{item.display}</AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                {Math.round(item.percent)}%
              </AppText>
            </View>
          </View>
          <View style={styles.breakdownTrack}>
            <View
              style={[
                styles.breakdownFill,
                { width: `${Math.max(2, Math.min(100, item.percent))}%`, backgroundColor: item.color },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  track: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: Radius.sm,
  },
  breakdown: {
    gap: Spacing.md,
  },
  breakdownRow: {
    gap: Spacing.xs + 2,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  breakdownValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSunken,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: 8,
    borderRadius: 4,
  },
});
