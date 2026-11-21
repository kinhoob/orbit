import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { font, tokens as t } from '../design/tokens';
import { introSpec } from '../design/motion.mjs';
import { useReducedMotion } from './motion';

const MARK = 104;
const DOT = 9;

/**
 * Abertura do app (pedido do Marco em 21/11/2026): uma animação curta de
 * entrada e, só depois dela, as informações aparecem. O anel com o ponto em
 * órbita gira enquanto fontes e sessão carregam por baixo; com `ready`, a
 * marca completa o tempo mínimo e some em fade, revelando o app. Com reduzir
 * movimento, nada anima: o conteúdo aparece assim que está pronto.
 */
export function IntroGate({ ready, children }: React.PropsWithChildren<{ ready: boolean }>) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const word = useRef(new Animated.Value(0)).current;
  const startedAt = useRef<number | null>(null);

  // Órbita ambiente enquanto a abertura está na tela.
  useEffect(() => {
    if (reduced || revealed) return;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: introSpec(false).orbitDuration, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, revealed, spin]);

  // A preferência de movimento pode resolver depois da primeira renderização:
  // a decisão entre animar ou revelar direto só acontece quando `ready` chega.
  useEffect(() => {
    if (!ready || revealed) return;
    if (reduced) { setRevealed(true); return; }
    const spec = introSpec(false);
    if (startedAt.current == null) startedAt.current = Date.now();
    Animated.timing(word, { toValue: 1, duration: spec.wordDuration, delay: spec.wordDelay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const wait = Math.max(0, spec.minVisible - (Date.now() - startedAt.current));
    const timeout = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: spec.fadeOut, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
        if (finished) setRevealed(true);
      });
    }, wait);
    return () => clearTimeout(timeout);
  }, [ready, reduced, revealed, fade, word]);

  if (revealed) return <>{children}</>;

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={styles.root}>
      <View style={styles.content} accessibilityElementsHidden importantForAccessibility="no">{children}</View>
      <Animated.View style={[styles.overlay, { opacity: fade }]} accessibilityElementsHidden importantForAccessibility="no">
        <View style={styles.mark}>
          <View style={styles.ring} />
          <Animated.View style={[styles.orbit, { transform: [{ rotate }] }]}>
            <View style={styles.dot} />
          </Animated.View>
        </View>
        <Animated.Text style={[styles.wordmark, { opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>ORBIT</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.colors.dark },
  content: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.colors.dark, alignItems: 'center', justifyContent: 'center', gap: 22 },
  mark: { width: MARK, height: MARK, alignItems: 'center', justifyContent: 'center' },
  ring: { width: MARK - 24, height: MARK - 24, borderRadius: (MARK - 24) / 2, borderWidth: 2.5, borderColor: t.colors.onDark },
  orbit: { position: 'absolute', width: MARK, height: MARK, alignItems: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: t.colors.gold, marginTop: (24 - DOT) / 2 },
  wordmark: { fontFamily: font.extrabold, fontSize: 26, letterSpacing: 10, color: t.colors.onDark, marginLeft: 10 },
});
