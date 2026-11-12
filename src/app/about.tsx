import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/rows';
import { AppText } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { TONES } from '@/constants/tones';

const LIMITATIONS = [
  'Android may delay reminders when battery optimisation or Doze is active. Allowing exact alarms in Settings makes delivery far more reliable, but no app can guarantee it.',
  'If you force-stop Nudge from Android settings, no reminder fires until you open it again.',
  'Notification sounds are set per channel. Changing a category ringtone creates a new channel, which is why an old entry may briefly appear in Android settings.',
  'Everything is stored on this device only. There is no account, no sync and no backup yet.',
];

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.root}>
      <ScreenHeader title="About Nudge" />
      <Screen>
        <Card>
          <AppText variant="title">Nudge</AppText>
          <AppText variant="body" color={Colors.textSecondary} style={styles.body}>
            Bills, payments and appointments, with a different ringtone for each part of your life.
          </AppText>
          <AppText variant="caption" color={Colors.textTertiary} style={styles.body}>
            Version {version}
          </AppText>
        </Card>

        <SectionHeader title="Your data" />
        <Card>
          <AppText variant="body" color={Colors.textSecondary}>
            Nudge works entirely offline. Bills, payments, activities and expenses live in a local
            SQLite database on this device. Nothing is uploaded, and the app never asks for banking
            or e-wallet credentials. Payments you record are your own notes, not real transactions.
          </AppText>
        </Card>

        <SectionHeader title="Ringtones" />
        <Card>
          <AppText variant="body" color={Colors.textSecondary}>
            The {TONES.length} bundled tones are generated from simple waveforms by a script in this
            project, so they carry no third-party licence.
          </AppText>
        </Card>

        <SectionHeader title="Known limitations" />
        <Card>
          {LIMITATIONS.map((item, index) => (
            <View key={item} style={index > 0 ? styles.limitation : undefined}>
              <AppText variant="body" color={Colors.textSecondary}>
                {'•'}  {item}
              </AppText>
            </View>
          ))}
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    marginTop: Spacing.sm,
  },
  limitation: {
    marginTop: Spacing.md,
  },
});
