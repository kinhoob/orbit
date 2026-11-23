import React from 'react';
import { Image, Text, View } from 'react-native';
import { palettes, font } from '../design/tokens';
import { ProfileAccent } from './profile-animation';

type Identity = { display_name?: string | null; username?: string | null; avatar_url?: string | null; profile_theme?: string; avatar_frame?: string; profile_badge?: string; profile_animation?: string | null };

/**
 * Cabeçalho do perfil visitado (pedido do Marco em 23/11/2026): a pessoa
 * aparece para os amigos com o tema, a moldura e a animação que escolheu.
 * Só identidade e emblema cosmético — nunca XP, nível ou lista de conquistas.
 */
export function ProfileIdentity({ profile }: { profile: Identity }) {
  const colors = palettes[profile.profile_theme as keyof typeof palettes] || palettes.neutral;
  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase();
  return (
    <View style={{ borderRadius: 22, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.secondary, overflow: 'hidden' }}>
      <View style={{ height: 6, backgroundColor: colors.accent }} accessibilityElementsHidden importantForAccessibility="no" />
      <View style={{ paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center', gap: 5 }}>
        <ProfileAccent animation={profile.profile_animation} size={96} color={colors.accent}>
          <View style={{ width: 88, height: 88, borderRadius: 44, borderWidth: profile.avatar_frame === 'double' ? 6 : profile.avatar_frame === 'line' ? 3 : 0, borderColor: colors.primary, backgroundColor: colors.accent, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontSize: 32, color: colors.primary, fontFamily: font.bold }}>{initial}</Text>}
          </View>
        </ProfileAccent>
        <Text style={{ fontSize: 24, fontFamily: font.extrabold, letterSpacing: -0.4, color: colors.primary, marginTop: 8, textAlign: 'center' }}>{profile.display_name || profile.username || 'Perfil'}</Text>
        {!!profile.username && <Text style={{ color: colors.primary, opacity: 0.7, fontFamily: font.medium }}>@{profile.username}</Text>}
        {profile.profile_badge && profile.profile_badge !== 'none' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.secondary, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, marginTop: 4 }}>
            <Text style={{ color: colors.primary, fontFamily: font.semibold, fontSize: 13 }}>✦ {profile.profile_badge === 'explorer' ? 'Explorador' : 'Colecionador'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
