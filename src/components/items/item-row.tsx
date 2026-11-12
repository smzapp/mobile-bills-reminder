import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/providers/settings-provider';
import type { ActivityWithCategory, BillWithState, ExpenseWithCategory } from '@/types/domain';
import { formatShortDate, formatTime12, relativeDayLabel } from '@/utils/date';
import { billStatusDetail, billStatusMeta } from '@/utils/status';

interface RowShellProps {
  icon: string;
  tint: string;
  ink: string;
  title: string;
  subtitle: string;
  subtitleColor?: string;
  value: string;
  valueCaption?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
}

function RowShell({
  icon,
  tint,
  ink,
  title,
  subtitle,
  subtitleColor = Colors.textSecondary,
  value,
  valueCaption,
  onPress,
  trailing,
}: RowShellProps) {
  const content = (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: tint }]}>
        <Icon name={icon} size={18} color={ink} />
      </View>
      <View style={styles.body}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color={subtitleColor} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <View style={styles.valueBlock}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {value}
        </AppText>
        {valueCaption ? (
          <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
            {valueCaption}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: Colors.surfaceSunken }}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

export function BillRow({
  bill,
  onPress,
  trailing,
}: {
  bill: BillWithState;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  const { money } = useSettings();
  const meta = billStatusMeta(bill.displayStatus);
  const partial = bill.displayStatus === 'partially_paid' || (bill.paidAmount > 0 && bill.balance > 0);
  return (
    <RowShell
      icon="receipt"
      tint={bill.category.tint}
      ink={bill.category.ink}
      title={bill.title}
      subtitle={`${bill.category.name} · ${billStatusDetail(bill.displayStatus, bill.dueDate)}`}
      subtitleColor={meta.color}
      value={money(partial ? bill.balance : bill.amount)}
      valueCaption={partial ? 'balance' : undefined}
      onPress={onPress}
      trailing={trailing}
    />
  );
}

export function ActivityRow({
  activity,
  onPress,
  trailing,
}: {
  activity: ActivityWithCategory;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  const time = formatTime12(activity.startTime);
  return (
    <RowShell
      icon="calendar"
      tint={activity.category.tint}
      ink={activity.category.ink}
      title={activity.title}
      subtitle={
        activity.location
          ? `${activity.category.name} · ${activity.location}`
          : activity.category.name
      }
      value={time || relativeDayLabel(activity.startDate)}
      valueCaption={time ? relativeDayLabel(activity.startDate) : undefined}
      onPress={onPress}
      trailing={trailing}
    />
  );
}

export function ExpenseRow({
  expense,
  onPress,
  trailing,
}: {
  expense: ExpenseWithCategory;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  const { money } = useSettings();
  return (
    <RowShell
      icon="wallet"
      tint={expense.category.tint}
      ink={expense.category.ink}
      title={expense.title}
      subtitle={`${expense.category.name} · ${formatShortDate(expense.expenseDate)}`}
      value={money(expense.amount)}
      onPress={onPress}
      trailing={trailing}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md - 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  valueBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
