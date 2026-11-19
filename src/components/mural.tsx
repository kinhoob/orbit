import React, { useState } from 'react';
import { CardEntrance, MotionPressable } from './motion';
import { Link } from 'expo-router';
import { Icon, type IconName } from './icons';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { categories } from '../features/catalog/data';
import { CURATED_MURAL_LABEL, type CuratedItem } from '../features/home/curated-data.mjs';
import { tokens, font} from '../design/tokens';

const COLUMN_BREAKPOINTS = { three: 640, four: 1024 } as const;
const GAP = tokens.spacing.sm;
/** Peso estimado do bloco de texto sob a capa, em unidades de largura da coluna. */
const TEXT_BLOCK_WEIGHT = 0.45;

const categoryIcons: Record<string, IconName> = {
  film: 'film', series: 'tv', anime: 'tv', music: 'music', album: 'music', book: 'book', game: 'game',
};

/** Tom da capa ilustrada por categoria, usando os tokens existentes. */
const categoryTone: Record<string, { bg: string; fg: string; caption: string }> = {
  film: { bg: '#4A3628', fg: tokens.colors.onDark, caption: 'rgba(244,239,231,0.65)' },
  series: { bg: '#2E4A3F', fg: tokens.colors.onDark, caption: 'rgba(244,239,231,0.65)' },
  anime: { bg: '#4E3550', fg: tokens.colors.onDark, caption: 'rgba(244,239,231,0.65)' },
  music: { bg: '#1D3560', fg: tokens.colors.onDark, caption: 'rgba(244,239,231,0.65)' },
  album: { bg: '#1D3560', fg: tokens.colors.onDark, caption: 'rgba(244,239,231,0.65)' },
  book: { bg: '#4A3B2C', fg: tokens.colors.onDark, caption: 'rgba(244,239,231,0.65)' },
  game: { bg: '#2F3E5C', fg: tokens.colors.onDark, caption: 'rgba(244,239,231,0.65)' },
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
    <Link href={{ pathname: '/curated/[id]', params: { id: item.id } }} asChild><MotionPressable
      accessibilityRole="link"
      accessibilityLabel={`${CURATED_MURAL_LABEL}: ${item.title}, ${item.creator}, ${categoryLabel(item.category)}`}
      style={{ width: '100%', backgroundColor: tokens.colors.surface, borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 16px rgba(23,20,15,0.06)', elevation: 1 }}
    >
      {item.coverUrl && !failed ? (
        <Image
          source={{ uri: item.coverUrl }}
          accessibilityLabel={`Capa oficial de ${item.title}`}
          onError={() => setFailed(true)}
          style={{ width: '100%', aspectRatio: item.coverAspectRatio, backgroundColor: tokens.colors.secondary }}
        />
      ) : (
        <IllustratedCover category={item.category} aspectRatio={item.coverAspectRatio} />
      )}
      <View style={{ padding: 14, gap: 4 }}>
        <Text style={{ fontSize: 15, fontFamily: font.semibold, color: tokens.colors.text }}>{item.title}</Text>
        <Text style={{ color: tokens.colors.muted, fontSize: 12 }}>
          {item.creator} · {categoryLabel(item.category)}{item.releaseYear ? ` · ${item.releaseYear}` : ''}
        </Text>
      </View>
    </MotionPressable></Link>
  );
}

export function IllustratedCover({ category, aspectRatio }: { category: string; aspectRatio: number }) {
  const tone = categoryTone[category] ?? categoryTone.series!;
  return (
    <View style={{ width: '100%', aspectRatio, backgroundColor: tone.bg, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 16 }}>
      <Icon name={categoryIcons[category] ?? 'image'} size={34} color={tone.fg} />
      <Text style={{ color: tone.caption, fontSize: 11, letterSpacing: 1.5, fontFamily: font.bold, textAlign: 'center' }}>{categoryLabel(category).toUpperCase()}</Text>
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
      <View style={{ backgroundColor: tokens.colors.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ color: tokens.colors.text, fontSize: 12, fontFamily: font.bold, letterSpacing: 1 }}>{CURATED_MURAL_LABEL.toUpperCase()}</Text>
      </View>
      <Text style={{ color: tokens.colors.muted, fontSize: 13, flexShrink: 1 }}>Obras reais de uma seleção local. Todas as capas são ilustradas, sem arte protegida. Ainda não é o catálogo conectado.</Text>
    </View>
  );
}
