import React from 'react';
import { Text } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen, Button, styles } from '../../src/components/ui';
import { LoadingState } from '../../src/components/loading';
import { requireSupabase, supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';

export default function PersonProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const profile = useQuery({ queryKey: ['public-profile', session?.user.id, id], enabled: !!supabase && !!id,
    queryFn: async () => { const { data, error } = await requireSupabase().from('profiles').select('id,display_name,username,bio').eq('id', id).maybeSingle(); if (error) throw error; return data; } });
  return <Screen>
    <Link href="/(tabs)/search" style={styles.link}>← Busca</Link>
    {!supabase ? <Text style={styles.body}>Os perfis precisam do catálogo conectado.</Text>
      : profile.isPending ? <LoadingState kind="feed" />
      : profile.isError ? <><Text style={styles.error}>Não foi possível abrir este perfil.</Text><Button label="Tentar novamente" onPress={() => { void profile.refetch(); }} /></>
      : !profile.data ? <Text style={styles.body}>Este perfil não está disponível.</Text>
      : <><Text style={styles.eyebrow}>NA SUA ÓRBITA</Text><Text style={styles.title}>{profile.data.display_name || profile.data.username || 'Perfil'}</Text>{!!profile.data.username && <Text style={styles.body}>@{profile.data.username}</Text>}{!!profile.data.bio && <Text style={styles.body}>{profile.data.bio}</Text>}<Link href={{ pathname: '/friends', params: { search: profile.data.username || profile.data.display_name } }} style={styles.link}>Gerenciar amizade →</Link></>}
  </Screen>;
}
