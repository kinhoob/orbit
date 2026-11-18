import React from 'react';
import { Text } from 'react-native';
import { Link } from 'expo-router';
import { Screen,styles } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/provider';
export default function Create() {
  const {session}=useAuth();
  return <Screen><Text style={styles.eyebrow}>CRIAR</Text><Text style={styles.title}>O que fez parte do seu universo?</Text><Text style={styles.body}>Escolha uma obra no catálogo para dar uma nota de 0 a 10 e escrever sua opinião.</Text><Link href="/(tabs)/discover" style={styles.link}>Escolher uma obra →</Link>{!session && <><Text style={styles.body}>Entre na sua conta para salvar suas avaliações.</Text><Link href="/auth" style={styles.link}>Entrar ou criar conta →</Link></>}</Screen>;
}
