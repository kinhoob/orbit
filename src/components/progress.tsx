import React from 'react';
import { Text, View } from 'react-native';
import { useAccountProgress } from '../features/account/settings';
import { tokens as t } from '../design/tokens';
export function ProgressSummary() {
  const query = useAccountProgress();
  if (!query.data) return null; // No made-up level while backend is unavailable.
  const p = query.data;
  const fraction = p.next_xp === null ? 1 : Math.max(0, Math.min(1, (p.total_xp - p.floor_xp) / (p.next_xp - p.floor_xp)));
  return <View style={{ gap: 6 }}><Text style={{ color: t.colors.muted, fontSize: 12 }}>Nível {p.level} · {p.title} · {p.total_xp} XP</Text><View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }} style={{ height: 5, borderRadius: 3, backgroundColor: t.colors.secondary }}><View style={{ width: `${fraction * 100}%`, height: 5, borderRadius: 3, backgroundColor: t.colors.accentStrong }} /></View></View>;
}
