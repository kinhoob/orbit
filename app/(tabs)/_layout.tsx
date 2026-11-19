import React from 'react';
import { Tabs } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { NAV_ITEMS, ResponsiveTabBar, SIDEBAR_BREAKPOINT, SIDEBAR_WIDTH } from '../../src/components/nav';
import { ProfileEdgeDrawer } from '../../src/components/drawer';
import { tokens } from '../../src/design/tokens';

export default function MainTabs() {
  const { width } = useWindowDimensions();
  const side = width >= SIDEBAR_BREAKPOINT;
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <ResponsiveTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: tokens.colors.background, marginLeft: side ? SIDEBAR_WIDTH : 0 },
        }}
      >
        {NAV_ITEMS.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />)}
      </Tabs>
      {/* Gaveta do Perfil: so no celular (no desktop a coluna lateral tem Perfil). */}
      {!side && <ProfileEdgeDrawer />}
    </View>
  );
}
