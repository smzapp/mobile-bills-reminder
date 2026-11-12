import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/text';
import { Colors, Radius, Shadow, Spacing, TAB_BAR_HEIGHT } from '@/constants/theme';

const AUTO_DISMISS_MS = 4000;

interface ToastState {
  /** Changes on every call so repeated identical messages still restart the timer. */
  id: number;
  text: string;
  undoLabel: string;
  onUndo?: () => void;
}

interface ToastApi {
  /** Shows a message, optionally with a single undo affordance. */
  showToast: (text: string, undo?: { label?: string; onUndo: () => void }) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  // Held in state rather than a ref so it is never touched during render.
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  const hideToast = useCallback(() => setToast(null), []);

  const showToast = useCallback<ToastApi['showToast']>((text, undo) => {
    setToast({
      id: Date.now(),
      text,
      undoLabel: undo?.label ?? 'Undo',
      onUndo: undo?.onUndo,
    });
  }, []);

  useEffect(() => {
    if (!toast) {
      opacity.setValue(0);
      return;
    }
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, opacity]);

  const api = useMemo<ToastApi>(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrapper, { opacity, bottom: TAB_BAR_HEIGHT + insets.bottom + Spacing.lg }]}>
          <View style={styles.toast}>
            <AppText variant="bodyStrong" color={Colors.textInverse} style={styles.text}>
              {toast.text}
            </AppText>
            {toast.onUndo ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.onUndo?.();
                  hideToast();
                }}
                hitSlop={8}>
                <AppText variant="label" color={Colors.primaryTint}>
                  {toast.undoLabel}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    backgroundColor: Colors.ink,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    ...(Shadow.raised as object),
  },
  text: {
    flexShrink: 1,
  },
});
