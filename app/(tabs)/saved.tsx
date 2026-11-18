import React from 'react';
import { Redirect } from 'expo-router';

// Os salvos moram dentro do próprio perfil (decisão do Marco, 18/11/2026).
// Esta rota só redireciona para não quebrar links antigos.
export default function SavedRedirect() {
  return <Redirect href="/(tabs)/profile" />;
}
