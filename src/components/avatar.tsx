import React from 'react';
import { Image, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { font } from '../design/tokens';
import { avatarInitial } from '../domain/avatar.mjs';

/**
 * Avatar único do app (pedido do Marco em 24/11/2026): mostra a foto de
 * perfil quando existe e volta para a inicial quando não há foto, quando a
 * URL falha ao carregar ou depois que a foto é removida.
 */
export function Avatar({ uri, name, size = 44, backgroundColor, color, fontSize, style, accessibilityLabel }: {
  uri?: string | null; name?: string | null; size?: number; backgroundColor: string; color: string; fontSize?: number;
  style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const [failed, setFailed] = React.useState<string | null>(null);
  const showPhoto = !!uri && failed !== uri;
  return (
    <View accessibilityLabel={accessibilityLabel} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      {showPhoto
        ? <Image source={{ uri: uri as string }} onError={() => setFailed(uri as string)} style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
        : <Text style={{ color, fontFamily: font.bold, fontSize: fontSize ?? Math.round(size * 0.4) }}>{avatarInitial(name)}</Text>}
    </View>
  );
}
