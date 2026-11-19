// Núcleo puro da troca de telas por arraste horizontal (pedido do Marco em
// 19/11/2026): todas as telas da barra de baixo — Início, Explorar, Criar,
// Busca e Sino — deslizam para o lado com o dedo, no mesmo espírito da troca
// Descobrir <-> Amigos dentro do Explorar.
// O componente animado fica em src/components/screen-swipe.tsx.

import { resolveSwipeTarget, shouldStartPager } from './pager.mjs';
import { EDGE_ZONE_PX } from './drawer.mjs';

/** Telas do arraste lateral, na mesma ordem da barra de baixo (com o Criar). */
export const SWIPE_SCREENS = ['index', 'discover', 'create', 'search', 'notifications'];

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
 * Com o teclado aberto (digitação no Criar/Busca), o arraste fica suspenso
 * para não roubar a interação com os campos de texto.
 */
export function shouldStartScreenSwipe(routeName, x0, dx, dy, edgeZone = EDGE_ZONE_PX, keyboardOpen = false) {
  if (keyboardOpen) return false;
  return shouldStartPager(x0, dx, dy, edgeZone) && hasSwipeNeighbor(routeName, dx);
}

/** Tela alvo ao soltar o arraste, ou null para ficar na tela atual. */
export function swipeTargetRoute(routeName, dx, width) {
  const i = swipeIndex(routeName);
  if (i < 0) return null;
  const target = resolveSwipeTarget(i, dx, SWIPE_SCREENS.length, width);
  return target === i ? null : SWIPE_SCREENS[target];
}

/**
 * Tela vizinha na direção do gesto, sem limiar: é ela que aparece ao lado e
 * acompanha o dedo durante todo o arraste (como no pager Descobrir/Amigos).
 */
export function swipeNeighborRoute(routeName, dx) {
  const i = swipeIndex(routeName);
  if (i < 0 || !Number.isFinite(dx) || dx === 0) return null;
  const j = dx < 0 ? i + 1 : i - 1;
  return j >= 0 && j < SWIPE_SCREENS.length ? SWIPE_SCREENS[j] : null;
}
