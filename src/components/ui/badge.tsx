import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { BillStatus } from '@/types/domain';
import { billStatusMeta } from '@/utils/status';

export interface BadgeProps {
  label: string;
  color: string;
  tint: string;
}

export function Badge({ label, color, tint }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: tint }]}>
      <AppText variant="caption" color={color} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

export function StatusBadge({ status }: { status: BillStatus }) {
  const meta = billStatusMeta(status);
  return <Badge label={meta.label} color={meta.color} tint={meta.tint} />;
}

export interface CategoryChipProps {
  name: string;
  tint: string;
  ink: string;
}

export function CategoryChip({ name, tint, ink }: CategoryChipProps) {
  return <Badge label={name} color={ink} tint={tint} />;
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSunken,
  },
});
