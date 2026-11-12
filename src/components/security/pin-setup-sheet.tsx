import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PinPad } from '@/components/security/pin-pad';
import { BottomSheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { useAppLock } from '@/providers/app-lock-provider';

export interface PinSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}

interface PinSetupBodyProps {
  onClose: () => void;
  onDone: () => void;
  onStageChange: (confirming: boolean) => void;
}

/** Two-step PIN creation: enter, then confirm. */
function PinSetupBody({ onClose, onDone, onStageChange }: PinSetupBodyProps) {
  const { setPin } = useAppLock();
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const handle = async (pin: string) => {
    if (first === null) {
      setFirst(pin);
      setError(null);
      setAttempt((value) => value + 1);
      onStageChange(true);
      return;
    }
    if (first !== pin) {
      setFirst(null);
      setError('Those did not match. Start again.');
      setAttempt((value) => value + 1);
      onStageChange(false);
      return;
    }
    try {
      await setPin(pin);
      onDone();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the PIN.');
      setFirst(null);
      setAttempt((value) => value + 1);
      onStageChange(false);
    }
  };

  return (
    <View style={styles.body}>
      <PinPad
        key={attempt}
        title={first === null ? 'Enter 5 digits' : 'Enter them again'}
        subtitle={first === null ? 'Pick something you will remember' : 'Just to be sure'}
        error={error}
        onComplete={handle}
      />
    </View>
  );
}

export function PinSetupSheet({ visible, onClose, onDone }: PinSetupSheetProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <BottomSheet
      visible={visible}
      title={confirming ? 'Confirm your PIN' : 'Choose a PIN'}
      subtitle="Nudge asks for this each time you open the app."
      onClose={onClose}
      maxBodyHeight={560}>
      {visible ? (
        // Mounted only while open, so every session starts from a clean slate.
        <PinSetupBody onClose={onClose} onDone={onDone} onStageChange={setConfirming} />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: Spacing.lg,
  },
});
