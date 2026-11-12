import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockOverlay } from '@/components/security/lock-overlay';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { ToastProvider } from '@/components/ui/toast';
import { Colors } from '@/constants/theme';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/database';
import { AppLockProvider, useAppLock } from '@/providers/app-lock-provider';
import { DataVersionProvider } from '@/providers/data-version';
import { NotificationProvider } from '@/providers/notification-provider';
import { SettingsProvider } from '@/providers/settings-provider';

SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash screen may already be hidden during fast refresh.
});

function AppShell() {
  const { locked, ready } = useAppLock();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bills/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="activities/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="expenses/create" options={{ presentation: 'modal' }} />
      </Stack>
      {ready && locked ? <LockOverlay /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
          <SettingsProvider>
            <AppLockProvider>
              <DataVersionProvider>
                <NotificationProvider>
                  <ConfirmProvider>
                    <ToastProvider>
                      <AppShell />
                    </ToastProvider>
                  </ConfirmProvider>
                </NotificationProvider>
              </DataVersionProvider>
            </AppLockProvider>
          </SettingsProvider>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
