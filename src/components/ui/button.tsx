import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

const PALETTE: Record<ButtonVariant, { background: string; border: string; text: string }> = {
  primary: { background: Colors.primary, border: Colors.primary, text: Colors.textInverse },
  secondary: { background: Colors.surface, border: Colors.borderStrong, text: Colors.textPrimary },
  ghost: { background: 'transparent', border: 'transparent', text: Colors.primary },
  danger: { background: Colors.dangerTint, border: Colors.dangerTint, text: Colors.danger },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const palette = PALETTE[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      android_ripple={{ color: Colors.surfaceSunken }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.large : styles.medium,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        fullWidth && styles.fullWidth,
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={18} color={palette.text} /> : null}
          <AppText variant="label" color={palette.text}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: string;
  onPress: () => void;
  color?: string;
  background?: string;
  size?: number;
  accessibilityLabel: string;
}

export function IconButton({
  icon,
  onPress,
  color = Colors.textPrimary,
  background = Colors.surfaceSunken,
  size = 40,
  accessibilityLabel,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      android_ripple={{ color: Colors.borderStrong, borderless: true }}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={Math.round(size * 0.5)} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medium: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  large: {
    paddingVertical: Spacing.lg - 2,
    paddingHorizontal: Spacing.xl,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inactive: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
