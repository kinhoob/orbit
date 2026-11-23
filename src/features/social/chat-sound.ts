import { Platform } from 'react-native';

// Efeito sonoro curto do chat (pedido do Marco em 22/11/2026): um "pop"
// sintetizado via Web Audio — sem arquivo de áudio e sem dados externos.
// No nativo ainda não há player instalado (expo-av não é dependência do
// projeto); lá o som simplesmente não toca, sem fingir. Quem chama decide
// quando NÃO tocar (conversa silenciada, por exemplo).

type WebAudioWindow = typeof window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
let shared: AudioContext | null = null;

export function playChatPop(kind: 'send' | 'receive') {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const w = window as WebAudioWindow;
    const Ctor = w.AudioContext || w.webkitAudioContext;
    if (!Ctor) return;
    shared = shared || new Ctor();
    const ctx = shared;
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(kind === 'send' ? 520 : 380, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'send' ? 760 : 520, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch {
    // Áudio indisponível: o chat continua funcionando em silêncio.
  }
}
