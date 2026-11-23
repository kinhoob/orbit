import React from 'react';
import { MotionPressable, ScreenMotion } from './motion';
import { buttonColorsFor } from '../domain/cosmetics.mjs';
import { useWebPullToRefresh } from './pull-to-refresh';
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons';
import { font, tokens as t } from '../design/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = React.PropsWithChildren<{
  maxWidth?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  scrollRef?: React.RefObject<React.ComponentRef<typeof ScrollView> | null>;
  /** Conteúdo da zona escura fixa no topo (saudação + calendário na Início). */
  header?: React.ReactNode;
  /** Cor do topo tingida pela obra em destaque; padrão carvão. */
  headerTint?: string;
}>;

export function Screen({ children, maxWidth = 560, onRefresh, refreshing = false, scrollRef, header, headerTint }: ScreenProps) {
  const insets = useSafeAreaInsets();
  // Nativo: RefreshControl padrao para o GESTO, com spinner transparente de
  // proposito — a bolinha de carregar aparece sozinha, centralizada abaixo das
  // abas (pedido do Marco em 18/11/2026), sem spinner duplicado. Web: gesto
  // de puxar proprio (o RefreshControl do react-native-web e um stub sem gesto).
  const pull = useWebPullToRefresh(refreshing, onRefresh);
  const scroll = <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" onScroll={pull.enabled ? pull.onScroll : undefined} scrollEventThrottle={pull.enabled ? 16 : undefined} contentContainerStyle={[styles.screen, { paddingBottom: Math.max(insets.bottom + 110, 130) }]} refreshControl={!pull.enabled && onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="transparent" colors={['transparent']} progressBackgroundColor="transparent" /> : undefined}><ScreenMotion testID="screen-motion" style={[styles.content, { maxWidth }]}>{children}</ScreenMotion></ScrollView>;
  const body = !pull.enabled ? scroll : <View style={styles.pullRoot} {...pull.panHandlers}>
    <Animated.View pointerEvents="none" style={[styles.pullIndicator, { opacity: pull.pull.interpolate({ inputRange: [0, 24, 48], outputRange: [0, 0.35, 1], extrapolate: 'clamp' }) }]}>
      <View style={styles.pullSpinner}><Icon name="arrow-down" size={18} color={t.colors.accentStrong} /></View>
    </Animated.View>
    <Animated.View style={[styles.pullContent, { transform: [{ translateY: pull.pull }] }]}>{scroll}</Animated.View>
  </View>;
  // Estrutura aprovada em 19/11/2026: zona escura fixa no topo (carvão ou
  // tingida pela obra do dia) e painel creme de cantos arredondados que rola.
  return (
    <View style={[styles.root, { backgroundColor: headerTint || t.colors.dark, paddingTop: Math.max(insets.top, 12) }]}>
      {header ? <View style={styles.header}>{header}</View> : <View style={styles.headerSpacer} />}
      <View style={styles.panel}>{body}</View>
    </View>
  );
}

export function Button({ label, onPress, disabled = false, variant = 'primary', buttonTheme }: { label: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'outline'; buttonTheme?: string }) {
  const outline = variant === 'outline';
  const themed = !outline && buttonTheme ? buttonColorsFor(buttonTheme) : null;
  return <MotionPressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[outline ? styles.buttonOutline : styles.button, themed && { backgroundColor: themed.bg }, disabled && { opacity: 0.5 }]}><Text style={[outline ? styles.buttonOutlineText : styles.buttonText, themed && { color: themed.fg }]}>{label}</Text></MotionPressable>;
}

export const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 26, paddingTop: 14, paddingBottom: 26 },
  headerSpacer: { height: 56 },
  panel: { flex: 1, backgroundColor: t.colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  screen: { flexGrow: 1, backgroundColor: 'transparent', padding: 24, paddingTop: 30 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 18 },
  eyebrow: { fontSize: 12, letterSpacing: 3, fontFamily: font.bold, color: t.colors.muted },
  title: { fontSize: 34, fontFamily: font.extrabold, letterSpacing: -1, lineHeight: 40, color: t.colors.text },
  body: { fontSize: 16, lineHeight: 25, fontFamily: font.regular, color: t.colors.muted },
  card: { padding: 20, borderRadius: t.radius, backgroundColor: t.colors.surface, gap: 16, boxShadow: '0 4px 16px rgba(23,20,15,0.06)', elevation: 1 },
  input: { borderWidth: 1, borderColor: t.colors.border, borderRadius: 16, padding: 16, fontSize: 16, fontFamily: font.regular, color: t.colors.text, backgroundColor: t.colors.surface },
  button: { backgroundColor: t.colors.primary, paddingVertical: 11, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center', borderRadius: 999, alignItems: 'center' },
  buttonText: { color: t.colors.onDark, fontSize: 14, fontFamily: font.semibold, letterSpacing: 0.2 },
  link: { color: t.colors.text, fontSize: 15, fontFamily: font.semibold, paddingVertical: 10 },
  buttonOutline: { borderWidth: 1.5, borderColor: t.colors.primary, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  buttonOutlineText: { color: t.colors.text, fontSize: 14, fontFamily: font.semibold, letterSpacing: 0.2 },
  error: { color: t.colors.error, lineHeight: 22, fontFamily: font.regular },
  pullRoot: { flex: 1 },
  pullContent: { flex: 1 },
  pullIndicator: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  pullSpinner: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, borderRadius: 20, padding: 8 },
});
