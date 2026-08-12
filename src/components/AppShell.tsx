import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { BrandMark } from './ui';
import { colors, radius, spacing } from '../theme/tokens';

const items = [
  { href: '/swipes', label: 'Свайпы', icon: '✦' },
  { href: '/favourites', label: 'Избранное', icon: '♡' },
  { href: '/meets', label: 'Встречи', icon: '◉' },
  { href: '/profile', label: 'Профиль', icon: '⌁' },
] as const;

function NavItem({
  href,
  label,
  icon,
  compact,
}: {
  href: (typeof items)[number]['href'];
  label: string;
  icon: string;
  compact: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={[styles.item, compact && styles.itemCompact, active && styles.itemActive]}
    >
      <Text style={[styles.icon, active && styles.activeText]}>{icon}</Text>
      <Text style={[styles.itemText, compact && styles.itemTextCompact, active && styles.activeText]}>
        {label}
      </Text>
      {!compact && active && <View style={styles.activeDot} />}
    </Pressable>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const desktop = width >= 860;

  return (
    <View style={styles.shell}>
      {desktop && (
        <View style={styles.rail}>
          <BrandMark />
          <View style={styles.nav}>
            {items.map((item) => (
              <NavItem key={item.href} {...item} compact={false} />
            ))}
          </View>
          <View style={styles.railNote}>
            <Text style={styles.railNoteMark}>✦</Text>
            <Text style={styles.railNoteTitle}>Будьте настоящими</Text>
            <Text style={styles.railNoteText}>Хорошая встреча начинается с честного профиля.</Text>
          </View>
        </View>
      )}
      <View style={[styles.content, !desktop && styles.contentMobile]}>{children}</View>
      {!desktop && (
        <View style={styles.bottomBar}>
          {items.map((item) => (
            <NavItem key={item.href} {...item} compact />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: colors.canvas },
  rail: {
    width: 248,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    backgroundColor: colors.surface,
  },
  nav: { gap: spacing.xs, marginTop: 44 },
  item: {
    minHeight: 50,
    paddingHorizontal: 15,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  itemCompact: {
    flex: 1,
    minHeight: 58,
    paddingHorizontal: 2,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
  },
  itemActive: { backgroundColor: colors.blush },
  icon: { width: 22, textAlign: 'center', color: colors.muted, fontSize: 21, fontWeight: '800' },
  itemText: { flex: 1, color: colors.muted, fontWeight: '700', fontSize: 15 },
  itemTextCompact: { flex: 0, width: '100%', textAlign: 'center', fontSize: 10 },
  activeText: { color: colors.berryDark },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.berry },
  railNote: {
    marginTop: 'auto',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.soft,
    gap: 5,
  },
  railNoteMark: { color: colors.amber, fontSize: 21 },
  railNoteTitle: { color: colors.ink, fontWeight: '800' },
  railNoteText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  content: { flex: 1 },
  contentMobile: { paddingBottom: 70 },
  bottomBar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 8,
    minHeight: 64,
    flexDirection: 'row',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
  },
});
