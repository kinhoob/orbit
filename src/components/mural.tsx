import React, { useState } from 'react';
import { CardEntrance } from './motion';
import { Icon, type IconName } from './icons';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { categories } from '../features/catalog/data';
import { CURATED_MURAL_LABEL, type CuratedItem } from '../features/home/curated-data.mjs';
import { tokens } from '../design/tokens';

const COLUMN_BREAKPOINTS = { three: 640, four: 1024 } as const;
const GAP = tokens.spacing.sm;
/** Peso estimado do bloco de texto sob a capa, em unidades de largura da coluna. */
const TEXT_BLOCK_WEIGHT = 0.45;

const categoryIcons: Record<string, IconName> = {
  film: 'film', series: 'tv', anime: 'tv', music: 'music', album: 'music', book: 'book', game: 'game',
};

/** Tom da capa ilustrada por categoria, usando os tokens existentes. */
const categoryTone: Record<string, { bg: string; fg: string; caption: string }> = {
  film: { bg: tokens.colors.primary, fg: tokens.colors.surface, caption: '#C9D2D6' },
  series: { bg: tokens.colors.secondary, fg: tokens.colors.accentStrong, caption: tokens.colors.muted },
  anime: { bg: tokens.colors.accentStrong, fg: tokens.colors.surface, caption: '#CDE3E4' },
  music: { bg: tokens.colors.secondary, fg: tokens.colors.accentStrong, caption: tokens.colors.muted },
  album: { bg: tokens.colors.accent, fg: tokens.colors.accentStrong, caption: tokens.colors.muted },
  book: { bg: tokens.colors.primary, fg: tokens.colors.surface, caption: '#C9D2D6' },
  game: { bg: tokens.colors.accentStrong, fg: tokens.colors.surface, caption: '#CDE3E4' },
};

function columnCount(width: number): number {
  if (width >= COLUMN_BREAKPOINTS.four) return 4;
  if (width >= COLUMN_BREAKPOINTS.three) return 3;
  return 2;
}

function categoryLabel(id: string): string {
  return categories.find((c) => c.id === id)?.label ?? 'Outros';
}

/** Distribui os itens na coluna mais baixa, estimando altura em proporção da largura da coluna. */
function splitIntoColumns(items: CuratedItem[], columns: number): CuratedItem[][] {
  const result: CuratedItem[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  for (const item of items) {
    const shortest = heights.indexOf(Math.min(...heights));
    result[shortest]?.push(item);
    heights[shortest] = (heights[shortest] ?? 0) + 1 / item.coverAspectRatio + TEXT_BLOCK_WEIGHT;
  }
  return result;
}

function MuralTile({ item }: { item: CuratedItem }) {
  const [failed, setFailed] = useState(false);
  return (
    <View
      accessibilityLabel={`${CURATED_MURAL_LABEL}: ${item.title}, ${item.creator}, ${categoryLabel(item.category)}`}
      style={{ width: '100%', backgroundColor: tokens.colors.surface, borderRadius: tokens.radius, overflow: 'hidden', borderWidth: 1, borderColor: tokens.colors.border }}
    >
      {item.coverUrl && !failed ? (
        <Image
          source={{ uri: item.coverUrl }}
          accessibilityLabel={`Capa oficial de ${item.title}`}
          onError={() => setFailed(true)}
          style={{ width: '100%', aspectRatio: item.coverAspectRatio, backgroundColor: tokens.colors.secondary }}
        />
      ) : (
        <View style={{ width: '100%', aspectRatio: item.coverAspectRatio, backgroundColor: (categoryTone[item.category] ?? categoryTone.series)!.bg, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 16 }}>
          <Icon name={categoryIcons[item.category] ?? 'image'} size={34} color={(categoryTone[item.category] ?? categoryTone.series)!.fg} />
          <Text style={{ color: (categoryTone[item.category] ?? categoryTone.series)!.caption, fontSize: 11, letterSpacing: 1.5, fontWeight: '700', textAlign: 'center' }}>{categoryLabel(item.category).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ padding: 14, gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.colors.text }}>{item.title}</Text>
        <Text style={{ color: tokens.colors.muted, fontSize: 12 }}>
          {item.creator} · {categoryLabel(item.category)}{item.releaseYear ? ` · ${item.releaseYear}` : ''}
        </Text>
      </View>
    </View>
  );
}

export function MuralWall({ items }: { items: CuratedItem[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const columns = columnCount(windowWidth);
  if (items.length === 0) {
    return <Text style={{ color: tokens.colors.muted, fontSize: 15, lineHeight: 23 }}>Nenhuma obra desta categoria na curadoria de demonstração. O catálogo completo fica em Descobrir.</Text>;
  }
  return (
    <View style={{ flexDirection: 'row', gap: GAP, width: '100%' }}>
      {splitIntoColumns(items, columns).map((column, index) => (
        <View key={index} style={{ flex: 1, gap: GAP, minWidth: 0 }}>
          {column.map((item) => <CardEntrance key={item.id} index={items.indexOf(item)}><MuralTile item={item} /></CardEntrance>)}
        </View>
      ))}
    </View>
  );
}

export function CuratedBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <View style={{ backgroundColor: tokens.colors.accent, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ color: tokens.colors.text, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>{CURATED_MURAL_LABEL.toUpperCase()}</Text>
      </View>
      <Text style={{ color: tokens.colors.muted, fontSize: 13, flexShrink: 1 }}>Obras reais de uma seleção local. Todas as capas são ilustradas, sem arte protegida. Ainda não é o catálogo conectado.</Text>
    </View>
  );
  }
