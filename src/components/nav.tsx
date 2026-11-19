import React, { useEffect, useRef, useState } from 'react';
import { MotionPressable, useReducedMotion } from './motion';
import { Icon, type IconName } from './icons';
import { NotificationBadge } from './notification-badge';
import { Animated, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AccountMenu } from './account-menu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../design/tokens';

/** Largura a partir da qual a navegação vira lateral (desktop/tablet). */
export const SIDEBAR_BREAKPOINT = 768;
export const SIDEBAR_WIDTH = 232;

/**
 * Barra de baixo do celular (arquitetura aprovada pelo Marco em 18/11/2026):
 * Início, Explorar, Criar, Busca e Sino, só ícones. O Perfil sai da barra e
 * abre pela gaveta lateral (arraste da borda esquerda ou toque no avatar).
 */
export const NAV_ITEMS = [
  { name: 'index', title: 'Início', icon: 'home' },
  { name: 'discover', title: 'Explorar', icon: 'compass' },
  { name: 'create', title: 'Criar', icon: 'plus' },
  { name: 'search', title: 'Busca', icon: 'search' },
  { name: 'notifications', title: 'Sino', icon: 'bell' },
] as const satisfies ReadonlyArray<{ name: string; title: string; icon: IconName }>;

/** No desktop/tablet não há gesto de borda: o Perfil fica no topo da coluna lateral. */
export const SIDE_ITEMS = [
  { name: 'profile', title: 'Perfil', icon: 'user' },
  ...NAV_ITEMS,
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

type NavEntry = { name: string; title: string; icon: IconName };

function NavItem(props: TabBarProps & { item: NavEntry; layout: 'side' | 'bottom' }) {
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
      <View style={{ position: 'relative' }}>
        <Icon name={props.item.icon} size={side ? 22 : 24} color={focused ? tokens.colors.accentStrong : tokens.colors.muted} strokeWidth={focused ? 2.4 : 2} />
        {props.item.name === 'notifications' && <NotificationBadge />}
      </View>
      {side && <Text style={{ fontSize: 15, fontWeight: '600', color: focused ? tokens.colors.accentStrong : tokens.colors.muted }}>{props.item.title}</Text>}
      {!side && <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontSize: 10, fontWeight: focused ? '700' : '500', color: focused ? tokens.colors.accentStrong : tokens.colors.muted }}>{props.item.title}</Text>}
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
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}><Text style={{ fontSize: 20, fontWeight: '700', letterSpacing: 6, color: tokens.colors.primary, paddingHorizontal: 32, paddingBottom: 16 }}>ORBIT</Text>
      {NAV_ITEMS.map((item) => <NavItem key={item.name} {...props} item={item} layout="side" />)}
      <AccountMenu /></ScrollView>
    </View>
  );
}

/** Barra inferior para celular. */
export function BottomBar(props: TabBarProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const position = useRef(new Animated.Value(0)).current;
  const name = props.state.routes[props.state.index]?.name;
  const selected = NAV_ITEMS.findIndex(item => item.name === name);
  const target = Math.max(0, selected) * width / NAV_ITEMS.length;
  useEffect(() => {
    position.stopAnimation();
    if (reduced) { position.setValue(target); return; }
    const animation = Animated.spring(position, { toValue: target, damping: 22, stiffness: 240, mass: 0.8, useNativeDriver: Platform.OS !== 'web', isInteraction: false });
    animation.start(); return () => animation.stop();
  }, [target, reduced, position]);
  return (
    <View
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="navigation"
      accessibilityLabel="Navegação principal"
      style={{ flexDirection: 'row', backgroundColor: tokens.colors.surface, borderTopWidth: 1, borderTopColor: tokens.colors.border, paddingBottom: Math.max(insets.bottom, 10), paddingTop: 6 }}
    >
      {width > 0 && selected >= 0 && <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: width / NAV_ITEMS.length, height: 3, alignItems: 'center', transform: [{ translateX: position }] }}><View style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: tokens.colors.accentStrong }} /></Animated.View>}
      {NAV_ITEMS.map((item) => <NavItem key={item.name} {...props} item={item} layout="bottom" />)}
    </View>
  );
}

export function ResponsiveTabBar(props: TabBarProps) {
  const { width } = useWindowDimensions();
  return width >= SIDEBAR_BREAKPOINT ? <SideBar {...props} /> : <BottomBar {...props} />;
      }

