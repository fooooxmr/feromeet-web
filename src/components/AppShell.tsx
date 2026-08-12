import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { BrandMark } from './ui';
import { colors, radius, spacing } from '../theme/tokens';

const items = [
  { href: '/swipes', label: 'Свайпы', icon: '▣' },
  { href: '/meets', label: 'Встречи', icon: '♡' },
  { href: '/favourites', label: 'Симпатии', icon: '♥' },
  { href: '/profile', label: 'Профиль', icon: '○' },
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
    </Pressable>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const desktop = width >= 860;

  return (
    <View style={styles.shell}>
      {desktop && (
        <View style={styles.topBar}>
          <BrandMark />
          <View style={styles.topNav}>
            {items.map((item) => (
              <NavItem key={item.href} {...item} compact={false} />
            ))}
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
  shell: { flex: 1, backgroundColor: colors.canvas },
  topBar: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  topNav: { flexDirection: 'row', gap: spacing.xs },
  item: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemCompact: {
    flex: 1,
    minHeight: 58,
    paddingHorizontal: 2,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
  },
  itemActive: { backgroundColor: colors.soft },
  icon: { width: 22, textAlign: 'center', color: colors.muted, fontSize: 18, fontWeight: '800' },
  itemText: { color: colors.muted, fontWeight: '700', fontSize: 14 },
  itemTextCompact: { width: '100%', textAlign: 'center', fontSize: 10 },
  activeText: { color: colors.berry },
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
