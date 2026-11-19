import type { QueryClient } from '@tanstack/react-query';
import { requireSupabase } from '../../lib/supabase';

type MediaState = { saved: boolean; rating: unknown };
const pending = new WeakMap<QueryClient, Set<string>>();
export async function persistSavedItem(userId: string, mediaId: string, saved: boolean) {
  const client = requireSupabase();
  const result = saved
    ? await client.from('saved_items').upsert({ user_id: userId, media_item_id: mediaId }, { onConflict: 'user_id,media_item_id', ignoreDuplicates: true })
    : await client.from('saved_items').delete().eq('user_id', userId).eq('media_item_id', mediaId);
  if (result.error) throw result.error;
}

/** Immediate feedback, rollback on error, and authoritative refresh afterwards. */
export async function toggleSavedItem(cache: QueryClient, userId: string, mediaId: string, write = persistSavedItem): Promise<boolean | null> {
  const key = ['media-state', mediaId, userId];
  const lock = `${userId}:${mediaId}`;
  const locks = pending.get(cache) || new Set<string>();
  pending.set(cache, locks);
  if (locks.has(lock)) return null;
  locks.add(lock);
  let previous: MediaState | undefined;
  try {
    await cache.cancelQueries({ queryKey: key, exact: true });
    previous = cache.getQueryData<MediaState>(key);
    if (!previous) throw new Error('Media state is not loaded');
    const next = !previous.saved;
    cache.setQueryData(key, { ...previous, saved: next });
    await write(userId, mediaId, next);
    return next;
  } catch (error) {
    if (previous && cache.getQueryData(key)) cache.setQueryData<MediaState>(key, current => current && ({ ...current, saved: previous!.saved }));
    throw error;
  } finally {
    try {
      await Promise.all([
        cache.invalidateQueries({ queryKey: key, exact: true }),
        cache.invalidateQueries({ queryKey: ['saved', userId] }),
      ]);
    } finally { locks.delete(lock); }
  }
}
