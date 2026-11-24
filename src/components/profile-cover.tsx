import React from 'react';
import { View } from 'react-native';
import { tokens as t } from '../design/tokens';

/**
 * Capa do cabeçalho do perfil (pedido do Marco em 23/11/2026): faixa tingida
 * pelas cores do tema escolhido no Personalizar, com o motivo da marca —
 * círculo claro e ponto dourado em órbita. Só cores do tema, sem imagem de
 * obra. O avatar aparece sobreposto à faixa nos cabeçalhos.
 */
export function ProfileCover({ colors, height = 92 }: { colors: { secondary: string; accent: string; primary: string }; height?: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={{ height, backgroundColor: colors.secondary, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -34, top: -46, width: 150, height: 150, borderRadius: 75, borderWidth: 14, borderColor: colors.accent, opacity: 0.55 }} />
      <View style={{ position: 'absolute', right: 96, top: 18, width: 14, height: 14, borderRadius: 7, backgroundColor: t.colors.gold }} />
      <View style={{ position: 'absolute', left: -52, bottom: -70, width: 170, height: 170, borderRadius: 85, backgroundColor: colors.accent, opacity: 0.28 }} />
      <View style={{ position: 'absolute', left: 70, bottom: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, opacity: 0.35 }} />
    </View>
  );
}
