import React from 'react';
import { Text, View } from 'react-native';
import { Icon, type IconName } from './icons';
import { font, tokens as t } from '../design/tokens';
import { useAchievementDefinitions, type AchievementDefinition } from '../features/account/achievements';

const KNOWN_ICONS = new Set(['star', 'sparkles', 'medal', 'flame', 'trophy', 'crown', 'users', 'megaphone', 'library', 'orbit', 'gem', 'bookmark', 'heart']);

/** Uma insígnia de conquista: ícone dourado em medalhão creme + título. */
export function BadgeChip({ icon, title, tone = 'light' }: { icon: string; title: string; tone?: 'light' | 'dark' }) {
  const name = (KNOWN_ICONS.has(icon) ? icon : 'star') as IconName;
  const bg = tone === 'dark' ? t.colors.darkSoft : t.colors.secondary;
  const labelColor = tone === 'dark' ? t.colors.onDark : t.colors.text;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: bg, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 }}>
      <Icon name={name} size={16} color={t.colors.gold} />
      <Text style={{ color: labelColor, fontSize: 13, fontFamily: font.semibold }}>{title}</Text>
    </View>
  );
}

/**
 * Insígnias que a pessoa escolheu exibir no perfil. Só mostra o que está
 * salvo em profiles.equipped_badges; enquanto a atualização do banco não
 * existe, a linha simplesmente não aparece — nunca insígnia inventada.
 */
export function EquippedBadges({ badges, tone = 'light', definitions }: { badges?: string[] | null; tone?: 'light' | 'dark'; definitions?: AchievementDefinition[] }) {
  const query = useAchievementDefinitions();
  const list = definitions ?? query.data;
  if (!badges || badges.length === 0 || !list || list.length === 0) return null;
  const byId = new Map(list.map((d) => [d.id, d]));
  const shown = badges.map((id) => byId.get(id)).filter((d): d is NonNullable<typeof d> => !!d);
  if (!shown.length) return null;
  return (
    <View accessibilityLabel="Insígnias do perfil" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {shown.map((d) => <BadgeChip key={d.id} icon={d.icon} title={d.title} tone={tone} />)}
    </View>
  );
}
