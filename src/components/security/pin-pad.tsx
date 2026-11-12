import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PIN_LENGTH } from '@/services/security/app-lock';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export interface PinPadProps {
  title: string;
  subtitle: string;
  error?: string | null;
  /** Fired once the user has entered a full PIN. */
  onComplete: (pin: string) => void;
}

export function PinPad({ title, subtitle, error, onComplete }: PinPadProps) {
  const [pin, setPin] = useState('');

  const press = (key: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (key === 'del') {
      setPin((current) => current.slice(0, -1));
      return;
    }
    const next = (pin + key).slice(0, PIN_LENGTH);
    setPin(next);
    // Give the last dot a moment to fill before the caller reacts.
    if (next.length === PIN_LENGTH) setTimeout(() => onComplete(next), 120);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.lockIcon}>
        <Icon name="lock" size={26} color={Colors.primary} />
      </View>
      <AppText variant="heading" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" color={Colors.textSecondary}>
        {subtitle}
      </AppText>

      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < pin.length && styles.dotFilled,
              error ? styles.dotError : null,
            ]}
          />
        ))}
      </View>

      <View style={styles.errorSlot}>
        {error ? (
          <AppText variant="label" color={Colors.danger}>
            {error}
          </AppText>
        ) : null}
      </View>

      <View style={styles.keypad}>
        {KEYS.map((key, index) => {
          if (key === '') return <View key={`blank-${index}`} style={styles.key} />;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? 'Delete' : key}
              onPress={() => press(key)}
              style={({ pressed }) => [
                styles.key,
                key !== 'del' && styles.keyFilled,
                pressed && styles.keyPressed,
              ]}>
              {key === 'del' ? (
                <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
              ) : (
                <AppText variant="heading">{key}</AppText>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  lockIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.xxl,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
  },
  dotFilled: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  dotError: {
    borderColor: Colors.danger,
  },
  errorSlot: {
    height: 22,
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    maxWidth: 300,
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyFilled: {
    backgroundColor: Colors.surfaceSunken,
  },
  keyPressed: {
    opacity: 0.6,
  },
});
