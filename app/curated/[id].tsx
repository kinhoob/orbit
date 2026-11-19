import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Link, Redirect, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Screen, styles } from '../../src/components/ui';
import { IllustratedCover } from '../../src/components/mural';
import { curatedMuralItems } from '../../src/features/home/curated-data.mjs';
import { categories } from '../../src/features/catalog/data';
import { findCuratedMatches } from '../../src/features/catalog/curated';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/features/auth/provider';

// Curated IDs are local identifiers, never UUIDs of invented database rows.
// Resolve against the actual catalogue; never insert from a client side click.
export default function CuratedDetail() {
  const [coverFailed, setCoverFailed] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = curatedMuralItems.find(candidate => candidate.id === id);
  const { session } = useAuth();
  const matches = useQuery({
    queryKey: ['curated-match', id, session?.user.id],
    enabled: !!supabase && !!item,
    queryFn: () => findCuratedMatches(item!),
  });
  const match = matches.data?.length === 1 ? matches.data[0] : null;
  if (match) return <Redirect href={{ pathname: '/media/[id]', params: { id: match.id } }} />;
  return <Screen>
    <Link href="/(tabs)" style={styles.link}>← Início</Link>
    {!item ? <Text style={styles.body}>Esta indicação não foi encontrada.</Text> : <>
      <Text style={styles.eyebrow}>CURADORIA LOCAL</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.creator} · {item.releaseYear} · {categories.find(c => c.id === item.category)?.label}</Text>
      <View style={{ maxWidth: 320, width: '100%', alignSelf: 'center', overflow: 'hidden', borderRadius: 18 }}>
        {item.coverUrl ? (
          <Image source={{ uri: item.coverUrl }} accessibilityLabel={`Capa oficial de ${item.title}`} onError={() => setCoverFailed(true)} style={{ width: '100%', aspectRatio: item.coverAspectRatio }} />
        ) : null}
        {!item.coverUrl || coverFailed ? <IllustratedCover category={item.category} aspectRatio={item.coverAspectRatio} /> : null}
      </View>
      {supabase && matches.isPending ? <Text style={styles.body}>Localizando esta obra no catálogo…</Text>
        : matches.isError ? <><Text style={styles.error}>Não foi possível consultar o catálogo.</Text><Button label="Tentar novamente" onPress={() => { void matches.refetch(); }} /></>
        : matches.data && matches.data.length > 1 ? <>
          <Text style={styles.body}>Há mais de um registro desta obra. Escolha qual deseja abrir:</Text>
          {matches.data.map((candidate, index) => <Link key={candidate.id} href={{ pathname: '/media/[id]', params: { id: candidate.id } }} style={styles.link}>
            {candidate.title} · {candidate.creator || 'Criador não informado'} · Registro {index + 1} →
          </Link>)}
        </> : <Text style={styles.body}>{supabase
          ? 'Esta indicação ainda não está no catálogo conectado. Salvar e avaliar ficarão disponíveis quando a obra for cadastrada.'
          : 'Esta é uma indicação da curadoria local. Conecte o catálogo do ORBIT para salvar e avaliar a obra.'}</Text>}
    </>}
  </Screen>;
}
