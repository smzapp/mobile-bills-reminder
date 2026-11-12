import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Colors, FAB_SIZE, Shadow, Spacing, TAB_BAR_HEIGHT } from '@/constants/theme';

export interface FabProps {
  onPress: () => void;
  icon?: string;
  accessibilityLabel?: string;
}

export function Fab({ onPress, icon = 'plus', accessibilityLabel = 'Add new item' }: FabProps) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      android_ripple={{ color: Colors.primaryDark, borderless: false }}
      style={({ pressed }) => [
        styles.fab,
        { bottom: TAB_BAR_HEIGHT + insets.bottom + Spacing.lg },
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={26} color={Colors.textInverse} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Shadow.raised as object),
  },
  pressed: {
    opacity: 0.9,
  },
});
