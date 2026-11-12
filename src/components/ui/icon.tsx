import {
  Archive,
  ArrowLeft,
  Banknote,
  Bell,
  BellOff,
  BellRing,
  Briefcase,
  CalendarDays,
  CalendarRange,
  Car,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Church,
  Clock,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Eye,
  EyeOff,
  GraduationCap,
  Heart,
  House,
  Info,
  Link2,
  ListFilter,
  Lock,
  MapPin,
  Music,
  Pause,
  Pencil,
  PieChart,
  Plane,
  Play,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Stethoscope,
  Store,
  Trash2,
  TrendingUp,
  Undo2,
  User,
  Users,
  Wallet,
  Wifi,
  X,
  Zap,
} from 'lucide-react-native';
import type { ComponentType } from 'react';

import { Colors } from '@/constants/theme';

export interface LucideProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Explicit registry rather than a dynamic lookup, so the bundler only ships the
 * icons that are actually used and every name is checked at compile time.
 */
const REGISTRY = {
  archive: Archive,
  'arrow-left': ArrowLeft,
  banknote: Banknote,
  bell: Bell,
  'bell-off': BellOff,
  'bell-ring': BellRing,
  briefcase: Briefcase,
  calendar: CalendarDays,
  'calendar-range': CalendarRange,
  car: Car,
  check: Check,
  'check-check': CheckCheck,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  church: Church,
  clock: Clock,
  'credit-card': CreditCard,
  dumbbell: Dumbbell,
  ellipsis: Ellipsis,
  eye: Eye,
  'eye-off': EyeOff,
  'graduation-cap': GraduationCap,
  heart: Heart,
  house: House,
  info: Info,
  link: Link2,
  filter: ListFilter,
  lock: Lock,
  'map-pin': MapPin,
  music: Music,
  pause: Pause,
  pencil: Pencil,
  'pie-chart': PieChart,
  plane: Plane,
  play: Play,
  plus: Plus,
  receipt: ReceiptText,
  repeat: RefreshCw,
  restore: RotateCcw,
  settings: Settings,
  'shopping-cart': ShoppingCart,
  sliders: SlidersHorizontal,
  stethoscope: Stethoscope,
  store: Store,
  trash: Trash2,
  'trending-up': TrendingUp,
  undo: Undo2,
  user: User,
  users: Users,
  wallet: Wallet,
  wifi: Wifi,
  x: X,
  zap: Zap,
} satisfies Record<string, ComponentType<LucideProps>>;

export type IconName = keyof typeof REGISTRY;

export function isIconName(value: string): value is IconName {
  return value in REGISTRY;
}

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Renders a registered icon, falling back to a neutral dot for unknown names. */
export function Icon({ name, size = 20, color = Colors.textPrimary, strokeWidth = 2 }: IconProps) {
  const Component = isIconName(name) ? REGISTRY[name] : REGISTRY.info;
  return <Component size={size} color={color} strokeWidth={strokeWidth} />;
}
