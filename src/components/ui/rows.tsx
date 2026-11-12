import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="eyebrow" color={Colors.textSecondary}>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <AppText variant="label" color={Colors.primary}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}

/** Icon + label on the left, value (and chevron when tappable) on the right. */
export function InfoRow({ icon, label, value, onPress }: InfoRowProps) {
  const body = (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Icon name={icon} size={18} color={Colors.textSecondary} />
        <AppText variant="body" color={Colors.textSecondary}>
          {label}
        </AppText>
      </View>
      <View style={styles.infoRight}>
        <AppText variant="bodyStrong" style={styles.infoValue} numberOfLines={1}>
          {value}
        </AppText>
        {onPress ? <Icon name="chevron-right" size={16} color={Colors.textTertiary} /> : null}
      </View>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} android_ripple={{ color: Colors.surfaceSunken }}>
      {body}
    </Pressable>
  );
}

export interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <AppText variant="bodyStrong" color={disabled ? Colors.textTertiary : Colors.textPrimary}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" color={Colors.textSecondary}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: Colors.primary, false: Colors.borderStrong }}
        thumbColor={Colors.surface}
      />
    </View>
  );
}

export interface NavRowProps {
  icon: string;
  label: string;
  description?: string;
  onPress: () => void;
  tint?: string;
  ink?: string;
}

export function NavRow({ icon, label, description, onPress, tint, ink }: NavRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: Colors.surfaceSunken }}
      style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}>
      <View style={[styles.navIcon, { backgroundColor: tint ?? Colors.surfaceSunken }]}>
        <Icon name={icon} size={19} color={ink ?? Colors.textPrimary} />
      </View>
      <View style={styles.navText}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" color={Colors.textSecondary}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron-right" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
});
