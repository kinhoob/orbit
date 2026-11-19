import React from 'react';
import { Text } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen, Button, styles } from '../../../src/components/ui';
import { CatalogGrid } from '../../../src/components/catalog';
import { LoadingState } from '../../../src/components/loading';
import { useAuth } from '../../../src/features/auth/provider';
import { requireSupabase, supabase } from '../../../src/lib/supabase';
import type { MediaItem } from '../../../src/features/catalog/data';
export default function SharedCollection() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { session } = useAuth();
  const query = useQuery({ queryKey: ['shared-collection', session?.user.id, id], enabled: !!supabase,
    queryFn: async () => { const client = requireSupabase(); const { data: collection, error } = await client.from('collections').select('title,description,user_id').eq('id', id).maybeSingle(); if (error) throw error; if (!collection) return null; const result = await client.from('collection_items').select('media:media_items(*)').eq('collection_id', id).order('added_at', { ascending: false }); if (result.error) throw result.error; return { collection, items: (result.data || []).map(row => row.media).filter(Boolean) as unknown as MediaItem[] }; } });
  return <Screen maxWidth={760}><Link href="/(tabs)/profile" style={styles.link}>← Perfil</Link>
    {!supabase ? <Text style={styles.body}>Coleções indisponíveis sem conexão.</Text> : query.isPending ? <LoadingState /> : query.isError ? <><Text style={styles.error}>Não foi possível abrir esta coleção.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></> : !query.data ? <Text style={styles.body}>Esta coleção não está disponível para você.</Text> : <><Text style={styles.title}>{query.data.collection.title}</Text><Text style={styles.body}>{query.data.collection.description}</Text>{query.data.items.length ? <CatalogGrid items={query.data.items} /> : <Text style={styles.body}>Nenhuma obra nesta coleção.</Text>}{session?.user.id === query.data.collection.user_id && <Link href={{ pathname: '/collections/[id]', params: { id } }} style={styles.link}>Editar minha coleção →</Link>}</>}
  </Screen>;
}
