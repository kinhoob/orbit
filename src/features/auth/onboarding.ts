import { requireSupabase } from '../../lib/supabase';
import { compatibilityKickoff } from '../../domain/onboarding.mjs';

// A escolha de gostos é obrigatória para contas novas (pedido do Marco em
// 21/11/2026): só quem já tem avaliações suficientes no servidor passa direto.
export async function needsTasteOnboarding(userId: string): Promise<boolean> {
  const { count, error } = await requireSupabase().from('ratings').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  return !compatibilityKickoff(count ?? 0).complete;
}
