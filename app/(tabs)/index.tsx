import React from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen,styles } from '../../src/components/ui';
import { tokens } from '../../src/design/tokens';
export default function Home() {
  return <Screen><Text style={styles.eyebrow}>ORBIT / SEU UNIVERSO</Text><Text style={styles.title}>Gostos que levam você mais longe.</Text><Text style={styles.body}>Um lugar para descobrir sua próxima história e encontrar quem também se conecta com ela.</Text>
    <View style={[styles.card,{backgroundColor:tokens.colors.accent,padding:28,marginVertical:12}]}><Text style={styles.eyebrow}>ORBIT DAILY</Text><Text style={[styles.title,{fontSize:29,lineHeight:35}]}>Uma nova descoberta. Todos os dias.</Text><Text style={styles.body}>As recomendações pessoais chegam em uma próxima etapa. Enquanto isso, explore o catálogo e comece a registrar seus gostos.</Text><Link href="/(tabs)/discover" style={styles.link}>Explorar o catálogo →</Link></View>
    <Text style={[styles.title,{fontSize:24,lineHeight:30}]}>Seu mural começa aqui</Text><Text style={styles.body}>As publicações da comunidade e dos seus amigos aparecerão aqui quando o mural estiver disponível.</Text><Link href="/(tabs)/create" style={styles.link}>Registrar minha primeira avaliação →</Link>
  </Screen>;
}
