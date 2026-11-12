/**
 * Nudge design tokens.
 *
 * Core palette follows the project brief. Per-category colour triples are
 * converted from the oklch values used in the Nudge design reference
 * (React Native has no oklch() support, so they are baked to hex).
 */
import { Platform, type TextStyle } from 'react-native';

export const Colors = {
  background: '#F6F5F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EFEB',
  surfaceSunken: '#ECEAE5',

  primary: '#24718A',
  primaryDark: '#1A5468',
  primaryLight: '#DDF3EB',
  primaryTint: '#DEEEF6',

  textPrimary: '#202020',
  textSecondary: '#858585',
  textTertiary: '#A9A59D',
  textInverse: '#FFFFFF',

  success: '#229B73',
  successTint: '#E0F5E6',
  warning: '#E6A23C',
  warningTint: '#FBEEDB',
  danger: '#DC5555',
  dangerTint: '#FBE9E9',

  border: '#ECEBE8',
  borderStrong: '#DAD7D0',

  overlay: 'rgba(32,32,32,0.32)',
  ink: '#1C1B19',
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  sheet: 26,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'eyebrow'
  | 'amount';

export const Typography: Record<TypographyVariant, TextStyle> = {
  display: { fontFamily: FontFamily.extrabold, fontSize: 34, letterSpacing: -0.8, lineHeight: 40 },
  title: { fontFamily: FontFamily.bold, fontSize: 26, letterSpacing: -0.5, lineHeight: 32 },
  heading: { fontFamily: FontFamily.bold, fontSize: 20, letterSpacing: -0.2, lineHeight: 26 },
  subtitle: { fontFamily: FontFamily.bold, fontSize: 17, letterSpacing: -0.1, lineHeight: 22 },
  body: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 16 },
  eyebrow: {
    fontFamily: FontFamily.extrabold,
    fontSize: 11.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    lineHeight: 15,
  },
  amount: { fontFamily: FontFamily.extrabold, fontSize: 24, letterSpacing: -0.6, lineHeight: 30 },
};

export const Shadow = {
  card: Platform.select({
    android: { elevation: 1 },
    default: {
      shadowColor: '#1C1B19',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
  }),
  raised: Platform.select({
    android: { elevation: 6 },
    default: {
      shadowColor: '#1C1B19',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
  }),
} as const;

export const TAB_BAR_HEIGHT = 64;
export const FAB_SIZE = 56;
