import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/features/auth/provider';
export default function RootLayout() {
  const [client] = useState(() => new QueryClient({defaultOptions:{queries:{retry:1,staleTime:30000}}}));
  return <SafeAreaProvider><QueryClientProvider client={client}><AuthProvider><Stack screenOptions={{headerShown:false}} /></AuthProvider></QueryClientProvider></SafeAreaProvider>;
}
