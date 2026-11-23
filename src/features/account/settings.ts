import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/provider';
import { requireSupabase } from '../../lib/supabase';
export type AccountSettings = { default_visibility: 'public' | 'friends' | 'private'; show_notification_badge: boolean; motion_preference: 'system' | 'reduce' };
export const defaultSettings: AccountSettings = { default_visibility: 'public', show_notification_badge: true, motion_preference: 'system' };
export function useAccountSettings() {
  const { session } = useAuth();
  return useQuery({ queryKey: ['account-settings', session?.user.id], enabled: !!session,
    queryFn: async (): Promise<AccountSettings> => { const { data, error } = await requireSupabase().from('account_settings').select('default_visibility,show_notification_badge,motion_preference').eq('user_id', session!.user.id).maybeSingle(); if (error) throw error; return data || defaultSettings; } });
}
export type AccountProgress = { total_xp: number; level: number; title: string; floor_xp: number; next_xp: number | null; rated_works: number; first_collection: boolean; base_xp?: number; achievement_xp?: number };
export function useAccountProgress() {
  const { session } = useAuth();
  return useQuery({ queryKey: ['account-progress', session?.user.id], enabled: !!session,
    queryFn: async (): Promise<AccountProgress> => { const { data, error } = await requireSupabase().rpc('account_progress'); if (error) throw error; return data as AccountProgress; } });
}
