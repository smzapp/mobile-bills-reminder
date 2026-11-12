import { Text, type TextProps } from 'react-native';

import { Colors, Typography, type TypographyVariant } from '@/constants/theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

export function AppText({
  variant = 'body',
  color = Colors.textPrimary,
  style,
  ...rest
}: AppTextProps) {
  return <Text {...rest} style={[Typography[variant], { color }, style]} />;
}
