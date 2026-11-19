import React, { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountScreen } from '../src/components/account-screen';
import { Button, styles } from '../src/components/ui';
import { LoadingState } from '../src/components/loading';
import { useAuth } from '../src/features/auth/provider';
import { defaultSettings, useAccountSettings, type AccountSettings } from '../src/features/account/settings';
import { requireSupabase } from '../src/lib/supabase';
export default function Settings() {
  const { session } = useAuth(); const query = useAccountSettings(); const cache = useQueryClient();
  const [values, setValues] = useState<AccountSettings>(defaultSettings); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { if (query.data) setValues(query.data); }, [query.data]);
  const blocks = useQuery({ queryKey: ['blocked-users', session?.user.id], enabled: !!session, queryFn: async () => { const { data, error } = await requireSupabase().from('blocks').select('blocked_id,created_at').eq('blocker_id', session!.user.id).order('created_at', { ascending: false }); if (error) throw error; return data || []; } });
  async function save() { if (!session || busy) return; setBusy(true); setMessage(''); try { const { error } = await requireSupabase().from('account_settings').upsert({ user_id: session.user.id, ...values }); if (error) throw error; await cache.invalidateQueries({ queryKey: ['account-settings', session.user.id] }); setMessage('Preferências salvas.'); } catch { setMessage('Não foi possível salvar. Tente novamente.'); } finally { setBusy(false); } }
  async function unblock(id: string) { if (!session || busy) return; setBusy(true); try { const { error } = await requireSupabase().from('blocks').delete().eq('blocker_id', session.user.id).eq('blocked_id', id); if (error) throw error; await cache.invalidateQueries(); setMessage('Usuário desbloqueado.'); } catch { setMessage('Não foi possível desbloquear.'); } finally { setBusy(false); } }
  return <AccountScreen title="Configurações">
    <Text style={styles.eyebrow}>CONTA</Text><Text style={styles.body}>{session?.user.email}</Text><Link href="/auth" style={styles.link}>Acesso e recuperação de senha →</Link>
    {query.isPending ? <LoadingState kind="feed" /> : query.isError ? <><Text style={styles.error}>Preferências indisponíveis. A atualização do serviço pode estar pendente.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></> : <>
      <Text style={styles.eyebrow}>PRIVACIDADE</Text><Text style={styles.body}>Visibilidade inicial das novas avaliações. As avaliações existentes mantêm a escolha feita em cada obra.</Text>
      {(['public', 'friends', 'private'] as const).map(value => <Button key={value} label={`${values.default_visibility === value ? '✓ ' : ''}${value === 'public' ? 'Pública' : value === 'friends' ? 'Amigos' : 'Privada'}`} onPress={() => setValues(current => ({ ...current, default_visibility: value }))} />)}
      <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between' }]}><Text style={[styles.body, { flex: 1 }]}>Mostrar contador no sino</Text><Switch accessibilityLabel="Mostrar contador no sino" value={values.show_notification_badge} onValueChange={value => setValues(current => ({ ...current, show_notification_badge: value }))} /></View>
      <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between' }]}><Text style={[styles.body, { flex: 1 }]}>Reduzir animações{values.motion_preference === 'system' ? ' · seguindo o dispositivo' : ''}</Text><Switch accessibilityLabel="Reduzir animações" value={values.motion_preference === 'reduce'} onValueChange={value => setValues(current => ({ ...current, motion_preference: value ? 'reduce' : 'system' }))} /></View>
      <Button disabled={busy} label="Salvar preferências" onPress={() => { void save(); }} />
    </>}
    <Text style={styles.eyebrow}>USUÁRIOS BLOQUEADOS</Text>
    {blocks.isPending ? <LoadingState kind="feed" /> : blocks.isError ? <Button label="Tentar carregar bloqueados" onPress={() => { void blocks.refetch(); }} /> : !blocks.data.length ? <Text style={styles.body}>Você não bloqueou ninguém.</Text> : blocks.data.map(row => <View style={styles.card} key={row.blocked_id}><Text style={styles.body}>Usuário bloqueado · {row.blocked_id.slice(0, 8)}</Text><Button disabled={busy} label="Desbloquear" onPress={() => { void unblock(row.blocked_id); }} /></View>)}
    {!!message && <Text accessibilityRole="alert" style={styles.body}>{message}</Text>}
  </AccountScreen>;
}
