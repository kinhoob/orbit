import React, { useState } from 'react';
import { Text, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { Screen, styles } from '../../src/components/ui';
import { Categories } from '../../src/components/catalog';
import { CuratedBadge, MuralWall } from '../../src/components/mural';
import { curatedMuralItems } from '../../src/features/home/curated-data.mjs';

export default function Home() {
  const [category, setCategory] = useState('');
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const items = category ? curatedMuralItems.filter((item) => item.category === category) : curatedMuralItems;
  return (
    <Screen maxWidth={1120}>
      <Text style={[styles.eyebrow, compact && { fontSize: 12, letterSpacing: 3 }]}>ORBIT / SEU UNIVERSO</Text>
      <Text style={[styles.title, compact && { fontSize: 29, lineHeight: 35 }]}>Gostos que levam você mais longe.</Text>
      <Text style={[styles.body, compact && { fontSize: 15, lineHeight: 22 }]}>
        {compact ? 'Descubra sua próxima história e quem se conecta com ela.' : 'Um lugar para descobrir sua próxima história e encontrar quem também se conecta com ela.'}
      </Text>
      <Categories value={category} onChange={setCategory} compact={compact} />
      <CuratedBadge />
      <MuralWall items={items} />
      <Link href="/(tabs)/discover" style={styles.link}>Explorar o catálogo real →</Link>
    </Screen>
  );
}
