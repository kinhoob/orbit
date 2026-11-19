import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MotionPressable } from './motion';
import { Icon } from './icons';
import { ProgressSummary } from './progress';
import { accountMenuItems } from '../features/account/menu';
import { useAuth } from '../features/auth/provider';
import { requireSupabase } from '../lib/supabase';
import { font, tokens as t } from '../design/tokens';

export function AccountMenu({ onNavigate, dark = false }: { onNavigate?: (href: string) => void; dark?: boolean }) {
  const { session } = useAuth(); const router = useRouter(); const cache = useQueryClient();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const query = useQuery({ queryKey: ['account-menu', session?.user.id], enabled: !!session, queryFn: async () => { const { data, error } = await requireSupabase().from('profiles').select('display_name,username,avatar_url').eq('id', session!.user.id).single(); if (error) throw error; return data; } });
  const go = (href: string) => onNavigate ? onNavigate(href) : router.push(href as never);
  async function signout() { if (busy) return; setBusy(true); setError(''); try { const { error } = await requireSupabase().auth.signOut(); if (error) throw error; cache.clear(); go('/'); } catch { setError('Não foi possível sair. Tente novamente.'); } finally { setBusy(false); } }
  const fg = dark ? t.colors.onDark : t.colors.text;
  const fgMuted = dark ? t.colors.onDarkMuted : t.colors.muted;
  return <View style={{ gap: 4, paddingVertical: 12 }}>
    <MotionPressable accessibilityRole="button" accessibilityLabel={session ? 'Abrir meu perfil' : 'Entrar no ORBIT'} onPress={() => go(session ? '/(tabs)/profile' : '/auth')} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {query.data?.avatar_url ? <Image source={{ uri: query.data.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} /> : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: dark ? t.colors.darkSoft : t.colors.secondary, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: fg, fontSize: 19, fontFamily: font.bold }}>{(query.data?.display_name || query.data?.username || session?.user.email || '?').charAt(0).toUpperCase()}</Text></View>}
      <View style={{ flex: 1 }}><Text style={{ color: fg, fontSize: 16, fontFamily: font.bold }}>{query.data?.display_name || query.data?.username || (session ? 'Sua conta' : 'Entrar no ORBIT')}</Text>{!!query.data?.username && <Text style={{ color: fgMuted, fontSize: 12, fontFamily: font.regular }}>@{query.data.username}</Text>}</View>
    </MotionPressable>
    {!!session && <View style={{ padding: 12 }}><ProgressSummary dark={dark} /></View>}
    {accountMenuItems.map(item => <MotionPressable key={item.href} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => go(item.href)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13 }}><Icon name={item.icon} size={20} color={fg} /><Text style={{ color: fg, fontSize: 14, fontFamily: font.medium, flex: 1 }}>{item.label}</Text></MotionPressable>)}
    <View style={{ borderTopWidth: 1, borderTopColor: dark ? t.colors.darkSoft : t.colors.border, marginTop: 12, paddingTop: 12, gap: 4 }}>
      <MotionPressable accessibilityRole="button" onPress={() => go('/help')} style={{ padding: 12 }}><Text style={{ color: fgMuted, fontFamily: font.regular }}>Ajuda e feedback</Text></MotionPressable>
      {!!session && <MotionPressable accessibilityRole="button" disabled={busy} onPress={() => { void signout(); }} style={{ padding: 12 }}><Text style={{ color: t.colors.error, fontFamily: font.regular }}>{busy ? 'Saindo…' : 'Sair da conta'}</Text></MotionPressable>}
      {!!error && <Text accessibilityRole="alert" style={{ color: t.colors.error, padding: 12, fontFamily: font.regular }}>{error}</Text>}
    </View>
  </View>;
    }
