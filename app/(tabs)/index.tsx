import React, { useState } from 'react';
import { Text } from 'react-native';
import { Link } from 'expo-router';
import { Screen, styles } from '../../src/components/ui';
import { Categories } from '../../src/components/catalog';
import { DemoBadge, MuralWall } from '../../src/components/mural';
import { demoMuralItems } from '../../src/features/home/demo-data';

export default function Home() {
  const [category, setCategory] = useState('');
  const items = category ? demoMuralItems.filter((item) => item.category === category) : demoMuralItems;
  return (
    <Screen maxWidth={1120}>
      <Text style={styles.eyebrow}>ORBIT / SEU UNIVERSO</Text>
      <Text style={styles.title}>Gostos que levam você mais longe.</Text>
      <Text style={styles.body}>Um lugar para descobrir sua próxima história e encontrar quem também se conecta com ela.</Text>
      <Categories value={category} onChange={setCategory} />
      <DemoBadge />
      <MuralWall items={items} />
      <Link href="/(tabs)/discover" style={styles.link}>Explorar o catálogo real →</Link>
    </Screen>
  );
}
