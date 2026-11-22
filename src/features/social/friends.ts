import { requireSupabase } from '../../lib/supabase';
import { relationWith as relationFn } from '../../domain/friendship.mjs';

export type ProfileSummary = { id: string; username: string | null; display_name: string; avatar_url: string | null };
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';
export type Friendship = { id: string; requester_id: string; addressee_id: string; status: FriendshipStatus };
export type Relation =
  | { kind: 'none' }
  | { kind: 'rejected'; friendship: Friendship }
  | { kind: 'outgoing'; friendship: Friendship }
  | { kind: 'incoming'; friendship: Friendship }
  | { kind: 'friends'; friendship: Friendship };

export async function searchProfiles(term: string, userId: string): Promise<ProfileSummary[]> {
  const clean = term.trim().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/_/g, '');
  if (!clean) return [];
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id,username,display_name,avatar_url')
    .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
    .neq('id', userId)
    .order('username')
    .limit(20);
  if (error) throw error;
  return (data || []) as ProfileSummary[];
}

export async function fetchFriendships(userId: string): Promise<Friendship[]> {
  const { data, error } = await requireSupabase()
    .from('friendships')
    .select('id,requester_id,addressee_id,status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
  return (data || []) as Friendship[];
}

export async function fetchProfilesByIds(ids: string[]): Promise<ProfileSummary[]> {
  if (!ids.length) return [];
  const { data, error } = await requireSupabase().from('profiles').select('id,username,display_name,avatar_url').in('id', ids);
  if (error) throw error;
  return (data || []) as ProfileSummary[];
}

// Sugestões da timeline de amigos vazia (21/11/2026): leitura simples de
// perfis, sem mudança de banco; o filtro de relações fica no domínio.
export async function suggestProfiles(userId: string): Promise<ProfileSummary[]> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id,username,display_name,avatar_url')
    .neq('id', userId)
    .order('username')
    .limit(12);
  if (error) throw error;
  return (data || []) as ProfileSummary[];
}

export function relationWith(friendships: Friendship[], userId: string, otherId: string): Relation {
  return relationFn(friendships, userId, otherId) as Relation;
}

export async function sendRequest(userId: string, otherId: string): Promise<void> {
  const { error } = await requireSupabase().from('friendships').insert({ requester_id: userId, addressee_id: otherId });
  if (error) {
    if (error.code === '23505') throw new Error('duplicate');
    throw error;
  }
}

export async function respondToRequest(friendshipId: string, accept: boolean, userId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('friendships')
    .update({ status: accept ? 'accepted' : 'rejected' })
    .eq('id', friendshipId).eq('addressee_id', userId).eq('status', 'pending').select('id').single();
  if (error) throw error;
}

export async function deleteFriendship(friendshipId: string, userId: string): Promise<void> {
  const { error } = await requireSupabase().from('friendships').delete().eq('id', friendshipId).or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).select('id').single();
  if (error) throw error;
}
