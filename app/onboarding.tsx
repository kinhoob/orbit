import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui';
import { CardEntrance, MotionPressable, ScreenMotion, useReducedMotion } from '../src/components/motion';
import { AmbientBackground } from '../src/components/ambient';
import { Icon, OrbitMark } from '../src/components/icons';
import { motionSpec } from '../src/design/motion.mjs';
import { font, tokens as t } from '../src/design/tokens';
import { supabase, requireSupabase } from '../src/lib/supabase';
import { useAuth } from '../src/features/auth/provider';
import { useAccountSettings } from '../src/features/account/settings';
import { needsTasteOnboarding, markTasteComplete } from '../src/features/auth/onboarding';
import { categories, searchMedia, type MediaItem } from '../src/features/catalog/data';
import { genres, genresByCategory, searchGenres } from '../src/features/catalog/genres.mjs';
import { compatibilityKickoff, COMPATIBILITY_RATING_TARGET } from '../src/domain/onboarding.mjs';

type Step = 'choose' | 'rate' | 'done';

const nativeDriver = Platform.OS !== 'web';

// Chip de estilo com resposta elástica e transição de cor ao escolher: o
// toque contrai o chip inteiro e uma mola devolve com leve overshoot, enquanto
// o fundo desliza para o dourado. Não anima na montagem (só nas trocas) e
// movimento reduzido mantém tudo parado, com as cores fixas.
function GenreChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const tint = useRef(new Animated.Value(active ? 1 : 0)).current;
  const mounted = useRef(false);
  useEffect(() => {
    if (reduced) { scale.setValue(1); tint.setValue(active ? 1 : 0); return; }
    if (!mounted.current) { mounted.current = true; return; }
    scale.setValue(0.84);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 300, useNativeDriver: nativeDriver }),
      Animated.timing(tint, { toValue: active ? 1 : 0, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [active, reduced, scale, tint]);
  const backgroundColor = reduced
    ? (active ? t.colors.gold : t.colors.secondary)
    : tint.interpolate({ inputRange: [0, 1], outputRange: [t.colors.secondary, t.colors.gold] });
  return (
    <MotionPressable accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={onPress}>
      <Animated.View style={[styles.chip, { backgroundColor, transform: [{ scale: reduced ? 1 : scale }] }]}>
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </Animated.View>
    </MotionPressable>
  );
}

// Botão de nota (0 a 10): afunda e volta com mola a cada toque, para a
// avaliação parecer física. Movimento reduzido mantém o botão parado.
function ScoreButton({ score, busy, onPress }: { score: number; busy: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const handle = () => {
    if (!reduced) {
      scale.setValue(0.8);
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 300, useNativeDriver: nativeDriver }).start();
    }
    onPress();
  };
  return (
    <MotionPressable accessibilityRole="button" accessibilityLabel={`Nota ${score}`} disabled={busy} onPress={handle}>
      <Animated.View style={[styles.score, { transform: [{ scale: reduced ? 1 : scale }] }]}>
        <Text style={styles.scoreText}>{score}</Text>
      </Animated.View>
    </MotionPressable>
  );
}

// Transição entre as etapas (escolha, avaliação, fim): cada cartão entra com
// um deslize suave em vez de trocar seco. Movimento reduzido mostra direto.
function StepTransition({ step, children }: React.PropsWithChildren<{ step: Step }>) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const spec = motionSpec(reduced);
    if (!spec.screenDuration) { value.setValue(1); return; }
    value.setValue(0);
    Animated.timing(value, { toValue: 1, duration: spec.screenDuration + 60, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver, isInteraction: false }).start();
  }, [step, reduced, value]);
  const spec = motionSpec(reduced);
  return (
    <Animated.View style={{
      opacity: reduced ? 1 : value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
      transform: [{ translateY: reduced ? 0 : value.interpolate({ inputRange: [0, 1], outputRange: [spec.screenDistance + 6, 0] }) }],
    }}>{children}</Animated.View>
  );
}

// Pedido do Marco em 21/11/2026: depois de se cadastrar e confirmar o e-mail,
// a pessoa escolhe os gostos para começar a ter compatibilidade. A escolha é
// feita de avaliações reais (0 a 10) em obras do catálogo: são elas, e não
// uma lista de temas, que alimentam o cálculo de compatibilidade entre amigos.
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { session, loading } = useAuth();
  const settings = useAccountSettings();
  const userId = session?.user.id || '';
  const [gate, setGate] = useState<'checking' | 'show' | 'skip' | 'error'>('checking');
  const [step, setStep] = useState<Step>('choose');
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [works, setWorks] = useState<MediaItem[]>([]);
  const [worksError, setWorksError] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [index, setIndex] = useState(0);
  const [outOfWorks, setOutOfWorks] = useState(false);
  const [rated, setRated] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (loading || !session || !supabase) return;
    let active = true;
    needsTasteOnboarding(session.user.id)
      .then(needed => { if (active) setGate(needed ? 'show' : 'skip'); })
      .catch(() => { if (active) setGate('error'); });
    return () => { active = false; };
  }, [loading, session]);

  if (!loading && !session) return <Redirect href="/auth" />;
  if (gate === 'skip') return <Redirect href="/(tabs)" />;

  async function loadWorks() {
    setLoadingWorks(true); setWorksError(false);
    try {
      // A seleção fica no dispositivo até a migração de gêneros ser revisada e
      // aplicada; as notas, que alimentam a compatibilidade, vão ao servidor.
      try { await AsyncStorage.setItem(`orbit:taste-genres:v1:${userId}`, JSON.stringify(picked)); } catch { /* ignora */ }
      const pickedCategories = [...new Set(picked.map(id => genres.find(g => g.id === id)?.category).filter((c): c is string => !!c))];
      const lists = await Promise.all(pickedCategories.map(category => searchMedia('', category)));
      const seen = new Set<string>();
      const merged: MediaItem[] = [];
      const columns = lists.map(list => list.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; }));
      for (let i = 0; columns.some(col => col.length > i); i++) for (const col of columns) { const item = col[i]; if (item) merged.push(item); }
      setWorks(merged);
      setIndex(0);
      setOutOfWorks(false);
      if (!merged.length) { setWorksError(true); return; }
      setStep('rate');
    } catch { setWorksError(true); }
    finally { setLoadingWorks(false); }
  }

  async function rate(score: number) {
    const work = works[index];
    if (!work || !userId) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await requireSupabase()
        .from('ratings')
        .upsert({ user_id: userId, media_item_id: work.id, score, review: '', visibility: settings.data?.default_visibility || 'public' }, { onConflict: 'user_id,media_item_id' });
      if (error) throw error;
      const total = rated + 1;
      setRated(total);
      if (compatibilityKickoff(total).complete) {
        // As avaliações já estão no servidor: renova o registro local de queda.
        try { await markTasteComplete(userId); } catch { /* ignora */ }
        setStep('done');
      }
      else if (index + 1 >= works.length) setOutOfWorks(true);
      else setIndex(index + 1);
    } catch { setMessage('Não foi possível salvar a avaliação. Confira a conexão e tente de novo.'); }
    finally { setBusy(false); }
  }

  function skipWork() {
    // "Não conheço" não cria avaliação nem conta para a meta: só avança a obra.
    if (index + 1 >= works.length) setOutOfWorks(true);
    else setIndex(index + 1);
  }

  const kickoff = compatibilityKickoff(rated);
  const work = works[index];
  const workCategory = work ? categories.find(c => c.id === work.category)?.label || 'Outros' : '';
  const visibleGroups = categories
    .map(category => [category, ((genresByCategory(searchGenres(query)).get(category.id) || []) as { id: string; label: string }[])] as const)
    .filter(([, list]) => list.length > 0);

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
      <AmbientBackground />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <ScreenMotion testID="screen-motion" style={styles.center}>
          <View style={styles.brand}>
            <OrbitMark size={56} />
            <Text style={styles.wordmark}>ORBIT</Text>
          </View>
          {!supabase ? (
            <View style={styles.card}>
              <Text style={styles.title}>Escolha seus gostos.</Text>
              <Text style={styles.body}>O catálogo ainda não foi conectado. Assim que a conexão com o ORBIT for configurada, você escolhe seus gostos por aqui e a compatibilidade com seus amigos começa.</Text>
              <Button label="Voltar ao início" onPress={() => router.replace('/(tabs)')} />
            </View>
          ) : gate === 'checking' ? (
            <View style={styles.card}><Text style={styles.body}>Preparando sua escolha de gostos…</Text></View>
          ) : gate === 'error' ? (
            <View style={styles.card}>
              <Text style={styles.title}>Escolha seus gostos.</Text>
              <Text style={styles.body}>Não foi possível verificar suas avaliações agora. Confira a conexão e tente de novo.</Text>
              <Button label="Tentar de novo" onPress={() => { setGate('checking'); needsTasteOnboarding(userId).then(needed => setGate(needed ? 'show' : 'skip')).catch(() => setGate('error')); }} />
            </View>
          ) : step === 'choose' ? (
            <StepTransition step={step}><View style={styles.card}>
              <Text style={styles.title}>Escolha seus gostos.</Text>
              <Text style={styles.body}>A compatibilidade com seus amigos vem das notas em obras em comum. Seus estilos favoritos guiam as sugestões: escolha os gêneros e avalie {COMPATIBILITY_RATING_TARGET} obras para começar.</Text>
              <View style={styles.searchWrap}>
                <Icon name="search" size={18} color={t.colors.muted} />
                <TextInput accessibilityLabel="Buscar estilo" style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Buscar estilo: terror, sertanejo, RPG…" placeholderTextColor={t.colors.muted} autoCapitalize="none" />
              </View>
              {visibleGroups.length === 0 ? (
                <Text style={styles.body}>Nenhum estilo encontrado para essa busca.</Text>
              ) : visibleGroups.map(([category, list], groupIndex) => (
                <CardEntrance key={category.id} index={groupIndex} style={styles.group}>
                  <Text style={styles.groupLabel}>{category.label}</Text>
                  <View style={styles.chips}>
                    {list.map(genre => {
                      const active = picked.includes(genre.id);
                      return (
                        <GenreChip key={genre.id} active={active} label={genre.label} onPress={() => setPicked(current => active ? current.filter(id => id !== genre.id) : [...current, genre.id])} />
                      );
                    })}
                  </View>
                </CardEntrance>
              ))}
              {worksError && <Text accessibilityRole="alert" style={styles.error}>Não encontrei obras desses estilos agora. Confira a conexão ou escolha outros estilos.</Text>}
              <Button label={loadingWorks ? 'Buscando obras…' : 'Ver obras para avaliar'} disabled={!picked.length || loadingWorks} onPress={() => { void loadWorks(); }} />
            </View></StepTransition>
          ) : step === 'rate' && outOfWorks ? (
            <StepTransition step={step}><View style={styles.card}>
              <Text style={styles.title}>As sugestões acabaram.</Text>
              <Text style={styles.body}>Você tem {rated} de {COMPATIBILITY_RATING_TARGET} avaliações. Escolha outros estilos para ver mais obras e continuar.</Text>
              <Button label="Escolher outros estilos" onPress={() => { setOutOfWorks(false); setStep('choose'); }} />
            </View></StepTransition>
          ) : step === 'rate' && work ? (
            <StepTransition step={step}><View style={styles.card}>
              <Text style={styles.progress}>Suas avaliações: {rated} de {COMPATIBILITY_RATING_TARGET}. A compatibilidade vem das obras em comum com cada amigo.</Text>
              <View style={styles.workBox}>
                <Text style={styles.workTitle}>{work.title}</Text>
                <Text style={styles.workMeta}>{[work.creator, workCategory, work.release_year].filter(Boolean).join(' · ')}</Text>
              </View>
              <Text style={styles.label}>Dê uma nota de 0 a 10</Text>
              <View style={styles.scores}>
                {Array.from({ length: 11 }, (_, score) => (
                  <ScoreButton key={score} score={score} busy={busy} onPress={() => { void rate(score); }} />
                ))}
              </View>
              {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
              <MotionPressable accessibilityRole="button" disabled={busy} onPress={skipWork} style={styles.later}>
                <Text style={styles.laterText}>Não conheço esta obra</Text>
              </MotionPressable>
            </View></StepTransition>
          ) : (
            <StepTransition step={step}><View style={styles.card}>
              <Text style={styles.title}>Seu universo começou.</Text>
              <Text style={styles.body}>Suas {COMPATIBILITY_RATING_TARGET} primeiras avaliações estão guardadas. A compatibilidade aparece quando você e um amigo tiverem {COMPATIBILITY_RATING_TARGET} obras avaliadas em comum.</Text>
              <Button label="Entrar no meu universo" onPress={() => router.replace('/(tabs)')} />
            </View></StepTransition>
          )}
        </ScreenMotion>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.colors.dark },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  center: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 22 },
  brand: { alignItems: 'center', gap: 8 },
  wordmark: { fontFamily: font.extrabold, fontSize: 20, letterSpacing: 6, color: t.colors.onDark, marginLeft: 6 },
  card: { padding: 20, borderRadius: t.radius, backgroundColor: t.colors.surface, gap: 18, boxShadow: '0 12px 32px rgba(0,0,0,0.28)', elevation: 4 },
  title: { fontSize: 26, fontFamily: font.extrabold, letterSpacing: -0.5, lineHeight: 32, color: t.colors.text },
  body: { fontSize: 15, lineHeight: 23, fontFamily: font.regular, color: t.colors.muted },
  progress: { fontSize: 13, fontFamily: font.semibold, color: t.colors.muted },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: t.colors.border, borderRadius: 16, paddingHorizontal: 14, backgroundColor: t.colors.surface },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: font.regular, color: t.colors.text },
  group: { gap: 8 },
  groupLabel: { fontSize: 13, fontFamily: font.semibold, color: t.colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: t.colors.secondary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  chipActive: { backgroundColor: t.colors.gold },
  chipText: { color: t.colors.text, fontSize: 14, fontFamily: font.medium },
  chipTextActive: { fontFamily: font.semibold },
  label: { fontSize: 13, fontFamily: font.medium, color: t.colors.muted },
  scores: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  score: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.surface },
  scoreText: { fontSize: 15, fontFamily: font.semibold, color: t.colors.text },
  workBox: { gap: 6 },
  workTitle: { fontSize: 22, lineHeight: 28, fontFamily: font.extrabold, letterSpacing: -0.3, color: t.colors.text },
  workMeta: { fontSize: 14, fontFamily: font.regular, color: t.colors.muted },
  later: { alignSelf: 'center', paddingVertical: 4 },
  laterText: { fontSize: 14, fontFamily: font.semibold, color: t.colors.text },
  error: { fontSize: 14, lineHeight: 21, fontFamily: font.regular, color: t.colors.error },
});
