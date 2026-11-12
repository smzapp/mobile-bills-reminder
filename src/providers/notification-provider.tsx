import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
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

import { ensureDefaultChannel } from '@/services/notifications/channels';
import {
  ensureNotificationPermission,
  getPermissionState,
  type PermissionState,
  requestExactAlarms,
} from '@/services/notifications/permissions';
import {
  reconcileAllReminders,
  type ReconcileResult,
  type ScheduledPayload,
} from '@/services/notifications/scheduler';

// Registered at module scope so a notification that launched the app is handled
// before the first screen renders.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationApi {
  permission: PermissionState | null;
  lastReconcile: ReconcileResult | null;
  /** Asks the OS for permission, then rebuilds every scheduled reminder. */
  enableNotifications: () => Promise<PermissionState>;
  allowExactAlarms: () => Promise<boolean>;
  reconcile: () => Promise<ReconcileResult | null>;
}

const NotificationContext = createContext<NotificationApi | null>(null);

export function useNotifications(): NotificationApi {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return context;
}

function openFromPayload(payload: Partial<ScheduledPayload> | undefined): void {
  if (!payload?.entityId) return;
  if (payload.entityType === 'bill') router.push(`/bills/${payload.entityId}`);
  else if (payload.entityType === 'activity') router.push(`/activities/${payload.entityId}`);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [lastReconcile, setLastReconcile] = useState<ReconcileResult | null>(null);
  const appState = useRef<string | null | undefined>(AppState.currentState);

  const reconcile = useCallback(async () => {
    try {
      const result = await reconcileAllReminders(db);
      setLastReconcile(result);
      return result;
    } catch {
      return null;
    }
  }, [db]);

  // Startup reconciliation: notifications do not survive reinstalls, permission
  // changes or an OS that dropped them, so the database is replayed every time.
  useEffect(() => {
    let active = true;
    (async () => {
      await ensureDefaultChannel().catch(() => {});
      const state = await getPermissionState().catch(() => null);
      if (active && state) setPermission(state);
      await reconcile();
    })();
    return () => {
      active = false;
    };
  }, [reconcile]);

  // A permission granted in Android settings while the app was backgrounded
  // only takes effect once we re-check and reschedule.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const previous = appState.current;
      const resumed =
        (previous === 'inactive' || previous === 'background') && next === 'active';
      appState.current = next;
      if (!resumed) return;
      void (async () => {
        const state = await getPermissionState().catch(() => null);
        if (state) setPermission(state);
        await reconcile();
      })();
    });
    return () => subscription.remove();
  }, [reconcile]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromPayload(
        response.notification.request.content.data as Partial<ScheduledPayload> | undefined,
      );
    });
    return () => subscription.remove();
  }, []);

  const enableNotifications = useCallback(async () => {
    const state = await ensureNotificationPermission();
    setPermission(state);
    await reconcile();
    return state;
  }, [reconcile]);

  const allowExactAlarms = useCallback(async () => {
    const granted = await requestExactAlarms();
    const state = await getPermissionState().catch(() => null);
    if (state) setPermission(state);
    return granted;
  }, []);

  const api = useMemo<NotificationApi>(
    () => ({ permission, lastReconcile, enableNotifications, allowExactAlarms, reconcile }),
    [permission, lastReconcile, enableNotifications, allowExactAlarms, reconcile],
  );

  return <NotificationContext.Provider value={api}>{children}</NotificationContext.Provider>;
}
