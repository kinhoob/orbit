import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, View, type ViewProps } from 'react-native';
import { useReducedMotion } from './motion';
import { resolveSwipeTarget, rubberBand } from '../domain/pager.mjs';

const nativeDriver = Platform.OS !== 'web';

type PagerProps = React.PropsWithChildren<{
  /** Pagina ativa (0-based). */
  index: number;
  /** Chamado quando um gesto horizontal pede outra pagina. */
  onIndexChange: (next: number) => void;
}> & Omit<ViewProps, 'children' | 'onLayout'>;

/**
 * Pager horizontal estilo "swiper" (referencia: transicao entre as abas do X).
 * Arrastar na horizontal desliza entre as paginas com o dedo; soltar alem do
 * limiar troca de pagina. Trocar a aba pelo toque anima o mesmo deslize.
 * Respeita "reduzir movimento": a troca e instantanea, sem deslize.
 */
export function Pager({ index, onIndexChange, children, style, ...props }: PagerProps) {
  const reduced = useReducedMotion();
  const pages = React.Children.toArray(children);
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;
  const state = useRef({ index, width, pageCount: pages.length, reduced, dragging: false });
  state.current.index = index;
  state.current.width = width;
  state.current.pageCount = pages.length;
  state.current.reduced = reduced;
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  const animateTo = (toValue: number) => {
    slide.stopAnimation();
    if (state.current.reduced) { slide.setValue(toValue); return; }
    Animated.timing(slide, { toValue, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  };

  // Troca de pagina por fora do gesto (toque na aba): anima o deslize.
  useEffect(() => {
    if (!width || state.current.dragging) return;
    animateTo(-index * width);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, width, reduced]);

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) =>
      state.current.width > 0 && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderGrant: () => { state.current.dragging = true; slide.stopAnimation(); },
    onPanResponderMove: (_e, g) => {
      const { index: i, width: w, pageCount } = state.current;
      slide.setValue(rubberBand(-i * w + g.dx, -(pageCount - 1) * w, 0));
    },
    onPanResponderRelease: (_e, g) => finish(g.dx),
    onPanResponderTerminate: (_e, g) => finish(g.dx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const finish = (dx: number) => {
    state.current.dragging = false;
    const { index: i, width: w, pageCount } = state.current;
    const target = resolveSwipeTarget(i, dx, pageCount, w);
    if (target === i) {
      animateTo(-i * w);
    } else {
      onIndexChangeRef.current(target); // o efeito acima anima o deslize ate a nova pagina
    }
  };

  return (
    <View
      {...props}
      {...responder.panHandlers}
      style={[{ overflow: 'hidden' }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <Animated.View style={{ flexDirection: 'row', width: width * pages.length, transform: [{ translateX: slide }] }}>
          {pages.map((page, i) => (
            <View key={i} style={{ width }} accessibilityElementsHidden={i !== index} importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}>
              {page}
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}
