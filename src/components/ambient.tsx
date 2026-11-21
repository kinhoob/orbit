import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { tokens as t } from '../design/tokens';
import { ambientOrbs } from '../design/motion.mjs';
import { useReducedMotion } from './motion';

const nativeDriver = Platform.OS !== 'web';

function Orb({ size, color, opacity, left, top, dx, dy, duration, delay }: ReturnType<typeof ambientOrbs>[number]) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
      Animated.timing(progress, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [progress, duration, delay]);
  return (
    <Animated.View style={[styles.orb, {
      width: size, height: size, borderRadius: size / 2, backgroundColor: color, left, top,
      opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [opacity, opacity * 0.55] }),
      transform: [
        { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
      ],
    }]} />
  );
}

/** Fundo ambiente das telas escuras (pedido do Marco em 21/11/2026): orbes
// suaves em deriva lenta, ecoando a marca. Só transform e opacidade, para
// ficar fluido; com movimento reduzido o fundo fica estático (sem orbes). */
export function AmbientBackground() {
  const reduced = useReducedMotion();
  const orbs = ambientOrbs(reduced);
  if (!orbs.length) return <View pointerEvents="none" style={StyleSheet.absoluteFill} />;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {orbs.map((orb, index) => <Orb key={index} {...orb} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute' },
});

export const ambientBaseColor = t.colors.dark;
