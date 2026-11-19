import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/provider';
import { requireSupabase } from '../lib/supabase';
import { Button, styles } from './ui';
export function SharedCollections({ profileId }: { profileId: string }) {
  const { session } = useAuth();
  const query = useQuery({ queryKey: ['shared-collections', session?.user.id, profileId], queryFn: async () => { const { data, error } = await requireSupabase().from('collections').select('id,title,visibility').eq('user_id', profileId).in('visibility', ['public', 'friends']).order('created_at', { ascending: false }).limit(30); if (error) throw error; return data || []; } });
  return <View style={{ gap: 12 }}><Text style={styles.eyebrow}>COLEÇÕES COMPARTILHADAS</Text>{query.isError ? <Button label="Tentar carregar coleções" onPress={() => { void query.refetch(); }} /> : query.isPending ? <Text style={styles.body}>Carregando coleções…</Text> : !query.data.length ? <Text style={styles.body}>Nenhuma coleção compartilhada disponível.</Text> : query.data.map(item => <Link key={item.id} style={styles.link} href={{ pathname: '/collections/view/[id]', params: { id: item.id } }}>{item.title} →</Link>)}</View>;
}
