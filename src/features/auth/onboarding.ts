import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireSupabase } from '../../lib/supabase';
import { compatibilityKickoff } from '../../domain/onboarding.mjs';

// "Agora não" fica neste dispositivo, como os interesses locais; as
// avaliações que contam para a compatibilidade vivem no servidor (ratings).
const dismissedKey = (account: string) => `orbit:onboarding-dismissed:v1:${account}`;

export async function dismissTasteOnboarding(account: string): Promise<void> {
  await AsyncStorage.setItem(dismissedKey(account), '1');
}

/** Quem já avaliou o suficiente ou dispensou neste dispositivo não é chamado de novo. */
export async function needsTasteOnboarding(userId: string): Promise<boolean> {
  const dismissed = await AsyncStorage.getItem(dismissedKey(userId));
  if (dismissed) return false;
  const { count, error } = await requireSupabase().from('ratings').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  return !compatibilityKickoff(count ?? 0).complete;
}
