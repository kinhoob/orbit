import React from 'react';
import { MotionPressable } from './motion';
import { Icon, type IconName } from './icons';
import { Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../design/tokens';

/** Largura a partir da qual a navegação vira lateral (desktop/tablet). */
export const SIDEBAR_BREAKPOINT = 768;
export const SIDEBAR_WIDTH = 232;

export const NAV_ITEMS = [
  { name: 'index', title: 'Início', icon: 'home' },
  { name: 'discover', title: 'Descobrir', icon: 'compass' },
  { name: 'create', title: 'Criar', icon: 'plus' },
  { name: 'saved', title: 'Salvos', icon: 'bookmark' },
  { name: 'profile', title: 'Perfil', icon: 'user' },
] as const satisfies ReadonlyArray<{ name: string; title: string; icon: IconName }>;

/** Subconjunto estrutural das props que o Tabs do expo-router entrega ao tabBar customizado. */
export type TabBarProps = {
  state: { index: number; routes: Array<{ key: string; name: string; params?: object }> };
  emitter: { emit: (options: { type: 'tabPress' | 'tabLongPress'; target?: string; canPreventDefault?: boolean }) => unknown };
  navigateToTab: (routeKey: string) => void;
};

function useNavItem(props: TabBarProps, routeName: string) {
  const index = props.state.routes.findIndex((r) => r.name === routeName);
  const route = props.state.routes[index];
  const focused = index === props.state.index;
  const onPress = () => {
    if (!route) return;
    const event = props.emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }) as { defaultPrevented?: boolean };
    if (!focused && !event.defaultPrevented) props.navigateToTab(route.key);
  };
  const onLongPress = () => {
    if (route) props.emitter.emit({ type: 'tabLongPress', target: route.key });
  };
  return { focused, onPress, onLongPress };
}

function NavItem(props: TabBarProps & { item: (typeof NAV_ITEMS)[number]; layout: 'side' | 'bottom' }) {
  const { focused, onPress, onLongPress } = useNavItem(props, props.item.name);
  const side = props.layout === 'side';
  return (
    <MotionPressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      {...{ 'aria-selected': focused }}
      accessibilityLabel={props.item.title}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        side
          ? { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginHorizontal: 12 }
          : { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 6 },
        side && focused && { backgroundColor: tokens.colors.secondary },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon name={props.item.icon} size={side ? 22 : 24} color={focused ? tokens.colors.accentStrong : tokens.colors.muted} strokeWidth={focused ? 2.4 : 2} />
      <Text style={{ color: focused ? tokens.colors.accentStrong : tokens.colors.muted, fontSize: side ? 16 : 11, fontWeight: focused ? '700' : '400' }}>{props.item.title}</Text>
    </MotionPressable>
  );
}

/** Navegação lateral para desktop/tablet. */
export function SideBar(props: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="navigation"
      accessibilityLabel="Navegação principal"
      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH, backgroundColor: tokens.colors.surface, borderRightWidth: 1, borderRightColor: tokens.colors.border, paddingTop: Math.max(insets.top + 12, 32), paddingBottom: 24, gap: 4 }}
    >
      <Text style={{ fontSize: 20, fontWeight: '700', letterSpacing: 6, color: tokens.colors.primary, paddingHorizontal: 32, paddingBottom: 28 }}>ORBIT</Text>
      {NAV_ITEMS.map((item) => <NavItem key={item.name} {...props} item={item} layout="side" />)}
    </View>
  );
}

/** Barra inferior para celular. */
export function BottomBar(props: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="navigation"
      accessibilityLabel="Navegação principal"
      style={{ flexDirection: 'row', backgroundColor: tokens.colors.surface, borderTopWidth: 1, borderTopColor: tokens.colors.border, paddingBottom: Math.max(insets.bottom, 10), paddingTop: 6 }}
    >
      {NAV_ITEMS.map((item) => <NavItem key={item.name} {...props} item={item} layout="bottom" />)}
    </View>
  );
}

export function ResponsiveTabBar(props: TabBarProps) {
  const { width } = useWindowDimensions();
  return width >= SIDEBAR_BREAKPOINT ? <SideBar {...props} /> : <BottomBar {...props} />;
  }
