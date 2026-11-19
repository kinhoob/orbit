// Nucleo puro da gaveta do Perfil (testavel em Node).
// O componente animado fica em src/components/drawer.tsx.
//
// Regra de convivencia com o pager das timelines (aprovada pelo Marco em
// 18/11/2026): o arraste horizontal no MEIO da tela continua trocando
// Descobrir <-> Amigos; a gaveta so abre quando o gesto COMECA na faixa da
// borda esquerda, que e so dela. Assim um gesto nunca dispara o outro.

/** Largura da gaveta aberta (px). */
export const DRAWER_WIDTH_PX = 280;

/** Faixa da borda esquerda da tela reservada ao gesto da gaveta (px). */
export const EDGE_ZONE_PX = 28;

/** O gesto da gaveta so comeca dentro da faixa da borda esquerda. */
export function isEdgeStart(x0, edgeZone = EDGE_ZONE_PX) {
  return Number.isFinite(x0) && x0 >= 0 && x0 <= edgeZone;
}

/** Decide se o arraste de abertura termina com a gaveta aberta. */
export function shouldOpenDrawer(dx, vx = 0) {
  if (!Number.isFinite(dx)) return false;
  return dx > 60 || vx > 0.4;
}

/** Decide se o arraste de fechamento termina com a gaveta fechada. */
export function shouldCloseDrawer(dx, vx = 0) {
  if (!Number.isFinite(dx)) return false;
  return dx < -60 || vx < -0.4;
}

/**
 * Posicao da gaveta durante o arraste de abertura (partindo de fechada).
 * Vai de -width (escondida) a 0 (aberta), com leve resistencia alem do fim.
 */
export function drawerOpenOffset(dx, width = DRAWER_WIDTH_PX) {
  if (!Number.isFinite(dx)) return -width;
  const clamped = Math.max(0, Math.min(dx, width + 40));
  const over = clamped > width ? (clamped - width) * 0.35 : 0;
  return Math.min(0, -width + Math.min(clamped, width) + over);
}

/** Posicao da gaveta durante o arraste de fechamento (partindo de aberta). */
export function drawerCloseOffset(dx, width = DRAWER_WIDTH_PX) {
  if (!Number.isFinite(dx)) return 0;
  const clamped = Math.max(-width - 40, Math.min(dx, 0));
  const over = clamped < -width ? (clamped + width) * 0.35 : 0;
  return Math.max(-width, Math.max(clamped, -width) + over);
}
