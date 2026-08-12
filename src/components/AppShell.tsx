import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { BrandMark } from './Logo';
import { colors, fontFamily, shadow, spacing } from '../theme/tokens';
import { meetsApi } from '../api/endpoints';
import { useSessionStore } from '../state/session';

const items = [
  { href: '/swipes', label: 'Свайпы', icon: '▣', activeIcon: '▣' },
  { href: '/meets', label: 'Встречи', icon: '♡', activeIcon: '♥' },
  { href: '/favourites', label: 'Симпатии', icon: '♡♡', activeIcon: '♥♥' },
  { href: '/profile', label: 'Профиль', icon: '○', activeIcon: '●' },
] as const;

function NavItem({
  href,
  label,
  icon,
  activeIcon,
  badge,
}: {
  href: (typeof items)[number]['href'];
  label: string;
  icon: string;
  activeIcon: string;
  badge?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={styles.item}
    >
      <View style={styles.iconWrap}>
        <Text style={[styles.icon, active && styles.activeText]}>
          {active ? activeIcon : icon}
        </Text>
        {!!badge && badge > 0 && (
          <Text style={styles.badge}>{badge > 99 ? '99+' : badge}</Text>
        )}
      </View>
      <Text style={[styles.itemText, active && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const framed = width >= 860;
  const demoMode = useSessionStore((state) => state.demoMode);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (demoMode || !isAuthenticated) return;
    let active = true;
    meetsApi
      .getActive()
      .then((current) => {
        if (!active || !Array.isArray(current)) return;
        setUnread(
          current.reduce((sum, meet) => sum + (meet.countUnreadMessages || 0), 0),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [demoMode, isAuthenticated]);

  return (
    <View style={[styles.stage, framed && styles.stageDesktop]}>
      <View style={[styles.phone, framed && styles.phoneDesktop]}>
      <View style={styles.body}>{children}</View>
      <View style={styles.bottomBar}>
          {items.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              badge={item.href === '/meets' ? unread : undefined}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export function AppHeader({
  onFilter,
}: {
  onFilter?: () => void;
}) {
  return (
    <View style={styles.header}>
      <BrandMark />
      {onFilter ? (
        <Pressable accessibilityLabel="Фильтры" onPress={onFilter} style={styles.filter}>
          <Text style={styles.filterIcon}>☰</Text>
        </Pressable>
      ) : (
        <View style={styles.filter} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: colors.canvas },
  stageDesktop: {
    backgroundColor: colors.stage,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  phone: { flex: 1, backgroundColor: colors.canvas },
  phoneDesktop: {
    width: 430,
    maxWidth: '100%',
    height: '100%',
    maxHeight: 920,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E2DA',
    ...shadow,
  },
  body: { flex: 1 },
  header: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filter: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  filterIcon: { color: colors.amber, fontSize: 22, fontWeight: '800' },
  item: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: { position: 'relative' },
  icon: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -7,
    right: -14,
    minWidth: 18,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 16,
    fontSize: 9,
    fontWeight: '800',
    color: colors.surface,
    backgroundColor: colors.amber,
  },
  itemText: { color: colors.muted, fontWeight: '600', fontSize: 11, fontFamily },
  activeText: { color: colors.amber },
  bottomBar: {
    minHeight: 58,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingBottom: 4,
  },
});
