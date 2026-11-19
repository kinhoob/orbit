import React, { useMemo, useState } from 'react';
import { Text, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { Screen, styles } from '../../src/components/ui';
import { Categories } from '../../src/components/catalog';
import { CuratedBadge, MuralWall } from '../../src/components/mural';
import { WeekCalendar } from '../../src/components/week';
import { curatedMuralItems } from '../../src/features/home/curated-data.mjs';
import { weekDays, picksForDay } from '../../src/domain/week.mjs';

export default function Home() {
  const [category, setCategory] = useState('');
  const { width } = useWindowDimensions();
  const compact = width < 640;
  // Indicacoes da semana com calendario (pedido do Marco em 18/11/2026): as
  // datas sao calculadas do relogio do aparelho e tocar em um dia troca as
  // indicacoes exibidas. Sao sugestoes da curadoria local (obras reais) de o
  // que ver/ouvir/jogar no dia — NAO datas de lancamento nem eventos oficiais.
  const days = useMemo(() => weekDays(new Date()), []);
  const fallback = days[0]!;
  const todayIso = days.find((d) => d.isToday)?.iso ?? fallback.iso;
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const selectedDay = days.find((d) => d.iso === selectedIso) ?? fallback;
  const picks = useMemo(() => picksForDay(curatedMuralItems, selectedDay.date, 6), [selectedDay]);
  const items = category ? picks.filter((item) => item.category === category) : picks;
  return (
    <Screen maxWidth={1120}>
      <Text style={[styles.eyebrow, compact && { fontSize: 12, letterSpacing: 3 }]}>ORBIT / SUA SEMANA</Text>
      <Text style={[styles.title, compact && { fontSize: 29, lineHeight: 35 }]}>Indicações da semana.</Text>
      <Text style={[styles.body, compact && { fontSize: 15, lineHeight: 22 }]}>
        {compact ? 'Sugestões da curadoria local para cada dia. Não são datas de lançamento.' : 'Sugestões da curadoria local para cada dia da semana — o que ver, ouvir ou jogar, não datas de lançamento. Toque em um dia do calendário para ver as indicações dele.'}
      </Text>
      <WeekCalendar selectedIso={selectedDay.iso} onSelect={setSelectedIso} />
      <Categories value={category} onChange={setCategory} compact={compact} />
      <CuratedBadge />
      <MuralWall items={items} />
      <Link href="/(tabs)/discover" style={styles.link}>Explorar o catálogo real →</Link>
    </Screen>
  );
}
