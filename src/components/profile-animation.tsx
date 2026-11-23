import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { useReducedMotion } from './motion';

const nativeDriver = Platform.OS !== 'web';

// Animações únicas do perfil, desbloqueadas por nível (pedido do Marco em
// 23/11/2026, ampliado no mesmo dia com mais variedade). Envolvem o avatar
// ou o anel de XP. Todas respeitam a preferência de movimento reduzido da
// conta e do sistema: com ela, nada se move. Amplitudes pequenas para não
// atrapalhar a leitura.
const OSCILLATE: Record<string, number> = { pulse: 1200, float: 1400, sway: 1600, glow: 1800, shimmer: 1500 };
const SPIN: Record<string, number> = { comet: 2800, orbit: 6000, aurora: 6000 };

export function ProfileAccent({ animation, size, color, children }: { animation?: string | null; size: number; color: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const kind = animation || 'none';
  const active = !reduced && kind !== 'none';
  useEffect(() => {
    if (!active) { value.setValue(0); spin.setValue(0); return; }
    const loops: Animated.CompositeAnimation[] = [];
    if (OSCILLATE[kind]) {
      const ms = OSCILLATE[kind];
      loops.push(Animated.loop(Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false }),
        Animated.timing(value, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false }),
      ])));
    }
    if (SPIN[kind]) {
      // Aurora anima cor; cor não usa driver nativo fora da web.
      loops.push(Animated.loop(Animated.timing(spin, { toValue: 1, duration: SPIN[kind], easing: Easing.linear, useNativeDriver: kind === 'aurora' ? false : nativeDriver, isInteraction: false })));
    }
    loops.forEach((l) => l.start());
    return () => { loops.forEach((l) => l.stop()); value.setValue(0); spin.setValue(0); };
  }, [active, kind, value, spin]);

  const scale = kind === 'pulse' ? value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) : 1;
  const translateY = kind === 'float' ? value.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) : 0;
  const sway = kind === 'sway' ? value.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) : '0deg';
  const opacity = kind === 'shimmer' ? value.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) : 1;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowOpacity = kind === 'glow' ? value.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0.2] }) : 0;
  const auroraColor = kind === 'aurora' ? spin.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [color, '#D97B8F', '#7FA8C9', color] }) : color;
  const ring = size + 10;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {kind === 'glow' && active && (
        <Animated.View accessibilityElementsHidden importantForAccessibility="no" style={{ position: 'absolute', width: ring, height: ring, borderRadius: ring / 2, borderWidth: 3, borderColor: color, opacity: glowOpacity }} />
      )}
      {kind === 'aurora' && active && (
        <Animated.View accessibilityElementsHidden importantForAccessibility="no" style={{ position: 'absolute', width: ring, height: ring, borderRadius: ring / 2, borderWidth: 3, borderColor: auroraColor }} />
      )}
      {(kind === 'orbit' || kind === 'comet') && active && (
        <Animated.View accessibilityElementsHidden importantForAccessibility="no" style={{ position: 'absolute', width: size + 16, height: size + 16, transform: [{ rotate }] }}>
          <View style={{ position: 'absolute', top: 0, left: '50%', width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
          {kind === 'orbit' && <View style={{ position: 'absolute', bottom: 6, right: 8, width: 5, height: 5, borderRadius: 3, backgroundColor: color, opacity: 0.6 }} />}
          {kind === 'comet' && (
            <View style={{ position: 'absolute', width: '100%', height: '100%', transform: [{ rotate: '-38deg' }] }}>
              <View style={{ position: 'absolute', top: 0, left: '50%', width: 4, height: 4, borderRadius: 2, backgroundColor: color, opacity: 0.45 }} />
            </View>
          )}
        </Animated.View>
      )}
      <Animated.View style={{ transform: [{ scale }, { translateY }, { rotate: sway }], opacity, alignItems: 'center', justifyContent: 'center' }}>{children}</Animated.View>
    </View>
  );
}
