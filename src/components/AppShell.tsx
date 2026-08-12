import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { BrandMark } from './Logo';
import { colors, fontFamily, shadow, spacing } from '../theme/tokens';
import { meetsApi } from '../api/endpoints';
import { useSessionStore } from '../state/session';
import { useShellStore } from '../state/shell';

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
    <Pressable accessibilityRole="link" onPress={() => router.push(href)} style={styles.item}>
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
          <View style={styles.sliders}>
            <View style={[styles.slider, { width: 14 }]} />
            <View style={[styles.slider, { width: 10 }]} />
            <View style={[styles.slider, { width: 16 }]} />
          </View>
        </Pressable>
      ) : (
        <View style={styles.filter} />
      )}
    </View>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const demoMode = useSessionStore((state) => state.demoMode);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const openFilters = useShellStore((state) => state.openFilters);
  const [unread, setUnread] = useState(0);
  const isChat = pathname.startsWith('/chat');
  const isSwipes = pathname === '/swipes' || pathname.startsWith('/swipes');
  const hideChrome =
    pathname === '/phone' || pathname === '/otp' || pathname === '/onboarding' || isChat;

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
    <View style={styles.stage}>
      <View style={styles.phone}>
        {!hideChrome && <AppHeader onFilter={isSwipes ? openFilters : undefined} />}
        <View style={styles.body}>{children}</View>
        {!hideChrome && (
          <View style={styles.bottomBar}>
            {items.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                badge={item.href === '/meets' ? unread : undefined}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.stage,
    alignItems: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    height: '100%',
    position: 'relative',
    backgroundColor: colors.canvas,
    overflow: 'hidden',
    ...shadow,
  },
  body: { flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' },
  header: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
  },
  filter: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  sliders: { gap: 4, alignItems: 'flex-end' },
  slider: { height: 2, borderRadius: 1, backgroundColor: colors.amber },
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
