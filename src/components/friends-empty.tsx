import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/provider';
import { fetchFriendships, sendRequest, suggestProfiles, type ProfileSummary } from '../features/social/friends';
import { pickSuggestions } from '../domain/friends-suggestions.mjs';
import { CardEntrance, MotionPressable } from './motion';
import { Icon } from './icons';
import { font, tokens as t } from '../design/tokens';

function SuggestionRow({ profile, index, sent, onAdd }: { profile: ProfileSummary; index: number; sent: boolean; onAdd: (id: string) => void }) {
  const name = profile.display_name || profile.username || 'Sem nome';
  return (
    <CardEntrance index={index} style={styles.row}>
      <View style={styles.avatar} accessibilityLabel={`Avatar de ${name}`}>
        <Text style={styles.avatarText}>{name.trim().charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.rowText}>
        <Link href={{ pathname: '/people/[id]', params: { id: profile.id } }} style={styles.name}>{name}</Link>
        {!!profile.username && <Text style={styles.username}>@{profile.username}</Text>}
      </View>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={sent ? `Pedido de amizade enviado para ${name}` : `Adicionar ${name} como amigo`}
        disabled={sent}
        onPress={() => onAdd(profile.id)}
        style={[styles.addButton, sent && styles.addButtonSent]}
      >
        <Text style={[styles.addText, sent && styles.addTextSent]}>{sent ? 'Pedido enviado' : 'Adicionar'}</Text>
      </MotionPressable>
    </CardEntrance>
  );
}

// Estado vazio da timeline de amigos (pedido do Marco em 21/11/2026): cartão
// de boas-vindas e sugestões de contas reais para adicionar. O pedido de
// amizade é de verdade (tabela friendships); nada aqui inventa contas, posts
// ou compatibilidade.
export function FriendsEmptyState() {
  const { session } = useAuth();
  const userId = session?.user.id || '';
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const friendshipsQuery = useQuery({ queryKey: ['friendships', userId], queryFn: () => fetchFriendships(userId), enabled: !!userId });
  const suggestQuery = useQuery({ queryKey: ['suggested-accounts', userId], queryFn: () => suggestProfiles(userId), enabled: !!userId });
  const suggestions = useMemo(
    () => pickSuggestions(suggestQuery.data || [], friendshipsQuery.data || [], userId) as ProfileSummary[],
    [suggestQuery.data, friendshipsQuery.data, userId],
  );
  const add = async (otherId: string) => {
    setError('');
    try {
      await sendRequest(userId, otherId);
      setSent(current => ({ ...current, [otherId]: true }));
    } catch (cause) {
      if ((cause as Error).message === 'duplicate') setSent(current => ({ ...current, [otherId]: true }));
      else setError('Não foi possível enviar o pedido agora. Tente de novo.');
    }
  };
  return (
    <View style={styles.wrap}>
      <CardEntrance index={0} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="user" size={26} color={t.colors.dark} />
        </View>
        <Text style={styles.title}>Sua timeline de amigos começa aqui.</Text>
        <Text style={styles.body}>Quando você adicionar amigos e eles avaliarem obras, as avaliações aparecem aqui, das mais recentes. Nada é inventado: sem amigos, sem posts por enquanto.</Text>
      </CardEntrance>
      {suggestQuery.isPending ? (
        <Text style={styles.body}>Buscando sugestões de contas…</Text>
      ) : suggestQuery.isError ? (
        <Text style={styles.body}>Não foi possível buscar sugestões de contas agora.</Text>
      ) : suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          <Text style={styles.section}>Sugestões de contas para você</Text>
          {suggestions.map((profile, index) => (
            <SuggestionRow key={profile.id} profile={profile} index={index + 1} sent={!!sent[profile.id]} onAdd={add} />
          ))}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        </View>
      ) : (
        <Text style={styles.body}>Ainda não há outras contas para sugerir. Quando mais pessoas chegarem, as sugestões aparecem aqui.</Text>
      )}
      <Link href="/friends" style={styles.friendsLink}>Ver pedidos de amizade e buscar pessoas</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18, paddingVertical: 8 },
  hero: { padding: 22, borderRadius: t.radius, backgroundColor: t.colors.surface, gap: 12, alignItems: 'center', boxShadow: '0 4px 16px rgba(23,20,15,0.06)', elevation: 1 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: t.colors.gold, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: font.extrabold, letterSpacing: -0.4, color: t.colors.text, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, fontFamily: font.regular, color: t.colors.muted, textAlign: 'center' },
  suggestions: { gap: 10 },
  section: { fontSize: 13, fontFamily: font.semibold, color: t.colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: t.colors.surface, boxShadow: '0 4px 16px rgba(23,20,15,0.06)', elevation: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: t.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontFamily: font.extrabold, color: t.colors.text },
  rowText: { flex: 1, gap: 1 },
  name: { fontSize: 15, fontFamily: font.semibold, color: t.colors.text },
  username: { fontSize: 13, fontFamily: font.regular, color: t.colors.muted },
  addButton: { backgroundColor: t.colors.accentStrong, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  addButtonSent: { backgroundColor: t.colors.secondary },
  addText: { fontSize: 13, fontFamily: font.semibold, color: t.colors.surface },
  addTextSent: { color: t.colors.muted },
  error: { fontSize: 14, lineHeight: 21, fontFamily: font.regular, color: t.colors.error },
  friendsLink: { fontSize: 14, fontFamily: font.semibold, color: t.colors.text, textAlign: 'center', paddingVertical: 6 },
});
