import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_APP_SETTINGS, readSettings, writeSettings } from '@/database/repositories/settings';
import type { AppSettings, Minor } from '@/types/domain';
import { formatMoney, formatMoneyCompact } from '@/utils/money';

interface SettingsApi {
  settings: AppSettings;
  ready: boolean;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  /** Formats using the user's chosen currency symbol. */
  money: (amount: Minor, withDecimals?: boolean) => string;
  moneyCompact: (amount: Minor) => string;
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function useSettings(): SettingsApi {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>');
  return context;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    readSettings(db)
      .then((loaded) => {
        if (active) setSettings(loaded);
      })
      .catch(() => {
        // Fall back to defaults; the Settings screen surfaces write errors.
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [db]);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      await writeSettings(db, patch);
      setSettings((current) => ({ ...current, ...patch }));
    },
    [db],
  );

  const api = useMemo<SettingsApi>(
    () => ({
      settings,
      ready,
      updateSettings,
      money: (amount, withDecimals = true) =>
        formatMoney(amount, settings.currencySymbol, withDecimals),
      moneyCompact: (amount) => formatMoneyCompact(amount, settings.currencySymbol),
    }),
    [settings, ready, updateSettings],
  );

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}
