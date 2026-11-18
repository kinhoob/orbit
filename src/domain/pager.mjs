// Nucleo puro do pager horizontal das timelines do Explorar (testavel em Node).
// O componente animado fica em src/components/pager.tsx.

/**
 * Decide a pagina alvo de um gesto horizontal.
 * deltaX < 0 = arrastar para a esquerda (proxima pagina);
 * deltaX > 0 = arrastar para a direita (pagina anterior).
 * Arraste curto demais mantem a pagina atual; nas bordas nao ha para onde ir.
 */
export function resolveSwipeTarget(index, deltaX, pageCount, width, thresholdRatio = 0.22) {
  if (!Number.isFinite(deltaX) || !Number.isInteger(pageCount) || pageCount < 2) return index;
  const threshold = Math.max(40, Math.min((width || 0) * thresholdRatio, 140));
  if (deltaX <= -threshold) return Math.min(index + 1, pageCount - 1);
  if (deltaX >= threshold) return Math.max(index - 1, 0);
  return index;
}

/** Resistencia nas bordas do arraste: alem dos limites o deslocamento rende menos. */
export function rubberBand(offset, min, max) {
  if (offset < min) return min + (offset - min) * 0.35;
  if (offset > max) return max + (offset - max) * 0.35;
  return offset;
}

/** Limiar (px) do gesto vertical de "puxar para atualizar" e curso maximo do indicador. */
export const PULL_THRESHOLD = 56;
export const PULL_MAX = 110;

/** Deslocamento visual do gesto de puxar: metade do dedo, limitado ao curso maximo. */
export function pullOffset(dy) {
  if (!Number.isFinite(dy)) return 0;
  return Math.min(Math.max(0, dy) * 0.5, PULL_MAX);
}

/** Ao soltar alem do limiar o conteudo recolhe: o indicador de carregamento aparece na linha "Atualizando…" abaixo das abas (pedido do Marco em 18/11/2026). */
export const PULL_HOLD_OFFSET = 0;

/** O gesto de puxar so comeca com a lista no topo e movimento vertical dominante. */
export function shouldStartPull(atTop, dy, dx) {
  return Boolean(atTop) && dy > 10 && dy > Math.abs(dx) * 1.2;
}
