import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ensureDefaultChannel } from '@/services/notifications/channels';

export interface PermissionState {
  granted: boolean;
  canAskAgain: boolean;
  /** Android 12+: whether the OS will honour exact alarm times. */
  exactAlarmsAllowed: boolean;
}

/**
 * Android only shows the notification prompt once at least one channel exists,
 * so the default channel is created first.
 */
export async function ensureNotificationPermission(): Promise<PermissionState> {
  await ensureDefaultChannel();

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  let canAskAgain = current.canAskAgain;

  if (!granted && canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
    canAskAgain = requested.canAskAgain;
  }

  return { granted, canAskAgain, exactAlarmsAllowed: await exactAlarmsAllowed() };
}

export async function getPermissionState(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();
  return {
    granted: current.granted,
    canAskAgain: current.canAskAgain,
    exactAlarmsAllowed: await exactAlarmsAllowed(),
  };
}

export async function exactAlarmsAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const status = await Notifications.getExactAlarmPermissionsAsync();
    return status.granted;
  } catch {
    // Older Android versions have no such permission; alarms are exact anyway.
    return true;
  }
}

/**
 * Opens the system screen where the user can allow exact alarms.
 * Android 14+ denies this by default for newly installed apps.
 */
export async function requestExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const status = await Notifications.requestExactAlarmPermissionsAsync();
    return status.granted;
  } catch {
    return false;
  }
}
