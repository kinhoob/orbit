import React from 'react';
import { Image, Text, View } from 'react-native';
import { Link } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { palettes, font, tokens as t } from '../design/tokens';
import { useAccountProgress, type AccountProgress } from '../features/account/settings';
import { EquippedBadges } from './profile-badges';
import { ProfileAccent } from './profile-animation';
import { ProfileCover } from './profile-cover';
import { Icon, type IconName } from './icons';
import { MotionPressable } from './motion';
import type { AchievementDefinition } from '../features/account/achievements';

type HeroProfile = {
  display_name?: string | null; username?: string | null; avatar_url?: string | null; bio?: string | null;
  profile_theme?: string; avatar_frame?: string; profile_animation?: string | null; equipped_badges?: string[] | null;
};

const RING = 96;
const STROKE = 6;

function HeroAction({ href, icon, label, onPress, colors }: { href?: string; icon: IconName; label: string; onPress?: () => void; colors: { primary: string; secondary: string } }) {
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.secondary, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 }}>
      <Icon name={icon} size={16} color={colors.primary} />
      <Text style={{ color: colors.primary, fontSize: 13, fontFamily: font.semibold }}>{label}</Text>
    </View>
  );
  if (href) return <Link href={href} asChild><MotionPressable accessibilityRole="button" accessibilityLabel={label}>{inner}</MotionPressable></Link>;
  return <MotionPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>{inner}</MotionPressable>;
}

/**
 * Cabeçalho chamativo do próprio perfil (pedido do Marco em 23/11/2026):
 * capa tingida pelo tema, foto de perfil com anel de progresso de XP, nível e
 * título, bio dentro do cartão, barra para o próximo nível, insígnias
 * equipadas e ações com ícone (Editar, Personalizar, Conquistas). Sem dados
 * do backend, mostra só a identidade — nunca nível ou XP inventado.
 */
export function ProfileHero({ profile, progress, badgeDefinitions, onEdit, onPickAvatar, avatarBusy = false }: {
  profile: HeroProfile; progress?: AccountProgress; badgeDefinitions?: AchievementDefinition[];
  onEdit?: () => void; onPickAvatar?: () => void; avatarBusy?: boolean;
}) {
  const colors = palettes[profile.profile_theme as keyof typeof palettes] || palettes.neutral;
  const query = useAccountProgress();
  const p = progress ?? query.data ?? null;
  const fraction = p ? (p.next_xp === null ? 1 : Math.max(0, Math.min(1, (p.total_xp - p.floor_xp) / (p.next_xp - p.floor_xp)))) : 0;
  const radius = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase();
  return (
    <View style={{ borderRadius: 22, backgroundColor: colors.background, overflow: 'hidden' }}>
      <ProfileCover colors={colors} />
      <View style={{ padding: 20, paddingTop: 0, gap: 14, alignItems: 'center' }}>
        <View style={{ marginTop: -RING / 2 }}>
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
            {onPickAvatar && (
              <MotionPressable accessibilityRole="button" accessibilityLabel={avatarBusy ? 'Enviando foto de perfil' : 'Escolher foto de perfil'} disabled={avatarBusy} onPress={onPickAvatar}
                style={{ position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.dark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background, opacity: avatarBusy ? 0.6 : 1 }}>
                <Icon name="camera" size={15} color={t.colors.onDark} />
              </MotionPressable>
            )}
          </View>
          </ProfileAccent>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 26, fontFamily: font.extrabold, letterSpacing: -0.4, color: colors.primary }}>{profile.display_name || profile.username || 'Perfil'}</Text>
          {!!profile.username && <Text style={{ color: colors.primary, opacity: 0.75, fontFamily: font.medium }}>@{profile.username}</Text>}
          {p && <Text style={{ color: colors.primary, fontFamily: font.semibold, fontSize: 14 }}>{p.title} · {p.total_xp} XP</Text>}
          {!!profile.bio && <Text style={{ color: colors.primary, opacity: 0.8, fontFamily: font.regular, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 4 }}>{profile.bio}</Text>}
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          <HeroAction icon="edit" label="Editar" onPress={onEdit} colors={colors} />
          <HeroAction icon="sparkles" label="Personalizar" href="/customize" colors={colors} />
          <HeroAction icon="trophy" label="Conquistas" href="/achievements" colors={colors} />
        </View>
      </View>
    </View>
  );
}
