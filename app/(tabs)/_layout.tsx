import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SIDEBAR_BREAKPOINT, SIDEBAR_WIDTH } from '../../src/components/nav';
import { ScreenPager } from '../../src/components/screen-pager';
import { ProfileEdgeDrawer } from '../../src/components/drawer';
import { tokens } from '../../src/design/tokens';

/**
 * As cinco telas da barra (Início, Explorar, Criar, Busca, Sino) vivem num
 * pager persistente: cada uma monta uma vez e desliza com o dedo na troca de
 * telas (pedido do Marco em 19/11/2026). Perfil e Salvos abrem por cima dele.
 */
export default function MainTabs() {
  const { width } = useWindowDimensions();
  const side = width >= SIDEBAR_BREAKPOINT;
  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.dark }}>
      <ScreenPager marginLeft={side ? SIDEBAR_WIDTH : 0} />
      {/* Gaveta do Perfil: so no celular (no desktop a coluna lateral tem Perfil). */}
      {!side && <ProfileEdgeDrawer />}
    </View>
  );
}
