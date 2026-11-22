import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireSupabase } from '../../lib/supabase';
import { compatibilityKickoff } from '../../domain/onboarding.mjs';
import { tasteCompleteKey } from './gate-state.mjs';
import { genres } from '../catalog/genres.mjs';

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
  const client = requireSupabase();
  const [profile, settings, ratings] = await Promise.all([
    client.from('profiles').select('id').eq('id', userId).single(),
    client.from('account_settings').select('user_id,default_visibility,show_notification_badge,motion_preference').eq('user_id', userId).maybeSingle(),
    client.from('ratings').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (profile.error) throw profile.error;
  if (!profile.data || profile.data.id !== userId) throw new Error('Profile unavailable');
  if (settings.error) throw settings.error;
  const { count, error } = ratings;
  if (error) throw error;
  if (count === null) throw new Error('Ratings count unavailable');
  const complete = compatibilityKickoff(count ?? 0).complete;
  if (complete) await markTasteComplete(userId).catch(() => {});
  return !complete;
}

export async function loadTasteGenres(userId: string): Promise<string[]> {
  const { data, error } = await requireSupabase().from('account_settings').select('taste_genres').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  const known = new Set(genres.map(genre => genre.id));
  return (data?.taste_genres ?? []).filter((id: string) => known.has(id));
}

export async function loadRatedMediaIds(userId: string): Promise<string[]> {
  const { data, error } = await requireSupabase().from('ratings').select('media_item_id').eq('user_id', userId).order('media_item_id').limit(5);
  if (error) throw error;
  return [...new Set<string>((data ?? []).map(item => item.media_item_id))];
}

export async function saveTasteGenres(userId: string, selected: string[]): Promise<void> {
  const known = new Set(genres.map(genre => genre.id));
  if (!userId || !selected.length || selected.some(id => !known.has(id))) throw new Error('Invalid taste selection');
  const taste_genres = [...new Set(selected)];
  const { data, error } = await requireSupabase().from('account_settings')
    .upsert({ user_id: userId, taste_genres }, { onConflict: 'user_id' })
    .select('user_id,taste_genres').single();
  if (error) throw error;
  if (data?.user_id !== userId || !Array.isArray(data.taste_genres)
    || data.taste_genres.length !== taste_genres.length || !taste_genres.every(id => data.taste_genres.includes(id))) {
    throw new Error('Taste preferences were not saved');
  }
}
