import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, styles } from './ui';
import { LoadingState } from './loading';
import { MediaCard } from './catalog';
import { Icon } from './icons';
import { tokens as t, font } from '../design/tokens';
import { favoritesCarouselCardWidth, profileTabsFor } from '../domain/favorites.mjs';
import { favoritesTableMissing, listFavoriteItems } from '../features/catalog/favorites';
import type { MediaItem } from '../features/catalog/data';

/** Carrossel horizontal de favoritos: a ponta do próximo card indica o arraste. */
export function FavoritesCarousel({ items }: { items: MediaItem[] }) {
  const { width } = useWindowDimensions();
  const cardWidth = favoritesCarouselCardWidth(width);
  return (
    <ScrollView
      horizontal
      accessibilityRole="adjustable"
      accessibilityLabel="Favoritos em carrossel"
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + 12}
      decelerationRate="fast"
      contentContainerStyle={{ gap: 12, paddingRight: 24 }}
    >
      {items.map((item) => (
        <View key={item.id} style={{ width: cardWidth }}>
          <MediaCard item={item} />
        </View>
      ))}
    </ScrollView>
  );
}

/** Abas do perfil (próprio ou de outra pessoa). Salvos só existem no próprio. */
export function ProfileTabs({ own, active, onChange }: { own: boolean; active: string; onChange: (id: string) => void }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, backgroundColor: t.colors.secondary, borderRadius: 999, padding: 4 }}>
      {profileTabsFor(own).map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={{ flexGrow: 1, minWidth: 110, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', backgroundColor: selected ? t.colors.primary : 'transparent' }}
          >
            <Text style={{ fontSize: 15, fontFamily: selected ? font.bold : font.semibold, color: selected ? t.colors.onDark : t.colors.text }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Grade de favoritos de um perfil, com estados honestos enquanto a migration está em revisão. */
export function FavoritesPanel({ profileId, own }: { profileId: string; own: boolean }) {
  const query = useQuery({ queryKey: ['profile-favorites', profileId], queryFn: () => listFavoriteItems(profileId) });
  if (query.isPending) return <LoadingState kind="feed" />;
  if (query.isError) {
    return (
      <View style={{ gap: 12 }}>
        <Text style={styles.error}>Não foi possível carregar os favoritos.</Text>
        <Button label="Tentar novamente" onPress={() => { void query.refetch(); }} />
      </View>
    );
  }
  if (favoritesTableMissing()) {
    return <Text style={styles.body}>Os favoritos chegam com a próxima atualização do banco, que já está em revisão.</Text>;
  }
  if (!query.data?.length) {
    return (
      <View style={{ gap: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" size={30} color={t.colors.muted} />
        </View>
        <Text style={styles.body}>
          {own
            ? 'Suas obras favoritas aparecem aqui. Toque no coração na página de uma obra para destacá-la no seu perfil.'
            : 'Nenhuma obra favorita por aqui ainda.'}
        </Text>
        {own && <Link href="/(tabs)/discover" style={styles.link}>Encontrar obras →</Link>}
      </View>
    );
  }
  return <FavoritesCarousel items={query.data} />;
}
