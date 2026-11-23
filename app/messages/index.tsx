import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen, styles } from '../../src/components/ui';
import { LoadingState } from '../../src/components/loading';
import { tokens as t, font } from '../../src/design/tokens';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
import { fetchProfilesByIds, type ProfileSummary } from '../../src/features/social/friends';
import { fetchRecentMessages } from '../../src/features/social/messages';
import { groupConversations } from '../../src/domain/messages.mjs';

export default function Conversations() {
  const { session, loading } = useAuth();
  const userId = session?.user.id;

  const recent = useQuery({
    queryKey: ['conversations', userId],
    enabled: !!supabase && !!userId,
    queryFn: () => fetchRecentMessages(userId!),
  });
  const unavailable = recent.data === null;
  const conversations = groupConversations(recent.data || [], userId || '');
  const otherIds = conversations.map((c) => c.otherId);
  const known = useQuery({
    queryKey: ['conversation-profiles', userId, otherIds.join(',')],
    enabled: !!supabase && !!userId && otherIds.length > 0,
    queryFn: () => fetchProfilesByIds(otherIds),
  });
  const byId = new Map((known.data || []).map((p: ProfileSummary) => [p.id, p]));

  return (
    <Screen>
      <Text style={styles.eyebrow}>MENSAGENS</Text>
      <Text style={styles.title}>Conversas com amigos.</Text>
      <Link href="/friends" style={styles.link}>← Amizades</Link>
      {!supabase ? (
        <Text style={styles.body}>As mensagens ficam disponíveis quando a conexão com o ORBIT for configurada.</Text>
      ) : loading || !userId ? (
        <LoadingState kind="feed" />
      ) : unavailable ? (
        <Text style={styles.body}>As mensagens estão em atualização no banco de dados. Quando a atualização em revisão for aplicada, suas conversas com amigos aparecem aqui. Nenhuma conversa foi criada ainda.</Text>
      ) : recent.isPending ? (
        <LoadingState kind="feed" />
      ) : recent.isError ? (
        <Text style={styles.error}>Não foi possível carregar as conversas.</Text>
      ) : !conversations.length ? (
        <Text style={styles.body}>Nenhuma conversa ainda. Quando você segue uma pessoa e ela segue de volta, vocês viram amigos e podem trocar mensagens — abra o perfil dela e toque em Enviar mensagem.</Text>
      ) : (
        conversations.map((c) => {
          const profile = byId.get(c.otherId);
          const name = profile?.display_name || profile?.username || 'Perfil indisponível';
          return (
            <Link key={c.otherId} href={{ pathname: '/messages/[id]', params: { id: c.otherId } }} style={list.rowLink}>
              <View style={list.row}>
                <View style={list.avatar} accessibilityLabel={`Avatar de ${name}`}>
                  <Text style={list.avatarText}>{name.trim().charAt(0).toUpperCase()}</Text>
                </View>
                <View style={list.rowText}>
                  <Text style={list.name}>{name}</Text>
                  <Text style={styles.body} numberOfLines={1}>{c.lastMine ? `Você: ${c.lastBody}` : c.lastBody}</Text>
                </View>
                {c.unread > 0 && (
                  <View style={list.badge} accessibilityLabel={`${c.unread} mensagens não lidas`}>
                    <Text style={list.badgeText}>{c.unread}</Text>
                  </View>
                )}
              </View>
            </Link>
          );
        })
      )}
    </Screen>
  );
}

const list = StyleSheet.create({
  rowLink: { textDecorationLine: 'none' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: t.radius, backgroundColor: t.colors.surface },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: t.colors.onDark, fontSize: 18, fontFamily: font.bold },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontFamily: font.semibold, color: t.colors.text },
  badge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  badgeText: { color: t.colors.onDark, fontSize: 12, fontFamily: font.bold },
});
