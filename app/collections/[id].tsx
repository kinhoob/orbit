import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountScreen } from '../../src/components/account-screen';
import { styles, Button } from '../../src/components/ui';
import { LoadingState } from '../../src/components/loading';
import { useAuth } from '../../src/features/auth/provider';
import { requireSupabase } from '../../src/lib/supabase';
import { saveCollection, deleteCollection, type Collection } from '../../src/features/account/data';
import { searchMedia, type MediaItem } from '../../src/features/catalog/data';
export default function CollectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { session } = useAuth(); const userId = session?.user.id; const cache = useQueryClient();
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [visibility, setVisibility] = useState<Collection['visibility']>('private');
  const [search, setSearch] = useState(''); const [term, setTerm] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false);
  const query = useQuery({ queryKey: ['collection', userId, id], enabled: !!userId && !!id, queryFn: async () => { const { data, error } = await requireSupabase().from('collections').select('*').eq('id', id).eq('user_id', userId!).maybeSingle(); if (error) throw error; return data as Collection | null; } });
  const items = useQuery({ queryKey: ['collection-items', userId, id], enabled: !!query.data, queryFn: async () => { const { data, error } = await requireSupabase().from('collection_items').select('media_item_id,media:media_items(*)').eq('collection_id', id).order('added_at', { ascending: false }); if (error) throw error; return (data || []) as unknown as { media_item_id: string; media: MediaItem | null }[]; } });
  const results = useQuery({ queryKey: ['collection-search', userId, term], enabled: !!query.data && term.trim().length >= 2, queryFn: () => searchMedia(term) });
  useEffect(() => { if (query.data) { setTitle(query.data.title); setDescription(query.data.description); setVisibility(query.data.visibility); } }, [query.data]);
  useEffect(() => { const timer = setTimeout(() => setTerm(search), 300); return () => clearTimeout(timer); }, [search]);
  async function act(action: () => Promise<unknown>, success: string) { if (busy) return; setBusy(true); setMessage(''); try { await action(); await Promise.all([cache.invalidateQueries({ queryKey: ['collection', userId, id] }), cache.invalidateQueries({ queryKey: ['collection-items', userId, id] }), cache.invalidateQueries({ queryKey: ['collections', userId] })]); setMessage(success); } catch { setMessage('Não foi possível concluir. Tente novamente.'); } finally { setBusy(false); } }
  async function itemAction(mediaId: string, remove: boolean) { const table = requireSupabase().from('collection_items'); const { error } = remove ? await table.delete().eq('collection_id', id).eq('media_item_id', mediaId) : await table.upsert({ collection_id: id, media_item_id: mediaId }, { onConflict: 'collection_id,media_item_id', ignoreDuplicates: true }); if (error) throw error; }
  return <AccountScreen title="Editar coleção"><Link href="/collections" style={styles.link}>← Minhas coleções</Link>
    {query.isPending ? <LoadingState kind="feed" /> : query.isError ? <><Text style={styles.error}>Não foi possível abrir a coleção.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></> : !query.data ? <Text style={styles.body}>Coleção indisponível.</Text> : <>
      <TextInput accessibilityLabel="Título da coleção" style={styles.input} value={title} onChangeText={setTitle} maxLength={120} /><TextInput accessibilityLabel="Descrição da coleção" placeholder="Descrição" style={styles.input} value={description} onChangeText={setDescription} multiline maxLength={1000} />
      <Text style={styles.body}>Quem pode ver?</Text><View style={{ gap: 8 }}>{(['private', 'friends', 'public'] as const).map(value => <Button key={value} label={`${visibility === value ? '✓ ' : ''}${value === 'private' ? 'Somente eu' : value === 'friends' ? 'Amigos' : 'Qualquer pessoa'}`} onPress={() => setVisibility(value)} />)}</View>
      <Button disabled={busy || !title.trim()} label="Salvar alterações" onPress={() => { void act(() => saveCollection(userId!, { title: title.trim(), description: description.trim(), visibility }, id), 'Coleção atualizada.'); }} />
      <Text style={styles.eyebrow}>OBRAS DA COLEÇÃO</Text>
      {items.isPending ? <LoadingState kind="feed" /> : items.isError ? <Button label="Tentar carregar obras" onPress={() => { void items.refetch(); }} /> : !items.data.length ? <Text style={styles.body}>Nenhuma obra adicionada.</Text> : items.data.map(item => <View style={styles.card} key={item.media_item_id}><Link href={{ pathname: '/media/[id]', params: { id: item.media_item_id } }} style={styles.link}>{item.media?.title || 'Obra indisponível'} →</Link><Button disabled={busy} label="Remover da coleção" onPress={() => { void act(() => itemAction(item.media_item_id, true), 'Obra removida.'); }} /></View>)}
      <TextInput accessibilityLabel="Buscar obra para adicionar" placeholder="Buscar obra no catálogo…" value={search} onChangeText={setSearch} style={styles.input} />
      {term.trim().length >= 2 && (results.isPending ? <LoadingState kind="feed" /> : results.isError ? <Button label="Tentar buscar novamente" onPress={() => { void results.refetch(); }} /> : results.data?.length ? results.data.map(item => <Button key={item.id} disabled={busy || items.data?.some(row => row.media_item_id === item.id)} label={`Adicionar ${item.title}`} onPress={() => { void act(() => itemAction(item.id, false), 'Obra adicionada.'); }} />) : <Text style={styles.body}>Nenhuma obra encontrada.</Text>)}
      {!confirm ? <Button label="Excluir coleção" disabled={busy} onPress={() => setConfirm(true)} /> : <View style={styles.card}><Text style={styles.body}>Excluir esta coleção e sua lista de obras? As avaliações e os salvos serão mantidos.</Text><Button label="Confirmar exclusão" disabled={busy} onPress={() => { void act(async () => { await deleteCollection(userId!, id); router.replace('/collections'); }, 'Coleção excluída.'); }} /><Button label="Cancelar" onPress={() => setConfirm(false)} /></View>}
    </>}{!!message && <Text accessibilityRole="alert" style={styles.body}>{message}</Text>}
  </AccountScreen>;
}
