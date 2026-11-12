import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export interface ProgressBarProps {
  /** 0-100. Values above 100 are clamped but recoloured by `over`. */
  percent: number;
  color?: string;
  track?: string;
  height?: number;
  over?: boolean;
}

export function ProgressBar({
  percent,
  color = Colors.primary,
  track = Colors.surfaceSunken,
  height = 10,
  over = false,
}: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(100, percent))}%` as const;
  return (
    <View style={[styles.track, { backgroundColor: track, height, borderRadius: height / 2 }]}>
      <View
        style={{
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: over ? Colors.danger : color,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: Radius.pill,
  },
});
