import { requireSupabase } from '../../lib/supabase';
import { isMissingTableError } from '../../domain/supabase-error.mjs';

// Seguir unilateral sem aceite (decisão do Marco em 22/11/2026), da migration
// 20261123010000_follows.sql, que fica em revisão no PR. Enquanto a tabela
// não existe no banco, estas funções respondem indisponível — nunca estado
// inventado — e a interface explica isso no perfil.

let tableMissing = false;

/** Verdadeiro quando o banco respondeu que a tabela de seguir ainda não existe. */
export function followsUnavailable(): boolean {
  return tableMissing;
}

function markIfMissing(error: unknown): boolean {
  if (isMissingTableError(error)) {
    tableMissing = true;
    return true;
  }
  return false;
}

/** Se a pessoa logada segue o perfil; null quando a tabela ainda não existe. */
export async function fetchIsFollowing(userId: string, profileId: string): Promise<boolean | null> {
  if (tableMissing) return null;
  const { data, error } = await requireSupabase()
    .from('follows')
    .select('follower_id')
    .eq('follower_id', userId)
    .eq('followed_id', profileId)
    .maybeSingle();
  if (error) {
    if (markIfMissing(error)) return null;
    throw error;
  }
  return !!data;
}

/** Segue ou deixa de seguir. 'unavailable' enquanto a migration está em revisão. */
export async function setFollow(userId: string, profileId: string, follow: boolean): Promise<'ok' | 'unavailable'> {
  if (tableMissing) return 'unavailable';
  const client = requireSupabase();
  if (follow) {
    const { error } = await client.from('follows').insert({ follower_id: userId, followed_id: profileId });
    if (error && error.code !== '23505') { // já segue: estado desejado
      if (markIfMissing(error)) return 'unavailable';
      throw error;
    }
  } else {
    const { error } = await client.from('follows').delete().eq('follower_id', userId).eq('followed_id', profileId);
    if (error) {
      if (markIfMissing(error)) return 'unavailable';
      throw error;
    }
  }
  return 'ok';
}
