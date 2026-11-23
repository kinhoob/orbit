import { requireSupabase } from '../../lib/supabase';
import { isMissingFunctionError } from '../../domain/profile-stats.mjs';

// Números do perfil (pedido do Marco em 22/11/2026): avaliações, amigos e
// curtidas recebidas chegam pela RPC profile_stats da migration
// 20261123001500_profile_stats.sql, que fica em revisão no PR. Enquanto a
// função não existe no banco, estas funções respondem indisponível — nunca
// número inventado — e a interface explica o estado no perfil.

export type ProfileStats = { ratings: number; friends: number; likes: number };

let functionMissing = false;

/** Verdadeiro quando o banco respondeu que a RPC de números ainda não existe. */
export function profileStatsUnavailable(): boolean {
  return functionMissing;
}

export function markProfileStatsUnavailable(error: unknown): boolean {
  if (isMissingFunctionError(error)) {
    functionMissing = true;
    return true;
  }
  return false;
}

/** Números de um perfil; nulo quando há bloqueio entre as pessoas ou a RPC ainda não existe. */
export async function fetchProfileStats(profileId: string): Promise<ProfileStats | null> {
  if (functionMissing) return null;
  const { data, error } = await requireSupabase().rpc('profile_stats', { profile_id: profileId });
  if (error) {
    if (markProfileStatsUnavailable(error)) return null;
    throw error;
  }
  return (data as ProfileStats | null) ?? null;
}
