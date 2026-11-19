import { requireSupabase } from '../../lib/supabase';
import type { MediaItem } from '../catalog/data';

export type SavedStatus = 'planned' | 'in_progress' | 'completed';
export type LibraryItem = { media_item_id: string; status: SavedStatus; created_at: string; media: MediaItem };
export type Collection = { id: string; title: string; description: string; visibility: 'public' | 'friends' | 'private'; created_at: string };
export async function listLibrary(userId: string, status: string, page: number): Promise<LibraryItem[]> {
  let query = requireSupabase().from('saved_items').select('media_item_id,status,created_at,media:media_items(*)')
    .eq('user_id', userId).order('created_at', { ascending: false }).order('media_item_id').range(page * 24, page * 24 + 23);
  if (status) query = query.eq('status', status);
  const { data, error } = await query; if (error) throw error;
  return (data || []) as unknown as LibraryItem[];
}
export async function updateLibraryStatus(userId: string, mediaId: string, status: SavedStatus) {
  const { error } = await requireSupabase().from('saved_items').update({ status }).eq('user_id', userId).eq('media_item_id', mediaId).select('media_item_id').single();
  if (error) throw error;
}
export async function listCollections(userId: string): Promise<Collection[]> {
  const { data, error } = await requireSupabase().from('collections').select('id,title,description,visibility,created_at').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error; return data || [];
}
export async function saveCollection(userId: string, values: Pick<Collection, 'title' | 'description' | 'visibility'>, id?: string) {
  if (!values.title.trim() || values.title.trim().length > 120) throw new Error('Título inválido');
  const table = requireSupabase().from('collections');
  const { data, error } = id ? await table.update(values).eq('id', id).eq('user_id', userId).select('id').single()
    : await table.insert({ ...values, user_id: userId }).select('id').single();
  if (error) throw error; return data!.id as string;
}
export async function deleteCollection(userId: string, id: string) {
  const { error } = await requireSupabase().from('collections').delete().eq('id', id).eq('user_id', userId).select('id').single(); if (error) throw error;
}
export type DiscoveryEvent = { id: string; media_item_id: string | null; title: string; category: string; discovered_at: string };
export async function listHistory(userId: string, page: number): Promise<DiscoveryEvent[]> {
  const { data, error } = await requireSupabase().from('discovery_history').select('id,media_item_id,title,category,discovered_at').eq('user_id', userId).order('discovered_at', { ascending: false }).order('id').range(page * 30, page * 30 + 29);
  if (error) throw error; return data || [];
}
