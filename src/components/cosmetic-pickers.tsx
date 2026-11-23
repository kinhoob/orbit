import React from 'react';
import { Text, View } from 'react-native';
import { MotionPressable } from './motion';
import { ProfileAccent } from './profile-animation';
import { COSMETICS, buttonColorsFor } from '../domain/cosmetics.mjs';
import { palettes, font, tokens as t } from '../design/tokens';

// Seletores visuais da personalização por nível (pedido do Marco em 23/11/2026):
// cada opção mostra a aparência real — amostra de cor, botão colorido, animação
// em movimento — em vez de uma lista de texto. Itens bloqueados ficam visíveis
// com o nível em que destravam; o toque neles não faz nada.

type PickerProps = { value: string; level: number; onSelect: (id: string) => void };

function lockOf(minLevel: number, level: number): number | null {
  return minLevel > level ? minLevel : null;
}

function OptionLabel({ name, lockedAt, selected }: { name: string; lockedAt: number | null; selected: boolean }) {
  return (
    <Text style={{ fontSize: 11, fontFamily: selected ? font.bold : font.semibold, color: t.colors.text, textAlign: 'center' }}>
      {name}{lockedAt !== null ? ` · Nv ${lockedAt}` : ''}
    </Text>
  );
}

/** Temas de perfil como amostras circulares com as cores reais da paleta. */
export function ThemeSwatches({ value, level, onSelect }: PickerProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {COSMETICS.filter((c) => c.kind === 'theme').map((item) => {
        const lockedAt = lockOf(item.min_level, level);
        const selected = value === item.id;
        const pal = palettes[item.id as keyof typeof palettes] || palettes.neutral;
        return (
          <MotionPressable key={item.id} disabled={lockedAt !== null} accessibilityRole="button" accessibilityState={{ disabled: lockedAt !== null, selected }} accessibilityLabel={`Tema ${item.name}${lockedAt !== null ? `, desbloqueia no nível ${lockedAt}` : ''}`} onPress={() => onSelect(item.id)} style={{ alignItems: 'center', gap: 6, width: 72, minHeight: 44, opacity: lockedAt !== null ? 0.45 : 1 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: pal.background, borderWidth: selected ? 3 : 1.5, borderColor: selected ? t.colors.gold : pal.primary, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: pal.accent }} />
            </View>
            <OptionLabel name={item.name} lockedAt={lockedAt} selected={selected} />
          </MotionPressable>
        );
      })}
    </View>
  );
}

/** Cores de botão como botões de verdade, nas cores que o visitante verá. */
export function ButtonThemeSwatches({ value, level, onSelect }: PickerProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {COSMETICS.filter((c) => c.kind === 'button').map((item) => {
        const lockedAt = lockOf(item.min_level, level);
        const selected = value === item.id;
        const colors = buttonColorsFor(item.id);
        return (
          <MotionPressable key={item.id} disabled={lockedAt !== null} accessibilityRole="button" accessibilityState={{ disabled: lockedAt !== null, selected }} accessibilityLabel={`Botão ${item.name}${lockedAt !== null ? `, desbloqueia no nível ${lockedAt}` : ''}`} onPress={() => onSelect(item.id)} style={{ backgroundColor: colors.bg, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center', borderWidth: selected ? 2.5 : 0, borderColor: t.colors.gold, opacity: lockedAt !== null ? 0.45 : 1 }}>
            <Text style={{ color: colors.fg, fontSize: 13, fontFamily: font.semibold }}>{selected ? '✓ ' : ''}{item.name}{lockedAt !== null ? ` · Nv ${lockedAt}` : ''}</Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}

/** Animações em movimento numa grade de mini-avatares ao vivo. */
export function AnimationGrid({ value, level, onSelect }: PickerProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {COSMETICS.filter((c) => c.kind === 'animation').map((item) => {
        const lockedAt = lockOf(item.min_level, level);
        const selected = value === item.id;
        return (
          <MotionPressable key={item.id} disabled={lockedAt !== null} accessibilityRole="button" accessibilityState={{ disabled: lockedAt !== null, selected }} accessibilityLabel={`Animação ${item.name}${lockedAt !== null ? `, desbloqueia no nível ${lockedAt}` : ''}`} onPress={() => onSelect(item.id)} style={{ width: '30%', minWidth: 96, minHeight: 44, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 16, borderWidth: selected ? 2 : 1, borderColor: selected ? t.colors.gold : t.colors.border, backgroundColor: t.colors.surface, opacity: lockedAt !== null ? 0.45 : 1 }}>
            <ProfileAccent animation={lockedAt !== null ? 'none' : item.id} size={52} color={t.colors.gold}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: palettes.neutral.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, color: palettes.neutral.primary, fontFamily: font.bold }}>A</Text>
              </View>
            </ProfileAccent>
            <OptionLabel name={item.name} lockedAt={lockedAt} selected={selected} />
          </MotionPressable>
        );
      })}
    </View>
  );
}

/** Molduras de avatar mostradas em mini-avatares. */
export function FrameSwatches({ value, level, onSelect }: PickerProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {COSMETICS.filter((c) => c.kind === 'frame').map((item) => {
        const lockedAt = lockOf(item.min_level, level);
        const selected = value === item.id;
        return (
          <MotionPressable key={item.id} disabled={lockedAt !== null} accessibilityRole="button" accessibilityState={{ disabled: lockedAt !== null, selected }} accessibilityLabel={`Moldura ${item.name}${lockedAt !== null ? `, desbloqueia no nível ${lockedAt}` : ''}`} onPress={() => onSelect(item.id)} style={{ width: '30%', minWidth: 96, minHeight: 44, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 16, borderWidth: selected ? 2 : 1, borderColor: selected ? t.colors.gold : t.colors.border, backgroundColor: t.colors.surface, opacity: lockedAt !== null ? 0.45 : 1 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: item.id === 'double' ? 5 : item.id === 'line' ? 3 : 0, borderColor: palettes.neutral.primary, backgroundColor: palettes.neutral.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18, color: palettes.neutral.primary, fontFamily: font.bold }}>A</Text>
            </View>
            <OptionLabel name={item.name} lockedAt={lockedAt} selected={selected} />
          </MotionPressable>
        );
      })}
    </View>
  );
}

/** Emblemas cosméticos como fichas com o símbolo real. */
export function BadgeOptions({ value, level, onSelect }: PickerProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {COSMETICS.filter((c) => c.kind === 'badge').map((item) => {
        const lockedAt = lockOf(item.min_level, level);
        const selected = value === item.id;
        return (
          <MotionPressable key={item.id} disabled={lockedAt !== null} accessibilityRole="button" accessibilityState={{ disabled: lockedAt !== null, selected }} accessibilityLabel={`Emblema ${item.name}${lockedAt !== null ? `, desbloqueia no nível ${lockedAt}` : ''}`} onPress={() => onSelect(item.id)} style={{ borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderWidth: selected ? 2 : 1, borderColor: selected ? t.colors.gold : t.colors.border, backgroundColor: selected ? palettes.neutral.secondary : t.colors.surface, opacity: lockedAt !== null ? 0.45 : 1 }}>
            <Text style={{ fontSize: 13, fontFamily: font.semibold, color: t.colors.text }}>{item.id !== 'none' ? '✦ ' : ''}{selected ? '✓ ' : ''}{item.name}{lockedAt !== null ? ` · Nv ${lockedAt}` : ''}</Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}
