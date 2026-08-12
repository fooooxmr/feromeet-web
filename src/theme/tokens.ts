import { Platform, StyleSheet } from 'react-native';

export const colors = {
  ink: '#151726',
  muted: '#9BA0AA',
  body: '#363A45',
  canvas: '#FFFFFF',
  stage: '#F4F1EC',
  surface: '#FFFFFF',
  soft: '#FFF3E6',
  line: '#E6E6E6',
  berry: '#EF7C0D',
  berryDark: '#D96A00',
  blush: '#FFF3E6',
  amber: '#FFB800',
  green: '#4CAF50',
  danger: '#FF5A5F',
  overlay: 'rgba(0, 0, 0, 0.45)',
} as const;

export const fontFamily = Platform.select({
  web: 'Golos Text, system-ui, sans-serif',
  default: undefined,
});

export const radius = { sm: 16, md: 25, lg: 32, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const gradient = Platform.select({
  web: { backgroundImage: 'linear-gradient(90deg, #FFB800 0%, #EF7C0D 100%)' },
  default: { backgroundColor: colors.berry },
});

export const shadow = Platform.select({
  web: {
    boxShadow: '0 12px 32px rgba(21, 23, 38, 0.12)',
  },
  default: {
    elevation: 8,
    shadowColor: '#151726',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
});

export const type = StyleSheet.create({
  eyebrow: {
    color: colors.berry,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    fontFamily,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily,
  },
});
