import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/features/auth/provider';
import { MotionProvider, useReducedMotion } from '../src/components/motion';
function Routes() {
  const reduced = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'slide_from_right', animationDuration: 220 }} />;
}
export default function RootLayout() {
  const [client] = useState(() => new QueryClient({defaultOptions:{queries:{retry:1,staleTime:30000}}}));
  return <SafeAreaProvider><QueryClientProvider client={client}><AuthProvider><MotionProvider><Routes /></MotionProvider></AuthProvider></QueryClientProvider></SafeAreaProvider>;
}

