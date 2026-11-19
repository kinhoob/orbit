import React, { useEffect } from 'react';
import { Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Screen,styles,Button } from '../../src/components/ui';
import { MotionPressable } from '../../src/components/motion';
import { Icon } from '../../src/components/icons';
import { listNotifications, markAllNotificationsRead, notificationsTableMissing, type OrbitNotification } from '../../src/features/social/notifications';
import { notificationText } from '../../src/domain/notifications.mjs';
import { relativeTime } from '../../src/domain/timelines.mjs';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
import { tokens as t } from '../../src/design/tokens';

function NotificationRow({ item, onPress }: { item: OrbitNotification; onPress: () => void }) {
  const actorName = item.actor?.display_name || item.actor?.username || '';
  const unread = !item.read_at;
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={notificationText(item.type, actorName)}
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: t.colors.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: t.colors.accentStrong }}>{(actorName || '?').trim().charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: unread ? '700' : '500', color: t.colors.text }}>{notificationText(item.type, actorName)}</Text>
        <Text style={{ fontSize: 12, color: t.colors.muted }}>{relativeTime(item.created_at)}</Text>
      </View>
      {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.accentStrong }} /> : null}
    </MotionPressable>
  );
}

// Sino (arquitetura aprovada pelo Marco em 18/11/2026): lista apenas
// notificacoes reais do banco. Enquanto a migration estiver em revisao e nao
// aplicada, a tela avisa com honestidade em vez de inventar conteudo.
export default function Notifications() {
  const { session, loading } = useAuth();
  const cache = useQueryClient();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['notifications', session?.user.id],
    queryFn: () => listNotifications(session!.user.id),
    enabled: !!session && !!supabase,
  });
  // Abrir o sino marca tudo como lido e zera o contador da barra.
  const hasUnread = (query.data || []).some((item) => !item.read_at);
  useEffect(() => {
    if (!session || !hasUnread) return;
    void markAllNotificationsRead(session.user.id).then(() => {
      void cache.invalidateQueries({ queryKey: ['notifications-unread', session.user.id] });
      void cache.invalidateQueries({ queryKey: ['notifications', session.user.id] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, hasUnread]);
  const open = (item: OrbitNotification) => {
    if (item.type === 'rating_like') router.push('/(tabs)/discover');
    else router.push('/friends');
  };
  return <Screen>
    <Text style={styles.eyebrow}>SINO</Text>
    <Text style={{...styles.title, fontSize: 29, lineHeight: 35}}>Notificações.</Text>
    {loading || !supabase ? null : !session ? <Text style={styles.body}>Entre para ver suas notificações.</Text> : null}
    {!!session && query.isPending ? <Text style={styles.body}>Carregando notificações…</Text> : null}
    {!!session && query.isError ? <><Text style={styles.error}>Não foi possível carregar as notificações.</Text><Button label="Tentar novamente" onPress={() => { void query.refetch(); }} /></> : null}
    {!!session && query.data && notificationsTableMissing() ? (
      <View style={{ gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.secondary, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={28} color={t.colors.muted} /></View>
        <Text style={styles.body}>As notificações ainda estão sendo preparadas no banco de dados. Quando essa etapa for concluída, pedidos de amizade, amizades aceitas e curtidas nas suas avaliações aparecem aqui de verdade.</Text>
      </View>
    ) : null}
    {!!session && query.data && !notificationsTableMissing() && query.data.length === 0 ? (
      <View style={{ gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.secondary, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={28} color={t.colors.muted} /></View>
        <Text style={styles.body}>Nada novo por aqui. Quando alguém pedir sua amizade, aceitar seu pedido ou curtir sua avaliação, você vê aqui.</Text>
      </View>
    ) : null}
    {!!session && query.data && !notificationsTableMissing() && query.data.length > 0 ? (
      <View>{query.data.map((item) => <NotificationRow key={item.id} item={item} onPress={() => open(item)} />)}</View>
    ) : null}
  </Screen>;
}
