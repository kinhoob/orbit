// Decisões do portão da escolha de gostos (pedido do Marco em 21/11/2026).
// Função pura para ser testada decisão a decisão.
export function tasteCompleteKey(userId) {
  if (typeof userId !== 'string' || !userId) throw new RangeError('Invalid user id');
  return `orbit:taste-complete:v1:${userId}`;
}

// check: resultado da verificação autoritativa no servidor.
// knownComplete: registro local desta conta, gravado só depois de uma
// verificação autoritativa bem-sucedida: fallback de queda, nunca atalho.
export function tasteGateDecision(hasSession, check, knownComplete) {
  if (!hasSession) return 'allow'; // visitante navega livre
  if (check === 'complete') return 'allow';
  if (check === 'incomplete') return 'onboard';
  if (check === 'error') return knownComplete ? 'allow' : 'retry'; // desconhecido não vira "refaça o setup"
  throw new RangeError('Invalid check');
}
