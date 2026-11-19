import React, { useState } from 'react';
import { Text } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileTimeline } from '../../src/components/profile-timeline';
import { SharedCollections } from '../../src/components/shared-collections';
import { ProfileIdentity } from '../../src/components/profile-identity';
import { Screen, Button, styles } from '../../src/components/ui';
import { LoadingState } from '../../src/components/loading';
import { requireSupabase, supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';

export default function PersonProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const cache = useQueryClient(); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const compatibility = useQuery({ queryKey: ['compatibility', session?.user.id, id], enabled: !!session && session.user.id !== id,
    queryFn: async () => { const { data, error } = await requireSupabase().rpc('friend_compatibility', { other_user: id }); if (error) throw error; return data as { common: number; percent: number | null; minimum: number } | null; } });
  async function block() { if (!session || session.user.id === id || busy) return; setBusy(true); try { const { error } = await requireSupabase().from('blocks').upsert({ blocker_id: session.user.id, blocked_id: id }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true }); if (error) throw error; await cache.invalidateQueries(); router.replace('/(tabs)/search'); } catch { setMessage('Não foi possível bloquear. Tente novamente.'); } finally { setBusy(false); } }
  const profile = useQuery({ queryKey: ['public-profile', session?.user.id, id], enabled: !!supabase && !!id,
    queryFn: async () => { const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', id).maybeSingle(); if (error) throw error; return data; } });
  return <Screen>
    <Link href="/(tabs)/search" style={styles.link}>← Busca</Link>
    {!supabase ? <Text style={styles.body}>Os perfis precisam do catálogo conectado.</Text>
      : profile.isPending ? <LoadingState kind="feed" />
      : profile.isError ? <><Text style={styles.error}>Não foi possível abrir este perfil.</Text><Button label="Tentar novamente" onPress={() => { void profile.refetch(); }} /></>
      : !profile.data ? <Text style={styles.body}>Este perfil não está disponível.</Text>
      : <><Text style={styles.eyebrow}>NA SUA ÓRBITA</Text><ProfileIdentity profile={profile.data} />{!!profile.data.bio && <Text style={styles.body}>{profile.data.bio}</Text>}
      {compatibility.data && <Text style={styles.body}>{compatibility.data.percent === null ? `Avaliem pelo menos ${compatibility.data.minimum} obras em comum para comparar gostos. Vocês têm ${compatibility.data.common}.` : `${compatibility.data.percent}% de compatibilidade · ${compatibility.data.common} obras em comum. Uma comparação de notas, não de personalidade.`}</Text>}
      <Link href={{ pathname: '/friends', params: { search: profile.data.username || profile.data.display_name } }} style={styles.link}>Gerenciar amizade →</Link>
      <ProfileTimeline profileId={id} />
      <SharedCollections profileId={id} />
      {!!session && session.user.id !== id && (!confirm ? <Button label="Bloquear usuário" onPress={() => setConfirm(true)} /> : <><Text style={styles.body}>Bloquear impede interações entre vocês. Você pode desfazer em Configurações.</Text><Button label="Confirmar bloqueio" disabled={busy} onPress={() => { void block(); }} /><Button label="Cancelar" disabled={busy} onPress={() => setConfirm(false)} /></>)}
      {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
      </>}
  </Screen>;
}
