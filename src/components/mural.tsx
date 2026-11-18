import React from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { categories } from '../features/catalog/data';
import { DEMO_MURAL_LABEL, type DemoMuralItem } from '../features/home/demo-data';
import { tokens } from '../design/tokens';

const COLUMN_BREAKPOINTS = { three: 640, four: 1024 } as const;
const GAP = tokens.spacing.sm;
/** Peso estimado do bloco de texto sob a capa, em unidades de largura da coluna. */
const TEXT_BLOCK_WEIGHT = 0.45;

const categorySymbols: Record<string, string> = {
  film: '◎', series: '▣', anime: '✦', music: '♪', album: '◉', book: '❖', game: '▲',
};

function columnCount(width: number): number {
  if (width >= COLUMN_BREAKPOINTS.four) return 4;
  if (width >= COLUMN_BREAKPOINTS.three) return 3;
  return 2;
}

function toneColor(tone: DemoMuralItem['tone']): string {
  if (tone === 'primary') return tokens.colors.primary;
  if (tone === 'secondary') return tokens.colors.secondary;
  return tokens.colors.accent;
}

function categoryLabel(id: string): string {
  return categories.find((c) => c.id === id)?.label ?? 'Outros';
}

/** Distribui os itens na coluna mais baixa, estimando altura em proporção da largura da coluna. */
function splitIntoColumns(items: DemoMuralItem[], columns: number): DemoMuralItem[][] {
  const result: DemoMuralItem[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  for (const item of items) {
    const shortest = heights.indexOf(Math.min(...heights));
    result[shortest]?.push(item);
    heights[shortest] = (heights[shortest] ?? 0) + 1 / item.coverAspectRatio + TEXT_BLOCK_WEIGHT;
  }
  return result;
}

function MuralTile({ item }: { item: DemoMuralItem }) {
  const dark = item.tone === 'primary';
  return (
    <View
      accessibilityLabel={`${DEMO_MURAL_LABEL}: ${item.title}, ${categoryLabel(item.category)}`}
      style={{ width: '100%', backgroundColor: tokens.colors.surface, borderRadius: tokens.radius, overflow: 'hidden', borderWidth: 1, borderColor: tokens.colors.border }}
    >
      <View style={{ width: '100%', aspectRatio: item.coverAspectRatio, backgroundColor: toneColor(item.tone), justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 44, color: dark ? tokens.colors.surface : tokens.colors.muted }}>
          {categorySymbols[item.category] ?? '◎'}
        </Text>
      </View>
      <View style={{ padding: 14, gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.colors.text }}>{item.title}</Text>
        <Text style={{ color: tokens.colors.muted, fontSize: 12 }}>
          {categoryLabel(item.category)}{item.releaseYear ? ` · ${item.releaseYear}` : ''}
        </Text>
      </View>
    </View>
  );
}

export function MuralWall({ items }: { items: DemoMuralItem[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const columns = columnCount(windowWidth);
  if (items.length === 0) {
    return <Text style={{ color: tokens.colors.muted, fontSize: 15, lineHeight: 24 }}>Nenhuma peça de demonstração nesta categoria.</Text>;
  }
  const split = splitIntoColumns(items, columns);
  return (
    <View style={{ flexDirection: 'row', gap: GAP, alignItems: 'flex-start', width: '100%' }}>
      {split.map((column, index) => (
        <View key={index} style={{ flex: 1, gap: GAP, minWidth: 0 }}>
          {column.map((item) => <MuralTile key={item.id} item={item} />)}
        </View>
      ))}
    </View>
  );
}

export function DemoBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <View style={{ backgroundColor: tokens.colors.secondary, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ color: tokens.colors.text, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>{DEMO_MURAL_LABEL.toUpperCase()}</Text>
      </View>
      <Text style={{ color: tokens.colors.muted, fontSize: 13 }}>Capas e títulos locais, só para avaliar o layout. Não vêm do catálogo real.</Text>
    </View>
  );
                    }
