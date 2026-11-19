import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Text, View } from 'react-native';
import { useReducedMotion } from './motion';
import { tokens as t } from '../design/tokens';

export function Feedback({ message, error = false }: { message: string; error?: boolean }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reduced || !message) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web', isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [message, progress, reduced]);
  if (!message) return null;
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }}>
    <View style={{ padding: 14, borderRadius: 12, backgroundColor: t.colors.surface, borderLeftWidth: 3, borderLeftColor: error ? t.colors.error : t.colors.success }}>
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: error ? t.colors.error : t.colors.text, lineHeight: 22 }}>{message}</Text>
    </View>
  </Animated.View>;
}

/** A short icon pulse after state changes. Reduced motion keeps it still. */
export function StatePulse({ active, children }: React.PropsWithChildren<{ active: boolean }>) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(active);
  useEffect(() => {
    scale.stopAnimation(); scale.setValue(1);
    const changed = previous.current !== active;
    previous.current = active;
    if (reduced || !changed) return;
    const animation = Animated.sequence([
      Animated.timing(scale, { toValue: 1.16, duration: 90, useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
      Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 220, mass: 0.6, useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
    ]);
    animation.start(); return () => animation.stop();
  }, [active, reduced, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}
