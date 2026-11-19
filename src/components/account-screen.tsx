import React from 'react';
import { Text } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../features/auth/provider';
import { Screen, styles } from './ui';
import { LoadingState } from './loading';

export function AccountScreen({ title, children }: React.PropsWithChildren<{ title: string }>) {
  const { session, loading } = useAuth();
  return <Screen maxWidth={760}>
    <Link href="/(tabs)/profile" style={styles.link}>← Meu perfil</Link>
    <Text style={[styles.title, { fontSize: 30, lineHeight: 36 }]}>{title}</Text>
    {loading ? <LoadingState kind="feed" /> : !session ? <Link href="/auth" style={styles.link}>Entre para acessar esta área →</Link> : children}
  </Screen>;
}
