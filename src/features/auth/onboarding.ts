import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireSupabase } from '../../lib/supabase';
import { compatibilityKickoff } from '../../domain/onboarding.mjs';
import { tasteCompleteKey } from './gate-state.mjs';

// Registro local por conta, gravado SOMENTE depois de verificação autoritativa
// bem-sucedida (ou das 5 avaliações salvas com sucesso): fallback para quedas,
// nunca um atalho para pular a escolha de gostos.
export async function markTasteComplete(userId: string): Promise<void> {
  await AsyncStorage.setItem(tasteCompleteKey(userId), '1');
}

export async function isTasteCompleteKnown(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(tasteCompleteKey(userId))) === '1';
}

// A escolha de gostos é obrigatória para contas novas: quem já tem avaliações
// suficientes no servidor passa direto (e fica com o registro local renovado).
export async function needsTasteOnboarding(userId: string): Promise<boolean> {
  const { count, error } = await requireSupabase().from('ratings').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  const complete = compatibilityKickoff(count ?? 0).complete;
  if (complete) await markTasteComplete(userId);
  return !complete;
}
