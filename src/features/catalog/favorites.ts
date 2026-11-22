import type { QueryClient } from '@tanstack/react-query';
import { requireSupabase } from '../../lib/supabase';
import { isMissingTableError } from '../../domain/favorites.mjs';
import type { MediaItem } from './data';

// Favoritos do perfil (pedido do Marco em 22/11/2026): a tabela chega pela
// migration 20261122233000_profile_favorites.sql, que fica em revisão no PR.
// Enquanto ela não é aplicada, estas funções detectam a tabela ausente e
// respondem vazio — nunca dado inventado — e a interface esconde o botão de
// favoritar e explica o estado na aba.

let tableMissing = false;

/** Verdadeiro quando o banco respondeu que a tabela de favoritos ainda não existe. */
export function favoritesTableMissing(): boolean {
  return tableMissing;
}

export function markFavoritesTableMissing(error: unknown): boolean {
  if (isMissingTableError(error)) {
    tableMissing = true;
    return true;
  }
  return false;
}

/** Obras favoritas da pessoa, da marcação mais recente para a mais antiga. */
export async function listFavoriteItems(
  userId: string,
  limit = 60,
  client = requireSupabase(),
): Promise<MediaItem[]> {
  if (tableMissing) return [];
  const { data, error } = await client
    .from('profile_favorites')
    .select('media_item_id,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (markFavoritesTableMissing(error)) return [];
    throw error;
  }
  const ids = (data || []).map((row) => row.media_item_id as string);
  if (!ids.length) return [];
  const result = await client.from('media_items').select('*').in('id', ids);
  if (result.error) throw result.error;
  return ids
    .map((id) => (result.data as MediaItem[]).find((item) => item.id === id))
    .filter((item): item is MediaItem => !!item);
}

export async function persistFavorite(userId: string, mediaId: string, favorite: boolean) {
  const client = requireSupabase();
  const result = favorite
    ? await client.from('profile_favorites').upsert(
        { user_id: userId, media_item_id: mediaId },
        { onConflict: 'user_id,media_item_id', ignoreDuplicates: true },
      )
    : await client.from('profile_favorites').delete().eq('user_id', userId).eq('media_item_id', mediaId);
  if (result.error) {
    markFavoritesTableMissing(result.error);
    throw result.error;
  }
}

type MediaState = { saved: boolean; rating: unknown; favorite?: boolean };
const pending = new WeakMap<QueryClient, Set<string>>();

/** Immediate feedback, rollback on error, and authoritative refresh afterwards. */
export async function toggleFavorite(
  cache: QueryClient,
  userId: string,
  mediaId: string,
  write = persistFavorite,
): Promise<boolean | null> {
  const key = ['media-state', mediaId, userId];
  const lock = `favorite:${userId}:${mediaId}`;
  const locks = pending.get(cache) || new Set<string>();
  pending.set(cache, locks);
  if (locks.has(lock)) return null;
  locks.add(lock);
  let previous: MediaState | undefined;
  try {
    await cache.cancelQueries({ queryKey: key, exact: true });
    previous = cache.getQueryData<MediaState>(key);
    if (!previous) throw new Error('Media state is not loaded');
    const next = !(previous.favorite ?? false);
    cache.setQueryData<MediaState>(key, (current) => current && { ...current, favorite: next });
    await write(userId, mediaId, next);
    return next;
  } catch (error) {
    if (previous && cache.getQueryData(key)) {
      cache.setQueryData<MediaState>(key, (current) => current && { ...current, favorite: previous!.favorite ?? false });
    }
    throw error;
  } finally {
    try {
      await Promise.all([
        cache.invalidateQueries({ queryKey: key, exact: true }),
        cache.invalidateQueries({ queryKey: ['profile-favorites', userId] }),
      ]);
    } finally {
      locks.delete(lock);
    }
  }
}
