import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountScreen } from '../src/components/account-screen';
import { Button, styles } from '../src/components/ui';
import { LoadingState } from '../src/components/loading';
import { ProfileAccent } from '../src/components/profile-animation';
import { useAuth } from '../src/features/auth/provider';
import { requireSupabase } from '../src/lib/supabase';
import { useAccountProgress } from '../src/features/account/settings';
import { cosmeticsCatalogMissing, saveCosmetics, useCosmeticCatalog } from '../src/features/account/cosmetics';
import { buttonColorsFor, COSMETIC_KINDS } from '../src/domain/cosmetics.mjs';
import { palettes } from '../src/design/tokens';

// Personalização por nível (pedido do Marco em 23/11/2026): temas, cores de
// botão, animações, molduras e emblemas destravam conforme o nível sobe. O
// catálogo vem do banco; enquanto a atualização está em revisão, as escolhas
// antigas continuam funcionando e as novas explicam que chegam em breve.

const LEGACY_THEMES = [{ id: 'neutral', name: 'Minimalista', xp: 0 }, { id: 'sky', name: 'Céu', xp: 15 }, { id: 'softYellow', name: 'Sol suave', xp: 50 }] as const;
const LEGACY_FRAMES = [{ id: 'none', name: 'Sem moldura', xp: 0 }, { id: 'line', name: 'Órbita', xp: 20 }, { id: 'double', name: 'Explorador', xp: 120 }] as const;
const LEGACY_BADGES = [{ id: 'none', name: 'Sem emblema', xp: 0 }, { id: 'explorer', name: 'Explorador', xp: 15 }, { id: 'collector', name: 'Colecionador', xp: 20 }] as const;

export default function Customize() {
  const { session } = useAuth(); const cache = useQueryClient(); const progress = useAccountProgress();
  const catalog = useCosmeticCatalog();
  const query = useQuery({ queryKey: ['profile', session?.user.id], enabled: !!session, queryFn: async () => { const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', session!.user.id).single(); if (error) throw error; return data; } });
  const [theme, setTheme] = useState<keyof typeof palettes>('neutral'); const [frame, setFrame] = useState('none'); const [badge, setBadge] = useState('none');
  const [button, setButton] = useState('ink'); const [animation, setAnimation] = useState('none');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (query.data) {
    setTheme(query.data.profile_theme || 'neutral'); setFrame(query.data.avatar_frame || 'none'); setBadge(query.data.profile_badge || 'none');
    setButton(query.data.button_theme || 'ink'); setAnimation(query.data.profile_animation || 'none');
  } }, [query.data]);
  const xp = progress.data?.total_xp || 0; const level = progress.data?.level || 1;
  const colors = palettes[theme];
  const initial = (query.data?.display_name || query.data?.username || '?').charAt(0).toUpperCase();
  const leveled = !!catalog.data?.length && !cosmeticsCatalogMissing();
  async function save() {
    if (!session) return; setBusy(true); setMessage('');
    try {
      if (leveled) {
        await saveCosmetics(session.user.id, { profile_theme: theme, avatar_frame: frame, profile_badge: badge, button_theme: button, profile_animation: animation });
      } else {
        const { error } = await requireSupabase().from('profiles').update({ profile_theme: theme, avatar_frame: frame, profile_badge: badge }).eq('id', session.user.id).select('id').single();
        if (error) throw error;
      }
      await cache.invalidateQueries({ queryKey: ['profile', session.user.id] });
      await cache.invalidateQueries({ queryKey: ['public-profile'] });
      setMessage('Perfil personalizado.');
    } catch { setMessage('Não foi possível salvar. Verifique seus desbloqueios e tente novamente.'); } finally { setBusy(false); }
  }
  function optionLabel(selected: boolean, name: string, lockedAt: number | null) {
    return `${selected ? '✓ ' : ''}${name}${lockedAt !== null ? ` · desbloqueia no nível ${lockedAt}` : ''}`;
  }
  return <AccountScreen title="Personalizar perfil">
    <Text style={styles.body}>Os itens abaixo são desbloqueados pelo seu nível. Equipá-los não gasta XP.</Text>
    <View style={[styles.card, { backgroundColor: colors.background, alignItems: 'center' }]}>
      <ProfileAccent animation={leveled ? animation : 'none'} size={80} color={colors.accent}>
        <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: frame === 'none' ? 0 : frame === 'line' ? 3 : 6, borderColor: colors.primary, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 28, color: colors.primary }}>{initial}</Text></View>
      </ProfileAccent>
      <Text style={{ color: colors.primary, fontSize: 22 }}>{query.data?.display_name || 'Seu perfil'}</Text>
      {leveled && <View style={{ backgroundColor: buttonColorsFor(button).bg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18 }}><Text style={{ color: buttonColorsFor(button).fg, fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>Botão do perfil</Text></View>}
      <Text style={{ color: colors.primary }}>Prévia</Text>
    </View>
    {query.isPending || progress.isPending || catalog.isPending ? <LoadingState kind="feed" /> : query.isError || progress.isError ? <><Text style={styles.error}>Personalização indisponível. Seus desbloqueios ainda não puderam ser carregados.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); void progress.refetch(); }} /></> : !leveled ? <>
      <Text style={styles.eyebrow}>TEMAS</Text>{LEGACY_THEMES.map(item => <Button key={item.id} disabled={busy || xp < item.xp} label={`${theme === item.id ? '✓ ' : ''}${item.name}${xp < item.xp ? ` · desbloqueia em ${item.xp} XP` : ''}`} onPress={() => setTheme(item.id)} />)}
      <Text style={styles.eyebrow}>MOLDURAS</Text>{LEGACY_FRAMES.map(item => <Button key={item.id} disabled={busy || xp < item.xp} label={`${frame === item.id ? '✓ ' : ''}${item.name}${xp < item.xp ? ` · desbloqueia em ${item.xp} XP` : ''}`} onPress={() => setFrame(item.id)} />)}
      <Text style={styles.eyebrow}>EMBLEMAS</Text>{LEGACY_BADGES.map(item => <Button key={item.id} disabled={busy || xp < item.xp} label={`${badge === item.id ? '✓ ' : ''}${item.name}${xp < item.xp ? ` · ${item.xp} XP` : ''}`} onPress={() => setBadge(item.id)} />)}
      <Text style={styles.body}>Cores de botão, animações e novos temas chegam com a próxima atualização do banco, que já está em revisão.</Text>
      <Button label="Aplicar no perfil" disabled={busy} onPress={() => { void save(); }} />
    </> : <>
      {COSMETIC_KINDS.map(kind => (
        <View key={kind.id} style={{ gap: 12 }}>
          <Text style={styles.eyebrow}>{kind.label.toUpperCase()}</Text>
          {catalog.data!.filter(item => item.kind === kind.id).map(item => {
            const selected = (kind.id === 'theme' && theme === item.id) || (kind.id === 'frame' && frame === item.id) || (kind.id === 'badge' && badge === item.id) || (kind.id === 'button' && button === item.id) || (kind.id === 'animation' && animation === item.id);
            const locked = item.min_level > level;
            return <Button key={item.id} disabled={busy || locked} label={optionLabel(selected, item.name, locked ? item.min_level : null)} onPress={() => {
              if (kind.id === 'theme') setTheme(item.id as keyof typeof palettes);
              else if (kind.id === 'frame') setFrame(item.id);
              else if (kind.id === 'badge') setBadge(item.id);
              else if (kind.id === 'button') setButton(item.id);
              else setAnimation(item.id);
            }} />;
          })}
        </View>
      ))}
      <Button label="Aplicar no perfil" disabled={busy} onPress={() => { void save(); }} />
    </>}
    {!!message && <Text accessibilityRole="alert" style={styles.body}>{message}</Text>}
  </AccountScreen>;
}
