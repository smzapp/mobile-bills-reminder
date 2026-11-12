import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** 'close' for forms presented as a modal, 'arrow-left' for pushed screens. */
  backIcon?: 'arrow-left' | 'x';
  onBack?: () => void;
  right?: ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  backIcon = 'arrow-left',
  onBack,
  right,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
      <IconButton
        icon={backIcon}
        onPress={goBack}
        accessibilityLabel="Go back"
        background={Colors.surfaceSunken}
      />
      <View style={styles.titleBlock}>
        <AppText variant="subtitle" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
