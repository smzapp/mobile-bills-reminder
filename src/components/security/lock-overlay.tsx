import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinPad } from '@/components/security/pin-pad';
import { Colors } from '@/constants/theme';
import { useAppLock } from '@/providers/app-lock-provider';

/** Full-screen gate shown while the app is locked. */
export function LockOverlay() {
  const { unlock } = useAppLock();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 48, paddingBottom: insets.bottom }]}>
      <PinPad
        // Remounting on a failed attempt clears the entered digits.
        key={attempt}
        title="Welcome back"
        subtitle="Enter your 5-digit PIN to continue"
        error={error}
        onComplete={async (pin) => {
          const ok = await unlock(pin);
          if (ok) {
            setError(null);
            return;
          }
          setError('Incorrect PIN. Try again.');
          setAttempt((value) => value + 1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
});
