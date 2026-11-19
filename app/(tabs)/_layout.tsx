import React from 'react';
import { Tabs } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { NAV_ITEMS, ResponsiveTabBar, SIDEBAR_BREAKPOINT, SIDEBAR_WIDTH } from '../../src/components/nav';
import { ProfileEdgeDrawer } from '../../src/components/drawer';
import { tokens } from '../../src/design/tokens';

/** Rotas fora da barra (Perfil, Salvos) — registradas para a navegação abrir de verdade. */
const EXTRA_SCREENS = [
  { name: 'profile', title: 'Perfil' },
  { name: 'saved', title: 'Salvos' },
] as const;

export default function MainTabs() {
  const { width } = useWindowDimensions();
  const side = width >= SIDEBAR_BREAKPOINT;
  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.dark }}>
      <Tabs
        tabBar={(props) => <ResponsiveTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: tokens.colors.dark, marginLeft: side ? SIDEBAR_WIDTH : 0 },
        }}
      >
        {[...NAV_ITEMS, ...EXTRA_SCREENS].map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />)}
      </Tabs>
      {/* Gaveta do Perfil: so no celular (no desktop a coluna lateral tem Perfil). */}
      {!side && <ProfileEdgeDrawer />}
    </View>
  );
}
