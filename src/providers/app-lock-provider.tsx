import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { useSettings } from '@/providers/settings-provider';
import { clearPin, hasPin, setPin as persistPin, verifyPin } from '@/services/security/app-lock';

/** Re-lock after this long in the background. */
const RELOCK_AFTER_MS = 60_000;

interface AppLockApi {
  /** True while the lock screen should cover the app. */
  locked: boolean;
  /** False until the stored PIN state has been read. */
  ready: boolean;
  enabled: boolean;
  unlock: (pin: string) => Promise<boolean>;
  lockNow: () => void;
  setPin: (pin: string) => Promise<void>;
  disableLock: () => Promise<void>;
}

const AppLockContext = createContext<AppLockApi | null>(null);

export function useAppLock(): AppLockApi {
  const context = useContext(AppLockContext);
  if (!context) throw new Error('useAppLock must be used inside <AppLockProvider>');
  return context;
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings, ready: settingsReady } = useSettings();
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!settingsReady) return;
    let active = true;
    hasPin().then((stored) => {
      if (!active) return;
      const on = stored && settings.appLockEnabled;
      setEnabled(on);
      setLocked(on);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [settingsReady, settings.appLockEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (enabled && since !== null && Date.now() - since > RELOCK_AFTER_MS) setLocked(true);
      } else if (next === 'background') {
        backgroundedAt.current = Date.now();
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  const unlock = useCallback(async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) setLocked(false);
    return ok;
  }, []);

  const setPin = useCallback(
    async (pin: string) => {
      await persistPin(pin);
      await updateSettings({ appLockEnabled: true });
      setEnabled(true);
      setLocked(false);
    },
    [updateSettings],
  );

  const disableLock = useCallback(async () => {
    await clearPin();
    await updateSettings({ appLockEnabled: false });
    setEnabled(false);
    setLocked(false);
  }, [updateSettings]);

  const lockNow = useCallback(() => {
    if (enabled) setLocked(true);
  }, [enabled]);

  const api = useMemo<AppLockApi>(
    () => ({ locked, ready, enabled, unlock, lockNow, setPin, disableLock }),
    [locked, ready, enabled, unlock, lockNow, setPin, disableLock],
  );

  return <AppLockContext.Provider value={api}>{children}</AppLockContext.Provider>;
}
