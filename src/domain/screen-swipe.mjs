// Núcleo puro da troca de telas por arraste horizontal (pedido do Marco em
// 19/11/2026): Início, Explorar, Busca e Sino deslizam para o lado com o dedo,
// no mesmo espírito da troca Descobrir <-> Amigos dentro do Explorar.
// O Criar fica fora do arraste: é o formulário de avaliação, não uma tela de
// leitura, e o gesto horizontal atrapalharia os controles do formulário.
// O componente animado fica em src/components/screen-swipe.tsx.

import { resolveSwipeTarget, shouldStartPager } from './pager.mjs';
import { EDGE_ZONE_PX } from './drawer.mjs';

/** Telas do arraste lateral, na mesma ordem da barra de baixo (sem o Criar). */
export const SWIPE_SCREENS = ['index', 'discover', 'search', 'notifications'];

/** Posição da tela no arraste, ou -1 para telas fora dele (Criar, Perfil…). */
export function swipeIndex(routeName) {
  return SWIPE_SCREENS.indexOf(routeName);
}

/** A tela participa do arraste e tem vizinha na direção do gesto? */
export function hasSwipeNeighbor(routeName, dx) {
  const i = swipeIndex(routeName);
  if (i < 0 || !Number.isFinite(dx) || dx === 0) return false;
  return dx < 0 ? i < SWIPE_SCREENS.length - 1 : i > 0;
}

/**
 * O arraste de troca de tela só começa fora da faixa da borda esquerda (que
 * pertence à gaveta do Perfil), com movimento horizontal dominante e uma tela
 * vizinha na direção do gesto: um gesto nunca dispara duas navegações.
 */
export function shouldStartScreenSwipe(routeName, x0, dx, dy, edgeZone = EDGE_ZONE_PX) {
  return shouldStartPager(x0, dx, dy, edgeZone) && hasSwipeNeighbor(routeName, dx);
}

/** Tela alvo ao soltar o arraste, ou null para ficar na tela atual. */
export function swipeTargetRoute(routeName, dx, width) {
  const i = swipeIndex(routeName);
  if (i < 0) return null;
  const target = resolveSwipeTarget(i, dx, SWIPE_SCREENS.length, width);
  return target === i ? null : SWIPE_SCREENS[target];
}
