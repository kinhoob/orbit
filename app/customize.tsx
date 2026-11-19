import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountScreen } from '../src/components/account-screen';
import { Button, styles } from '../src/components/ui';
import { LoadingState } from '../src/components/loading';
import { useAuth } from '../src/features/auth/provider';
import { requireSupabase } from '../src/lib/supabase';
import { useAccountProgress } from '../src/features/account/settings';
import { palettes } from '../src/design/tokens';
export default function Customize() {
  const { session } = useAuth(); const cache = useQueryClient(); const progress = useAccountProgress();
  const query = useQuery({ queryKey: ['profile', session?.user.id], enabled: !!session, queryFn: async () => { const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', session!.user.id).single(); if (error) throw error; return data; } });
  const [theme, setTheme] = useState<keyof typeof palettes>('neutral'); const [frame, setFrame] = useState('none'); const [badge, setBadge] = useState('none'); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (query.data) { setTheme(query.data.profile_theme || 'neutral'); setFrame(query.data.avatar_frame || 'none'); setBadge(query.data.profile_badge || 'none'); } }, [query.data]);
  const xp = progress.data?.total_xp || 0; const colors = palettes[theme];
  async function save() { if (!session) return; setBusy(true); setMessage(''); try { const { error } = await requireSupabase().from('profiles').update({ profile_theme: theme, avatar_frame: frame, profile_badge: badge }).eq('id', session.user.id).select('id').single(); if (error) throw error; await cache.invalidateQueries({ queryKey: ['profile', session.user.id] }); await cache.invalidateQueries({ queryKey: ['public-profile'] }); setMessage('Perfil personalizado.'); } catch { setMessage('Não foi possível salvar. Verifique seus desbloqueios e tente novamente.'); } finally { setBusy(false); } }
  return <AccountScreen title="Personalizar perfil">
    <Text style={styles.body}>Os itens abaixo são desbloqueados pelo XP vitalício. Equipá-los não gasta XP.</Text>
    <View style={[styles.card, { backgroundColor: colors.background, alignItems: 'center' }]}><View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: frame === 'none' ? 0 : frame === 'line' ? 3 : 6, borderColor: colors.primary, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 28, color: colors.primary }}>{(query.data?.display_name || query.data?.username || '?').charAt(0).toUpperCase()}</Text></View><Text style={{ color: colors.primary, fontSize: 22 }}>{query.data?.display_name || 'Seu perfil'}</Text><Text style={{ color: colors.primary }}>Prévia</Text></View>
    {query.isPending || progress.isPending ? <LoadingState kind="feed" /> : query.isError || progress.isError ? <><Text style={styles.error}>Personalização indisponível. Seus desbloqueios ainda não puderam ser carregados.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); void progress.refetch(); }} /></> : <>
      <Text style={styles.eyebrow}>TEMAS</Text>{([{ id: 'neutral', name: 'Minimalista', xp: 0 }, { id: 'sky', name: 'Céu', xp: 15 }, { id: 'softYellow', name: 'Sol suave', xp: 50 }] as const).map(item => <Button key={item.id} disabled={busy || xp < item.xp} label={`${theme === item.id ? '✓ ' : ''}${item.name}${xp < item.xp ? ` · desbloqueia em ${item.xp} XP` : ''}`} onPress={() => setTheme(item.id)} />)}
      <Text style={styles.eyebrow}>MOLDURAS</Text>{[{ id: 'none', name: 'Sem moldura', xp: 0 }, { id: 'line', name: 'Órbita', xp: 20 }, { id: 'double', name: 'Explorador', xp: 120 }].map(item => <Button key={item.id} disabled={busy || xp < item.xp} label={`${frame === item.id ? '✓ ' : ''}${item.name}${xp < item.xp ? ` · desbloqueia em ${item.xp} XP` : ''}`} onPress={() => setFrame(item.id)} />)}
      <Text style={styles.eyebrow}>EMBLEMAS</Text>{[{ id: 'none', name: 'Sem emblema', xp: 0 }, { id: 'explorer', name: 'Explorador', xp: 15 }, { id: 'collector', name: 'Colecionador', xp: 20 }].map(item => <Button key={item.id} disabled={busy || xp < item.xp} label={`${badge === item.id ? '✓ ' : ''}${item.name}${xp < item.xp ? ` · ${item.xp} XP` : ''}`} onPress={() => setBadge(item.id)} />)}
      <Button label="Aplicar no perfil" disabled={busy} onPress={() => { void save(); }} />
    </>}{!!message && <Text accessibilityRole="alert" style={styles.body}>{message}</Text>}
  </AccountScreen>;
}
