import { Platform, StyleSheet } from 'react-native';

export const colors = {
  ink: '#1B2430',
  muted: '#6C7690',
  canvas: '#FFFFFF',
  surface: '#FFFFFF',
  soft: '#FFF3E6',
  line: '#FFEDDD',
  berry: '#EF7C0D',
  berryDark: '#D96A00',
  blush: '#FFF3E6',
  amber: '#FFB800',
  green: '#22C55E',
  danger: '#D93025',
  overlay: 'rgba(16, 18, 24, 0.42)',
} as const;

export const radius = { sm: 12, md: 18, lg: 28, pill: 999 } as const;
export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;

export const gradient = Platform.select({
  web: { backgroundImage: 'linear-gradient(90deg, #EF7C0D 0%, #FFB800 100%)' },
  default: { backgroundColor: colors.berry },
});

export const shadow = Platform.select({
  web: {
    boxShadow: '0 18px 40px rgba(27, 36, 48, 0.12)',
  },
  default: {
    elevation: 8,
    shadowColor: '#1B2430',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
});

export const type = StyleSheet.create({
  eyebrow: {
    color: colors.berry,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
