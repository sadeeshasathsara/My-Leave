import { Platform } from 'react-native';
import { moderateScale } from './layout';

export const Colors = {
  light: {
    primary: '#6366f1', // Indigo
    primaryLight: '#c7d2fe',
    accent: '#f43f5e', // Rose
    background: '#f8fafc', // Slate 50
    card: '#ffffff',
    text: '#0f172a', // Slate 900
    textSecondary: '#475569', // Slate 600
    textMuted: '#94a3b8', // Slate 400
    border: '#e2e8f0', // Slate 200
    divider: '#f1f5f9', // Slate 100
    shadow: 'rgba(99, 102, 241, 0.06)',
    cardShadow: {
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
  },
  dark: {
    primary: '#818cf8', // Indigo lightened for dark mode
    primaryLight: '#312e81',
    accent: '#fb7185', // Rose lightened
    background: '#090d16', // Deep dark blue-black
    card: '#131c2e', // Slate-blue card
    text: '#f8fafc', // Slate 50
    textSecondary: '#94a3b8', // Slate 400
    textMuted: '#64748b', // Slate 500
    border: '#1e293b', // Slate 800
    divider: '#1e293b', // Slate 800
    shadow: 'rgba(0, 0, 0, 0.3)',
    cardShadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export const LeaveTypeColors = {
  'Casual': '#f59e0b', // Amber
  'Vacation': '#6366f1', // Indigo
  'Duty': '#10b981', // Emerald
  'Half Day': '#a855f7', // Purple/Violet
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    bold: 'System',
    medium: 'System',
  },
  android: {
    sans: 'sans-serif',
    bold: 'sans-serif-bold',
    medium: 'sans-serif-medium',
  },
  default: {
    sans: 'normal',
    bold: 'normal',
    medium: 'normal',
  },
});

export const Spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
  xxxl: moderateScale(32),
};

export const BorderRadius = {
  sm: moderateScale(6),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(24),
  round: 9999,
};

