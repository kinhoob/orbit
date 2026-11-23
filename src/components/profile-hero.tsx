import React from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { palettes, font, tokens as t } from '../design/tokens';
import { useAccountProgress, type AccountProgress } from '../features/account/settings';
import { EquippedBadges } from './profile-badges';
import { ProfileAccent } from './profile-animation';
import type { AchievementDefinition } from '../features/account/achievements';

type HeroProfile = {
  display_name?: string | null; username?: string | null; avatar_url?: string | null;
  profile_theme?: string; avatar_frame?: string; profile_animation?: string | null; equipped_badges?: string[] | null;
};

const RING = 96;
const STROKE = 6;

/**
 * Cabeçalho chamativo do próprio perfil (pedido do Marco em 23/11/2026):
 * avatar com anel de progresso de XP, nível e título, barra para o próximo
 * nível e as insígnias equipadas. Sem dados do backend, mostra só a
 * identidade — nunca nível ou XP inventado.
 */
export function ProfileHero({ profile, progress, badgeDefinitions }: { profile: HeroProfile; progress?: AccountProgress; badgeDefinitions?: AchievementDefinition[] }) {
  const colors = palettes[profile.profile_theme as keyof typeof palettes] || palettes.neutral;
  const query = useAccountProgress();
  const p = progress ?? query.data ?? null;
  const fraction = p ? (p.next_xp === null ? 1 : Math.max(0, Math.min(1, (p.total_xp - p.floor_xp) / (p.next_xp - p.floor_xp)))) : 0;
  const radius = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase();
  return (
    <View style={{ padding: 20, borderRadius: 22, backgroundColor: colors.background, gap: 14, alignItems: 'center' }}>
      <ProfileAccent animation={profile.profile_animation} size={RING} color={t.colors.gold}>
      <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
        {p && (
          <Svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} style={{ position: 'absolute' }} accessibilityElementsHidden importantForAccessibility="no">
            <Circle cx={RING / 2} cy={RING / 2} r={radius} stroke={colors.secondary} strokeWidth={STROKE} fill="none" />
            <Circle cx={RING / 2} cy={RING / 2} r={radius} stroke={t.colors.gold} strokeWidth={STROKE} fill="none"
              strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - fraction)}
              strokeLinecap="round" transform={`rotate(-90 ${RING / 2} ${RING / 2})`} />
          </Svg>
        )}
        <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: profile.avatar_frame === 'double' ? 6 : profile.avatar_frame === 'line' ? 3 : 0, borderColor: colors.primary, backgroundColor: colors.accent, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontSize: 30, color: colors.primary }}>{initial}</Text>}
        </View>
        {p && (
          <View style={{ position: 'absolute', bottom: -6, backgroundColor: t.colors.gold, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 12, fontFamily: font.extrabold, color: t.colors.dark }}>Nv {p.level}</Text>
          </View>
        )}
      </View>
      </ProfileAccent>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 26, fontFamily: font.extrabold, letterSpacing: -0.4, color: colors.primary }}>{profile.display_name || profile.username || 'Perfil'}</Text>
        {!!profile.username && <Text style={{ color: colors.primary, opacity: 0.75, fontFamily: font.medium }}>@{profile.username}</Text>}
        {p && <Text style={{ color: colors.primary, fontFamily: font.semibold, fontSize: 14 }}>{p.title} · {p.total_xp} XP</Text>}
      </View>
      {p && (
        <View style={{ width: '100%', gap: 6 }}>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }} style={{ height: 8, borderRadius: 4, backgroundColor: colors.secondary }}>
            <View style={{ width: `${fraction * 100}%`, height: 8, borderRadius: 4, backgroundColor: t.colors.gold }} />
          </View>
          <Text style={{ color: colors.primary, opacity: 0.7, fontSize: 12, fontFamily: font.medium, textAlign: 'center' }}>
            {p.next_xp === null ? 'Nível máximo alcançado.' : `Faltam ${p.next_xp - p.total_xp} XP para o nível ${p.level + 1}.`}
          </Text>
        </View>
      )}
      <EquippedBadges badges={profile.equipped_badges} definitions={badgeDefinitions} />
    </View>
  );
}
