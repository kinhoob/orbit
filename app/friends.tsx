import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Screen, styles } from '../src/components/ui';
import { useAuth } from '../src/features/auth/provider';
import { supabase } from '../src/lib/supabase';
import { tokens as t, font} from '../src/design/tokens';
import {
  deleteFriendship,
  fetchFriendships,
  fetchProfilesByIds,
  relationWith,
  respondToRequest,
  searchProfiles,
  sendRequest,
  type Friendship,
  type ProfileSummary,
  type Relation,
} from '../src/features/social/friends';

function PersonRow({ profile, children }: React.PropsWithChildren<{ profile: ProfileSummary }>) {
  return (
    <View style={social.row}>
      <View style={social.avatar} accessibilityLabel={`Avatar de ${profile.display_name || profile.username || 'usuário'}`}>
        <Text style={social.avatarText}>{(profile.display_name || profile.username || '?').trim().charAt(0).toUpperCase()}</Text>
      </View>
      <View style={social.rowText}>
        <Link href={{ pathname: '/people/[id]', params: { id: profile.id } }} style={social.name}>{profile.display_name || 'Sem nome'} →</Link>
        {!!profile.username && <Text style={social.username}>@{profile.username}</Text>}
      </View>
      <View style={social.rowActions}>{children}</View>
    </View>
  );
}

export default function Friends() {
  const { session, loading } = useAuth();
  const userId = session?.user.id;
  const cache = useQueryClient();
  const params = useLocalSearchParams<{ search?: string }>();
  const [term, setTerm] = useState(typeof params.search === 'string' ? params.search : '');
  const [message, setMessage] = useState('');

  const friendships = useQuery({
    queryKey: ['friendships', userId],
    enabled: !!supabase && !!userId,
    queryFn: () => fetchFriendships(userId!),
  });
  const otherIds = (friendships.data || []).map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id));
  const known = useQuery({
    queryKey: ['friend-profiles', userId, otherIds.join(',')],
    enabled: !!supabase && !!userId && friendships.isSuccess,
    queryFn: () => fetchProfilesByIds(otherIds),
  });
  const results = useQuery({
    queryKey: ['profile-search', userId, term],
    enabled: !!supabase && !!userId && !!term.trim(),
    queryFn: () => searchProfiles(term, userId!),
  });

  async function refresh() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['friendships', userId] }),
      cache.invalidateQueries({ queryKey: ['friend-profiles', userId] }),
    ]);
  }
  const act = useMutation({
    mutationFn: async (op: { type: 'send'; otherId: string } | { type: 'respond'; id: string; accept: boolean } | { type: 'delete'; id: string }) => {
      if (op.type === 'send') await sendRequest(userId!, op.otherId);
      else if (op.type === 'respond') await respondToRequest(op.id, op.accept, userId!);
      else await deleteFriendship(op.id, userId!);
    },
    onSuccess: async (_data, op) => {
      await refresh();
      setMessage(
        op.type === 'send'
          ? 'Solicitação de amizade enviada.'
          : op.type === 'respond'
            ? op.accept
              ? 'Solicitação aceita. Vocês são amigos agora.'
              : 'Solicitação recusada.'
            : 'Solicitação ou amizade removida.',
      );
    },
    onError: (error) => {
      setMessage(error instanceof Error && error.message === 'duplicate' ? 'Já existe uma solicitação entre vocês.' : 'Não foi possível concluir. Tente novamente.');
    },
  });
  const busy = act.isPending || !friendships.isSuccess || !known.isSuccess;

  function relationFor(otherId: string): Relation {
    return relationWith(friendships.data || [], userId!, otherId);
  }
  function ActionButtons({ otherId }: { otherId: string }) {
    const relation = relationFor(otherId);
    if (relation.kind === 'rejected') {
      return <Button label="Limpar solicitação recusada" disabled={busy} onPress={() => act.mutate({ type: 'delete', id: relation.friendship.id })} />;
    }
    if (relation.kind === 'friends') {
      return <Button label="Remover" disabled={busy} onPress={() => act.mutate({ type: 'delete', id: relation.friendship.id })} />;
    }
    if (relation.kind === 'outgoing') {
      return <Button label="Cancelar solicitação" disabled={busy} onPress={() => act.mutate({ type: 'delete', id: relation.friendship.id })} />;
    }
    if (relation.kind === 'incoming') {
      return (
        <View style={social.actions}>
          <Button label="Aceitar" disabled={busy} onPress={() => act.mutate({ type: 'respond', id: relation.friendship.id, accept: true })} />
          <Button label="Recusar" disabled={busy} onPress={() => act.mutate({ type: 'respond', id: relation.friendship.id, accept: false })} />
        </View>
      );
    }
    return <Button label="Adicionar" disabled={busy} onPress={() => act.mutate({ type: 'send', otherId })} />;
  }

  const byId = new Map((known.data || []).map((p) => [p.id, p]));
  const rowsOf = (list: Friendship[]) =>
    list.map((f) => {
      const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      const profile = byId.get(otherId) || { id: otherId, username: null, display_name: 'Perfil indisponível', avatar_url: null };
      return { friendship: f, profile };
    });
  const incoming = (friendships.data || []).filter((f) => f.status === 'pending' && f.addressee_id === userId);
  const outgoing = (friendships.data || []).filter((f) => f.status === 'pending' && f.requester_id === userId);
  const friends = (friendships.data || []).filter((f) => f.status === 'accepted');

  return (
    <Screen>
      <Text style={styles.eyebrow}>AMIZADES</Text>
      <Text style={styles.title}>Pessoas na sua órbita.</Text>
      <Link href="/(tabs)/profile" style={styles.link}>
        ← Perfil
      </Link>
      {!supabase ? (
        <Text style={styles.body}>As amizades ficam disponíveis quando a conexão com o ORBIT for configurada.</Text>
      ) : loading ? (
        <Text style={styles.body}>Carregando sessão…</Text>
      ) : !session ? (
        <>
          <Text style={styles.body}>Entre para buscar pessoas e construir sua rede de amizades. Sem seguidores: amizade aqui é sempre mútua.</Text>
          <Link href="/auth" style={styles.link}>
            Entrar ou criar conta →
          </Link>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={[styles.title, { fontSize: 25, lineHeight: 30 }]}>Buscar pessoas</Text>
            <TextInput
              style={styles.input}
              accessibilityLabel="Buscar por nome ou username"
              placeholder="Nome ou username…"
              autoCapitalize="none"
              value={term}
              onChangeText={setTerm}
              maxLength={80}
              editable={!busy}
            />
            {!!term.trim() &&
              (results.isPending ? (
                <Text style={styles.body}>Buscando…</Text>
              ) : results.isError ? (
                <>
                  <Text style={styles.error}>Não foi possível buscar agora.</Text>
                  <Button label="Tentar novamente" onPress={() => void results.refetch()} />
                </>
              ) : (results.data || []).length === 0 ? (
                <Text style={styles.body}>Nenhuma pessoa encontrada com esse termo.</Text>
              ) : (
                (results.data || []).map((profile) => (
                  <PersonRow key={profile.id} profile={profile}>
                    <ActionButtons otherId={profile.id} />
                  </PersonRow>
                ))
              ))}
          </View>
          {known.isError && <View style={styles.card}><Text style={styles.error}>Não foi possível carregar os perfis.</Text><Button label="Tentar carregar perfis" onPress={() => void known.refetch()} /></View>}
          {friendships.isPending ? (
            <Text style={styles.body}>Carregando suas amizades…</Text>
          ) : friendships.isError ? (
            <View style={styles.card}>
              <Text style={styles.error}>Não foi possível carregar suas amizades.</Text>
              <Button label="Tentar novamente" onPress={() => void friendships.refetch()} />
            </View>
          ) : (
            <>
              {incoming.length > 0 && (
                <View style={styles.card}>
                  <Text style={[styles.title, { fontSize: 25, lineHeight: 30 }]}>Solicitações recebidas</Text>
                  {rowsOf(incoming).map(({ friendship, profile }) => (
                    <PersonRow key={friendship.id} profile={profile}>
                      <View style={social.actions}>
                        <Button label="Aceitar" disabled={busy} onPress={() => act.mutate({ type: 'respond', id: friendship.id, accept: true })} />
                        <Button label="Recusar" disabled={busy} onPress={() => act.mutate({ type: 'respond', id: friendship.id, accept: false })} />
                      </View>
                    </PersonRow>
                  ))}
                </View>
              )}
              <View style={styles.card}>
                <Text style={[styles.title, { fontSize: 25, lineHeight: 30 }]}>Seus amigos</Text>
                {friends.length === 0 ? (
                  <Text style={styles.body}>Você ainda não tem amizades. Busque pessoas acima para começar.</Text>
                ) : (
                  rowsOf(friends).map(({ friendship, profile }) => (
                    <PersonRow key={friendship.id} profile={profile}>
                      <Button label="Remover" disabled={busy} onPress={() => act.mutate({ type: 'delete', id: friendship.id })} />
                    </PersonRow>
                  ))
                )}
              </View>
              {outgoing.length > 0 && (
                <View style={styles.card}>
                  <Text style={[styles.title, { fontSize: 25, lineHeight: 30 }]}>Solicitações enviadas</Text>
                  {rowsOf(outgoing).map(({ friendship, profile }) => (
                    <PersonRow key={friendship.id} profile={profile}>
                      <Button label="Cancelar" disabled={busy} onPress={() => act.mutate({ type: 'delete', id: friendship.id })} />
                    </PersonRow>
                  ))}
                </View>
              )}
            </>
          )}
        </>
      )}
      {!!message && (
        <Text accessibilityRole="alert" style={styles.body}>
          {message}
        </Text>
      )}
    </Screen>
  );
}

const social = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    flexWrap: 'wrap',
  },
  rowText: { flex: 1, minWidth: 140 },
  rowActions: { flexDirection: 'row', gap: t.spacing.xs },
  actions: { flexDirection: 'row', gap: t.spacing.xs },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: font.bold, color: t.colors.primary },
  name: { fontSize: 16, fontFamily: font.semibold, color: t.colors.text },
  username: { fontSize: 14, color: t.colors.muted },
});

