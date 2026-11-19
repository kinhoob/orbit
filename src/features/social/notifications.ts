import { requireSupabase } from '../../lib/supabase';

// Sino de notificacoes (aprovado pelo Marco em 18/11/2026): mostra apenas
// eventos reais gravados no banco pela migration de notificacoes. Enquanto a
// migration nao for aplicada (ela fica em revisao no PR), as funcoes abaixo
// detectam a tabela ausente e respondem vazio/zero — nunca dado inventado.

export type NotificationType = 'friend_request' | 'friend_accepted' | 'rating_like';
export type NotificationActor = { id: string; username: string | null; display_name: string; avatar_url: string | null };
export type OrbitNotification = {
  id: string;
  type: NotificationType;
  created_at: string;
  read_at: string | null;
  rating_id: string | null;
  friendship_id: string | null;
  actor: NotificationActor | null;
};

let tableMissing = false;

/** Verdadeiro quando o banco respondeu que a tabela de notificacoes ainda nao existe. */
export function notificationsTableMissing(): boolean {
  return tableMissing;
}

function markIfMissingTable(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|Could not find the table/i.test(`${e.code || ''} ${e.message || ''}`)) {
    tableMissing = true;
    return true;
  }
  return false;
}

export async function listNotifications(userId: string): Promise<OrbitNotification[]> {
  if (tableMissing) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from('notifications')
    .select('id,type,created_at,read_at,rating_id,friendship_id,actor:profiles!notifications_actor_id_fkey(id,username,display_name,avatar_url)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    if (markIfMissingTable(error)) return [];
    throw error;
  }
  return (data || []) as unknown as OrbitNotification[];
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  if (tableMissing) return 0;
  const client = requireSupabase();
  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null);
  if (error) {
    if (markIfMissingTable(error)) return 0;
    throw error;
  }
  return count || 0;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (tableMissing) return;
  const client = requireSupabase();
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null);
  if (error) markIfMissingTable(error);
}
