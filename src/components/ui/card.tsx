import type { ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Card({ children, onPress, style, padded = true }: CardProps) {
  const content = [styles.card, padded && styles.padded, style];

  if (!onPress) {
    return <View style={content}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: Colors.surfaceSunken }}
      style={({ pressed }) => [...content, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...(Shadow.card as object),
  },
  padded: {
    padding: Spacing.lg,
  },
  pressed: {
    opacity: 0.9,
  },
});
