import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/text';
import { Colors, Spacing, TAB_BAR_HEIGHT } from '@/constants/theme';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Adds bottom padding so content clears the tab bar and FAB. */
  withTabBar?: boolean;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  withTabBar = false,
  loading = false,
  error = null,
  onRefresh,
  refreshing = false,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = withTabBar ? TAB_BAR_HEIGHT + Spacing.xxxl + 28 : Spacing.xxl;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { paddingHorizontal: Spacing.xl }]}>
        <AppText variant="subtitle">Something went wrong</AppText>
        <AppText variant="body" color={Colors.textSecondary} style={styles.errorBody}>
          {error}
        </AppText>
      </View>
    );
  }

  if (!scroll) {
    return (
      <View style={[styles.container, { paddingBottom }, contentStyle]}>{children}</View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: paddingBottom + insets.bottom },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        ) : undefined
      }>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  errorBody: {
    textAlign: 'center',
  },
});
