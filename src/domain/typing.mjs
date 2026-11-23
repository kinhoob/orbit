// Indicador "digitando" (pedido do Marco em 23/11/2026): presença REAL via
// broadcast do Supabase Realtime — sem tabela, sem migration. O indicador só
// aparece quando o aparelho da outra pessoa avisa que ela está digitando;
// o app nunca simula um evento que não chegou.

/** Nome simétrico do canal: os dois lados da conversa calculam o mesmo nome. */
export function typingChannelName(a, b) {
  return 'typing:' + [a, b].sort().join(':');
}

/** Intervalo mínimo entre avisos de "digitando", para não inundar o canal. */
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
