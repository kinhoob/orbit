import React from 'react';
import { Text, View } from 'react-native';
import { MotionPressable } from './motion';
import { Icon, type IconName } from './icons';
import { styles } from './ui';
import type { AchievementState } from '../features/account/achievements';
import { achievementProgress } from '../domain/achievements.mjs';
import { font, tokens as t } from '../design/tokens';

const KNOWN_ICONS = new Set(['star', 'sparkles', 'medal', 'flame', 'trophy', 'crown', 'users', 'megaphone', 'library', 'orbit', 'gem', 'bookmark', 'heart']);

export function AchievementCard({ item, equipped, busy, onToggle }: { item: AchievementState; equipped: boolean; busy: boolean; onToggle: () => void }) {
  const progress = achievementProgress(item.current, item.threshold);
  const icon = (KNOWN_ICONS.has(item.icon) ? item.icon : 'star') as IconName;
  return (
    <View style={[styles.card, { gap: 10, opacity: item.unlocked ? 1 : 0.72 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: item.unlocked ? t.colors.gold : t.colors.secondary }}>
          <Icon name={icon} size={22} color={item.unlocked ? t.colors.dark : t.colors.muted} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontFamily: font.bold, color: t.colors.text }}>{item.title}</Text>
          <Text style={{ fontSize: 13, fontFamily: font.regular, color: t.colors.muted }}>{item.description} · +{item.xp_reward} XP</Text>
        </View>
        {item.unlocked && (
          <MotionPressable accessibilityRole="button" accessibilityLabel={equipped ? `Remover insígnia ${item.title} do perfil` : `Colocar insígnia ${item.title} no perfil`} disabled={busy} onPress={onToggle}
            style={{ borderRadius: 999, borderWidth: 1.5, borderColor: equipped ? t.colors.gold : t.colors.border, backgroundColor: equipped ? t.colors.gold : 'transparent', paddingVertical: 8, paddingHorizontal: 14 }}>
            <Text style={{ fontSize: 13, fontFamily: font.semibold, color: equipped ? t.colors.dark : t.colors.text }}>{equipped ? 'No perfil ✓' : 'Equipar'}</Text>
          </MotionPressable>
        )}
      </View>
      {!item.unlocked && (
        <View style={{ gap: 5 }}>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress.fraction * 100) }} style={{ height: 6, borderRadius: 3, backgroundColor: t.colors.secondary }}>
            <View style={{ width: `${progress.fraction * 100}%`, height: 6, borderRadius: 3, backgroundColor: t.colors.accentStrong }} />
          </View>
          <Text style={{ fontSize: 12, fontFamily: font.medium, color: t.colors.muted }}>{progress.current} de {progress.threshold}</Text>
        </View>
      )}
    </View>
  );
}
