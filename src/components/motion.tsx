import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, type PressableProps, type ViewProps } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { motionSpec } from '../design/motion.mjs';
import { useAccountSettings } from '../features/account/settings';

const ReducedMotion = createContext(true);

/** Fail closed until the preference is known. Changes apply without restarting. */
export function MotionProvider({ children }: React.PropsWithChildren) {
  const preferences = useAccountSettings();
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setReduced(media.matches);
      update();
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    let alive = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      if (alive) setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (alive && !changed) setReduced(value);
    }).catch(() => { /* Keep motion off if the preference cannot be read. */ });
    return () => { alive = false; subscription.remove(); };
  }, []);
  return <ReducedMotion.Provider value={reduced || preferences.data?.motion_preference === 'reduce'}>{children}</ReducedMotion.Provider>;
}

export const useReducedMotion = () => useContext(ReducedMotion);
const nativeDriver = Platform.OS !== 'web';

/** One short entrance on focus, including tab revisits and back navigation. No layout animation. */
export function ScreenMotion({ children, style, ...props }: ViewProps) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(1)).current;
  useFocusEffect(useCallback(() => {
    value.stopAnimation();
    const spec = motionSpec(reduced);
    if (reduced) { value.setValue(1); return; }
    value.setValue(0);
    const animation = Animated.timing(value, { toValue: 1, duration: spec.screenDuration, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver, isInteraction: false });
    animation.start();
    return () => { animation.stop(); value.setValue(1); };
  }, [reduced, value]));
  const spec = motionSpec(reduced);
  return <Animated.View {...props} style={[style, {
    opacity: reduced ? 1 : value.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
    transform: [{ translateY: reduced ? 0 : value.interpolate({ inputRange: [0, 1], outputRange: [spec.screenDistance, 0] }) }],
  }]}>{children}</Animated.View>;
}

/** Bounded stagger. Later cards stay still, so large lists do not queue animations. */
export function CardEntrance({ children, index, style }: React.PropsWithChildren<{ index: number; style?: ViewProps['style'] }>) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    value.stopAnimation();
    const spec = motionSpec(reduced, index);
    if (!spec.cardDuration) { value.setValue(1); return; }
    value.setValue(0);
    const animation = Animated.timing(value, { toValue: 1, delay: spec.cardDelay, duration: spec.cardDuration, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver, isInteraction: false });
    animation.start();
    return () => { animation.stop(); value.setValue(1); };
  }, [index, reduced, value]);
  return <Animated.View style={[style, { opacity: reduced ? 1 : value.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }), transform: [{ translateY: reduced ? 0 : value.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
/** Keeps Pressable semantics, refs and Link asChild handlers. No added wrapper or delayed press. */
export const MotionPressable = React.forwardRef<React.ElementRef<typeof Pressable>, PressableProps>(function MotionPressable({ style, onPressIn, onPressOut, disabled, ...props }, ref) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  useEffect(() => { scale.stopAnimation(); scale.setValue(1); setPressed(false); }, [reduced, disabled, scale]);
  useEffect(() => () => scale.stopAnimation(), [scale]);
  // Toque com mola (pedido do Marco em 22/11/2026): afunda firme e rápido no
  // pressionar e volta com um balanço suave, fluido mesmo interrompendo no meio.
  const animate = (toValue: number) => {
    scale.stopAnimation();
    if (reduced || disabled) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue, useNativeDriver: nativeDriver, stiffness: toValue === 1 ? 260 : 520, damping: toValue === 1 ? 16 : 34, mass: 0.7 }).start();
  };
  return <AnimatedPressable {...props} ref={ref} disabled={disabled}
    onPressIn={event => { setPressed(true); animate(0.965); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); animate(1); onPressOut?.(event); }}
    style={[typeof style === 'function' ? style({ pressed }) : style, pressed && !disabled && { opacity: 0.85 }, { transform: [{ scale: reduced ? 1 : scale }] }]} />;
});

