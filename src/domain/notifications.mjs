// Nucleo puro das notificacoes do Sino (testavel em Node, sem Supabase).
//
// O sino mostra apenas eventos reais do banco: pedido de amizade recebido,
// amizade aceita e curtida na sua avaliacao. Nada de badge cosmetico:
// sem linha nao lida no banco, sem contador.

/** Texto de uma notificacao a partir do tipo e do nome de quem agiu. */
export function notificationText(type, actorName) {
  const name = (actorName || '').trim() || 'Alguém';
  switch (type) {
    case 'friend_request':
      return `${name} pediu para ser seu amigo.`;
    case 'friend_accepted':
      return `${name} aceitou seu pedido de amizade.`;
    case 'rating_like':
      return `${name} curtiu sua avaliação.`;
    default:
      return `${name} interagiu com você.`;
  }
}

/** Rótulo curto do contador do sino: acima de 9 vira "9+". */
export function unreadBadgeLabel(count) {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (n <= 0) return '';
  return n > 9 ? '9+' : String(n);
}
