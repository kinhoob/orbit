import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { pullOffset, shouldStartPull, PULL_THRESHOLD, PULL_HOLD_OFFSET } from '../domain/pager.mjs';

/**
 * "Puxar para atualizar" na WEB (no nativo, a Screen usa o RefreshControl
 * padrao). Arrastar para baixo com a lista no topo revela o indicador do
 * gesto; ao soltar alem do limiar o conteudo recolhe e a bolinha de
 * carregamento aparece sozinha, centralizada abaixo das abas.
 */
export function useWebPullToRefresh(refreshing: boolean, onRefresh?: () => void) {
  const enabled = Platform.OS === 'web' && !!onRefresh;
  const pull = useRef(new Animated.Value(0)).current;
  const state = useRef({ refreshing, onRefresh, atTop: true, holding: false, value: 0 });
  state.current.refreshing = refreshing;
  state.current.onRefresh = onRefresh;

  const settle = (toValue: number) => {
    state.current.value = toValue;
    pull.stopAnimation();
    Animated.timing(pull, { toValue, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };

  const responder = useMemo(() => {
    if (!enabled) return null;
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => shouldStartPull(state.current.atTop, g.dy, g.dx),
      onPanResponderMove: (_e, g) => {
        const v = pullOffset(g.dy);
        state.current.value = v;
        pull.setValue(v);
      },
      onPanResponderRelease: () => {
        if (state.current.value >= PULL_THRESHOLD) {
          state.current.holding = true;
          settle(PULL_HOLD_OFFSET);
          state.current.onRefresh?.();
        } else {
          settle(0);
        }
      },
      onPanResponderTerminate: () => { if (!state.current.holding) settle(0); },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Atualizacao concluida: recolhe o indicador.
  useEffect(() => {
    if (!refreshing && state.current.holding) {
      state.current.holding = false;
      settle(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    state.current.atTop = e.nativeEvent.contentOffset.y <= 0;
  };

  return { enabled, panHandlers: responder?.panHandlers, pull, onScroll };
}
