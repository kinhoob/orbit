import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { AuthProvider } from '../src/features/auth/provider';
import { TasteGate } from '../src/features/auth/taste-gate';
import { MotionProvider, useReducedMotion } from '../src/components/motion';
import { IntroGate } from '../src/components/intro';
import { font, tokens } from '../src/design/tokens';

function Routes() {
  const reduced = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'slide_from_right', animationDuration: 220, contentStyle: { backgroundColor: tokens.colors.dark } }} />;
}

/** Na web, textos sem familia explicita herdam a Inter e o fundo acompanha o carvão. */
function useWebBaseStyle() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const tag = document.createElement('style');
    tag.textContent = `body{font-family:'${font.regular}',system-ui,sans-serif;background:${tokens.colors.dark};}`;
    document.head.appendChild(tag);
    return () => { tag.remove(); };
  }, []);
}

export default function RootLayout() {
  const [client] = useState(() => new QueryClient({defaultOptions:{queries:{retry:1,staleTime:30000}}}));
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  useWebBaseStyle();
  // Enquanto as fontes carregam, a animação de entrada cobre a tela (pedido do
  // Marco em 21/11/2026); com reduzir movimento, o conteúdo aparece direto.
  return <SafeAreaProvider><QueryClientProvider client={client}><AuthProvider><MotionProvider><IntroGate ready={loaded || !!error}><TasteGate><Routes /></TasteGate></IntroGate></MotionProvider></AuthProvider></QueryClientProvider></SafeAreaProvider>;
}
