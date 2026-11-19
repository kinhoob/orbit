import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { useReducedMotion } from './motion';
import { tokens as t } from '../design/tokens';

/** One opacity animation per group; fixed geometry avoids layout jumps. */
export function LoadingState({ kind = 'catalog' }: { kind?: 'catalog' | 'feed' | 'detail' }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    opacity.setValue(1);
    if (reduced) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.45, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
      Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reduced]);
  const bar = (width: `${number}%`, height = 14) => <View style={{ width, height, backgroundColor: t.colors.secondary, borderRadius: 8 }} />;
  return <View accessibilityRole="progressbar" accessibilityLabel="Carregando conteúdo" accessibilityState={{ busy: true }}>
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ opacity, gap: 16, flexDirection: kind === 'catalog' ? 'row' : 'column', flexWrap: 'wrap' }}>
      {Array.from({ length: kind === 'detail' ? 1 : kind === 'feed' ? 3 : 4 }, (_, index) => <View key={index} style={{ width: kind === 'catalog' ? '47%' : '100%', gap: 14, padding: kind === 'feed' ? 18 : 0 }}>
        {kind !== 'feed' && <View style={{ width: '100%', aspectRatio: kind === 'detail' ? 16 / 9 : 0.7, backgroundColor: t.colors.secondary, borderRadius: t.radius }} />}
        {bar('70%', kind === 'detail' ? 30 : 18)}{bar('92%')}{bar('54%')}
      </View>)}
    </Animated.View>
  </View>;
}
