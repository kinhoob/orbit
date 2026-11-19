import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../features/auth/provider';
import { styles, Button } from './ui';
import { LoadingState } from './loading';
import { tokens as t } from '../design/tokens';

type TimelineRating = { id: string; score: number; review: string; visibility: string; created_at: string; likes?: { count: number }[]; media: { id: string; title: string; category: string } | null };
export function ProfileTimeline({ profileId }: { profileId: string }) {
  const { session } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ['profile-timeline', session?.user.id, profileId], initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const fields = 'id,score,review,visibility,created_at,media:media_items(id,title,category)' + (session ? ',likes:rating_likes(count)' : '');
      const { data, error } = await requireSupabase().from('ratings').select(fields).eq('user_id', profileId).order('created_at', { ascending: false }).order('id').range(pageParam * 20, pageParam * 20 + 19);
      if (error) throw error; return (data || []) as unknown as TimelineRating[];
    },
    getNextPageParam: (last, pages) => last.length === 20 ? pages.length : undefined,
  });
  return <View style={{ gap: 16 }}>
    <Text style={[styles.title, { fontSize: 25, lineHeight: 30 }]}>Linha do tempo</Text>
    <Text style={styles.body}>Avaliações da mais recente para a mais antiga.</Text>
    {query.isPending ? <LoadingState kind="feed" /> : query.isError ? <><Text style={styles.error}>Não foi possível carregar as avaliações.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></>
      : !query.data.pages[0]?.length ? <Text style={styles.body}>As avaliações aparecerão aqui conforme forem publicadas.</Text>
      : query.data.pages.flat().map(rating => <View key={rating.id} style={{ borderLeftWidth: 2, borderLeftColor: t.colors.border, paddingLeft: 18, gap: 8 }}>
        <Text style={{ color: t.colors.muted, fontSize: 12 }}>{new Date(rating.created_at).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
        <View style={[styles.card, { gap: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: t.colors.accentStrong, fontWeight: '700', fontSize: 21 }}>{String(rating.score).replace('.', ',')}/10</Text><Text style={{ color: t.colors.muted }}>{rating.visibility === 'private' ? 'Privada' : rating.visibility === 'friends' ? 'Amigos' : 'Pública'}</Text></View>
          {rating.media ? <Link href={{ pathname: '/media/[id]', params: { id: rating.media.id } }} style={[styles.link, { fontWeight: '700' }]}>{rating.media.title} →</Link> : <Text style={styles.body}>Obra indisponível</Text>}
          {!!rating.review && <Text style={styles.body}>{rating.review}</Text>}
          {rating.likes && <Text style={styles.body}>{rating.likes[0]?.count || 0} curtidas</Text>}
          {session?.user.id === profileId && rating.media && <Link href={{ pathname: '/media/[id]', params: { id: rating.media.id } }} style={styles.link}>Editar avaliação</Link>}
        </View>
      </View>)}
    {query.hasNextPage && <Button label={query.isFetchingNextPage ? 'Carregando…' : 'Ver avaliações anteriores'} disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }} />}
  </View>;
}
