import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Screen, styles } from '../../src/components/ui';
import { MotionPressable } from '../../src/components/motion';
import { Icon } from '../../src/components/icons';
import { ChatMenu, ProfilePreviewCard } from '../../src/components/chat-actions';
import { LoadingState } from '../../src/components/loading';
import { tokens as t, font } from '../../src/design/tokens';
import { supabase, requireSupabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
import { fetchFriendships, relationWith } from '../../src/features/social/friends';
import { fetchThread, markConversationRead, sendMessage, type ChatMessage } from '../../src/features/social/messages';
import { fetchMutedConversations, setConversationMuted } from '../../src/features/social/mute';
import { buildThread, canMessageWith, normalizeMessageBody, MESSAGE_MAX } from '../../src/domain/messages.mjs';

// Emojis mais usados, fixos no app — sem dados externos.
const EMOJIS = ['😀', '😂', '🥰', '😍', '🤔', '😅', '😭', '😴', '🤝', '👏', '👍', '🙏', '❤️', '🔥', '✨', '🎉', '🎬', '🎵', '📚', '🎮', '⚽', '🍕', '☕', '💯'];

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading } = useAuth();
  const userId = session?.user.id;
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState('');
  const [muted, setMuted] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);

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
    if (userId) void fetchMutedConversations(userId).then(setMuted);
  }, [userId]);

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

  async function toggleMute() {
    if (!userId || !id) return;
    const next = await setConversationMuted(userId, id);
    setMuted(next);
  }

  const rows = [...(thread.data || []), ...pending];
  const messages = buildThread(rows, userId || '');
  const name = profile.data?.display_name || profile.data?.username || 'esta pessoa';
  const isMutedNow = !!id && muted.includes(id);

  return (
    <Screen>
      {!supabase ? (
        <>
          <Text style={styles.title}>Conversa</Text>
          <Text style={styles.body}>As mensagens ficam disponíveis quando a conexão com o ORBIT for configurada.</Text>
        </>
      ) : loading || !userId || friendships.isPending ? (
        <>
          <Text style={styles.title}>Conversa</Text>
          <LoadingState kind="feed" />
        </>
      ) : !allowed ? (
        <>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.body}>Só amigos podem trocar mensagens. Quando você segue uma pessoa e ela segue de volta, vocês viram amigos e a conversa libera aqui.</Text>
        </>
      ) : (
        <>
          {/* Cabeçalho estilo a referência do Marco (22/11/2026): avatar e
           * nome à esquerda, três pontinhos à direita — sem vídeo e sem
           * ligação. Os três pontinhos abrem prévia do perfil e silenciar. */}
          <View style={chat.header}>
            <View style={chat.headerIdentity}>
              <View style={chat.avatar}>
                <Text style={chat.avatarText}>{name.trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={chat.headerName} numberOfLines={1}>{name}</Text>
                {isMutedNow && (
                  <View style={chat.mutedRow}>
                    <Icon name="bell-off" size={12} color={t.colors.muted} />
                    <Text style={chat.mutedText}>Silenciada</Text>
                  </View>
                )}
              </View>
            </View>
            <ChatMenu muted={isMutedNow} onPreview={() => setPreview((v) => !v)} onToggleMute={() => { void toggleMute(); }} />
          </View>
          <Link href="/messages" style={styles.link}>← Conversas</Link>
          {preview && (
            <ProfilePreviewCard
              name={name}
              username={profile.data?.username}
              onOpen={() => { setPreview(false); router.push(`/people/${id}` as never); }}
            />
          )}
          {isMutedNow && (
            <Text style={styles.body}>
              Silenciar fica só neste aparelho: a contagem de não lidas desta conversa some da sua lista. O ORBIT ainda não tem notificações push — quando chegarem, esta preferência passa a valer para elas.
            </Text>
          )}
          {unavailable ? (
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
              {/* Composer (pedido do Marco em 22/11/2026): apenas GIF e emoji
               * ao lado da caixa, com o avião de papel para enviar. */}
              <View style={chat.composer}>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel="GIFs"
                  accessibilityState={{ expanded: gifOpen }}
                  onPress={() => { setGifOpen((v) => !v); setEmojiOpen(false); }}
                  style={chat.gifButton}
                >
                  <Text style={chat.gifText}>GIF</Text>
                </MotionPressable>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel="Emojis"
                  accessibilityState={{ expanded: emojiOpen }}
                  onPress={() => { setEmojiOpen((v) => !v); setGifOpen(false); }}
                  style={chat.iconButton}
                >
                  <Icon name="smile" size={22} color={t.colors.muted} />
                </MotionPressable>
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
              {gifOpen && (
                <View style={[styles.card, { gap: 6 }]}>
                  <Text style={chat.gifText}>GIFs</Text>
                  <Text style={styles.body}>
                    A busca de GIFs precisa de um provedor de imagens (GIPHY, Tenor ou similar) com chave de API, que o ORBIT ainda não tem. Quando a chave for configurada, a busca aparece aqui. O envio de texto e emojis já funciona normalmente.
                  </Text>
                </View>
              )}
              {emojiOpen && (
                <View style={chat.emojiPanel} accessibilityLabel="Emojis">
                  {EMOJIS.map((emoji) => (
                    <MotionPressable
                      key={emoji}
                      accessibilityRole="button"
                      accessibilityLabel={`Inserir ${emoji}`}
                      onPress={() => setDraft((d) => d + emoji)}
                      style={chat.emojiItem}
                    >
                      <Text style={{ fontSize: 22 }}>{emoji}</Text>
                    </MotionPressable>
                  ))}
                </View>
              )}
              {!!feedback && <Text accessibilityRole="alert" style={styles.error}>{feedback}</Text>}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const chat = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, zIndex: 20 },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: t.colors.onDark, fontSize: 17, fontFamily: font.bold },
  headerName: { fontSize: 17, fontFamily: font.semibold, color: t.colors.text },
  mutedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  mutedText: { fontSize: 12, color: t.colors.muted, fontFamily: font.regular },
  thread: { gap: 10 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerInput: { flex: 1, minWidth: 0 },
  gifButton: { height: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
  gifText: { fontSize: 13, fontFamily: font.bold, color: t.colors.muted, letterSpacing: 0.5 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  emojiPanel: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  emojiItem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '85%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', backgroundColor: t.colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: t.colors.surface, borderBottomLeftRadius: 4 },
  mineText: { color: t.colors.onDark, fontSize: 15, lineHeight: 21 },
  theirsText: { color: t.colors.text, fontSize: 15, lineHeight: 21 },
});
