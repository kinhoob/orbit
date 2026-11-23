import AsyncStorage from '@react-native-async-storage/async-storage';
import { toggleMuted } from '../../domain/mute.mjs';

// Silenciar conversas fica só no aparelho (AsyncStorage): esconde a contagem
// de não lidas daquela conversa na lista. O ORBIT ainda não tem notificações
// push, então não há nada além da contagem para suprimir — nada é prometido
// além disso. Se um dia houver push, a preferência migra para o banco.

const storageKey = (userId: string) => `orbit-muted-conversations:${userId}`;

export async function fetchMutedConversations(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export async function setConversationMuted(userId: string, otherId: string): Promise<string[]> {
  const current = await fetchMutedConversations(userId);
  const next = toggleMuted(current, otherId);
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    // Sem persistência local, o silenciar simplesmente não sobrevive ao reload.
  }
  return next;
}
