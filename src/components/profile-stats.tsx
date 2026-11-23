import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { styles } from './ui';
import { font, tokens as t } from '../design/tokens';
import { PROFILE_STATS, formatStatCount } from '../domain/profile-stats.mjs';
import { fetchProfileStats, profileStatsUnavailable, type ProfileStats } from '../features/social/profile-stats';

/** Linha de números já carregados (avaliações, amigos, curtidas recebidas). */
export function ProfileStatsValues({ stats, own }: { stats: ProfileStats; own: boolean }) {
  return (
    <View accessibilityLabel="Números do perfil" style={{ flexDirection: 'row', gap: 28 }}>
      {PROFILE_STATS.map((stat) => {
        const value = formatStatCount(stats[stat.id as keyof ProfileStats]);
        const inner = (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 18, fontFamily: font.bold, color: t.colors.text }}>{value}</Text>
            <Text style={{ fontSize: 13, color: t.colors.muted }}>{stat.label}</Text>
          </View>
        );
        return own && stat.id === 'friends'
          ? <Link key={stat.id} href="/friends" accessibilityLabel={`${value} amigos, gerenciar amizades`}>{inner}</Link>
          : <View key={stat.id}>{inner}</View>;
      })}
    </View>
  );
}

/** Números do perfil, como no TikTok/Instagram, com estado honesto enquanto a RPC está em revisão. */
export function ProfileStatsRow({ profileId, own }: { profileId: string; own: boolean }) {
  const query = useQuery({ queryKey: ['profile-stats', profileId], queryFn: () => fetchProfileStats(profileId) });
  if (query.isPending) return null;
  if (query.isError) return null; // falha de rede não derruba o perfil; os números simplesmente não aparecem
  if (profileStatsUnavailable()) {
    return <Text style={styles.body}>Os números do perfil chegam com a próxima atualização do banco, que já está em revisão.</Text>;
  }
  if (!query.data) return null; // bloqueio entre as pessoas esconde o perfil inteiro
  return <ProfileStatsValues stats={query.data} own={own} />;
}
