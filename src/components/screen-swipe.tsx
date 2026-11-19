import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, PanResponder, Platform, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useReducedMotion } from './motion';
import { rubberBand } from '../domain/pager.mjs';
import { webPoint } from '../domain/web-gesture.mjs';
import { shouldStartScreenSwipe, swipeNeighborRoute, swipeTargetRoute } from '../domain/screen-swipe.mjs';

// Telas da barra de baixo, importadas estaticamente. Há um ciclo de módulos
// (as telas importam SwipeScreen), mas os dois lados só usam a ligação no
// render, depois da inicialização: o ciclo é seguro.
import IndexScreen from '../../app/(tabs)/index';
import DiscoverScreen from '../../app/(tabs)/discover';
import CreateScreen from '../../app/(tabs)/create';
import SearchTabScreen from '../../app/(tabs)/search';
import NotificationsScreen from '../../app/(tabs)/notifications';

const nativeDriver = Platform.OS !== 'web';

const NEIGHBORS: Record<string, React.ComponentType> = {
  index: IndexScreen,
  discover: DiscoverScreen,
  create: CreateScreen,
  search: SearchTabScreen,
  notifications: NotificationsScreen,
};

/**
 * Verdadeiro dentro da cópia da tela vizinha renderizada ao lado durante o
 * arraste: a SwipeScreen dela fica inerte (sem gesto nem animação própria),
 * para não disputar o gesto nem navegar sozinha.
 */
const NeighborContext = React.createContext(false);

type SwipeScreenProps = React.PropsWithChildren<{
  /** Nome da rota da aba ('index', 'discover', 'create', 'search', 'notifications'). */
  route: string;
}> & Omit<ViewProps, 'children' | 'onLayout'>;

type NeighborState = { route: string; side: 'left' | 'right' } | null;

/**
 * Troca de tela arrastada para o lado (pedido do Marco em 19/11/2026): a tela
 * vizinha (Início, Explorar, Criar, Busca ou Sino, na ordem da barra de baixo)
 * aparece ao lado da atual e as DUAS acompanham o dedo durante todo o arraste,
 * como no pager Descobrir <-> Amigos. Soltando além do limiar, o par desliza
 * até a vizinha ocupar a tela e só então a rota troca — sem animação de
 * entrada, porque a vizinha já está no lugar. Soltando antes do limiar, o par
 * volta junto. A faixa da borda esquerda continua reservada à gaveta do
 * Perfil, e o pager das timelines entrega o gesto a este componente nas suas
 * bordas. Respeita "reduzir movimento": a troca é instantânea, sem deslize.
 */
export function SwipeScreen(props: SwipeScreenProps) {
  const nested = useContext(NeighborContext);
  const { children, style } = props;
  if (nested) return <View style={[{ flex: 1 }, style]}>{children}</View>;
  return <SwipeScreenPager {...props} />;
}

function SwipeScreenPager({ route, children, style, ...props }: SwipeScreenProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [neighbor, setNeighbor] = useState<NeighborState>(null);
  const slide = useRef(new Animated.Value(0)).current;
  const state = useRef({ route, width, reduced, dragging: false, keyboardOpen: false });
  state.current.route = route;
  state.current.width = width;
  state.current.reduced = reduced;
  const neighborRef = useRef<NeighborState>(null);
  const setNeighborState = (next: NeighborState) => {
    neighborRef.current = next;
    setNeighbor(next);
  };

  // Teclado aberto = usuário digitando (Criar, Busca): o arraste fica
  // suspenso para não roubar a interação com os campos de texto.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => { state.current.keyboardOpen = true; });
    const hide = Keyboard.addListener('keyboardDidHide', () => { state.current.keyboardOpen = false; });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const animateTo = (toValue: number, duration = 220, done?: () => void) => {
    slide.stopAnimation();
    if (state.current.reduced) { slide.setValue(toValue); done?.(); return; }
    Animated.timing(slide, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start(() => done?.());
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // Ao sair de foco a troca já terminou (a vizinha assentou em tela cheia):
  // zera o deslize e desmonta a cópia sem aparecer na tela.
  useFocusEffect(useCallback(() => () => {
    if (!state.current.dragging) slide.setValue(0);
    setNeighborState(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]));

  const finish = (dx: number) => {
    state.current.dragging = false;
    const { route: current, width: w } = state.current;
    const target = swipeTargetRoute(current, dx, w);
    if (!target) { animateTo(0, 220, () => setNeighborState(null)); return; }
    // As duas telas deslizam juntas até a vizinha ocupar a tela; a rota troca
    // no fim, com a vizinha já assentada — nada de entrada depois da troca.
    animateTo(dx < 0 ? -w : w, 160, () => {
      router.navigate(target === 'index' ? '/(tabs)' : `/(tabs)/${target}`);
    });
  };

  // Web: o PanResponder do react-native-web perde o estado do gesto (x0/dx)
  // quando outro respondedor foi consultado antes; por isso o arraste na web
  // mede o gesto pelo evento bruto, com origem gravada no touchstart. No
  // nativo o gestureState do PanResponder e confiavel e segue sendo usado.
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const webGesture = (e: { nativeEvent: unknown }) => {
    if (Platform.OS !== 'web' || !touchOrigin.current) return null;
    const p = webPoint(e.nativeEvent);
    if (!p) return null;
    return { startX: touchOrigin.current.x, dx: p.x - touchOrigin.current.x, dy: p.y - touchOrigin.current.y };
  };

  // Monta/troca a vizinha ao lado conforme a direção do dedo. Deslocamentos
  // mínimos mantêm a vizinha atual para não remontar tela à toa.
  const followFinger = (dx: number) => {
    if (Math.abs(dx) < 2) return;
    const nextRoute = swipeNeighborRoute(state.current.route, dx);
    if (nextRoute === (neighborRef.current?.route ?? null)) return;
    setNeighborState(nextRoute ? { route: nextRoute, side: dx < 0 ? 'right' : 'left' } : null);
  };

  const responder = useMemo(() => PanResponder.create({
    // Filhos (listas verticais, carrosséis, o pager das timelines) são
    // consultados antes; este gesto só assume o que sobrar na horizontal.
    onMoveShouldSetPanResponder: (e, g) => {
      const w = webGesture(e);
      const startX = w ? w.startX : g.x0;
      const dx = w ? w.dx : g.dx;
      const dy = w ? w.dy : g.dy;
      return state.current.width > 0 && !state.current.keyboardOpen
        && shouldStartScreenSwipe(state.current.route, startX, dx, dy);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { state.current.dragging = true; slide.stopAnimation(); },
    onPanResponderMove: (e, g) => {
      const w = webGesture(e);
      const dx = w ? w.dx : g.dx;
      slide.setValue(rubberBand(dx, -state.current.width, state.current.width));
      followFinger(dx);
    },
    onPanResponderRelease: (e, g) => finish(webGesture(e)?.dx ?? g.dx),
    onPanResponderTerminate: (e, g) => finish(webGesture(e)?.dx ?? g.dx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const NeighborScreen = neighbor ? NEIGHBORS[neighbor.route] : null;

  return (
    <View
      {...props}
      {...responder.panHandlers}
      onLayout={onLayout}
      onTouchStart={(e) => { if (Platform.OS === 'web') { const p = webPoint(e.nativeEvent); if (p) touchOrigin.current = p; } }}
      style={[{ flex: 1, overflow: 'hidden' }, Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as never) : null, style]}
    >
      <Animated.View style={{ flex: 1, transform: [{ translateX: slide }] }}>
        {neighbor && NeighborScreen ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', top: 0, bottom: 0, width: '100%',
              left: neighbor.side === 'right' ? '100%' : undefined,
              right: neighbor.side === 'left' ? '100%' : undefined,
            }}
          >
            <NeighborContext.Provider value={true}>
              <NeighborScreen />
            </NeighborContext.Provider>
          </View>
        ) : null}
        {children}
      </Animated.View>
    </View>
  );
}
