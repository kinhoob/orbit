import { useQuery } from '@tanstack/react-query';
import { requireSupabase } from '../../lib/supabase';
import { useAuth } from '../auth/provider';
import { isMissingFunctionError } from '../../domain/profile-stats.mjs';

// Conquistas e insígnias equipáveis (pedido do Marco em 23/11/2026): chegam
// pela RPC my_achievements e pela coluna profiles.equipped_badges da migration
// 20261123030000, em revisão no PR. Enquanto o banco não tem a atualização,
// estas funções respondem indisponível e as telas explicam — nunca catálogo
// ou progresso inventado.

export type AchievementState = {
  id: string; title: string; description: string; icon: string; kind: string;
  threshold: number; xp_reward: number; current: number; unlocked: boolean;
};
export type MyAchievements = { equipped: string[]; achievements: AchievementState[] };
export type AchievementDefinition = { id: string; title: string; description: string; icon: string };

let backendMissing = false;

/** Verdadeiro quando o banco respondeu que a atualização de conquistas ainda não existe. */
export function achievementsUnavailable(): boolean {
  return backendMissing;
}

function markMissing(error: unknown): boolean {
  if (isMissingFunctionError(error) || (error && /equipped_badges|achievement_definitions|my_achievements/i.test(String((error as { message?: string }).message || '')))) {
    backendMissing = true;
    return true;
  }
  return false;
}

export function useMyAchievements() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my-achievements', session?.user.id],
    enabled: !!session && !backendMissing,
    queryFn: async (): Promise<MyAchievements> => {
      if (backendMissing) throw new Error('Achievements backend unavailable');
      const { data, error } = await requireSupabase().rpc('my_achievements');
      if (error) { if (markMissing(error)) throw new Error('Achievements backend unavailable'); throw error; }
      return data as MyAchievements;
    },
  });
}

/** Salva as insígnias equipadas (no máximo 3, só desbloqueadas — o banco confirma). */
export async function saveEquippedBadges(userId: string, badges: string[]): Promise<void> {
  const { error } = await requireSupabase().from('profiles').update({ equipped_badges: badges }).eq('id', userId).select('id').single();
  if (error) { if (markMissing(error)) throw new Error('Achievements backend unavailable'); throw error; }
}

/** Definições públicas das conquistas citadas nas insígnias equipadas de um perfil. */
export async function fetchAchievementDefinitions(): Promise<AchievementDefinition[]> {
  if (backendMissing) return [];
  const { data, error } = await requireSupabase().from('achievement_definitions').select('id,title,description,icon');
  if (error) { if (markMissing(error)) return []; throw error; }
  return (data || []) as AchievementDefinition[];
}

export function useAchievementDefinitions() {
  return useQuery({ queryKey: ['achievement-definitions'], queryFn: fetchAchievementDefinitions, staleTime: 300000 });
}
