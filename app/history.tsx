import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AccountScreen } from '../src/components/account-screen';
import { styles, Button } from '../src/components/ui';
import { LoadingState } from '../src/components/loading';
import { useAuth } from '../src/features/auth/provider';
import { listHistory } from '../src/features/account/data';
export default function History() {
  const { session } = useAuth();
  const query = useInfiniteQuery({ queryKey: ['discovery-history', session?.user.id], initialPageParam: 0, enabled: !!session, queryFn: ({ pageParam }) => listHistory(session!.user.id, pageParam), getNextPageParam: (last, pages) => last.length === 30 ? pages.length : undefined });
  return <AccountScreen title="Histórico de descobertas"><Text style={styles.body}>Quando você salvou ou avaliou cada obra pela primeira vez. Seu histórico é privado.</Text>
    {query.isPending ? <LoadingState kind="feed" /> : query.isError ? <><Text style={styles.error}>Histórico indisponível. A conexão ou a atualização do serviço pode estar pendente.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></> : !query.data.pages[0]?.length ? <Text style={styles.body}>Suas próximas descobertas aparecerão aqui.</Text> : query.data.pages.flat().map(event => <View style={styles.card} key={event.id}><Text style={styles.body}>{new Date(event.discovered_at).toLocaleDateString('pt-BR')}</Text>{event.media_item_id ? <Link href={{ pathname: '/media/[id]', params: { id: event.media_item_id } }} style={styles.link}>{event.title} →</Link> : <Text style={styles.body}>{event.title}</Text>}</View>)}
    {query.hasNextPage && <Button label="Ver mais antigas" disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }} />}
  </AccountScreen>;
}
