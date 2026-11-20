import React, { useState } from 'react';
import { MotionPressable, useReducedMotion } from './motion';
import { Icon, type IconName } from './icons';
import { Animated, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AccountMenu } from './account-menu';
import { NotificationBadge } from './notification-badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, tokens } from '../design/tokens';

/** Largura a partir da qual a navegação vira lateral (desktop/tablet). */
export const SIDEBAR_BREAKPOINT = 768;
export const SIDEBAR_WIDTH = 232;

/**
 * Barra de baixo do celular (arquitetura aprovada pelo Marco em 18/11/2026):
 * Início, Explorar, Criar, Busca e Sino, só ícones. O Perfil sai da barra e
 * abre pela gaveta lateral (arraste da borda esquerda ou toque no avatar).
 * Desde 19/11/2026 a barra é a pílula escura flutuante da nova identidade,
 * com o ícone ativo em círculo creme (referência aprovada pelo Marco).
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
  screenPosition?: Animated.AnimatedInterpolation<number>;
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
  const activeColor = side ? tokens.colors.onDark : tokens.colors.dark;
  const idleColor = tokens.colors.onDarkMuted;
  const reduced = useReducedMotion();
  const itemIndex = NAV_ITEMS.findIndex((item) => item.name === props.item.name);
  const activeOpacity = !reduced && props.screenPosition
    ? props.screenPosition.interpolate({ inputRange: [itemIndex - 0.65, itemIndex, itemIndex + 0.65], outputRange: [0, 1, 0], extrapolate: 'clamp' })
    : focused ? 1 : 0;
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
          ? { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 999, marginHorizontal: 12 }
          : { flex: 1, alignItems: 'center', justifyContent: 'center' },
        side && focused && { backgroundColor: tokens.colors.darkSoft },
        pressed && { opacity: 0.7 },
      ]}
    >
      {side ? (
        <>
          <View style={{ position: 'relative' }}>
            <Icon name={props.item.icon} size={22} color={focused ? activeColor : idleColor} strokeWidth={focused ? 2.4 : 2} />
            {props.item.name === 'notifications' && <NotificationBadge />}
          </View>
          <Text style={{ fontSize: 15, fontFamily: focused ? font.bold : font.medium, color: focused ? activeColor : idleColor }}>{props.item.title}</Text>
        </>
      ) : (
        <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'relative' }}>
            <Icon name={props.item.icon} size={24} color={idleColor} strokeWidth={2} />
            <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, opacity: activeOpacity }}>
              <Icon name={props.item.icon} size={24} color={tokens.colors.dark} strokeWidth={2.3} />
            </Animated.View>
            {props.item.name === 'notifications' && <NotificationBadge />}
          </View>
        </View>
      )}
    </MotionPressable>
  );
}

/** Navegação lateral para desktop/tablet, na mesma linguagem escura. */
export function SideBar(props: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="navigation"
      accessibilityLabel="Navegação principal"
      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH, backgroundColor: tokens.colors.dark, borderRightWidth: 1, borderRightColor: tokens.colors.darkSoft, paddingTop: Math.max(insets.top + 12, 32), paddingBottom: 24, gap: 4 }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}><Text style={{ fontSize: 20, fontFamily: font.extrabold, letterSpacing: 6, color: tokens.colors.onDark, paddingHorizontal: 32, paddingBottom: 16 }}>ORBIT</Text>
      {NAV_ITEMS.map((item) => <NavItem key={item.name} {...props} item={item} layout="side" />)}
      <AccountMenu dark /></ScrollView>
    </View>
  );
}

/** Pílula flutuante escura para celular (identidade aprovada em 19/11/2026). */
export function BottomBar(props: TabBarProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [barWidth, setBarWidth] = useState(0);
  const slotWidth = barWidth / NAV_ITEMS.length;
  const position = props.screenPosition;
  // More samples keep the liquid stretch rounded as it leaves and reaches each icon.
  const inputRange = Array.from({ length: (NAV_ITEMS.length - 1) * 8 + 1 }, (_, index) => index / 8);
  const stretch = inputRange.map((value) => Math.sin(Math.PI * value) ** 2);
  const visible = props.state.index < NAV_ITEMS.length && barWidth > 0;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingBottom: Math.max(insets.bottom + 8, 18) }}>
      <View
        accessibilityRole="navigation"
        accessibilityLabel="Navegação principal"
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', alignItems: 'center', height: 66, borderRadius: 999, backgroundColor: tokens.colors.dark, boxShadow: '0 14px 30px rgba(23,20,15,0.35)', elevation: 8 }}
      >
        {visible && <Animated.View pointerEvents="none" style={{
          position: 'absolute', left: (slotWidth - 46) / 2, top: 10,
          width: 46, height: 46, borderRadius: 23, backgroundColor: tokens.colors.onDark,
          transform: [
            { translateX: !reduced && position ? Animated.multiply(position, slotWidth) : props.state.index * slotWidth },
            { scaleX: !reduced && position ? position.interpolate({ inputRange, outputRange: stretch.map((value) => 1 + value * 0.32), extrapolate: 'clamp' }) : 1 },
            { scaleY: !reduced && position ? position.interpolate({ inputRange, outputRange: stretch.map((value) => 1 - value * 0.1), extrapolate: 'clamp' }) : 1 },
          ],
        }} />}
        {NAV_ITEMS.map((item) => <NavItem key={item.name} {...props} item={item} layout="bottom" />)}
      </View>
    </View>
  );
}

export function ResponsiveTabBar(props: TabBarProps) {
  const { width } = useWindowDimensions();
  return width >= SIDEBAR_BREAKPOINT ? <SideBar {...props} /> : <BottomBar {...props} />;
}
