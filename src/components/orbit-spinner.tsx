import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { tokens as t } from '../design/tokens';
import { useReducedMotion } from './motion';

/**
 * A marca em movimento: o círculo creme com a bolinha dourada em órbita, o
 * mesmo desenho da abertura do app. Gira em loop enquanto está montada; com
 * reduzir movimento fica parada. Usada na validação de sessão da entrada e
 * na transição entre entrar e criar conta.
 */
export function OrbitSpinner({ size = 72 }: { size?: number }) {
  const reduced = useReducedMotion();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, spin]);

  const ring = size * 0.76;
  const dot = Math.max(7, size * 0.09);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={[styles.mark, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no">
      <View style={{ width: ring, height: ring, borderRadius: ring / 2, borderWidth: 2.5, borderColor: t.colors.onDark }} />
      <Animated.View style={[styles.orbit, { width: size, height: size, transform: [{ rotate }] }]}>
        <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: t.colors.gold, marginTop: (size - ring) / 2 - dot / 2 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', alignItems: 'center' },
});
