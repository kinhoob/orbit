import React from 'react';
import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/features/auth/provider';
import { entryRouteDecision } from '../src/features/auth/gate-state.mjs';
import { OrbitSpinner } from '../src/components/orbit-spinner';
import { font, tokens as t } from '../src/design/tokens';

/**
 * Porta de entrada do app: antes de entrar na conta, valida se existe uma
 * sessão confirmada pelo Auth (verificação no servidor em
 * src/features/auth/session-validation.ts). Com sessão válida, entra direto;
 * sem sessão, cai na tela de acesso. Enquanto a verificação corre, a marca
 * gira com o aviso de validação.
 */
export default function Index() {
  const { session, loading } = useAuth();
  const decision = entryRouteDecision(loading, !!session);
  if (decision === 'auth') return <Redirect href="/auth" />;
  if (decision === 'account') return <Redirect href="/(tabs)" />;
  return (
    <View style={styles.root}>
      <OrbitSpinner size={88} />
      <Text accessibilityRole="progressbar" style={styles.label}>Validando sua conta…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.colors.dark, alignItems: 'center', justifyContent: 'center', gap: 20 },
  label: { fontFamily: font.medium, fontSize: 14, color: t.colors.onDarkMuted },
});
