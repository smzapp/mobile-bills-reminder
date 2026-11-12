import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PinSetupSheet } from '@/components/security/pin-setup-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/chips';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Field, TextField, ValueField } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Divider, SectionHeader, ToggleRow } from '@/components/ui/rows';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { BottomSheet } from '@/components/ui/sheet';
import { AppText } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { REMINDER_OPTIONS, SNOOZE_OPTIONS } from '@/constants/reminders';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppLock } from '@/providers/app-lock-provider';
import { useNotifications } from '@/providers/notification-provider';
import { useSettings } from '@/providers/settings-provider';
import { minorToInput, parseAmountToMinor } from '@/utils/money';

const CURRENCIES = [
  { code: 'PHP', symbol: '₱', label: 'Philippine peso' },
  { code: 'USD', symbol: '$', label: 'US dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'Pound sterling' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore dollar' },
  { code: 'AED', symbol: 'AED ', label: 'UAE dirham' },
];

type SheetKind = 'currency' | 'budget' | 'billReminder' | 'activityReminder' | null;

export default function SettingsScreen() {
  const { settings, updateSettings, money } = useSettings();
  const { permission, enableNotifications, allowExactAlarms, reconcile, lastReconcile } =
    useNotifications();
  const lock = useAppLock();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(minorToInput(settings.monthlyBudget));
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const toggleLock = async (next: boolean) => {
    if (next) {
      setPinSetupOpen(true);
      return;
    }
    const ok = await confirm({
      title: 'Turn off app lock?',
      message: 'Your PIN will be deleted and Nudge will open without asking for it.',
      confirmLabel: 'Turn off',
      destructive: true,
    });
    if (!ok) return;
    await lock.disableLock();
    showToast('App lock turned off');
  };

  const saveBudget = async () => {
    const parsed = parseAmountToMinor(budgetDraft);
    if (parsed === null || parsed <= 0) {
      setBudgetError('Enter an amount greater than zero.');
      return;
    }
    await updateSettings({ monthlyBudget: parsed });
    setSheet(null);
    showToast('Monthly budget updated');
  };

  const notificationsOff = permission !== null && !permission.granted;
  const exactAlarmsOff = permission !== null && permission.granted && !permission.exactAlarmsAllowed;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Settings" />
      <Screen>
        {notificationsOff ? (
          <Card style={styles.warning}>
            <View style={styles.warningHeader}>
              <Icon name="bell-off" size={18} color={Colors.danger} />
              <AppText variant="bodyStrong" color={Colors.danger}>
                Notifications are turned off
              </AppText>
            </View>
            <AppText variant="caption" color={Colors.textSecondary}>
              Nudge cannot remind you about bills or activities until Android allows notifications.
            </AppText>
            <View style={styles.warningAction}>
              <Button
                label={permission?.canAskAgain ? 'Allow notifications' : 'Open Android settings'}
                onPress={async () => {
                  const state = await enableNotifications();
                  showToast(
                    state.granted ? 'Notifications enabled' : 'Allow them in Android settings',
                  );
                }}
                fullWidth
              />
            </View>
          </Card>
        ) : null}

        {exactAlarmsOff ? (
          <Card style={styles.warning}>
            <View style={styles.warningHeader}>
              <Icon name="clock" size={18} color={Colors.warning} />
              <AppText variant="bodyStrong" color={Colors.warning}>
                Reminders may arrive late
              </AppText>
            </View>
            <AppText variant="caption" color={Colors.textSecondary}>
              Android is batching alarms to save battery. Allow exact alarms for on-time reminders.
            </AppText>
            <View style={styles.warningAction}>
              <Button
                label="Allow exact alarms"
                variant="secondary"
                onPress={async () => {
                  const granted = await allowExactAlarms();
                  showToast(granted ? 'Exact alarms allowed' : 'Permission not granted');
                }}
                fullWidth
              />
            </View>
          </Card>
        ) : null}

        <SectionHeader title="Security" />
        <Card>
          <ToggleRow
            label="App lock"
            description="Ask for a 5-digit PIN when Nudge opens"
            value={lock.enabled}
            onValueChange={toggleLock}
          />
          {lock.enabled ? (
            <>
              <Divider />
              <ValueField
                label="PIN"
                value="Change PIN"
                icon="lock"
                onPress={() => setPinSetupOpen(true)}
              />
              <Divider />
              <View style={styles.inlineAction}>
                <Button label="Lock now" variant="secondary" onPress={lock.lockNow} fullWidth />
              </View>
            </>
          ) : null}
        </Card>

        <SectionHeader title="Alerts" />
        <Card>
          <ToggleRow
            label="Reminders"
            description="Turn off to stop every scheduled reminder"
            value={settings.notificationsEnabled}
            onValueChange={async (value) => {
              await updateSettings({ notificationsEnabled: value });
              await reconcile();
              showToast(value ? 'Reminders on' : 'All reminders cancelled');
            }}
          />
          <Divider />
          <ToggleRow
            label="Vibrate with ringtone"
            value={settings.vibrateWithRingtone}
            onValueChange={async (value) => {
              await updateSettings({ vibrateWithRingtone: value });
              await reconcile();
            }}
            disabled={!settings.notificationsEnabled}
          />
          <Divider />
          <ToggleRow
            label="Ring in silent mode"
            description="Android decides the final behaviour per channel"
            value={settings.ringInSilentMode}
            onValueChange={async (value) => {
              await updateSettings({ ringInSilentMode: value });
              await reconcile();
            }}
            disabled={!settings.notificationsEnabled}
          />
          <Divider />
          <Field label="Snooze for">
            <ChoiceChips
              options={SNOOZE_OPTIONS.map((minutes) => ({
                value: minutes,
                label: `${minutes} min`,
              }))}
              value={settings.snoozeMinutes}
              onChange={(snoozeMinutes) => updateSettings({ snoozeMinutes })}
            />
          </Field>
          <Divider />
          <ValueField
            label="Ringtones"
            value="Set per category"
            icon="music"
            onPress={() => router.push('/categories')}
          />
        </Card>

        <SectionHeader title="Defaults" />
        <Card>
          <ValueField
            label="Currency"
            value={`${settings.currency} (${settings.currencySymbol.trim()})`}
            icon="wallet"
            onPress={() => setSheet('currency')}
          />
          <Divider />
          <ValueField
            label="Monthly budget"
            value={money(settings.monthlyBudget)}
            icon="pie-chart"
            onPress={() => {
              setBudgetDraft(minorToInput(settings.monthlyBudget));
              setBudgetError(null);
              setSheet('budget');
            }}
          />
          <Divider />
          <Field label="Default bill reminder">
            <ChoiceChips
              options={REMINDER_OPTIONS.map((option) => ({
                value: option.minutes,
                label: option.shortLabel,
              }))}
              value={settings.defaultBillReminderMinutes}
              onChange={(defaultBillReminderMinutes) =>
                updateSettings({ defaultBillReminderMinutes })
              }
            />
          </Field>
          <Divider />
          <Field label="Default activity reminder">
            <ChoiceChips
              options={REMINDER_OPTIONS.map((option) => ({
                value: option.minutes,
                label: option.shortLabel,
              }))}
              value={settings.defaultActivityReminderMinutes}
              onChange={(defaultActivityReminderMinutes) =>
                updateSettings({ defaultActivityReminderMinutes })
              }
            />
          </Field>
        </Card>

        <SectionHeader title="Maintenance" />
        <Card>
          <AppText variant="body" color={Colors.textSecondary}>
            Rebuild every scheduled reminder from the database. Useful after changing Android
            permissions, restoring a backup or travelling across time zones.
          </AppText>
          {lastReconcile ? (
            <AppText variant="caption" color={Colors.textSecondary} style={styles.reconcileNote}>
              Last run scheduled {lastReconcile.scheduled} reminder
              {lastReconcile.scheduled === 1 ? '' : 's'}.
            </AppText>
          ) : null}
          <View style={styles.inlineAction}>
            <Button
              label="Reschedule reminders"
              icon="repeat"
              variant="secondary"
              loading={working}
              onPress={async () => {
                setWorking(true);
                const result = await reconcile();
                setWorking(false);
                showToast(
                  result
                    ? `Scheduled ${result.scheduled} reminder${result.scheduled === 1 ? '' : 's'}`
                    : 'Could not reschedule reminders',
                );
              }}
              fullWidth
            />
          </View>
        </Card>
      </Screen>

      <BottomSheet
        visible={sheet === 'currency'}
        title="Currency"
        subtitle="Used for every amount in the app."
        onClose={() => setSheet(null)}>
        {CURRENCIES.map((currency) => (
          <View key={currency.code} style={styles.currencyRow}>
            <Button
              label={`${currency.symbol.trim()}  ${currency.label}`}
              variant={settings.currency === currency.code ? 'primary' : 'secondary'}
              fullWidth
              onPress={async () => {
                await updateSettings({
                  currency: currency.code,
                  currencySymbol: currency.symbol,
                });
                setSheet(null);
                showToast(`Currency set to ${currency.code}`);
              }}
            />
          </View>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'budget'}
        title="Monthly budget"
        subtitle="Spending is measured against this each month."
        onClose={() => setSheet(null)}>
        <View style={styles.budgetBody}>
          <TextField
            label="Budget"
            value={budgetDraft}
            onChangeText={(next) => {
              setBudgetDraft(next.replace(/[^0-9.]/g, ''));
              setBudgetError(null);
            }}
            keyboardType="decimal-pad"
            prefix={settings.currencySymbol}
            error={budgetError}
          />
          <Button label="Save budget" onPress={saveBudget} fullWidth />
        </View>
      </BottomSheet>

      <PinSetupSheet
        visible={pinSetupOpen}
        onClose={() => setPinSetupOpen(false)}
        onDone={() => showToast('App lock is on')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  warning: {
    borderColor: Colors.borderStrong,
    borderRadius: Radius.lg,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  warningAction: {
    marginTop: Spacing.md,
  },
  inlineAction: {
    marginTop: Spacing.md,
  },
  reconcileNote: {
    marginTop: Spacing.sm,
  },
  currencyRow: {
    marginBottom: Spacing.sm,
  },
  budgetBody: {
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
