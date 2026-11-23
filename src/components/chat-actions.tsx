import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, styles } from './ui';
import { MotionPressable, useReducedMotion } from './motion';
import { Icon, type IconName } from './icons';
import { tokens as t, font } from '../design/tokens';

// Menu de três pontinhos da CONVERSA (pedido do Marco em 22/11/2026, com a
// referência de chat que ele mandou): prévia do perfil e silenciar. É outra
// superfície do menu "+" do perfil — lá ações de relação, aqui da conversa.
// Mesmo padrão de animação do menu do perfil: abre e recolhe com mola.

const menuNativeDriver = Platform.OS !== 'web';

export function ChatMenu({ onPreview, muted, onToggleMute }: {
  onPreview: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (reduced) {
      progress.setValue(open ? 1 : 0);
      setVisible(open);
      return;
    }
    if (open) {
      setVisible(true);
      Animated.spring(progress, { toValue: 1, useNativeDriver: menuNativeDriver, stiffness: 420, damping: 28, mass: 0.7 }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 130, easing: Easing.out(Easing.cubic), useNativeDriver: menuNativeDriver }).start(({ finished }) => { if (finished) setVisible(false); });
    }
  }, [open, reduced, progress]);

  const items: { key: string; label: string; icon: IconName; onPress: () => void }[] = [
    { key: 'preview', label: 'Ver perfil', icon: 'user', onPress: onPreview },
    { key: 'mute', label: muted ? 'Ativar mensagens' : 'Silenciar mensagens', icon: muted ? 'bell' : 'bell-off', onPress: onToggleMute },
  ];
  return (
    <View style={chatMenu.root}>
      <MotionPressable accessibilityRole="button" accessibilityLabel="Opções da conversa" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={chatMenu.toggle}>
        <Icon name="ellipsis" size={22} color={t.colors.text} />
      </MotionPressable>
      {visible && (
        <Animated.View style={[styles.card, chatMenu.dropdown, {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        }]}>
          {items.map((item) => (
            <MotionPressable key={item.key} accessibilityRole="button" onPress={() => { setOpen(false); item.onPress(); }} style={chatMenu.item}>
              <Icon name={item.icon} size={16} color={t.colors.muted} />
              <Text style={styles.body}>{item.label}</Text>
            </MotionPressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

/** Prévia do perfil dentro da conversa: só os campos que a pessoa já pode ver
 * na conversa, com caminho para o perfil completo. */
export function ProfilePreviewCard({ name, username, onOpen }: { name: string; username?: string | null; onOpen: () => void }) {
  return (
    <View style={[styles.card, { gap: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={chatMenu.avatar}><Text style={chatMenu.avatarText}>{name.trim().charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={chatMenu.name}>{name}</Text>
          {!!username && <Text style={styles.body}>@{username}</Text>}
        </View>
      </View>
      <Button variant="outline" label="Abrir perfil" onPress={onOpen} />
    </View>
  );
}

const chatMenu = StyleSheet.create({
  root: { position: 'relative', zIndex: 20 },
  toggle: { padding: 12 },
  dropdown: { position: 'absolute', top: 48, right: 0, minWidth: 220, gap: 4, zIndex: 20, padding: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: t.colors.onDark, fontSize: 18, fontFamily: font.bold },
  name: { fontSize: 16, fontFamily: font.semibold, color: t.colors.text },
});
