// Regras puras das mensagens entre amigos (modelo confirmado pelo Marco em
// 22/11/2026): amizade aceita libera a conversa; a permissão vem sempre da
// amizade, nunca do seguir sozinho. Sem rede aqui.

export const MESSAGE_MAX = 2000;

/** Texto pronto para enviar ou null quando vazio/longo demais (mesmo limite do banco). */
export function normalizeMessageBody(text) {
  const body = String(text || '').trim();
  if (!body || body.length > MESSAGE_MAX) return null;
  return body;
}

/** Só amigos (relação aceita) podem abrir a conversa. */
export function canMessageWith(relationKind) {
  return relationKind === 'friends';
}

/**
 * Ordena a conversa em ordem cronológica e marca o que é meu.
 * rows: [{ id, sender_id, recipient_id, body, created_at, read_at }]
 */
export function buildThread(rows, userId) {
  return [...(rows || [])]
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((row) => ({ ...row, mine: row.sender_id === userId }));
}

/**
 * Agrupa mensagens recentes em conversas, uma por pessoa, mais recente primeiro.
 * unread conta só o que eu recebi e ainda não li.
 */
export function groupConversations(rows, userId) {
  const byOther = new Map();
  for (const row of rows || []) {
    const otherId = row.sender_id === userId ? row.recipient_id : row.sender_id;
    if (!otherId || otherId === userId) continue;
    const current = byOther.get(otherId);
    if (!current) {
      byOther.set(otherId, {
        otherId,
        lastBody: row.body,
        lastAt: row.created_at,
        lastMine: row.sender_id === userId,
        unread: row.recipient_id === userId && !row.read_at ? 1 : 0,
      });
    } else {
      if (String(row.created_at) > String(current.lastAt)) {
        current.lastBody = row.body;
        current.lastAt = row.created_at;
        current.lastMine = row.sender_id === userId;
      }
      if (row.recipient_id === userId && !row.read_at) current.unread += 1;
    }
  }
  return [...byOther.values()].sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)));
}
