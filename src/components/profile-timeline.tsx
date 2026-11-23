import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../features/auth/provider';
import { setRatingLike } from '../features/feed/timelines';
import { withLike, isMissingColumnError } from '../domain/timelines.mjs';
import { categories } from '../features/catalog/data';
import { genreLabelsFor } from '../features/catalog/genres.mjs';
import { IllustratedCover } from './mural';
import { styles, Button } from './ui';
import { LoadingState } from './loading';
import { MotionPressable } from './motion';
import { StatePulse } from './feedback';
import { Icon } from './icons';
import { tokens as t, font} from '../design/tokens';

type TimelineMediaInfo = { id: string; title: string; category: string; cover_url?: string | null; creator?: string | null; release_year?: number | null; genres?: string[] | null };
type TimelineRating = { id: string; user_id: string; score: number; review: string; visibility: string; created_at: string; media: TimelineMediaInfo | null; like_count?: number; liked_by_me?: boolean };

const MEDIA_FIELDS_RICH = 'id,title,category,cover_url,creator,release_year,genres';
const MEDIA_FIELDS_BASIC = 'id,title,category';

/** Coluna genres ainda não existe no banco (migration em revisão): a consulta
 * volta aos campos básicos uma única vez e a timeline nunca quebra por isso. */
let mediaRichFieldsMissing = false;

/** Capa + ficha da obra avaliada (pedido do Marco em 23/11/2026): capa real
 * quando a obra tem cover_url das fontes já autorizadas, capa ilustrada da
 * categoria como fallback honesto; tipo, ano, autor e chips de gênero só
 * aparecem quando o dado existe — nada é inventado. */
export function TimelineMedia({ media }: { media: TimelineMediaInfo }) {
  const [failed, setFailed] = useState(false);
  const categoryLabel = categories.find((c) => c.id === media.category)?.label || 'Outros';
  const genreLabels = genreLabelsFor(media.genres, media.category).slice(0, 3);
  const meta = [categoryLabel, media.release_year].filter(Boolean).join(' · ');
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 60, borderRadius: 10, overflow: 'hidden' }}>
        {media.cover_url && !failed
          ? <Image source={{ uri: media.cover_url }} resizeMode="cover" onError={() => setFailed(true)} style={{ width: 60, aspectRatio: 2 / 3 }} accessibilityLabel={`Capa de ${media.title}`} />
          : <IllustratedCover category={media.category} aspectRatio={2 / 3} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Link href={{ pathname: '/media/[id]', params: { id: media.id } }} style={[styles.link, { fontFamily: font.bold, color: t.colors.text }]}>{media.title} →</Link>
        <Text style={{ color: t.colors.muted, fontSize: 12 }}>{meta}</Text>
        {!!media.creator && <Text style={{ color: t.colors.muted, fontSize: 12 }}>{media.creator}</Text>}
        {genreLabels.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {genreLabels.map((label) => (
              <View key={label} style={{ backgroundColor: t.colors.secondary, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                <Text style={{ color: t.colors.text, fontSize: 11, fontFamily: font.semibold }}>{label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/** Curtidas das avaliações da página: total e se a pessoa logada curtiu. */
async function attachTimelineLikes(ratings: TimelineRating[], userId: string): Promise<TimelineRating[]> {
  if (!ratings.length) return ratings;
  const { data, error } = await requireSupabase().from('rating_likes').select('rating_id,user_id').in('rating_id', ratings.map((r) => r.id));
  if (error) throw error;
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const like of data || []) {
    counts.set(like.rating_id, (counts.get(like.rating_id) || 0) + 1);
    if (like.user_id === userId) mine.add(like.rating_id);
  }
  return ratings.map((r) => ({ ...r, like_count: counts.get(r.id) || 0, liked_by_me: mine.has(r.id) }));
}

export function ProfileTimeline({ profileId }: { profileId: string }) {
  const { session } = useAuth();
  const cache = useQueryClient();
  const [message, setMessage] = useState('');
  const userId = session?.user.id;
  const queryKey = ['profile-timeline', userId, profileId] as const;
  const query = useInfiniteQuery({
    queryKey, initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const select = (mediaFields: string) => requireSupabase().from('ratings').select(`id,user_id,score,review,visibility,created_at,media:media_items(${mediaFields})`).eq('user_id', profileId).order('created_at', { ascending: false }).order('id').range(pageParam * 20, pageParam * 20 + 19);
      let { data, error } = await select(mediaRichFieldsMissing ? MEDIA_FIELDS_BASIC : MEDIA_FIELDS_RICH);
      if (error && !mediaRichFieldsMissing && isMissingColumnError(error)) {
        mediaRichFieldsMissing = true;
        ({ data, error } = await select(MEDIA_FIELDS_BASIC));
      }
      if (error) throw error;
      const ratings = (data || []) as unknown as TimelineRating[];
      return userId ? attachTimelineLikes(ratings, userId) : ratings;
    },
    getNextPageParam: (last, pages) => last.length === 20 ? pages.length : undefined,
  });

  /** Curtir/descurtir na timeline do perfil (pedido do Marco em 22/11/2026):
   * otimista, com reversão e aviso honesto em caso de erro. */
  async function toggleLike(rating: TimelineRating) {
    if (!userId || userId === rating.user_id) return; // o RLS só permite curtir avaliação de outra pessoa
    setMessage('');
    type TimelineData = { pages: TimelineRating[][]; pageParams: unknown[] };
    const previous = cache.getQueryData<TimelineData>(queryKey);
    cache.setQueryData<TimelineData>(queryKey, (current) => current && ({
      ...current,
      pages: current.pages.map((page) => page.map((row) => row.id === rating.id ? { ...row, ...withLike({ liked_by_me: row.liked_by_me, like_count: row.like_count ?? 0 }, !row.liked_by_me) } : row)),
    }));
    try {
      await setRatingLike(rating.id, userId, !rating.liked_by_me);
      await cache.invalidateQueries({ queryKey: ['profile-stats'] }); // curtidas recebidas do perfil mudam
    } catch {
      if (previous) cache.setQueryData(queryKey, previous);
      setMessage('Não foi possível registrar a curtida. Tente novamente.');
    }
  }

  return <View style={{ gap: 16 }}>
    <Text style={[styles.title, { fontSize: 25, lineHeight: 30 }]}>Linha do tempo</Text>
    <Text style={styles.body}>Avaliações da mais recente para a mais antiga.</Text>
    {query.isPending ? <LoadingState kind="feed" /> : query.isError ? <><Text style={styles.error}>Não foi possível carregar as avaliações.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></>
      : !query.data.pages[0]?.length ? <Text style={styles.body}>As avaliações aparecerão aqui conforme forem publicadas.</Text>
      : query.data.pages.flat().map(rating => <View key={rating.id} style={{ borderLeftWidth: 2, borderLeftColor: t.colors.border, paddingLeft: 18, gap: 8 }}>
        <Text style={{ color: t.colors.muted, fontSize: 12 }}>{new Date(rating.created_at).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
        <View style={[styles.card, { gap: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="star" size={18} color={t.colors.gold} />
              <Text style={{ color: t.colors.accentStrong, fontFamily: font.bold, fontSize: 21 }}>{String(rating.score).replace('.', ',')}/10</Text>
            </View>
            <Text style={{ color: t.colors.muted }}>{rating.visibility === 'private' ? 'Privada' : rating.visibility === 'friends' ? 'Amigos' : 'Pública'}</Text>
          </View>
          {rating.media ? <TimelineMedia media={rating.media} /> : <Text style={styles.body}>Obra indisponível</Text>}
          {!!rating.review && <Text style={styles.body}>{rating.review}</Text>}
          {rating.like_count !== undefined && (userId && userId !== rating.user_id
            ? <MotionPressable
                accessibilityRole="button"
                accessibilityLabel={rating.liked_by_me ? 'Remover curtida' : 'Curtir avaliação'}
                onPress={() => { void toggleLike(rating); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 }}
              >
                <StatePulse active={!!rating.liked_by_me}><Icon name="heart" size={18} color={rating.liked_by_me ? t.colors.accentStrong : t.colors.muted} /></StatePulse>
                <Text style={{ color: rating.liked_by_me ? t.colors.accentStrong : t.colors.muted, fontSize: 13 }}>{rating.like_count}</Text>
              </MotionPressable>
            : <Text style={styles.body}>{rating.like_count} curtidas</Text>)}
          {userId === profileId && rating.media && <Link href={{ pathname: '/media/[id]', params: { id: rating.media.id } }} style={styles.link}>Editar avaliação</Link>}
        </View>
      </View>)}
    {query.hasNextPage && <Button label={query.isFetchingNextPage ? 'Carregando…' : 'Ver avaliações anteriores'} disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }} />}
    {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
  </View>;
}
