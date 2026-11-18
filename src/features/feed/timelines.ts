import { requireSupabase } from '../../lib/supabase';
import { rankByLikes as rank, sortRecent as recent, friendIdsOf as friends, withLike as withLikePure, relativeTime as relTime, newestCreatedAt as newest } from '../../domain/timelines.mjs';
export { withLikePure as withLike, relTime as relativeTime, friends as friendIdsOf };
export const rankByLikes = rank;
export const sortRecent = recent;
export const newestCreatedAt = newest;

// Timelines do Explorar (pedido do Marco em 18/11/2026, estilo X):
// - "Descobrir": avaliacoes publicas ordenadas pelas mais curtidas.
// - "Amigos": so avaliacoes de amigos (amizade bidirecional aceita, sem
//   seguidores), das mais recentes para as mais antigas.
// A visibilidade (publica/amigos/privada) e os bloqueios sao aplicados no
// banco pelo RLS; os filtros locais abaixo sao defesa em profundidade.

export type FeedAuthor = { id: string; username: string | null; display_name: string; avatar_url: string | null };
export type FeedMedia = { id: string; title: string; category: string; release_year: number | null };
export type FeedReview = {
  rating_id: string;
  score: number;
  review: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  author: FeedAuthor;
  media: FeedMedia;
};

// ---- leitura via Supabase (RLS aplica visibilidade e bloqueios) ----

type JoinedRow = {
  id: string;
  score: number;
  review: string;
  created_at: string;
  user_id: string;
  profiles: FeedAuthor | FeedAuthor[] | null;
  media_items: FeedMedia | FeedMedia[] | null;
};

export function toFeedReview(row: JoinedRow, likeCount: number, likedByMe: boolean): FeedReview | null {
  const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const media = Array.isArray(row.media_items) ? row.media_items[0] : row.media_items;
  if (!author || !media) return null;
  return {
    rating_id: row.id,
    score: Number(row.score),
    review: row.review || '',
    created_at: row.created_at,
    like_count: likeCount,
    liked_by_me: likedByMe,
    author,
    media,
  };
}

const SELECT = 'id,score,review,created_at,user_id,profiles:user_id(id,username,display_name,avatar_url),media_items:media_item_id(id,title,category,release_year)';

async function attachLikes(rows: JoinedRow[], userId: string): Promise<FeedReview[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const { data: likes, error } = await requireSupabase().from('rating_likes').select('rating_id,user_id').in('rating_id', ids);
  if (error) throw error;
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const like of likes || []) {
    counts.set(like.rating_id, (counts.get(like.rating_id) || 0) + 1);
    if (like.user_id === userId) mine.add(like.rating_id);
  }
  return rows
    .map((row) => toFeedReview(row, counts.get(row.id) || 0, mine.has(row.id)))
    .filter((r): r is FeedReview => r !== null);
}

/** Timeline Descobrir: avaliacoes publicas, das mais curtidas. */
export async function listDiscoverTimeline(userId: string): Promise<FeedReview[]> {
  const { data, error } = await requireSupabase()
    .from('ratings')
    .select(SELECT)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return rank(await attachLikes((data || []) as JoinedRow[], userId)).slice(0, 50);
}

/** Timeline Amigos: so amigos aceitos, visibilidade publica ou amigos, recentes. */
export async function listFriendsTimeline(userId: string): Promise<FeedReview[]> {
  const sb = requireSupabase();
  const { data: friendships, error: fe } = await sb
    .from('friendships')
    .select('requester_id,addressee_id,status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (fe) throw fe;
  const ids = friends(userId, friendships || []);
  if (!ids.length) return [];
  const { data, error } = await sb
    .from('ratings')
    .select(SELECT)
    .in('user_id', ids)
    .in('visibility', ['public', 'friends'])
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return recent(await attachLikes((data || []) as JoinedRow[], userId));
}

// Balao "Novas publicacoes": a contagem abaixo e o sinal real — so avaliacoes
// mais novas que a mais recente ja exibida, dentro das mesmas regras de
// visibilidade e bloqueio (RLS) das timelines. Nada de badge cosmetico.

/** Conta avaliacoes publicas mais novas que `since` (timeline Descobrir). */
export async function countNewerDiscoverReviews(since: string): Promise<number> {
  const { count, error } = await requireSupabase()
    .from('ratings')
    .select('id', { count: 'exact', head: true })
    .eq('visibility', 'public')
    .gt('created_at', since);
  if (error) throw error;
  return count || 0;
}

/** Conta avaliacoes de amigos aceitos mais novas que `since` (timeline Amigos). */
export async function countNewerFriendReviews(userId: string, since: string): Promise<number> {
  const sb = requireSupabase();
  const { data: friendships, error: fe } = await sb
    .from('friendships')
    .select('requester_id,addressee_id,status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (fe) throw fe;
  const ids = friends(userId, friendships || []);
  if (!ids.length) return 0;
  const { count, error } = await sb
    .from('ratings')
    .select('id', { count: 'exact', head: true })
    .in('user_id', ids)
    .in('visibility', ['public', 'friends'])
    .gt('created_at', since);
  if (error) throw error;
  return count || 0;
}

/** Curtir/descurtir uma avaliacao (RLS: apenas visivel e de outra pessoa). */
export async function setRatingLike(ratingId: string, userId: string, liked: boolean): Promise<void> {
  const sb = requireSupabase();
  if (liked) {
    const { error } = await sb.from('rating_likes').insert({ rating_id: ratingId, user_id: userId });
    if (error && error.code !== '23505') throw error; // ja curtida: estado desejado
  } else {
    const { error } = await sb.from('rating_likes').delete().eq('rating_id', ratingId).eq('user_id', userId);
    if (error) throw error;
  }
      }
