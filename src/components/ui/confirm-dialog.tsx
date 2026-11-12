import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Promise-based confirmation, used before every permanent delete. */
export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={options !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => settle(false)}>
        <Pressable style={styles.backdrop} onPress={() => settle(false)} />
        <View style={styles.centered} pointerEvents="box-none">
          <View style={styles.dialog}>
            <AppText variant="subtitle">{options?.title}</AppText>
            <AppText variant="body" color={Colors.textSecondary}>
              {options?.message}
            </AppText>
            <View style={styles.actions}>
              <View style={styles.actionItem}>
                <Button
                  label={options?.cancelLabel ?? 'Cancel'}
                  variant="secondary"
                  onPress={() => settle(false)}
                  fullWidth
                />
              </View>
              <View style={styles.actionItem}>
                <Button
                  label={options?.confirmLabel ?? 'Confirm'}
                  variant={options?.destructive ? 'danger' : 'primary'}
                  onPress={() => settle(true)}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.sm,
    ...(Shadow.raised as object),
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionItem: {
    flex: 1,
  },
});
