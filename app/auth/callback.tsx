import React, { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { Platform, Text, TextInput } from 'react-native';
import { requireSupabase } from '../../src/lib/supabase';
import { Screen, Button, styles } from '../../src/components/ui';
import { passwordPolicyError } from '../../src/features/auth/validation.mjs';
import { acceptAuthCallback } from '../../src/features/auth/redirects.mjs';
export default function Callback() {
  const pending = useRef<{url: string; result: ReturnType<typeof acceptAuthCallback>} | null>(null);
  const url=Linking.useURL(); const [message,setMessage]=useState('Confirmando o link…');
  const [recovery,setRecovery]=useState(false); const [confirmed,setConfirmed]=useState(false); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(()=>{if(!url){setMessage('Abra o link enviado ao seu e-mail para continuar.');return;} let active=true;
    void (async()=>{try {
      // Reuse the one-time code exchange when React replays this effect.
      if (pending.current?.url !== url) pending.current = { url, result: acceptAuthCallback(requireSupabase(), url) };
      const result = await pending.current.result;
      if (!active) return;
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.history.replaceState(null, '', '/auth/callback');
      if(active){setRecovery(result.recovery);setConfirmed(!result.recovery);setMessage(result.recovery ? 'Defina sua nova senha.' : 'Acesso confirmado.');}
    }catch{if (!active) return; if (Platform.OS === 'web' && typeof window !== 'undefined') window.history.replaceState(null, '', '/auth/callback'); if(active)setMessage('O link é inválido ou expirou. Solicite um novo link.');}})();
    return ()=>{active=false;};
  },[url]);
  async function update(){const invalid=passwordPolicyError(password);if(invalid){setMessage(invalid);return;}setBusy(true);try{const {error}=await requireSupabase().auth.updateUser({password});if(error)throw error;setRecovery(false);setConfirmed(true);setPassword('');setMessage('Senha atualizada.');}catch{setMessage('Não foi possível atualizar a senha. Tente novamente.');}finally{setBusy(false);}}
  return <Screen><Text style={styles.eyebrow}>ORBIT</Text><Text accessibilityRole="alert" style={styles.body}>{message}</Text>{recovery && <><TextInput accessibilityLabel="Nova senha" placeholder="Nova senha" style={styles.input} secureTextEntry value={password} onChangeText={setPassword}/><Button label="Salvar nova senha" disabled={busy} onPress={()=>{void update();}}/></>}{confirmed && <Link href="/onboarding" style={styles.link}>Escolher meus gostos →</Link>}<Link href="/auth" style={styles.link}>Entrar ou solicitar outro link</Link><Link href="/" style={styles.link}>Voltar ao início</Link></Screen>;
    }
