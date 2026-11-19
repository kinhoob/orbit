import React, { useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { MotionPressable, useReducedMotion } from './motion';
import { Icon, type IconName } from './icons';
import { tokens } from '../design/tokens';
import { useAuth } from '../features/auth/provider';
import { requireSupabase } from '../lib/supabase';
import { DRAWER_WIDTH_PX, EDGE_ZONE_PX, drawerCloseOffset, drawerOpenOffset, shouldCloseDrawer, shouldOpenDrawer } from '../domain/drawer.mjs';

const nativeDriver = Platform.OS !== 'web';

type DrawerItem = { icon: IconName; label: string; href: string };

/**
 * Gaveta do Perfil (aprovada pelo Marco em 18/11/2026, referencia X): abre
 * arrastando a partir da borda esquerda da tela ou tocando no avatar no topo.
 * A faixa da borda e so da gaveta, entao o gesto nunca briga com o pager das
 * timelines (que responde no meio da tela). No desktop a navegacao lateral ja
 * tem Perfil, entao a gaveta so aparece no celular. Respeita reduzir movimento.
 */
export function ProfileEdgeDrawer() {
  const { session } = useAuth();
  const router = useRouter();
  const cache = useQueryClient();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH_PX)).current;
  const state = useRef({ open: false, reduced: false });
  state.current.open = open;
  state.current.reduced = reduced;

  const animateTo = (toValue: number) => {
    slide.stopAnimation();
    if (state.current.reduced) { slide.setValue(toValue); return; }
    Animated.timing(slide, { toValue, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  };
  const openDrawer = () => { setOpen(true); animateTo(0); };
  const closeDrawer = () => { animateTo(-DRAWER_WIDTH_PX); setOpen(false); };
  const openRef = useRef(openDrawer);
  const closeRef = useRef(closeDrawer);
  openRef.current = openDrawer;
  closeRef.current = closeDrawer;

  // Gesto de abrir: so na faixa da borda esquerda (overlay exclusivo dela).
  const edgeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => !state.current.open && g.dx > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
    onPanResponderMove: (_e, g) => slide.setValue(drawerOpenOffset(g.dx)),
    onPanResponderRelease: (_e, g) => { if (shouldOpenDrawer(g.dx, g.vx)) openRef.current(); else closeRef.current(); },
    onPanResponderTerminate: (_e, g) => { if (shouldOpenDrawer(g.dx, g.vx)) openRef.current(); else closeRef.current(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // Gesto de fechar: arrastar a gaveta aberta de volta para a esquerda.
  const panelResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => state.current.open && g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
    onPanResponderMove: (_e, g) => slide.setValue(drawerCloseOffset(g.dx)),
    onPanResponderRelease: (_e, g) => { if (shouldCloseDrawer(g.dx, g.vx)) closeRef.current(); else openRef.current(); },
    onPanResponderTerminate: (_e, g) => { if (shouldCloseDrawer(g.dx, g.vx)) closeRef.current(); else openRef.current(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const go = (href: string) => { closeDrawer(); router.push(href as never); };
  const signOut = async () => {
    closeDrawer();
    try {
      const { error } = await requireSupabase().auth.signOut();
      if (!error) cache.clear();
    } catch { /* o Perfil tambem oferece sair com mensagem de erro */ }
  };

  const items: DrawerItem[] = session
    ? [
        { icon: 'user', label: 'Perfil', href: '/(tabs)/profile' },
        { icon: 'bookmark', label: 'Salvos', href: '/(tabs)/profile' },
        { icon: 'heart', label: 'Amigos', href: '/friends' },
      ]
    : [{ icon: 'user', label: 'Entrar ou criar conta', href: '/auth' }];

  const initial = (session?.user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30 }}>
      {/* Avatar no topo: caminho por toque, teclado e leitor de tela (e principal na web mobile). */}
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Abrir menu do perfil"
        onPress={openDrawer}
        style={{ position: 'absolute', top: insets.top + 10, left: 16, width: 34, height: 34, borderRadius: 17, backgroundColor: tokens.colors.accent, alignItems: 'center', justifyContent: 'center', zIndex: 31 }}
      >
        {session
          ? <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.colors.accentStrong }}>{initial}</Text>
          : <Icon name="user" size={18} color={tokens.colors.accentStrong} />}
      </MotionPressable>

      {/* Faixa da borda esquerda: gesto de abrir a gaveta. O pager nao responde aqui. */}
      {!open && (
        <View
          {...edgeResponder.panHandlers}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: EDGE_ZONE_PX, zIndex: 32, ...(Platform.OS === 'web' ? { userSelect: 'none' as never } : {}) }}
        />
      )}

      {open && (
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Fechar menu do perfil"
          onPress={closeDrawer}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)', zIndex: 33, ...(Platform.OS === 'web' ? { userSelect: 'none' as never } : {}) }}
        />
      )}

      <Animated.View
        {...panelResponder.panHandlers}
        pointerEvents={open ? 'auto' : 'none'}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH_PX, zIndex: 34,
          // Na web, o arraste da gaveta nao pode virar selecao de texto.
          ...(Platform.OS === 'web' ? { userSelect: 'none' as never } : {}),
          backgroundColor: tokens.colors.surface, borderRightWidth: 1, borderRightColor: tokens.colors.border,
          paddingTop: Math.max(insets.top + 16, 40), paddingBottom: Math.max(insets.bottom + 16, 24), paddingHorizontal: 18, gap: 4,
          transform: [{ translateX: slide }],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: tokens.colors.border, marginBottom: 10 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            {session
              ? <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.colors.accentStrong }}>{initial}</Text>
              : <Icon name="user" size={22} color={tokens.colors.accentStrong} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.colors.text }}>{session ? 'Sua conta' : 'ORBIT'}</Text>
            {!!session?.user.email && <Text style={{ fontSize: 12, color: tokens.colors.muted }} numberOfLines={1}>{session.user.email}</Text>}
          </View>
        </View>
        {items.map((item) => (
          <MotionPressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => go(item.href)}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 8, borderRadius: 12 }, pressed && { opacity: 0.7 }]}
          >
            <Icon name={item.icon} size={22} color={tokens.colors.text} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: tokens.colors.text }}>{item.label}</Text>
          </MotionPressable>
        ))}
        {!!session && (
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
            onPress={() => { void signOut(); }}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 8, borderRadius: 12, marginTop: 8 }, pressed && { opacity: 0.7 }]}
          >
            <Icon name="arrow-down" size={22} color={tokens.colors.muted} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: tokens.colors.muted }}>Sair</Text>
          </MotionPressable>
        )}
      </Animated.View>
    </View>
  );
          }
