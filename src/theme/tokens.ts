import { Platform, StyleSheet } from 'react-native';

export const colors = {
  ink: '#201A24',
  muted: '#766D78',
  canvas: '#F8F5F2',
  surface: '#FFFFFF',
  soft: '#F1EAE7',
  line: '#E8DFDC',
  berry: '#9E3152',
  berryDark: '#71213D',
  blush: '#F5DCE3',
  amber: '#D98C3F',
  green: '#397761',
  danger: '#B54444',
} as const;

export const radius = { sm: 12, md: 18, lg: 28, pill: 999 } as const;
export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;

export const shadow = Platform.select({
  web: {
    boxShadow: '0 18px 50px rgba(56, 33, 43, 0.10)',
  },
  default: {
    elevation: 6,
    shadowColor: '#38212B',
    shadowOpacity: 0.12,
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
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
  },
});
