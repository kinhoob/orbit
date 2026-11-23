import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileTimeline } from '../../src/components/profile-timeline';
import { ProfileTabs, PinnedFavorites } from '../../src/components/profile-tabs';
import { SharedCollections } from '../../src/components/shared-collections';
import { ProfileIdentity } from '../../src/components/profile-identity';
import { ProfileStatsRow } from '../../src/components/profile-stats';
import { FollowButton, ReportFlow } from '../../src/components/person-actions';
import { MotionPressable } from '../../src/components/motion';
import { Icon } from '../../src/components/icons';
import { Screen, Button, styles } from '../../src/components/ui';
import { LoadingState } from '../../src/components/loading';
import { tokens as t } from '../../src/design/tokens';
import { requireSupabase, supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
import { fetchFriendships, relationWith } from '../../src/features/social/friends';
import { canMessageWith } from '../../src/domain/messages.mjs';

export default function PersonProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const cache = useQueryClient(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [tab, setTab] = useState('timeline');
  const [menuOpen, setMenuOpen] = useState(false); const [action, setAction] = useState<'' | 'report' | 'block'>('');
  const compatibility = useQuery({ queryKey: ['compatibility', session?.user.id, id], enabled: !!session && session.user.id !== id,
    queryFn: async () => { const { data, error } = await requireSupabase().rpc('friend_compatibility', { other_user: id }); if (error) throw error; return data as { common: number; percent: number | null; minimum: number } | null; } });
  async function block() { if (!session || session.user.id === id || busy) return; setBusy(true); try { const { error } = await requireSupabase().from('blocks').upsert({ blocker_id: session.user.id, blocked_id: id }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true }); if (error) throw error; await cache.invalidateQueries(); router.replace('/(tabs)/search'); } catch { setMessage('Não foi possível bloquear. Tente novamente.'); } finally { setBusy(false); } }
  const profile = useQuery({ queryKey: ['public-profile', session?.user.id, id], enabled: !!supabase && !!id,
    queryFn: async () => { const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', id).maybeSingle(); if (error) throw error; return data; } });
  const friendships = useQuery({ queryKey: ['friendships', session?.user.id], enabled: !!supabase && !!session && session.user.id !== id,
    queryFn: () => fetchFriendships(session!.user.id) });
  const relation = session && id && friendships.data ? relationWith(friendships.data, session.user.id, id) : null;
  const canMessage = !!relation && canMessageWith(relation.kind);
  return <Screen>
    <Link href="/(tabs)/search" style={styles.link}>← Busca</Link>
    {!supabase ? <Text style={styles.body}>Os perfis precisam do catálogo conectado.</Text>
      : profile.isPending ? <LoadingState kind="feed" />
      : profile.isError ? <><Text style={styles.error}>Não foi possível abrir este perfil.</Text><Button label="Tentar novamente" onPress={() => { void profile.refetch(); }} /></>
      : !profile.data ? <Text style={styles.body}>Este perfil não está disponível.</Text>
      : <><Text style={styles.eyebrow}>NA SUA ÓRBITA</Text><ProfileIdentity profile={profile.data} />{!!profile.data.bio && <Text style={styles.body}>{profile.data.bio}</Text>}
      <ProfileStatsRow profileId={id} own={false} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 18 }}>
          <FollowButton profileId={id} />
          {canMessage && <Button variant="outline" label="Enviar mensagem" onPress={() => router.push({ pathname: '/messages/[id]', params: { id: id! } })} />}
        </View>
        {!!session && session.user.id !== id && (
          <MotionPressable accessibilityRole="button" accessibilityLabel="Mais opções" accessibilityState={{ expanded: menuOpen }} onPress={() => { setMenuOpen(!menuOpen); setAction(''); }} style={{ padding: 12 }}>
            <Icon name="menu" size={22} color={t.colors.text} />
          </MotionPressable>
        )}
      </View>
      {menuOpen && !!session && session.user.id !== id && (
        <View style={[styles.card, { gap: 4 }]}>
          <MotionPressable accessibilityRole="button" onPress={() => { setAction('report'); setMenuOpen(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
            <Icon name="flag" size={16} color={t.colors.muted} />
            <Text style={styles.body}>Denunciar usuário</Text>
          </MotionPressable>
          <MotionPressable accessibilityRole="button" onPress={() => { setAction('block'); setMenuOpen(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
            <Icon name="eye-off" size={16} color={t.colors.muted} />
            <Text style={styles.body}>Bloquear usuário</Text>
          </MotionPressable>
        </View>
      )}
      {compatibility.data && <Text style={styles.body}>{compatibility.data.percent === null ? `Avaliem pelo menos ${compatibility.data.minimum} obras em comum para comparar gostos. Vocês têm ${compatibility.data.common}.` : `${compatibility.data.percent}% de compatibilidade · ${compatibility.data.common} obras em comum. Uma comparação de notas, não de personalidade.`}</Text>}
      <Link href={{ pathname: '/friends', params: { search: profile.data.username || profile.data.display_name } }} style={styles.link}>Gerenciar amizade →</Link>
      <PinnedFavorites profileId={id} own={false} />
      <ProfileTabs own={false} active={tab} onChange={setTab} />
      {tab === 'timeline' && <ProfileTimeline profileId={id} />}
      {tab === 'collections' && <SharedCollections profileId={id} />}
      {!!session && session.user.id !== id && action === 'report' && <ReportFlow profileId={id} startOpen />}
      {!!session && session.user.id !== id && action === 'block' && (<><Text style={styles.body}>Bloquear impede interações entre vocês. Você pode desfazer em Configurações.</Text><Button label="Confirmar bloqueio" disabled={busy} onPress={() => { void block(); }} /><Button variant="outline" label="Cancelar" disabled={busy} onPress={() => setAction('')} /></>)}
      {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
      </>}
  </Screen>;
}
