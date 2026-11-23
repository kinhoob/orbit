import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, styles } from './ui';
import { MotionPressable, useReducedMotion } from './motion';
import { Icon, type IconName } from './icons';
import { tokens as t, font } from '../design/tokens';
import { parseGifBody } from '../domain/gif.mjs';

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

// Bolha de mensagem com entrada animada (pedido do Marco em 22/11/2026: animar
// ao enviar e ao chegar) e estados REAIS no rodapé das minhas mensagens:
// enviada (INSERT confirmou), entregue (o aparelho da outra pessoa confirmou
// o recebimento) e lida (ela abriu a conversa). Sem estado inventado: enquanto
// o envio não confirma, a bolha diz "enviando…".

export type MessageState = 'sending' | 'sent' | 'delivered' | 'read';

const stateLabel: Record<MessageState, string> = {
  sending: 'enviando',
  sent: 'enviada',
  delivered: 'entregue',
  read: 'lida',
};

function StatusTicks({ state }: { state: MessageState }) {
  if (state === 'sending') return <Text style={bubbleStyles.sendingText}>enviando…</Text>;
  const color = state === 'read' ? t.colors.accent : t.colors.onDark;
  const dim = state === 'sent' ? 0.65 : 1;
  return (
    <View style={bubbleStyles.ticks} accessibilityLabel={stateLabel[state]}>
      <View style={{ opacity: dim }}><Icon name="check" size={11} color={color} /></View>
      {state !== 'sent' && <View style={{ marginLeft: -5 }}><Icon name="check" size={11} color={color} /></View>}
    </View>
  );
}

export function ChatBubble({ mine, body, time, state, animate }: {
  mine: boolean;
  body: string;
  time: string;
  state: MessageState;
  animate: boolean;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(animate && !reduced ? 0 : 1)).current;
  useEffect(() => {
    if (!animate || reduced) {
      progress.setValue(1);
      return;
    }
    // Entrada minimalista (revisão visual 23/11/2026): deslize curto com mola
    // bem amortecida e um toque de escala — suave, sem quicar.
    Animated.spring(progress, { toValue: 1, useNativeDriver: menuNativeDriver, stiffness: 280, damping: 30, mass: 0.7 }).start();
  }, [animate, reduced, progress]);
  const gifUrl = parseGifBody(body);
  return (
    <Animated.View
      accessibilityLabel={gifUrl
        ? `${mine ? 'Você' : 'A outra pessoa'} enviou um GIF${mine ? `. Mensagem ${stateLabel[state]}` : ''}`
        : `${mine ? 'Você' : 'A outra pessoa'}: ${body}${mine ? `. Mensagem ${stateLabel[state]}` : ''}`}
      style={[bubbleStyles.bubble, mine ? bubbleStyles.mine : bubbleStyles.theirs, gifUrl && bubbleStyles.gifBubble, {
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
        ],
      }]}
    >
      {gifUrl ? (
        <Image source={{ uri: gifUrl }} style={bubbleStyles.gif} accessibilityLabel="GIF" />
      ) : (
        <Text style={mine ? bubbleStyles.mineText : bubbleStyles.theirsText}>{body}</Text>
      )}
      <View style={bubbleStyles.footer}>
        <Text style={[bubbleStyles.time, mine && bubbleStyles.timeMine]}>{time}</Text>
        {mine && <StatusTicks state={state} />}
      </View>
    </Animated.View>
  );
}

const bubbleStyles = StyleSheet.create({
  // Bolhas minimalistas (revisão visual 23/11/2026): raio uniforme (sem
  // "rabinho"), bastante respiro interno, e a da outra pessoa com contorno
  // fino em vez de bloco cheio — o painel creme continua protagonista.
  bubble: { maxWidth: '85%', paddingVertical: 11, paddingHorizontal: 15, borderRadius: 18 },
  gifBubble: { paddingVertical: 6, paddingHorizontal: 6 },
  gif: { width: 200, height: 200, borderRadius: 14, backgroundColor: t.colors.surface },
  mine: { alignSelf: 'flex-end', backgroundColor: t.colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
  mineText: { color: t.colors.onDark, fontSize: 15, lineHeight: 22 },
  theirsText: { color: t.colors.text, fontSize: 15, lineHeight: 22 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 },
  time: { fontSize: 11, color: t.colors.muted, fontFamily: font.regular, opacity: 0.8 },
  timeMine: { color: t.colors.onDark, opacity: 0.55 },
  ticks: { flexDirection: 'row', alignItems: 'center' },
  sendingText: { fontSize: 11, color: t.colors.onDark, opacity: 0.55, fontFamily: font.regular, fontStyle: 'italic' },
});

/** Indicador "digitando" (pedido do Marco em 23/11/2026): bolha no estilo
 * da outra pessoa com três pontos pulsando em sequência. Só é renderizado
 * quando um broadcast REAL de digitação chega (ver app/messages/[id].tsx) —
 * nunca como enfeite. Com movimento reduzido, os pontos ficam estáticos. */
export function TypingBubble({ label }: { label: string }) {
  const reduced = useReducedMotion();
  const loop = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      entrance.setValue(1);
      loop.setValue(0.5);
      return;
    }
    Animated.timing(entrance, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: menuNativeDriver }).start();
    const animation = Animated.loop(
      Animated.timing(loop, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: menuNativeDriver }),
    );
    animation.start();
    return () => animation.stop();
  }, [reduced, loop, entrance]);
  const dots = [0, 1, 2].map((i) => {
    const start = i / 3;
    const peak = start + 1 / 6;
    const end = start + 1 / 3;
    return {
      opacity: reduced ? 0.45 : loop.interpolate({ inputRange: [start, peak, end, 1], outputRange: [0.25, 1, 0.25, 0.25], extrapolate: 'clamp' }),
      translateY: reduced ? 0 : loop.interpolate({ inputRange: [start, peak, end, 1], outputRange: [0, -2.5, 0, 0], extrapolate: 'clamp' }),
    };
  });
  return (
    <Animated.View
      accessibilityLabel={label}
      style={[bubbleStyles.bubble, bubbleStyles.theirs, typingStyles.bubble, {
        opacity: entrance,
        transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }]}
    >
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[typingStyles.dot, { opacity: dot.opacity, transform: [{ translateY: dot.translateY }] }]} />
      ))}
    </Animated.View>
  );
}

const typingStyles = StyleSheet.create({
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.colors.muted },
});

/** Painéis do composer (GIF e emoji) entram com um deslize curto e fade —
 * mesma linguagem suave das bolhas, desligado com movimento reduzido. */
export function PanelReveal({ children }: React.PropsWithChildren) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    Animated.timing(progress, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: menuNativeDriver }).start();
  }, [reduced, progress]);
  return (
    <Animated.View style={{
      opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}
