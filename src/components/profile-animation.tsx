import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { useReducedMotion } from './motion';

const nativeDriver = Platform.OS !== 'web';

/**
 * Animação única do perfil, desbloqueada por nível (pedido do Marco em
 * 23/11/2026). Envolve o avatar ou o anel de XP. Respeita a preferência de
 * movimento reduzido da conta e do sistema: com ela, nada se move.
 */
export function ProfileAccent({ animation, size, color, children }: { animation?: string | null; size: number; color: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  const active = !reduced && !!animation && animation !== 'none';
  useEffect(() => {
    if (!active) { value.setValue(0); return; }
    const half = (ms: number) => Animated.timing(value, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false });
    const back = (ms: number) => Animated.timing(value, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false });
    const full = Animated.timing(value, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: nativeDriver, isInteraction: false });
    const loop = animation === 'pulse'
      ? Animated.loop(Animated.sequence([half(1200), back(1200)]))
      : animation === 'shimmer'
        ? Animated.loop(Animated.sequence([half(1500), back(1500)]))
        : Animated.loop(full);
    loop.start();
    return () => { loop.stop(); value.setValue(0); };
  }, [active, animation, value]);
  const scale = animation === 'pulse' ? value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) : 1;
  const opacity = animation === 'shimmer' ? value.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) : 1;
  const rotate = animation === 'orbit' ? value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) : '0deg';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {animation === 'orbit' && active && (
        <Animated.View accessibilityElementsHidden importantForAccessibility="no" style={{ position: 'absolute', width: size + 16, height: size + 16, transform: [{ rotate }] }}>
          <View style={{ position: 'absolute', top: 0, left: '50%', width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
          <View style={{ position: 'absolute', bottom: 6, right: 8, width: 5, height: 5, borderRadius: 3, backgroundColor: color, opacity: 0.6 }} />
        </Animated.View>
      )}
      <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center', justifyContent: 'center' }}>{children}</Animated.View>
    </View>
  );
}
