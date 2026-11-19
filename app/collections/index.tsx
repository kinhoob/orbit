import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountScreen } from '../../src/components/account-screen';
import { styles, Button } from '../../src/components/ui';
import { LoadingState } from '../../src/components/loading';
import { useAuth } from '../../src/features/auth/provider';
import { listCollections, saveCollection } from '../../src/features/account/data';
export default function Collections() {
  const { session } = useAuth(); const cache = useQueryClient();
  const [title, setTitle] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['collections', session?.user.id], enabled: !!session, queryFn: () => listCollections(session!.user.id) });
  async function create() { if (!session || busy || !title.trim()) return; setBusy(true); setError(''); try { const id = await saveCollection(session.user.id, { title: title.trim(), description: '', visibility: 'private' }); await cache.invalidateQueries({ queryKey: ['collections', session.user.id] }); await cache.invalidateQueries({ queryKey: ['account-progress', session.user.id] }); setTitle(''); router.push({ pathname: '/collections/[id]', params: { id } }); } catch { setError('Não foi possível criar a coleção.'); } finally { setBusy(false); } }
  return <AccountScreen title="Minhas coleções">
    <Text style={styles.body}>Listas para organizar seu universo. Toda nova coleção começa privada.</Text>
    <TextInput accessibilityLabel="Nome da nova coleção" placeholder="Filmes para o fim de semana…" maxLength={120} style={styles.input} value={title} onChangeText={setTitle} />
    <Button label="Criar coleção" disabled={busy || !title.trim()} onPress={() => { void create(); }} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {query.isPending ? <LoadingState kind="feed" /> : query.isError ? <><Text style={styles.error}>Não foi possível carregar suas coleções.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></> : !query.data.length ? <Text style={styles.body}>Sua primeira coleção começa acima.</Text> : query.data.map(collection => <View style={styles.card} key={collection.id}><Link style={styles.link} href={{ pathname: '/collections/[id]', params: { id: collection.id } }}>{collection.title} →</Link><Text style={styles.body}>{collection.visibility === 'private' ? 'Privada' : collection.visibility === 'friends' ? 'Amigos' : 'Pública'}</Text></View>)}
  </AccountScreen>;
}
