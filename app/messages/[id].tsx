import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Screen, styles } from '../../src/components/ui';
import { MotionPressable } from '../../src/components/motion';
import { Icon } from '../../src/components/icons';
import { LoadingState } from '../../src/components/loading';
import { tokens as t } from '../../src/design/tokens';
import { supabase, requireSupabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
import { fetchFriendships, relationWith } from '../../src/features/social/friends';
import { fetchThread, markConversationRead, sendMessage, type ChatMessage } from '../../src/features/social/messages';
import { buildThread, canMessageWith, normalizeMessageBody, MESSAGE_MAX } from '../../src/domain/messages.mjs';

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading } = useAuth();
  const userId = session?.user.id;
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState('');

  const profile = useQuery({
    queryKey: ['public-profile', userId, id],
    enabled: !!supabase && !!id,
    queryFn: async () => {
      const { data, error } = await requireSupabase().from('profiles').select('id,username,display_name,avatar_url').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const friendships = useQuery({
    queryKey: ['friendships', userId],
    enabled: !!supabase && !!userId,
    queryFn: () => fetchFriendships(userId!),
  });
  const relation = userId && id && friendships.data ? relationWith(friendships.data, userId, id) : null;
  const allowed = !!relation && canMessageWith(relation.kind);

  const thread = useQuery({
    queryKey: ['conversation', userId, id],
    enabled: !!supabase && !!userId && !!id && allowed,
    queryFn: () => fetchThread(userId!, id!),
  });
  const unavailable = thread.data === null;

  useEffect(() => {
    if (userId && id && thread.data && thread.data.length) void markConversationRead(userId, id);
  }, [userId, id, thread.data]);

  async function send() {
    const body = normalizeMessageBody(draft);
    if (!body || !userId || !id) return;
    const optimistic: ChatMessage = { id: `local-${Date.now()}`, sender_id: userId, recipient_id: id, body, created_at: new Date().toISOString(), read_at: null };
    setPending((list) => [...list, optimistic]);
    setDraft('');
    try {
      const result = await sendMessage(userId, id, body);
      if (result === 'ok') {
        setPending((list) => list.filter((m) => m.id !== optimistic.id));
        await thread.refetch();
      } else {
        setPending((list) => list.filter((m) => m.id !== optimistic.id));
        setDraft(body);
        setFeedback(
          result === 'unavailable'
            ? 'As mensagens estão em atualização no banco de dados. Quando a atualização em revisão for aplicada, vocês poderão conversar aqui.'
            : 'O banco recusou o envio: a amizade entre vocês não está ativa. Confira em Amizades.',
        );
      }
    } catch {
      setPending((list) => list.filter((m) => m.id !== optimistic.id));
      setDraft(body);
      setFeedback('Não foi possível enviar. Tente novamente.');
    }
  }

  const rows = [...(thread.data || []), ...pending];
  const messages = buildThread(rows, userId || '');
  const name = profile.data?.display_name || profile.data?.username || 'esta pessoa';

  return (
    <Screen>
      <Text style={styles.eyebrow}>CONVERSA</Text>
      <Text style={styles.title}>{name}</Text>
      <Link href="/messages" style={styles.link}>← Conversas</Link>
      {!supabase ? (
        <Text style={styles.body}>As mensagens ficam disponíveis quando a conexão com o ORBIT for configurada.</Text>
      ) : loading || !userId ? (
        <LoadingState kind="feed" />
      ) : friendships.isPending ? (
        <LoadingState kind="feed" />
      ) : !allowed ? (
        <Text style={styles.body}>Só amigos podem trocar mensagens. Quando você segue uma pessoa e ela segue de volta, vocês viram amigos e a conversa libera aqui.</Text>
      ) : unavailable ? (
        <Text style={styles.body}>As mensagens estão em atualização no banco de dados. Quando a atualização em revisão for aplicada, você e {name} poderão conversar aqui. Nenhuma conversa foi criada ainda.</Text>
      ) : (
        <>
          {thread.isPending ? (
            <LoadingState kind="feed" />
          ) : thread.isError ? (
            <>
              <Text style={styles.error}>Não foi possível carregar a conversa.</Text>
              <Button label="Tentar novamente" onPress={() => { void thread.refetch(); }} />
            </>
          ) : (
            <View style={chat.thread} accessibilityLabel={`Conversa com ${name}`}>
              {!messages.length && <Text style={styles.body}>Nenhuma mensagem ainda. Diga oi para {name}.</Text>}
              {messages.map((m) => (
                <View key={m.id} style={[chat.bubble, m.mine ? chat.mine : chat.theirs]}>
                  <Text style={m.mine ? chat.mineText : chat.theirsText}>{m.body}</Text>
                </View>
              ))}
            </View>
          )}
          {/* Composer estilo iMessage (pedido do Marco em 22/11/2026): caixa
           * de texto com o botão redondo de avião de papel ao lado. */}
          <View style={chat.composer}>
            <TextInput
              style={[styles.input, chat.composerInput]}
              value={draft}
              onChangeText={setDraft}
              placeholder={`Mensagem para ${name}`}
              placeholderTextColor={t.colors.muted}
              multiline
              maxLength={MESSAGE_MAX}
              accessibilityLabel={`Escrever mensagem para ${name}`}
            />
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
              accessibilityState={{ disabled: !normalizeMessageBody(draft) }}
              disabled={!normalizeMessageBody(draft)}
              onPress={() => { void send(); }}
              style={[chat.sendButton, !normalizeMessageBody(draft) && { opacity: 0.45 }]}
            >
              <Icon name="send" size={18} color={t.colors.onDark} />
            </MotionPressable>
          </View>
          {!!feedback && <Text accessibilityRole="alert" style={styles.error}>{feedback}</Text>}
        </>
      )}
    </Screen>
  );
}

const chat = StyleSheet.create({
  thread: { gap: 10 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  composerInput: { flex: 1 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '85%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', backgroundColor: t.colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: t.colors.surface, borderBottomLeftRadius: 4 },
  mineText: { color: t.colors.onDark, fontSize: 15, lineHeight: 21 },
  theirsText: { color: t.colors.text, fontSize: 15, lineHeight: 21 },
});
