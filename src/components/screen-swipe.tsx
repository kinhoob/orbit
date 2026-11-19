import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, type LayoutChangeEvent, type ViewProps } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useReducedMotion } from './motion';
import { rubberBand } from '../domain/pager.mjs';
import { shouldStartScreenSwipe, swipeTargetRoute } from '../domain/screen-swipe.mjs';

const nativeDriver = Platform.OS !== 'web';

/** Direção de entrada pendente após um arraste: 1 = entra da direita, -1 = da esquerda. */
let pendingEntry: -1 | 0 | 1 = 0;

type SwipeScreenProps = React.PropsWithChildren<{
  /** Nome da rota da aba ('index', 'discover', 'search', 'notifications'). */
  route: string;
}> & Omit<ViewProps, 'children' | 'onLayout'>;

/**
 * Troca de tela arrastada para o lado (pedido do Marco em 19/11/2026): o
 * conteúdo acompanha o dedo na horizontal e, soltando além do limiar, a tela
 * vizinha (Início, Explorar, Busca ou Sino) entra deslizando. A faixa da
 * borda esquerda continua reservada à gaveta do Perfil, e o pager das
 * timelines do Explorar entrega o gesto a este componente nas suas bordas.
 * Respeita "reduzir movimento": a troca é instantânea, sem deslize.
 */
export function SwipeScreen({ route, children, style, ...props }: SwipeScreenProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;
  const state = useRef({ route, width, reduced, dragging: false });
  state.current.route = route;
  state.current.width = width;
  state.current.reduced = reduced;

  const animateTo = (toValue: number, duration = 220, done?: () => void) => {
    slide.stopAnimation();
    if (state.current.reduced) { slide.setValue(toValue); done?.(); return; }
    Animated.timing(slide, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start(() => done?.());
  };

  // Entrada deslizante da tela vizinha, do lado oposto ao da saída. Roda no
  // foco porque abas já visitadas continuam montadas (sem novo onLayout) e no
  // primeiro layout porque a montagem inicial pode anteceder o foco.
  const runEntry = (w: number) => {
    if (w <= 0 || pendingEntry === 0) return;
    const from = pendingEntry;
    pendingEntry = 0;
    slide.setValue(from * w);
    animateTo(0);
  };
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    runEntry(w);
  };
  useFocusEffect(useCallback(() => {
    runEntry(state.current.width);
    return () => {
      // Ao sair de foco a tela já terminou o deslize de saída: zera sem aparecer.
      if (!state.current.dragging) slide.setValue(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]));

  const finish = (dx: number) => {
    state.current.dragging = false;
    const { route: current, width: w } = state.current;
    const target = swipeTargetRoute(current, dx, w);
    if (!target) { animateTo(0); return; }
    // Arrastar para a esquerda (dx < 0) leva à próxima tela, que entra da direita.
    pendingEntry = dx < 0 ? 1 : -1;
    animateTo(dx < 0 ? -w : w, 160, () => {
      router.navigate(target === 'index' ? '/(tabs)' : `/(tabs)/${target}`);
    });
  };

  const responder = useMemo(() => PanResponder.create({
    // Filhos (listas verticais, carrosséis, o pager das timelines) são
    // consultados antes; este gesto só assume o que sobrar na horizontal.
    onMoveShouldSetPanResponder: (_e, g) =>
      state.current.width > 0 && shouldStartScreenSwipe(state.current.route, g.x0, g.dx, g.dy),
    onPanResponderGrant: () => { state.current.dragging = true; slide.stopAnimation(); },
    onPanResponderMove: (_e, g) => {
      const w = state.current.width;
      slide.setValue(rubberBand(g.dx, -w, w));
    },
    onPanResponderRelease: (_e, g) => finish(g.dx),
    onPanResponderTerminate: (_e, g) => finish(g.dx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  return (
    <Animated.View {...props} {...responder.panHandlers} onLayout={onLayout} style={[{ flex: 1, transform: [{ translateX: slide }] }, style]}>
      {children}
    </Animated.View>
  );
    }
