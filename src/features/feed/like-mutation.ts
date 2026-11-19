import type { QueryClient, QueryFilters } from '@tanstack/react-query';
import { setRatingLike, type FeedReview, type TimelinePage } from './timelines';
import { withLike } from '../../domain/timelines.mjs';

const pending = new WeakMap<QueryClient, Set<string>>();
/** One write per account at a time. No permanent override of server data. */
export async function toggleTimelineLike(
  cache: QueryClient, userId: string, review: FeedReview,
  write = setRatingLike,
): Promise<boolean> {
  const locks = pending.get(cache) || new Set<string>();
  pending.set(cache, locks);
  if (locks.has(userId)) return false;
  locks.add(userId);
  const filters: QueryFilters = {
    predicate: query => query.queryKey[0] === 'timeline' && query.queryKey[2] === userId,
  };
  let snapshots: ReturnType<QueryClient['getQueriesData']> = [];
  try {
    await cache.cancelQueries(filters);
    snapshots = cache.getQueriesData<TimelinePage>(filters);
    for (const [key, data] of snapshots) {
      const page = data as TimelinePage | undefined;
      if (!page) continue;
      cache.setQueryData<TimelinePage>(key, {
        ...page,
        reviews: page.reviews.map(row => row.rating_id === review.rating_id ? withLike(row, !review.liked_by_me) : row),
      });
    }
    await write(review.rating_id, userId, !review.liked_by_me);
    return true;
  } catch (error) {
    for (const [key, oldData] of snapshots) {
      const previous = (oldData as TimelinePage | undefined)?.reviews.find(row => row.rating_id === review.rating_id);
      if (!previous || !cache.getQueryData(key)) continue; // Do not restore cleared session caches.
      cache.setQueryData<TimelinePage>(key, current => current && ({
        ...current, reviews: current.reviews.map(row => row.rating_id === review.rating_id ? previous : row),
      }));
    }
    throw error;
  } finally {
    try { await cache.invalidateQueries(filters); }
    finally { locks.delete(userId); }
  }
}
