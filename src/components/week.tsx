import React from 'react';
import { Text, View } from 'react-native';
import { MotionPressable } from './motion';
import { tokens } from '../design/tokens';
import { weekDays } from '../domain/week.mjs';

/**
 * Calendario da semana da tela Inicio: 7 dias calculados do relogio do
 * aparelho (segunda a domingo), com o dia atual marcado. Tocar em um dia troca
 * as indicacoes exibidas — nao e decorativo.
 */
export function WeekCalendar({ selectedIso, onSelect, reference }: { selectedIso: string; onSelect: (iso: string) => void; reference?: Date }) {
  const days = weekDays(reference ?? new Date());
  return (
    <View accessibilityLabel="Calendário da semana" style={{ flexDirection: 'row', gap: 6 }}>
      {days.map((day) => {
        const selected = day.iso === selectedIso;
        return (
          <MotionPressable
            key={day.iso}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${day.weekdayLong}, dia ${day.dayNum}${day.isToday ? ', hoje' : ''}`}
            onPress={() => onSelect(day.iso)}
            style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: selected ? tokens.colors.accentStrong : tokens.colors.border, backgroundColor: selected ? tokens.colors.accentStrong : tokens.colors.surface }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: selected ? '#FFFFFF' : tokens.colors.muted }}>{(day.weekday || '').toUpperCase()}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: selected ? '#FFFFFF' : tokens.colors.text }}>{day.dayNum}</Text>
            {day.isToday && !selected ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: tokens.colors.accentStrong }} /> : null}
          </MotionPressable>
        );
      })}
    </View>
  );
}
