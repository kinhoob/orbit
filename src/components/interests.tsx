import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View } from 'react-native';
import { categories } from '../features/catalog/data';
import { MotionPressable } from './motion';
import { Button, styles } from './ui';
import { tokens as t } from '../design/tokens';

/** Optional local curation preferences; no claim of server recommendations. */
export function Interests({ account, onChange }: { account: string; onChange: (categories: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = `orbit:interests:v1:${account}`;
  useEffect(() => {
    let active = true;
    setReady(false);
    void AsyncStorage.getItem(key).then(raw => {
      if (!active) return;
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const value = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && categories.some(c => c.id === id)) : [];
      setSelected(value); onChange(value); setOpen(raw === null); setReady(true);
    }).catch(() => { if (active) { setReady(true); setOpen(true); } });
    return () => { active = false; };
  }, [key, onChange]);
  async function save(value: string[]) {
    setBusy(true); setError('');
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); setSelected(value); onChange(value); setOpen(false); }
    catch { setError('Não foi possível guardar sua seleção neste dispositivo. Tente novamente.'); }
    finally { setBusy(false); }
  }
  if (!ready) return null;
  if (!open) return <MotionPressable accessibilityRole="button" onPress={() => setOpen(true)}><Text style={styles.link}>Ajustar meus interesses →</Text></MotionPressable>;
  return <View style={styles.card}>
    <Text style={[styles.title, { fontSize: 23, lineHeight: 28 }]}>O que faz parte do seu universo?</Text>
    <Text style={styles.body}>Escolha seus interesses para organizar as indicações locais. Sua seleção fica salva neste dispositivo.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{categories.map(category => <MotionPressable key={category.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(category.id), disabled: busy }} disabled={busy} onPress={() => setSelected(current => current.includes(category.id) ? current.filter(id => id !== category.id) : [...current, category.id])} style={{ backgroundColor: selected.includes(category.id) ? t.colors.gold : t.colors.secondary, padding: 12, borderRadius: 999 }}><Text style={{ color: t.colors.text }}>{selected.includes(category.id) ? '✓ ' : ''}{category.label}</Text></MotionPressable>)}</View>
    <Button label={busy ? 'Guardando…' : 'Explorar meu universo'} disabled={busy} onPress={() => { void save(selected); }} />
    <MotionPressable accessibilityRole="button" disabled={busy} onPress={() => { void save([]); }}><Text style={styles.link}>Prefiro explorar tudo</Text></MotionPressable>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
      }
