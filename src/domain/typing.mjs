// Indicador "digitando" (pedido do Marco em 23/11/2026): presença REAL via
// postgres_changes na tabela public.typing_status (migration 20261123020000,
// em revisão) — o mesmo padrão das mensagens. A autorização é avaliada POR
// EVENTO no servidor: cada upsert passa pela RLS com a amizade/bloqueio
// atuais e o sender_id amarrado ao auth.uid(), e cada mudança só chega a
// quem a policy SELECT deixa ler naquele instante. O indicador só aparece
// quando o aparelho da outra pessoa avisa que ela está digitando; o app
// nunca simula um evento que não chegou.

/** Chave simétrica do par: os dois lados da conversa calculam a mesma. */
export function typingPairKey(a, b) {
  return [a, b].sort().join(':');
}

/** Nome do canal de assinatura (rótulo local; a permissão vem da RLS). */
export function typingChannelName(a, b) {
  return 'typing:' + typingPairKey(a, b);
}

/** Intervalo mínimo entre avisos de "digitando", para não inundar o banco. */
export const TYPING_EMIT_INTERVAL_MS = 2000;

/** Tempo que o indicador permanece sem um novo aviso antes de sumir. */
export const TYPING_VISIBLE_MS = 4000;

/** Decide se esta mudança no rascunho merece um novo aviso de digitação:
 * começou a digitar (rascunho saiu do vazio) ou continua digitando, no
 * máximo um aviso por intervalo. Rascunho vazio nunca avisa "digitando". */
export function shouldEmitTyping(prevDraft, nextDraft, lastEmitAt, now) {
  if (!nextDraft.trim()) return false;
  if (!prevDraft.trim()) return true;
  return now - lastEmitAt >= TYPING_EMIT_INTERVAL_MS;
}

/** O indicador ainda deve estar visível neste instante? */
export function typingStillVisible(lastReceivedAt, now) {
  return now - lastReceivedAt < TYPING_VISIBLE_MS;
}
