import { createElement, type PropsWithChildren, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { BrandMark } from './Logo';
import { colors, fontFamily, spacing } from '../theme/tokens';
import { useIsDesktop } from '../theme/layout';
import { meetsApi } from '../api/endpoints';
import { useSessionStore } from '../state/session';
import { useShellStore } from '../state/shell';

const items = [
  { href: '/swipes', label: 'Свайпы', icon: 'cards', activeIcon: 'cards' },
  { href: '/meets', label: 'Встречи', icon: '♡', activeIcon: '♥' },
  { href: '/favourites', label: 'Симпатии', icon: '♡♡', activeIcon: '♥♥' },
  { href: '/profile', label: 'Профиль', icon: '○', activeIcon: '●' },
] as const;

function CardsIcon({ active }: { active?: boolean }) {
  const stroke = active ? colors.berry : colors.muted;
  const back = active ? '#FFE7C2' : '#F3F0EA';
  return createElement(
    'svg',
    {
      width: 26,
      height: 22,
      viewBox: '0 0 26 22',
      'aria-hidden': true,
      focusable: 'false',
      style: { display: 'block', flexShrink: 0 },
    },
    createElement('rect', {
      x: 2,
      y: 5.5,
      width: 13,
      height: 15,
      rx: 2.4,
      fill: back,
      stroke,
      strokeWidth: 1.7,
      transform: 'rotate(-16 8.5 13)',
    }),
    createElement('rect', {
      x: 10.5,
      y: 1.5,
      width: 13,
      height: 15,
      rx: 2.4,
      fill: colors.surface,
      stroke,
      strokeWidth: 1.7,
    }),
  );
}

function NavItem({
  href,
  label,
  icon,
  activeIcon,
  badge,
  desktop,
}: {
  href: (typeof items)[number]['href'];
  label: string;
  icon: string;
  activeIcon: string;
  badge?: number;
  desktop?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={[desktop ? styles.sideItem : styles.item, desktop && active && styles.sideItemActive]}
    >
      <View style={styles.iconWrap}>
        {href === '/swipes' ? (
          <CardsIcon active={active} />
        ) : (
          <Text style={[styles.icon, active && styles.activeText]}>
            {active ? activeIcon : icon}
          </Text>
        )}
        {!!badge && badge > 0 && (
          <Text style={styles.badge}>{badge > 99 ? '99+' : badge}</Text>
        )}
      </View>
      <Text style={[desktop ? styles.sideLabel : styles.itemText, active && styles.activeText]}>
        {label}
      </Text>
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
        <Pressable accessibilityRole="button" accessibilityLabel="Фильтры" onPress={onFilter} style={styles.filter}>
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
  const desktop = useIsDesktop();
  const demoMode = useSessionStore((state) => state.demoMode);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const hydrated = useSessionStore((state) => state.hydrated);
  const openFilters = useShellStore((state) => state.openFilters);
  const [unread, setUnread] = useState(0);
  const isChat = pathname.startsWith('/chat');
  const isSwipes = pathname === '/swipes' || pathname.startsWith('/swipes');
  const isAuth =
    pathname === '/' ||
    pathname === '/phone' ||
    pathname === '/otp' ||
    pathname === '/onboarding';
  const hideHeader = isAuth || isChat;
  const hideMobileNav = isAuth || isChat;

  useEffect(() => {
    if (!hydrated || demoMode || !isAuthenticated) return;
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
  }, [demoMode, hydrated, isAuthenticated]);

  const nav = items.map((item) => (
    <NavItem
      key={item.href}
      {...item}
      desktop={desktop}
      badge={item.href === '/meets' ? unread : undefined}
    />
  ));

  return (
    <View style={[styles.stage, desktop && !isAuth && styles.desktopStage]}>
      <View
        style={[
          styles.shell,
          desktop && !isAuth ? styles.desktopShell : styles.phone,
          isAuth && styles.authShell,
        ]}
      >
        <View
          style={[styles.sidebar, (!desktop || isAuth) && styles.hidden]}
          accessibilityElementsHidden={!desktop || isAuth}
          importantForAccessibility={!desktop || isAuth ? 'no-hide-descendants' : 'auto'}
        >
          {desktop && !isAuth ? (
            <>
              <View style={styles.sidebarBrand}>
                <BrandMark />
              </View>
              <View style={styles.sideNav}>{nav}</View>
            </>
          ) : null}
        </View>
        <View style={styles.desktopMain}>
          {desktop && !hideHeader ? (
            <View style={styles.desktopTop}>
              <Text style={styles.desktopHint}>
                {isSwipes ? 'Листайте анкеты · профиль справа' : 'Feromeet'}
              </Text>
              {isSwipes ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Фильтры"
                    onPress={() => openFilters?.()}
                    style={styles.filter}
                  >
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
          ) : null}
          {!desktop && !hideHeader ? (
            <AppHeader onFilter={isSwipes ? () => openFilters?.() : undefined} />
          ) : null}
          <View style={styles.body}>{children}</View>
          {!desktop && !hideMobileNav ? <View style={styles.bottomBar}>{nav}</View> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  authShell: { maxWidth: '100%', backgroundColor: colors.stage, borderWidth: 0, borderRadius: 0 },
  hidden: {
    width: 0,
    minWidth: 0,
    maxWidth: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    overflow: 'hidden',
    borderRightWidth: 0,
    display: 'none',
  },
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
  },
  body: { flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' },
  header: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    zIndex: 2,
  },
  filter: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  sliders: { gap: 4, alignItems: 'flex-end' },
  slider: { height: 2, borderRadius: 1, backgroundColor: colors.amber },
  item: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: { position: 'relative', minHeight: 22, minWidth: 26, alignItems: 'center', justifyContent: 'center' },
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
  activeText: { color: colors.berry },
  bottomBar: {
    minHeight: 58,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingBottom: 4,
  },
  desktopStage: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.stage,
    alignItems: 'center',
    padding: 20,
  },
  desktopShell: {
    flex: 1,
    width: '100%',
    maxWidth: 1280,
    flexDirection: 'row',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sidebar: {
    width: 228,
    backgroundColor: '#FFFBF6',
    borderRightWidth: 1,
    borderRightColor: colors.line,
    paddingTop: 22,
    paddingHorizontal: 14,
  },
  sidebarBrand: { paddingHorizontal: 8, marginBottom: 28 },
  sideNav: { gap: 6 },
  sideItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  sideItemActive: { backgroundColor: colors.soft },
  sideLabel: { color: colors.muted, fontWeight: '700', fontSize: 15, fontFamily },
  desktopMain: { flex: 1, minWidth: 0, minHeight: 0, backgroundColor: colors.canvas },
  desktopTop: {
    minHeight: 56,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    zIndex: 2,
  },
  desktopHint: { color: colors.muted, fontSize: 13, fontFamily },
});
