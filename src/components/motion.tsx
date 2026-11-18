import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, type PressableProps, type ViewProps } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { motionSpec } from '../design/motion.mjs';

const ReducedMotion = createContext(true);

/** Fail closed until the preference is known. Changes apply without restarting. */
export function MotionProvider({ children }: React.PropsWithChildren) {
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
  return <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>;
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
  const animate = (toValue: number) => {
    scale.stopAnimation();
    if (reduced || disabled) { scale.setValue(1); return; }
    Animated.timing(scale, { toValue, duration: toValue === 1 ? 150 : 90, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  };
  return <AnimatedPressable {...props} ref={ref} disabled={disabled}
    onPressIn={event => { setPressed(true); animate(0.98); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); animate(1); onPressOut?.(event); }}
    style={[typeof style === 'function' ? style({ pressed }) : style, pressed && !disabled && { opacity: 0.8 }, { transform: [{ scale: reduced ? 1 : scale }] }]} />;
});
