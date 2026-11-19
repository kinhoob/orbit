import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Screen, styles } from '../../src/components/ui';
import { categories, type MediaItem } from '../../src/features/catalog/data';
import { useAuth } from '../../src/features/auth/provider';
import { requireSupabase, supabase } from '../../src/lib/supabase';
import { parseScore } from '../../src/domain/rating.mjs';
import { tokens as t } from '../../src/design/tokens';
import { LoadingState } from '../../src/components/loading';
import { Feedback, StatePulse } from '../../src/components/feedback';
import { MotionPressable } from '../../src/components/motion';
import { Icon } from '../../src/components/icons';
import { toggleSavedItem } from '../../src/features/catalog/save-mutation';

const VISIBILITY = [
  { id: 'public', label: 'Pública' },
  { id: 'friends', label: 'Amigos' },
  { id: 'private', label: 'Privada' },
] as const;
type Visibility = (typeof VISIBILITY)[number]['id'];

function CoverArt({ item }: { item: MediaItem }) {
  if (item.cover_url) {
    return (
      <View style={detail.coverFrame}>
        <Image source={{ uri: item.cover_url }} accessibilityLabel={`Capa de ${item.title}`} style={detail.cover} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={[detail.coverFrame, detail.coverFallback]} accessibilityLabel={`Obra sem capa: ${item.title}`}>
      <Text style={detail.coverInitial}>{item.title.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

function VisibilityPicker({ value, onChange, disabled }: { value: Visibility; onChange: (next: Visibility) => void; disabled: boolean }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Visibilidade da avaliação" style={detail.segmented}>
      {VISIBILITY.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
            {...({ 'aria-checked': active } as object)}
            disabled={disabled}
            onPress={() => onChange(option.id)}
            style={[detail.segment, active && detail.segmentActive, disabled && { opacity: 0.5 }]}
          >
            <Text style={[detail.segmentText, active && detail.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MediaDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();
  const userId = session?.user.id;
  const cache = useQueryClient();
  const [score, setScore] = useState('');
  const [review, setReview] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const media = useQuery({
    queryKey: ['media', id, userId],
    enabled: !!supabase && !!id,
    queryFn: async () => {
      const { data, error } = await requireSupabase().from('media_items').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as MediaItem | null;
    },
  });
  const state = useQuery({
    queryKey: ['media-state', id, userId],
    enabled: !!userId && !!id,
    queryFn: async () => {
      const client = requireSupabase();
      const [saved, rating] = await Promise.all([
        client.from('saved_items').select('media_item_id').eq('user_id', userId!).eq('media_item_id', id!).maybeSingle(),
        client.from('ratings').select('score,review,visibility').eq('user_id', userId!).eq('media_item_id', id!).maybeSingle(),
      ]);
      if (saved.error) throw saved.error;
      if (rating.error) throw rating.error;
      return { saved: !!saved.data, rating: rating.data };
    },
  });
  useEffect(() => {
    setScore(state.data?.rating ? String(state.data.rating.score) : '');
    setReview(state.data?.rating?.review || '');
    setVisibility((state.data?.rating?.visibility as Visibility) || 'public');
  }, [state.data?.rating?.score, state.data?.rating?.review, state.data?.rating?.visibility, id, userId]);
  useEffect(() => { setMessage(''); }, [id, userId]);
  async function invalidate() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['media-state', id, userId] }),
      cache.invalidateQueries({ queryKey: ['saved', userId] }),
    ]);
  }
  async function toggleSave() {
    if (!userId || !id) return;
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      const saved = await toggleSavedItem(cache, userId, id);
      if (saved !== null) setMessage(saved ? 'Obra salva na sua biblioteca.' : 'Obra removida dos salvos.');
    } catch {
      setFailed(true);
      setMessage('Não foi possível atualizar os salvos. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  async function saveRating() {
    if (!userId || !id) return;
    const parsed = parseScore(score);
    if (parsed === null) {
      setFailed(true);
      setMessage('Informe uma nota de 0 a 10, com no máximo uma casa decimal.');
      return;
    }
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      const { error } = await requireSupabase()
        .from('ratings')
        .upsert({ user_id: userId, media_item_id: id, score: parsed, review: review.trim(), visibility }, { onConflict: 'user_id,media_item_id' });
      if (error) throw error;
      await invalidate();
      await cache.invalidateQueries({ predicate: query => query.queryKey[0] === 'timeline' && query.queryKey[2] === userId });
      setMessage('Sua avaliação foi salva.');
    } catch {
      setFailed(true);
      setMessage('Não foi possível salvar a avaliação. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  const categoryLabel = categories.find((c) => c.id === media.data?.category)?.label || 'Outros';

  return (
    <Screen>
      <Link href="/(tabs)/discover" style={styles.link}>
        ← Descobrir
      </Link>
      {!supabase ? (
        <View style={detail.stateCard}>
          <Text style={styles.eyebrow}>CATÁLOGO</Text>
          <Text style={styles.body}>O catálogo ainda não foi conectado. Assim que a conexão com o ORBIT for configurada, os detalhes das obras aparecem aqui.</Text>
        </View>
      ) : media.isPending ? (
        <LoadingState kind="detail" />
      ) : media.isError ? (
        <View style={detail.stateCard}>
          <Text style={styles.eyebrow}>ERRO</Text>
          <Text style={styles.error}>Não foi possível abrir esta obra. Verifique sua conexão e tente novamente.</Text>
          <Button label="Tentar novamente" onPress={() => void media.refetch()} />
        </View>
      ) : !media.data ? (
        <View style={detail.stateCard}>
          <Text style={styles.eyebrow}>NÃO ENCONTRADA</Text>
          <Text style={styles.body}>Esta obra não foi encontrada. Ela pode ter sido removida do catálogo.</Text>
          <Link href="/(tabs)/discover" style={styles.link}>
            Voltar para Descobrir →
          </Link>
        </View>
      ) : (
        <>
          <View style={detail.hero}>
            <CoverArt item={media.data} />
            <View style={detail.heroText}>
              <View style={detail.metaRow}>
                <Text style={detail.chip}>{categoryLabel.toUpperCase()}</Text>
                {!!media.data.release_year && <Text style={detail.year}>{media.data.release_year}</Text>}
              </View>
              <Text style={styles.title}>{media.data.title}</Text>
              {!!state.data?.rating && (
                <Text style={detail.myScore} accessibilityLabel={`Sua nota atual: ${state.data.rating.score} de 10`}>
                  Sua nota: {state.data.rating.score}/10
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.body}>{media.data.description || 'Esta obra ainda não tem uma descrição.'}</Text>
          {!session ? (
            <Link href="/auth" style={styles.link}>
              Entre para salvar e avaliar →
            </Link>
          ) : state.isPending ? (
            <Text style={styles.body}>Carregando sua avaliação…</Text>
          ) : state.isError ? (
            <View style={detail.stateCard}>
              <Text style={styles.error}>Não foi possível carregar sua biblioteca.</Text>
              <Button label="Tentar novamente" onPress={() => void state.refetch()} />
            </View>
          ) : (
            <>
              <MotionPressable accessibilityRole="button" accessibilityLabel={state.data?.saved ? 'Remover dos salvos' : 'Salvar na biblioteca'} accessibilityState={{ selected: !!state.data?.saved, disabled: busy, busy }} disabled={busy} onPress={() => void toggleSave()} style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center', gap: 10, opacity: busy ? 0.6 : 1 }]}>
                <StatePulse active={!!state.data?.saved}><Icon name="bookmark" size={21} color={state.data?.saved ? t.colors.success : t.colors.text} /></StatePulse>
                <Text style={[styles.buttonOutlineText, state.data?.saved && { color: t.colors.success }]}>{state.data?.saved ? 'Salvo na biblioteca' : 'Salvar na biblioteca'}</Text>
              </MotionPressable>
              <View style={styles.card}>
                <Text style={[styles.title, { fontSize: 25, lineHeight: 30 }]}>Sua avaliação</Text>
                <Text style={styles.body}>Nota de 0 a 10</Text>
                <TextInput
                  style={styles.input}
                  accessibilityLabel="Nota de 0 a 10"
                  keyboardType="decimal-pad"
                  placeholder="Ex.: 8,5"
                  value={score}
                  onChangeText={setScore}
                  maxLength={4}
                  editable={!busy}
                />
                <Text style={styles.body}>O que você achou?</Text>
                <TextInput
                  style={[styles.input, { minHeight: 130, textAlignVertical: 'top' }]}
                  accessibilityLabel="Sua opinião"
                  multiline
                  placeholder="Conte em poucas linhas…"
                  value={review}
                  onChangeText={setReview}
                  maxLength={10000}
                  editable={!busy}
                />
                <Text style={styles.body}>Quem pode ver</Text>
                <VisibilityPicker value={visibility} onChange={setVisibility} disabled={busy} />
                <Button label={busy ? 'Salvando…' : 'Salvar avaliação'} disabled={busy} onPress={() => void saveRating()} />
              </View>
            </>
          )}
        </>
      )}
      <Feedback message={message} error={failed} />
    </Screen>
  );
}

const detail = StyleSheet.create({
  hero: { gap: t.spacing.md },
  heroText: { gap: t.spacing.sm },
  coverFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: t.radius,
    overflow: 'hidden',
    backgroundColor: t.colors.secondary,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  cover: { width: '100%', height: '100%' },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  coverInitial: { fontSize: 64, fontWeight: '700', color: t.colors.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  chip: {
    fontSize: 13,
    letterSpacing: 3,
    fontWeight: '700',
    color: t.colors.primary,
    backgroundColor: t.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  year: { fontSize: 15, fontWeight: '600', color: t.colors.muted },
  myScore: { fontSize: 16, fontWeight: '700', color: t.colors.success },
  stateCard: { padding: 24, borderRadius: t.radius, backgroundColor: t.colors.surface, gap: 14 },
  segmented: { flexDirection: 'row', gap: t.spacing.xs },
  segment: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  segmentText: { fontSize: 15, fontWeight: '600', color: t.colors.text },
  segmentTextActive: { color: '#FFFFFF' },
});

