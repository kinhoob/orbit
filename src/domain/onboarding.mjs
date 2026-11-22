// Escolha de gostos no primeiro acesso (pedido do Marco em 21/11/2026):
// a compatibilidade entre amigos sai das avaliações reais em obras em comum,
// e o cálculo (src/domain/compatibility.mjs) pede no mínimo 5 pares.
export const COMPATIBILITY_RATING_TARGET = 5;

export function compatibilityKickoff(ratedCount, target = COMPATIBILITY_RATING_TARGET) {
  if (!Number.isInteger(ratedCount) || ratedCount < 0) throw new RangeError('Invalid rated count');
  if (!Number.isInteger(target) || target < 1) throw new RangeError('Invalid target');
  const remaining = Math.max(0, target - ratedCount);
  return { remaining, complete: remaining === 0 };
}
