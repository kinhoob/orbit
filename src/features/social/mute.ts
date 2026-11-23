import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, requireSupabase } from '../../lib/supabase';
import { toggleMuted } from '../../domain/mute.mjs';

// Silenciar conversas. A persistência definitiva é a tabela conversation_mutes
// (migration 20261123013000, em revisão — ainda não aplicada). Enquanto ela
// não existe no banco, a preferência fica só no aparelho (AsyncStorage) e o
// app não finge que sincronizou. O ORBIT não tem notificações push: silenciar
// esconde a contagem de não lidas da conversa na lista, e só isso.

const storageKey = (userId: string) => `orbit-muted-conversations:${userId}`;

async function fetchLocal(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function persistLocal(userId: string, next: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    // Sem persistência local, o silenciar simplesmente não sobrevive ao reload.
  }
}

export async function fetchMutedConversations(userId: string): Promise<string[]> {
  if (supabase) {
    try {
      const { data, error } = await requireSupabase().from('conversation_mutes').select('other_id').eq('user_id', userId);
      if (!error && data) return data.map((row) => row.other_id as string);
      // Tabela ainda não aplicada (ou falha de rede): cai no armazenamento local.
    } catch {
      // Sem conexão: cai no armazenamento local.
    }
  }
  return fetchLocal(userId);
}

export async function setConversationMuted(userId: string, otherId: string): Promise<string[]> {
  const current = await fetchMutedConversations(userId);
  const next = toggleMuted(current, otherId);
  const muting = next.includes(otherId);
  let persistedRemote = false;
  if (supabase) {
    try {
      const client = requireSupabase();
      const { error } = muting
        ? await client.from('conversation_mutes').insert({ user_id: userId, other_id: otherId })
        : await client.from('conversation_mutes').delete().eq('user_id', userId).eq('other_id', otherId);
      persistedRemote = !error;
    } catch {
      persistedRemote = false;
    }
  }
  if (!persistedRemote) await persistLocal(userId, next);
  return next;
}
