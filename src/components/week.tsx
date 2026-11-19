import React from 'react';
import { Text, View } from 'react-native';
import { MotionPressable } from './motion';
import { font, tokens } from '../design/tokens';
import { weekDaysSunday } from '../domain/week.mjs';

/**
 * Calendario da semana da tela Inicio: 7 dias calculados do relogio do
 * aparelho (domingo a sabado), com o dia atual marcado. Tocar em um dia troca
 * as indicacoes exibidas — nao e decorativo.
 * Desde 19/11/2026 no formato da nova identidade: letras da semana, numeros
 * em circulos (dia atual cheio, selecionado em anel) e pontinho dourado nos
 * dias com indicacao — sobre a zona escura do topo.
 */
export function WeekCalendar({ selectedIso, onSelect, reference, pickIsos }: { selectedIso: string; onSelect: (iso: string) => void; reference?: Date; pickIsos?: ReadonlySet<string> }) {
  // Semana exibida de domingo a sabado (formato da referencia aprovada em 19/11/2026).
  const days = weekDaysSunday(reference ?? new Date());
  return (
    <View accessibilityLabel="Calendário da semana" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map((day) => {
        const selected = day.iso === selectedIso;
        const hasPick = pickIsos ? pickIsos.has(day.iso) : false;
        return (
          <MotionPressable
            key={day.iso}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${day.weekdayLong}, dia ${day.dayNum}${day.isToday ? ', hoje' : ''}`}
            onPress={() => onSelect(day.iso)}
            style={{ alignItems: 'center', gap: 7, paddingVertical: 4, width: 42 }}
          >
            <Text style={{ fontSize: 12, fontFamily: font.semibold, color: tokens.colors.onDarkMuted }}>{(day.weekday || '').charAt(0).toUpperCase()}</Text>
            <View style={{
              width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
              backgroundColor: day.isToday ? tokens.colors.onDark : 'transparent',
              borderWidth: selected && !day.isToday ? 1.5 : 0,
              borderColor: tokens.colors.onDarkMuted,
            }}>
              <Text style={{ fontSize: 16, fontFamily: day.isToday || selected ? font.bold : font.medium, color: day.isToday ? tokens.colors.dark : tokens.colors.onDark }}>{day.dayNum}</Text>
            </View>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: hasPick ? tokens.colors.gold : 'transparent' }} />
          </MotionPressable>
        );
      })}
    </View>
  );
}
