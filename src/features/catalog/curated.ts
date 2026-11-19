import { requireSupabase } from '../../lib/supabase';
import type { CuratedItem } from '../home/curated-data.mjs';
import type { MediaItem } from './data';

export async function findCuratedMatches(item: CuratedItem): Promise<MediaItem[]> {
  const { data, error } = await requireSupabase().from('media_items')
    .select('id,title,category,description,cover_url,release_year,creator')
    .eq('title', item.title).eq('category', item.category).eq('release_year', item.releaseYear)
    .order('id').limit(10);
  if (error) throw error;
  return data || [];
}
