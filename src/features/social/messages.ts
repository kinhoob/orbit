import { requireSupabase } from '../../lib/supabase';
import { isMissingTableError } from '../../domain/supabase-error.mjs';

// Mensagens entre amigos (modelo confirmado pelo Marco em 22/11/2026), da
// migration 20261123012000_messages.sql, que fica em revisão no PR. Enquanto
// a tabela não existe no banco, estas funções respondem indisponível — nunca
// estado inventado — e a interface explica isso na conversa.

export type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  delivered_at: string | null;
};

let tableMissing = false;

/** Verdadeiro quando o banco respondeu que a tabela de mensagens ainda não existe. */
export function messagesUnavailable(): boolean {
  return tableMissing;
}

function markIfMissing(error: unknown): boolean {
  if (isMissingTableError(error)) {
    tableMissing = true;
    return true;
  }
  return false;
}

/** RLS recusa o envio fora da amizade com este código. */
function isNotFriendsError(error: unknown): boolean {
  const e = error as { code?: string } | null;
  return !!e && e.code === '42501';
}

/** As últimas mensagens da conversa com a pessoa; null enquanto a tabela não existe. */
export async function fetchThread(userId: string, otherId: string, limit = 200): Promise<ChatMessage[] | null> {
  if (tableMissing) return null;
  const { data, error } = await requireSupabase()
    .from('messages')
    .select('id,sender_id,recipient_id,body,created_at,read_at,delivered_at')
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) {
    if (markIfMissing(error)) return null;
    throw error;
  }
  return (data || []) as ChatMessage[];
}

/** Mensagens recentes da pessoa logada, para montar a lista de conversas; null enquanto em revisão. */
export async function fetchRecentMessages(userId: string, limit = 300): Promise<ChatMessage[] | null> {
  if (tableMissing) return null;
  const { data, error } = await requireSupabase()
    .from('messages')
    .select('id,sender_id,recipient_id,body,created_at,read_at,delivered_at')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (markIfMissing(error)) return null;
    throw error;
  }
  return (data || []) as ChatMessage[];
}

/**
 * Envia mensagem para um amigo. 'unavailable' enquanto a migration está em
 * revisão; 'not-friends' quando o banco recusa porque a amizade não existe
 * (ou acabou, ou há bloqueio).
 */
export async function sendMessage(userId: string, otherId: string, body: string): Promise<'ok' | 'unavailable' | 'not-friends'> {
  if (tableMissing) return 'unavailable';
  const { error } = await requireSupabase().from('messages').insert({ sender_id: userId, recipient_id: otherId, body });
  if (error) {
    if (markIfMissing(error)) return 'unavailable';
    if (isNotFriendsError(error)) return 'not-friends';
    throw error;
  }
  return 'ok';
}

/**
 * Confirma a ENTREGA: o aparelho da pessoa logada recebeu de fato as
 * mensagens desta conversa (por busca ou evento em tempo real). É o que
 * transforma 'enviada' em 'entregue' no aparelho de quem enviou — nada
 * mais confirma entrega. Sem efeito em revisão.
 */
export async function markConversationDelivered(userId: string, otherId: string): Promise<void> {
  if (tableMissing) return;
  const { error } = await requireSupabase().rpc('mark_conversation_delivered', { other_user: otherId });
  if (error) markIfMissing(error);
}

/** Marca como lidas as mensagens que recebi desta pessoa. Sem efeito em revisão. */
export async function markConversationRead(userId: string, otherId: string): Promise<void> {
  if (tableMissing) return;
  const { error } = await requireSupabase().rpc('mark_conversation_read', { other_user: otherId });
  if (error) markIfMissing(error);
}
