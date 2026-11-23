import React, { useEffect, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Button, Screen, styles } from '../../src/components/ui';
import { MotionPressable } from '../../src/components/motion';
import { Icon } from '../../src/components/icons';
import { ChatBubble, ChatMenu, PanelReveal, ProfilePreviewCard, TypingBubble, type MessageState } from '../../src/components/chat-actions';
import { GifPicker } from '../../src/components/gif-picker';
import { LoadingState } from '../../src/components/loading';
import { tokens as t, font } from '../../src/design/tokens';
import { supabase, requireSupabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';
import { fetchFriendships, relationWith } from '../../src/features/social/friends';
import { fetchThread, markConversationDelivered, markConversationRead, sendMessage, type ChatMessage } from '../../src/features/social/messages';
import { fetchMutedConversations, setConversationMuted } from '../../src/features/social/mute';
import { playChatPop } from '../../src/features/social/chat-sound';
import { type Gif } from '../../src/features/social/giphy';
import { buildThread, canMessageWith, normalizeMessageBody, MESSAGE_MAX } from '../../src/domain/messages.mjs';
import { buildGifBody } from '../../src/domain/gif.mjs';
import { typingChannelName, shouldEmitTyping, TYPING_VISIBLE_MS } from '../../src/domain/typing.mjs';

// Emojis mais usados, fixos no app — sem dados externos.
const EMOJIS = ['😀', '😂', '🥰', '😍', '🤔', '😅', '😭', '😴', '🤝', '👏', '👍', '🙏', '❤️', '🔥', '✨', '🎉', '🎬', '🎵', '📚', '🎮', '⚽', '🍕', '☕', '💯'];

function messageState(m: ChatMessage, mine: boolean, pending: boolean): MessageState {
  if (pending) return 'sending';
  if (mine) {
    if (m.read_at) return 'read';
    if (m.delivered_at) return 'delivered';
    return 'sent';
  }
  return 'sent';
}

function messageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading } = useAuth();
  const userId = session?.user.id;
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState('');
  const [muted, setMuted] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const threadScroll = useRef<React.ElementRef<typeof ScrollView> | null>(null);
  const seenIds = useRef<Set<string> | null>(null);
  const animatedIds = useRef<Set<string>>(new Set());
  const mutedRef = useRef(false);
  const appState = useRef(AppState.currentState);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingChannelRef = useRef<import('@supabase/supabase-js').RealtimeChannel | null>(null);
  const typingLastSent = useRef(0);
  const typingHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Entrega e leitura são coisas diferentes (pedido do Marco em 22/11/2026):
  // ENTREGUE vale quando o aparelho recebe a mensagem (busca ou tempo real),
  // mesmo com o app em segundo plano; LIDA só quando o app está em primeiro
  // plano, com a pessoa vendo a conversa. Carregar a lista em segundo plano
  // nunca marca leitura.
  function confirmReceiptAndRead() {
    if (!userId || !id) return;
    void markConversationDelivered(userId, id);
    if (appState.current === 'active') void markConversationRead(userId, id);
  }

  useEffect(() => {
    if (userId && id && thread.data && thread.data.length) confirmReceiptAndRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, id, thread.data]);

  // Voltou ao primeiro plano com a conversa aberta: aí sim marca como lida.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const was = appState.current;
      appState.current = next;
      if (next === 'active' && was !== 'active' && userId && id && thread.data?.length) {
        void markConversationRead(userId, id);
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, id, thread.data]);

  const isMutedNow = !!id && muted.includes(id);
  mutedRef.current = isMutedNow;

  // Tempo real (migration de entrega em revisão): chegada de mensagem da outra
  // pessoa anima a bolha e toca o som (respeitando silenciar) e confirma a
  // ENTREGA no banco — é isso que vira "entregue" no aparelho de quem enviou.
  // Atualizações das minhas mensagens viram os tiques de entregue/lida.
  useEffect(() => {
    if (!supabase || !userId || !id || !allowed || unavailable) return;
    const client = requireSupabase();
    const channel = client
      .channel(`conversation:${userId}:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, (payload) => {
        const row = payload.new as ChatMessage;
        if (row.sender_id !== id) return;
        animatedIds.current.add(row.id);
        setOtherTyping(false);
        if (!mutedRef.current) playChatPop('receive');
        void markConversationDelivered(userId, id);
        void thread.refetch();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, () => {
        void thread.refetch();
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
    // thread.refetch é estável o suficiente para este efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId, id, allowed, unavailable]);

  // "Digitando" (pedido do Marco em 23/11/2026): presença REAL por broadcast
  // no canal simétrico da conversa — sem tabela, sem migration. O indicador
  // só aparece quando o aparelho da outra pessoa avisa; some sozinho após
  // TYPING_VISIBLE_MS sem novo aviso. Nada aqui simula evento dela.
  useEffect(() => {
    if (!supabase || !userId || !id || !allowed || unavailable) return;
    const client = requireSupabase();
    const channel = client.channel(typingChannelName(userId, id));
    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const p = (payload as { payload?: { userId?: string; typing?: boolean } }).payload || {};
        if (p.userId === userId) return; // garantia contra eco
        if (p.typing) {
          setOtherTyping(true);
          if (typingHideTimer.current) clearTimeout(typingHideTimer.current);
          typingHideTimer.current = setTimeout(() => setOtherTyping(false), TYPING_VISIBLE_MS);
        } else {
          setOtherTyping(false);
        }
      })
      .subscribe();
    typingChannelRef.current = channel;
    return () => {
      typingChannelRef.current = null;
      if (typingHideTimer.current) clearTimeout(typingHideTimer.current);
      void client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId, id, allowed, unavailable]);

  function emitTyping(typing: boolean) {
    const channel = typingChannelRef.current;
    if (!channel || !userId) return;
    void channel.send({ type: 'broadcast', event: 'typing', payload: { userId, typing } });
  }

  // Avisa a outra pessoa quando começo a digitar e, no máximo 1x a cada
  // intervalo, enquanto continuo; rascunho esvaziado avisa que parei.
  function changeDraft(next: string) {
    const now = Date.now();
    if (shouldEmitTyping(draft, next, typingLastSent.current, now)) {
      typingLastSent.current = now;
      emitTyping(true);
    } else if (draft.trim() && !next.trim()) {
      emitTyping(false);
    }
    setDraft(next);
  }

  async function sendBody(body: string, restoreDraft: boolean) {
    if (!userId || !id) return;
    const optimistic: ChatMessage = { id: `local-${Date.now()}`, sender_id: userId, recipient_id: id, body, created_at: new Date().toISOString(), read_at: null, delivered_at: null };
    animatedIds.current.add(optimistic.id);
    setPending((list) => [...list, optimistic]);
    try {
      const result = await sendMessage(userId, id, body);
      if (result === 'ok') {
        if (!mutedRef.current) playChatPop('send');
        setPending((list) => list.filter((m) => m.id !== optimistic.id));
        await thread.refetch();
      } else {
        setPending((list) => list.filter((m) => m.id !== optimistic.id));
        if (restoreDraft) setDraft(body);
        setFeedback(
          result === 'unavailable'
            ? 'As mensagens estão em atualização no banco de dados. Quando a atualização em revisão for aplicada, vocês poderão conversar aqui.'
            : 'O banco recusou o envio: a amizade entre vocês não está ativa. Confira em Amizades.',
        );
      }
    } catch {
      setPending((list) => list.filter((m) => m.id !== optimistic.id));
      if (restoreDraft) setDraft(body);
      setFeedback('Não foi possível enviar. Tente novamente.');
    }
  }

  async function send() {
    const body = normalizeMessageBody(draft);
    if (!body) return;
    setDraft('');
    emitTyping(false);
    await sendBody(body, true);
  }

  // GIF escolhido no seletor: vira uma mensagem com marcador (sem mudança de
  // banco) e entra no mesmo fluxo de envio do texto — otimista, som e tiques.
  async function sendGif(gif: Gif) {
    const body = buildGifBody(gif.url);
    if (!body) return;
    setGifOpen(false);
    setFeedback('');
    await sendBody(body, false);
  }

  async function toggleMute() {
    if (!userId || !id) return;
    const next = await setConversationMuted(userId, id);
    setMuted(next);
  }

  const rows = [...(thread.data || []), ...pending];
  const messages = buildThread(rows, userId || '');
  const name = profile.data?.display_name || profile.data?.username || 'esta pessoa';

  // Marca quais mensagens já estavam na tela: só as NOVAS (enviadas ou
  // recebidas depois) entram com animação — a primeira carga fica parada.
  const pendingIds = new Set(pending.map((m) => m.id));
  if (thread.data && seenIds.current === null) {
    seenIds.current = new Set(thread.data.map((m) => m.id));
  }

  if (!supabase || loading || !userId || friendships.isPending || !allowed) {
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
        ) : (
          <>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.body}>Só amigos podem trocar mensagens. Quando você segue uma pessoa e ela segue de volta, vocês viram amigos e a conversa libera aqui.</Text>
          </>
        )}
      </Screen>
    );
  }

  // Layout de chat (pedido do Marco em 22/11/2026): a barra de mensagem fica
  // FIXA embaixo, junto com o botão de enviar, e a conversa rola acima dela.
  // Mantém o painel creme do app e a safe area no rodapé.
  return (
    <View style={[chat.root, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.headerSpacer} />
      <View style={styles.panel}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={chat.inner}>
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
                Silenciar esconde a contagem de não lidas desta conversa na sua lista e não toca o som dela aqui. O ORBIT ainda não tem notificações push, então não há notificação para silenciar.
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
                  <ScrollView
                    ref={threadScroll}
                    style={chat.threadScroll}
                    contentContainerStyle={chat.thread}
                    accessibilityLabel={`Conversa com ${name}`}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => threadScroll.current?.scrollToEnd({ animated: true })}
                  >
                    {!messages.length && <Text style={styles.body}>Nenhuma mensagem ainda. Diga oi para {name}.</Text>}
                    {messages.map((m) => (
                      <ChatBubble
                        key={m.id}
                        mine={m.mine}
                        body={m.body}
                        time={messageTime(m.created_at)}
                        state={messageState(m, m.mine, pendingIds.has(m.id))}
                        animate={animatedIds.current.has(m.id) || (seenIds.current ? !seenIds.current.has(m.id) : false)}
                      />
                    ))}
                    {otherTyping && <TypingBubble label={`${name} está digitando`} />}
                  </ScrollView>
                )}
                {gifOpen && (
                  <PanelReveal>
                    <GifPicker onPick={(gif) => { void sendGif(gif); }} />
                  </PanelReveal>
                )}
                {emojiOpen && (
                  <PanelReveal>
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
                  </PanelReveal>
                )}
                {!!feedback && <Text accessibilityRole="alert" style={styles.error}>{feedback}</Text>}
                {/* Composer fixo embaixo (pedido do Marco em 22/11/2026):
                 * GIF e emoji ao lado da caixa, avião de papel para enviar. */}
                <View style={[chat.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
                    onChangeText={changeDraft}
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
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const chat = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.colors.dark },
  inner: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, paddingTop: 30, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, zIndex: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: t.colors.border },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: t.colors.onDark, fontSize: 17, fontFamily: font.bold },
  headerName: { fontSize: 17, fontFamily: font.semibold, color: t.colors.text },
  mutedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  mutedText: { fontSize: 12, color: t.colors.muted, fontFamily: font.regular },
  threadScroll: { flex: 1 },
  thread: { gap: 8, paddingVertical: 8 },
  // Composer (revisão visual 23/11/2026): filete separador acima, campo mais
  // arredondado e chip GIF/emoji discretos — a conversa fica com o palco.
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.colors.border },
  composerInput: { flex: 1, minWidth: 0, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14 },
  gifButton: { height: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' },
  gifText: { fontSize: 13, fontFamily: font.bold, color: t.colors.muted, letterSpacing: 0.5 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  emojiPanel: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  emojiItem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
