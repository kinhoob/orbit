import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { AccountScreen } from '../src/components/account-screen';
import { styles, Button } from '../src/components/ui';
import { LoadingState } from '../src/components/loading';
import { Feedback } from '../src/components/feedback';
import { useAuth } from '../src/features/auth/provider';
import { listLibrary, updateLibraryStatus, type SavedStatus } from '../src/features/account/data';
const statuses = [{ id: '', label: 'Todos' }, { id: 'planned', label: 'Para depois' }, { id: 'in_progress', label: 'Em andamento' }, { id: 'completed', label: 'Concluídos' }];
export default function Library() {
  const { session } = useAuth(); const cache = useQueryClient();
  const [status, setStatus] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const query = useInfiniteQuery({ queryKey: ['library', session?.user.id, status], initialPageParam: 0, enabled: !!session,
    queryFn: ({ pageParam }) => listLibrary(session!.user.id, status, pageParam), getNextPageParam: (last, pages) => last.length === 24 ? pages.length : undefined });
  async function change(id: string, next: SavedStatus) { if (!session || busy) return; setBusy(true); setMessage(''); try { await updateLibraryStatus(session.user.id, id, next); await cache.invalidateQueries({ queryKey: ['library', session.user.id] }); setMessage('Status atualizado.'); } catch { setMessage('Não foi possível atualizar. Tente novamente.'); } finally { setBusy(false); } }
  return <AccountScreen title="Minha biblioteca">
    <Text style={styles.body}>Seus salvos são privados. Organize o que quer conhecer e o que já concluiu.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{statuses.map(item => <Button key={item.id} label={`${item.id === status ? '✓ ' : ''}${item.label}`} onPress={() => setStatus(item.id)} />)}</View>
    <Feedback message={message} />
    {query.isPending ? <LoadingState /> : query.isError ? <><Text style={styles.error}>Não foi possível carregar a biblioteca.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></> : !query.data.pages[0]?.length ? <><Text style={styles.body}>Nenhuma obra nesta seção.</Text><Link href="/(tabs)/search" style={styles.link}>Encontrar uma obra →</Link></> : query.data.pages.flat().map(item => <View key={item.media_item_id} style={styles.card}>
      <Link href={{ pathname: '/media/[id]', params: { id: item.media_item_id } }} style={styles.link}>{item.media?.title || 'Obra indisponível'} →</Link>
      <Text style={styles.body}>{statuses.find(option => option.id === item.status)?.label}</Text>
      <View style={{ gap: 8 }}>{statuses.filter(option => option.id && option.id !== item.status).map(option => <Button key={option.id} disabled={busy} label={`Mover para ${option.label.toLowerCase()}`} onPress={() => { void change(item.media_item_id, option.id as SavedStatus); }} />)}</View>
    </View>)}
    {query.hasNextPage && <Button label="Carregar mais" disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }} />}
  </AccountScreen>;
}
