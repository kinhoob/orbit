import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen, styles, Button } from '../../components/ui';
import { Categories, CatalogGrid } from '../../components/catalog';
import { MotionPressable } from '../../components/motion';
import { LoadingState } from '../../components/loading';
import { searchMedia, type MediaItem } from '../catalog/data';
import { searchPublicCatalog, publicProviderCredit } from '../catalog/public-search';
import { searchProfiles } from '../social/friends';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/provider';
import { tokens as t } from '../../design/tokens';

export function SearchScreen({ intent = 'browse' }: { intent?: 'browse' | 'review' }) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<'works' | 'people'>('works');
  const { session } = useAuth();
  useEffect(() => { const timer = setTimeout(() => setTerm(search), 300); return () => clearTimeout(timer); }, [search]);
  const searching = term.trim().length >= 2;
  const works = intent === 'review' || mode === 'works';
  const catalog = useQuery({ queryKey: ['catalog', session?.user.id, term, category], queryFn: () => searchMedia(term, category), enabled: !!supabase && works });
  const external = useQuery({
    queryKey: ['public-catalog', term, category], enabled: !supabase && works && searching, staleTime: 600000,
    queryFn: async () => (await searchPublicCatalog(term, category)).map((item): MediaItem => ({ id: item.id, title: item.title, category: item.category, description: `Fonte: ${item.source}`, cover_url: null, release_year: item.releaseYear, creator: item.creator, source_url: item.sourceUrl })),
  });
  const people = useQuery({ queryKey: ['people-search', session?.user.id, term], queryFn: () => searchProfiles(term, session!.user.id), enabled: !!supabase && !!session && !works && searching });
  const results = supabase ? catalog : external;
  return <Screen>
    <Text style={styles.eyebrow}>{intent === 'review' ? 'NOVA AVALIAÇÃO' : 'BUSCA'}</Text>
    <Text style={[styles.title, { fontSize: 29, lineHeight: 35 }]}>{intent === 'review' ? 'Qual obra você quer avaliar?' : 'Encontre sua próxima conexão.'}</Text>
    {intent === 'review' && <Text style={styles.body}>1. Escolha uma obra · 2. Dê sua nota e escreva sua opinião</Text>}
    {intent === 'browse' && <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8 }}>
      {(['works', 'people'] as const).map(tab => <MotionPressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: mode === tab }} onPress={() => setMode(tab)} style={{ flex: 1, padding: 13, alignItems: 'center', borderRadius: 12, backgroundColor: mode === tab ? t.colors.accent : t.colors.secondary }}><Text style={{ color: t.colors.text, fontWeight: mode === tab ? '700' : '400' }}>{tab === 'works' ? 'Obras' : 'Pessoas'}</Text></MotionPressable>)}
    </View>}
    <TextInput accessibilityLabel={works ? 'Buscar obras' : 'Buscar pessoas'} placeholder={works ? 'Título da obra…' : 'Nome ou username…'} style={styles.input} value={search} onChangeText={setSearch} autoCorrect={false} returnKeyType="search" maxLength={150} />
    {works ? <>
      <Categories value={category} onChange={setCategory} />
      {!supabase && <Text style={[styles.body, { fontSize: 13 }]}>Fontes: {publicProviderCredit()}. Resultados públicos abrem o site da fonte; salvar e avaliar requer o catálogo conectado.</Text>}
      {!supabase && !searching ? <Text style={styles.body}>Digite pelo menos duas letras para buscar séries, animes e livros.</Text>
        : results.isPending || term !== search ? <LoadingState />
        : results.isError ? <><Text style={styles.error}>Não foi possível buscar agora.</Text><Button label="Tentar novamente" onPress={() => { void results.refetch(); }} /></>
        : results.data?.length ? <CatalogGrid items={results.data} />
        : <Text style={styles.body}>Nenhuma obra encontrada. Tente outro título ou categoria.</Text>}
      {intent === 'review' && !session && <Link href="/auth" style={styles.link}>Entre para publicar sua avaliação →</Link>}
    </> : !session ? <Link href="/auth" style={styles.link}>Entre para encontrar pessoas →</Link>
      : !searching ? <Text style={styles.body}>Busque por nome ou username, com pelo menos duas letras.</Text>
      : people.isPending || term !== search ? <LoadingState kind="feed" />
      : people.isError ? <><Text style={styles.error}>Não foi possível buscar pessoas.</Text><Button label="Tentar novamente" onPress={() => { void people.refetch(); }} /></>
      : people.data?.length ? <View style={{ gap: 12 }}>{people.data.map(person => <Link key={person.id} href={{ pathname: '/people/[id]', params: { id: person.id } }} asChild><MotionPressable accessibilityRole="link" style={[styles.card, { flexDirection: 'row', alignItems: 'center', padding: 16 }]}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.accent, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: t.colors.accentStrong, fontWeight: '700' }}>{(person.display_name || person.username || '?').charAt(0).toUpperCase()}</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: t.colors.text, fontWeight: '600' }}>{person.display_name || person.username}</Text><Text style={{ color: t.colors.muted }}>@{person.username || 'sem username'}</Text></View><Text style={{ color: t.colors.accentStrong }}>→</Text></MotionPressable></Link>)}</View>
      : <Text style={styles.body}>Nenhuma pessoa encontrada.</Text>}
  </Screen>;
}
export default function Search() { return <SearchScreen />; }
