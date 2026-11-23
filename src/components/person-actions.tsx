import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, styles } from './ui';
import { MotionPressable, useReducedMotion } from './motion';
import { Icon, type IconName } from './icons';
import { tokens as t, font } from '../design/tokens';
import { followLabel, nextFollow } from '../domain/follows.mjs';
import { REPORT_REASONS, REPORT_DETAILS_MAX } from '../domain/report.mjs';
import { fetchIsFollowing, followsUnavailable, setFollow } from '../features/social/follows';
import { reportsUnavailable, submitReport } from '../features/social/reports';
import { useAuth } from '../features/auth/provider';

// Ações no perfil de outras pessoas (pedido do Marco em 22/11/2026):
// seguir unilateral sem aceite — seguir de volta vira amizade no banco — e
// denúncia registrada sem promessa de moderação. O link "Gerenciar
// amizade" segue separado para o fluxo manual de pedido/aceite.

/** Botão Seguir/Seguindo. Enquanto a migration do seguir está em revisão,
 * explica o estado em vez de fingir que seguiu. */
export function FollowButton({ profileId }: { profileId: string }) {
  const { session } = useAuth();
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const userId = session?.user.id;
  const state = useQuery({
    queryKey: ['is-following', userId, profileId],
    enabled: !!userId && userId !== profileId,
    queryFn: () => fetchIsFollowing(userId as string, profileId),
  });
  if (!userId || userId === profileId) return null;
  const following = state.data === true;
  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const next = nextFollow(following);
    const previous = state.data;
    cache.setQueryData(['is-following', userId, profileId], next.following);
    try {
      const result = await setFollow(userId as string, profileId, next.following);
      if (result === 'unavailable') {
        cache.setQueryData(['is-following', userId, profileId], previous);
        setMessage('O seguir chega com a próxima atualização do banco, que já está em revisão.');
      } else {
        await cache.invalidateQueries({ queryKey: ['profile-stats'] });
      }
    } catch {
      cache.setQueryData(['is-following', userId, profileId], previous);
      setMessage(following ? 'Não foi possível deixar de seguir. Tente novamente.' : 'Não foi possível seguir. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  return <View style={{ gap: 8 }}>
    <Button variant={following ? 'outline' : 'primary'} label={busy ? 'Aguarde…' : followLabel(following)} disabled={busy || state.isPending} onPress={() => { void toggle(); }} />
    {followsUnavailable() && !message ? <Text style={styles.body}>O seguir chega com a próxima atualização do banco, que já está em revisão.</Text> : null}
    {!!message && <Text accessibilityRole="alert" style={message.startsWith('Não') ? styles.error : styles.body}>{message}</Text>}
  </View>;
}

const menuNativeDriver = Platform.OS !== 'web';

/** Menu "+" do perfil de outra pessoa (pedido do Marco em 22/11/2026): o botão
 * gira ao abrir e o dropdown aparece e recolhe com animação suave — ao abrir
 * e ao subir. Reúne só as ações reais do modelo: mensagem (só amigos),
 * denúncia e bloqueio. Movimento reduzido desliga a animação. */
export function ProfileMenu({ canMessage, onMessage, onReport, onBlock }: {
  canMessage: boolean;
  onMessage: () => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (reduced) {
      progress.setValue(open ? 1 : 0);
      setVisible(open);
      return;
    }
    if (open) {
      setVisible(true);
      Animated.spring(progress, { toValue: 1, useNativeDriver: menuNativeDriver, stiffness: 420, damping: 28, mass: 0.7 }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 130, easing: Easing.out(Easing.cubic), useNativeDriver: menuNativeDriver }).start(({ finished }) => { if (finished) setVisible(false); });
    }
  }, [open, reduced, progress]);

  const items: { key: string; label: string; icon: IconName; onPress: () => void }[] = [
    ...(canMessage ? [{ key: 'message', label: 'Enviar mensagem', icon: 'mail' as IconName, onPress: onMessage }] : []),
    { key: 'report', label: 'Denunciar usuário', icon: 'flag' as IconName, onPress: onReport },
    { key: 'block', label: 'Bloquear usuário', icon: 'eye-off' as IconName, onPress: onBlock },
  ];
  return (
    <View style={menuStyles.root}>
      <MotionPressable accessibilityRole="button" accessibilityLabel="Mais opções" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={menuStyles.toggle}>
        <Animated.View style={{ transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
          <Icon name="plus" size={22} color={t.colors.text} />
        </Animated.View>
      </MotionPressable>
      {visible && (
        <Animated.View style={[styles.card, menuStyles.dropdown, {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        }]}>
          {items.map((item) => (
            <MotionPressable key={item.key} accessibilityRole="button" onPress={() => { setOpen(false); item.onPress(); }} style={menuStyles.item}>
              <Icon name={item.icon} size={16} color={t.colors.muted} />
              <Text style={styles.body}>{item.label}</Text>
            </MotionPressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const menuStyles = StyleSheet.create({
  root: { position: 'relative', zIndex: 20 },
  toggle: { padding: 12 },
  dropdown: { position: 'absolute', top: 48, right: 0, minWidth: 210, gap: 4, zIndex: 20, padding: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
});

/** Denúncia de perfil: motivo, detalhe opcional e registro honesto — sem
 * prometer análise, porque a moderação ainda não existe. No perfil ela abre
 * a partir do menu "+" de opções, como em outras redes. */
export function ReportFlow({ profileId, startOpen = false }: { profileId: string; startOpen?: boolean }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(startOpen);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const userId = session?.user.id;
  if (!userId || userId === profileId) return null;
  if (done) {
    return <Text style={styles.body}>Denúncia registrada. O ORBIT ainda não tem moderação, então ninguém analisa denúncias por enquanto; para não ver esta pessoa, use o bloqueio.</Text>;
  }
  async function submit() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await submitReport({ reporterId: userId as string, reportedId: profileId, reason, details });
      if (result === 'invalid') setMessage('Escolha um motivo para denunciar.');
      else if (result === 'unavailable') setMessage('As denúncias chegam com a próxima atualização do banco, que já está em revisão.');
      else setDone(true);
    } catch {
      setMessage('Não foi possível registrar a denúncia. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  if (!open) {
    return <View style={{ gap: 8 }}>
      <MotionPressable accessibilityRole="button" accessibilityLabel="Denunciar usuário" onPress={() => setOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 }}>
        <Icon name="flag" size={16} color={t.colors.muted} />
        <Text style={[styles.link, { color: t.colors.muted }]}>Denunciar usuário</Text>
      </MotionPressable>
      {reportsUnavailable() ? <Text style={styles.body}>As denúncias chegam com a próxima atualização do banco, que já está em revisão.</Text> : null}
    </View>;
  }
  return <View style={{ gap: 12 }}>
    <Text style={[styles.body, { fontFamily: font.semibold }]}>Por que você está denunciando este perfil?</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {REPORT_REASONS.map((item) => {
        const active = reason === item.id;
        return <MotionPressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setReason(item.id)}
          style={{ borderWidth: 1, borderColor: active ? t.colors.accentStrong : t.colors.border, backgroundColor: active ? t.colors.surface : 'transparent', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
          <Text style={{ color: active ? t.colors.accentStrong : t.colors.text, fontFamily: font.semibold, fontSize: 13 }}>{item.label}</Text>
        </MotionPressable>;
      })}
    </View>
    <TextInput
      accessibilityLabel="Detalhes da denúncia (opcional)"
      placeholder="Detalhes (opcional)"
      placeholderTextColor={t.colors.muted}
      style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
      value={details}
      onChangeText={setDetails}
      maxLength={REPORT_DETAILS_MAX}
      multiline
    />
    <Text style={styles.body}>A denúncia fica registrada, mas o ORBIT ainda não tem moderação para analisá-la. Se precisar de efeito imediato, bloqueie esta pessoa.</Text>
    <Button label={busy ? 'Enviando…' : 'Registrar denúncia'} disabled={busy || !reason} onPress={() => { void submit(); }} />
    <Button variant="outline" label="Cancelar" disabled={busy} onPress={() => { setOpen(false); setMessage(''); }} />
    {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
  </View>;
}
