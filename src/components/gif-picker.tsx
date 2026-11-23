import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { styles } from './ui';
import { MotionPressable } from './motion';
import { tokens as t, font } from '../design/tokens';
import { searchGifs, trendingGifs, giphyConfigured, type Gif, type GifResult } from '../features/social/giphy';

// Seletor de GIFs do chat (pedido do Marco: busca real via provedor). Abre
// com os em alta e busca conforme a pessoa digita, com debounce para não
// estourar o limite da chave beta (100 req/hora). A atribuição "Powered By
// GIPHY" é exigência dos termos do provedor e fica sempre visível no painel.

const DEBOUNCE_MS = 450;

export function GifPicker({ onPick }: { onPick: (gif: Gif) => void }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<GifResult | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!giphyConfigured()) {
      setResult({ status: 'unconfigured' });
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(() => {
      const run = query.trim() ? searchGifs(query) : trendingGifs();
      void run.then((r) => {
        if (requestId.current !== id) return;
        setResult(r);
        setLoading(false);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const gifs = result?.status === 'ok' ? result.gifs : [];
  return (
    <View style={[styles.card, picker.root]} accessibilityLabel="Seletor de GIFs">
      <TextInput
        style={[styles.input, picker.search]}
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar GIFs"
        placeholderTextColor={t.colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Buscar GIFs"
      />
      {result?.status === 'unconfigured' ? (
        <Text style={styles.body}>
          A busca de GIFs usa o GIPHY e ainda está sem a chave de API configurada no app. Quando a chave da conta de teste for adicionada, os GIFs aparecem aqui. O envio de texto e emojis já funciona normalmente.
        </Text>
      ) : result?.status === 'error' ? (
        <Text style={styles.body}>Não foi possível buscar GIFs agora. Tente novamente em instantes.</Text>
      ) : loading && !gifs.length ? (
        <View style={picker.loading} accessibilityLabel="Carregando GIFs">
          <ActivityIndicator color={t.colors.primary} />
        </View>
      ) : !gifs.length ? (
        <Text style={styles.body}>{result ? 'Nenhum GIF encontrado para esta busca.' : ''}</Text>
      ) : (
        <ScrollView style={picker.gridScroll} keyboardShouldPersistTaps="handled">
          <View style={picker.grid}>
            {gifs.map((gif) => (
              <MotionPressable
                key={gif.id}
                accessibilityRole="button"
                accessibilityLabel={`Enviar GIF ${gif.title}`}
                onPress={() => onPick(gif)}
                style={picker.cell}
              >
                <Image source={{ uri: gif.preview }} style={picker.image} accessibilityLabel={gif.title} />
              </MotionPressable>
            ))}
          </View>
        </ScrollView>
      )}
      <Text style={picker.attribution}>Powered By GIPHY</Text>
    </View>
  );
}

const picker = StyleSheet.create({
  root: { gap: 8 },
  search: { marginBottom: 2 },
  loading: { paddingVertical: 24, alignItems: 'center' },
  gridScroll: { maxHeight: 260 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: '31.5%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: t.colors.surface },
  image: { width: '100%', height: '100%' },
  attribution: { fontSize: 11, color: t.colors.muted, fontFamily: font.regular, alignSelf: 'flex-end' },
});
