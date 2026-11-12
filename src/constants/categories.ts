/**
 * Seed categories.
 *
 * Colours are the Nudge design's per-category oklch triples converted to hex:
 * dot = oklch(0.64 0.11 h), tint = oklch(0.95 0.028 h), ink = oklch(0.43 0.09 h).
 * Keeping the three together means a chip, a dot and its label always agree.
 */

export interface CategorySeed {
  id: string;
  name: string;
  color: string;
  tint: string;
  ink: string;
  icon: string;
  ringtone: string;
}

export const CATEGORY_SEEDS: readonly CategorySeed[] = [
  {
    id: 'personal',
    name: 'Personal',
    color: '#5590CC',
    tint: '#E1F0FF',
    ink: '#24527F',
    icon: 'user',
    ringtone: 'soft_chime',
  },
  {
    id: 'family',
    name: 'Family',
    color: '#B871A1',
    tint: '#FCE8F4',
    ink: '#703A5F',
    icon: 'heart',
    ringtone: 'warm_notification',
  },
  {
    id: 'work',
    name: 'Work',
    color: '#33A182',
    tint: '#DDF5EC',
    ink: '#005F48',
    icon: 'briefcase',
    ringtone: 'professional_alert',
  },
  {
    id: 'business',
    name: 'Business',
    color: '#C6706A',
    tint: '#FFE8E5',
    ink: '#7A3A36',
    icon: 'store',
    ringtone: 'digital_alert',
  },
  {
    id: 'school',
    name: 'School',
    color: '#B77F39',
    tint: '#FBECDB',
    ink: '#6F4606',
    icon: 'graduation-cap',
    ringtone: 'school_bell',
  },
  {
    id: 'church',
    name: 'Church',
    color: '#9C7AC2',
    tint: '#F3EAFE',
    ink: '#5B4277',
    icon: 'church',
    ringtone: 'gentle_bell',
  },
  {
    id: 'household',
    name: 'Household',
    color: '#849644',
    tint: '#ECF2DD',
    ink: '#4A5714',
    icon: 'house',
    ringtone: 'cash_register',
  },
] as const;

/** Palette offered when the user creates or recolours a category. */
export const CATEGORY_PALETTE: readonly { color: string; tint: string; ink: string }[] = [
  { color: '#5590CC', tint: '#E1F0FF', ink: '#24527F' },
  { color: '#33A182', tint: '#DDF5EC', ink: '#005F48' },
  { color: '#B77F39', tint: '#FBECDB', ink: '#6F4606' },
  { color: '#C6706A', tint: '#FFE8E5', ink: '#7A3A36' },
  { color: '#9C7AC2', tint: '#F3EAFE', ink: '#5B4277' },
  { color: '#B871A1', tint: '#FCE8F4', ink: '#703A5F' },
  { color: '#00A0A1', tint: '#DAF5F4', ink: '#005E5F' },
  { color: '#849644', tint: '#ECF2DD', ink: '#4A5714' },
] as const;

export const CATEGORY_ICONS: readonly string[] = [
  'user',
  'users',
  'heart',
  'house',
  'briefcase',
  'store',
  'graduation-cap',
  'church',
  'car',
  'stethoscope',
  'zap',
  'wifi',
  'shopping-cart',
  'plane',
  'dumbbell',
  'wallet',
] as const;

export const DEFAULT_CATEGORY_ID = 'personal';
