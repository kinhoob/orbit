import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, PanResponder, Platform, View } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useReducedMotion } from './motion';
import { ResponsiveTabBar, type TabBarProps } from './nav';
import { ScreenActiveContext } from './screen-active';
import { rubberBand } from '../domain/pager.mjs';
import { webPoint } from '../domain/web-gesture.mjs';
import { shouldStartScreenSwipe, swipeIndex, swipeNeighborRoute, swipeTargetRoute, SWIPE_SCREENS } from '../domain/screen-swipe.mjs';
import { tokens } from '../design/tokens';

// Telas da barra de baixo, importadas estaticamente. As rotas continuam nos
// arquivos de app/(tabs); o pager monta cada tela UMA vez (estado, rolagem e
// formul�rios sobrevivem � troca) e desliza a fileira com o dedo.
import IndexScreen from '../../app/(tabs)/index';
import DiscoverScreen from '../../app/(tabs)/discover';
import CreateScreen from '../../app/(tabs)/create';
import SearchTabScreen from '../../app/(tabs)/search';
import NotificationsScreen from '../../app/(tabs)/notifications';

const nativeDriver = Platform.OS !== 'web';

const SCREENS: Record<string, React.ComponentType> = {
  index: IndexScreen,
  discover: DiscoverScreen,
  create: CreateScreen,
  search: SearchTabScreen,
  notifications: NotificationsScreen,
};

/** Rotas fora do arraste, abertas por cima do pager (Perfil, Salvos). */
const BAR_ROUTES = [
  ...SWIPE_SCREENS.map((name) => ({ key: name, name })),
  { key: 'profile', name: 'profile' },
  { key: 'saved', name: 'saved' },
];

/** Nome da rota a partir do caminho ('/' -> 'index', '/discover' -> 'discover'). */
function routeNameFromPath(pathname: string): string {
  const clean = pathname.replace(/^\//, '').replace(/^\(tabs\)\/?/, '');
  return clean.split('/')[0] || 'index';
}

const hrefFor = (name: string) => (name === 'index' ? '/(tabs)' : `/(tabs)/${name}`);

/**
 * Troca de telas arrastada para o lado (pedido do Marco em 19/11/2026): as
 * cinco telas da barra de baixo (In�cio, Explorar, Criar, Busca, Sino) ficam
 * montadas lado a lado numa fileira - cada uma UMA inst�ncia real, montada na
 * primeira visita e preservada depois - e a fileira acompanha o dedo. � o
 * mesmo comportamento do pager Descobrir <-> Amigos: a tela vizinha entra
 * junto, com a rolagem e os campos que ela j� tinha. Soltando al�m do limiar
 * a fileira assenta na vizinha e a rota acompanha; soltando antes, volta.
 * A faixa da borda esquerda continua reservada � gaveta do Perfil, o pager
 * das timelines entrega o gesto nas suas bordas e o teclado aberto suspende
 * o arraste. Respeita "reduzir movimento": troca instant�nea, sem deslize.
 */
export function ScreenPager({ marginLeft = 0 }: { marginLeft?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const [visited, setVisited] = useState<ReadonlyArray<boolean>>([true, false, false, false, false]);
  const slide = useRef(new Animated.Value(0)).current;
  const state = useRef({ active, width, reduced, dragging: false, keyboardOpen: false, overlay: false });
  state.current.active = active;
  state.current.width = width;
  state.current.reduced = reduced;

  const overlayName = swipeIndex(routeNameFromPath(pathname)) < 0 && pathname !== '/' ? routeNameFromPath(pathname) : null;
  state.current.overlay = overlayName !== null;

  // Navega��o iniciada por este pager (arraste ou toque na barra): o efeito
  // do pathname n�o deve animar de novo o que j� est� acontecendo.
  const navigatingTo = useRef<string | null>(null);

  const animateTo = (toValue: number, duration = 340, done?: () => void) => {
    slide.stopAnimation();
    if (state.current.reduced) { slide.setValue(toValue); done?.(); return; }
    Animated.timing(slide, { toValue, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }).start(({ finished }) => { if (finished) done?.(); });
  };

  const visit = (i: number) => {
    setVisited((current) => (current[i] ? current : current.map((v, j) => (j === i ? true : v))));
  };

  // Teclado aberto = usu�rio digitando (Criar, Busca): o arraste fica
  // suspenso para n�o roubar a intera��o com os campos de texto.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => { state.current.keyboardOpen = true; });
    const hide = Keyboard.addListener('keyboardDidHide', () => { state.current.keyboardOpen = false; });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const goTo = (i: number, updateUrl: boolean) => {
    const name = SWIPE_SCREENS[i];
    if (!name) return;
    visit(i);
    setActive(i);
    state.current.active = i;
    if (updateUrl) {
      navigatingTo.current = name;
      router.navigate(hrefFor(name));
    }
    if (state.current.width > 0) animateTo(-i * state.current.width, 480);
  };

  // Mudan�a de rota por fora do gesto (toque na barra, link, deep link,
  // voltar): o pager acompanha a URL. Navega��es iniciadas aqui s�o puladas.
  useEffect(() => {
    const name = routeNameFromPath(pathname);
    const i = swipeIndex(name);
    if (i < 0) return; // Perfil/Salvose: camada por cima, pager parado
    if (navigatingTo.current) {
      if (navigatingTo.current === name) navigatingTo.current = null;
      return;
    }
    if (i !== state.current.active) goTo(i, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const finish = (dx: number) => {
    state.current.dragging = false;
    const { active: current, width: w } = state.current;
    const target = swipeTargetRoute(SWIPE_SCREENS[current], dx, w);
    if (!target) { animateTo(-current * w, 340); return; }
    // A fileira assenta com a vizinha em tela cheia; a rota acompanha no fim.
    const j = swipeIndex(target);
    visit(j);
    setActive(j);
    state.current.active = j;
    navigatingTo.current = target;
    animateTo(-j * w, 340, () => router.navigate(hrefFor(target)));
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

  const responder = useMemo(() => PanResponder.create({
    // Filhos (listas verticais, carross�is, o pager das timelines) s�o
    // consultados antes; este gesto s� assume o que sobrar na horizontal.
    onMoveShouldSetPanResponder: (e, g) => {
      const w = webGesture(e);
      const startX = w ? w.startX : g.x0;
      const dx = w ? w.dx : g.dx;
      const dy = w ? w.dy : g.dy;
      return state.current.width > 0 && !state.current.keyboardOpen && !state.current.overlay
        && shouldStartScreenSwipe(SWIPE_SCREENS[state.current.active], startX, dx, dy);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { state.current.dragging = true; slide.stopAnimation(); },
    onPanResponderMove: (e, g) => {
      const w = webGesture(e);
      const dx = w ? w.dx : g.dx;
      const { active: current, width: wdt } = state.current;
      slide.setValue(-current * wdt + rubberBand(dx, -wdt, wdt));
      // A vizinha real monta na hora que aparece pela primeira vez, para
      // acompanhar o dedo j� com seu conte�do - nunca uma c�pia.
      const next = swipeNeighborRoute(SWIPE_SCREENS[current], dx);
      if (next) visit(swipeIndex(next));
    },
    onPanResponderRelease: (e, g) => finish(webGesture(e)?.dx ?? g.dx),
    onPanResponderTerminate: (e, g) => finish(webGesture(e)?.dx ?? g.dx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const barProps: TabBarProps = {
    screenPosition: slide.interpolate({ inputRange: [-Math.max(width, 1) * (SWIPE_SCREENS.length - 1), 0], outputRange: [SWIPE_SCREENS.length - 1, 0], extrapolate: 'clamp' }),
    state: {
      index: overlayName ? BAR_ROUTES.findIndex((r) => r.name === overlayName) : active,
      routes: BAR_ROUTES,
    },
    emitter: { emit: () => ({ defaultPrevented: false }) },
    navigateToTab: (routeKey) => {
      const i = swipeIndex(routeKey);
      if (i >= 0) goTo(i, true);
      else router.navigate(hrefFor(routeKey));
    },
  };

  return (
    <View style={{ flex: 1, marginLeft, backgroundColor: tokens.colors.dark }}>
      <View
        {...responder.panHandlers}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setWidth(w);
          state.current.width = w;
          if (!state.current.dragging) slide.setValue(-state.current.active * w);
        }}
        onTouchStart={(e) => { if (Platform.OS === 'web') { const p = webPoint(e.nativeEvent); if (p) touchOrigin.current = p; } }}
        style={{ flex: 1, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as object) : null) }}
      >
        <Animated.View style={{ flex: 1, flexDirection: 'row', width: width * SWIPE_SCREENS.length, transform: [{ translateX: slide }] }}>
          {SWIPE_SCREENS.map((name, i) => {
            const ScreenComponent = SCREENS[name] as React.ComponentType;
            return (
              <View key={name} style={{ width, height: '100%' }}>
                {visited[i] ? (
                  <ScreenActiveContext.Provider value={i === active}>
                    <ScreenComponent />
                  </ScreenActiveContext.Provider>
                ) : null}
              </View>
            );
          })}
        </Animated.View>
      </View>
      {/* Perfil/Salvose abrem por cima do pager (que segue montado, com estado). */}
      {overlayName ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: tokens.colors.dark }}>
          <Slot />
        </View>
      ) : null}
      <ResponsiveTabBar {...barProps} />
    </View>
  );
}
