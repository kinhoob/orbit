import React, { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { Text, TextInput } from 'react-native';
import { requireSupabase } from '../../src/lib/supabase';
import { Screen, Button, styles } from '../../src/components/ui';
import { passwordPolicyError } from '../../src/features/auth/validation.mjs';
export default function Callback() {
  const url=Linking.useURL(); const [message,setMessage]=useState('Confirmando o link…');
  const [recovery,setRecovery]=useState(false); const [confirmed,setConfirmed]=useState(false); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(()=>{if(!url)return; let active=true;
    void (async()=>{try {
      const parsed=new URL(url); const params=new URLSearchParams(parsed.hash.slice(1));
      const client=requireSupabase(); const code=parsed.searchParams.get('code');
      const access=params.get('access_token'); const refresh=params.get('refresh_token');
      const result=code ? await client.auth.exchangeCodeForSession(code) : access && refresh ? await client.auth.setSession({access_token:access,refresh_token:refresh}) : null;
      if(!result || result.error) throw new Error('Invalid link');
      if(active){const isRecovery=params.get('type')==='recovery' || parsed.searchParams.get('type')==='recovery';setRecovery(isRecovery);setConfirmed(!isRecovery);setMessage('Acesso confirmado.');}
    }catch{if(active)setMessage('O link é inválido ou expirou. Solicite um novo link.');}})();
    return ()=>{active=false;};
  },[url]);
  async function update(){const invalid=passwordPolicyError(password);if(invalid){setMessage(invalid);return;}setBusy(true);try{const {error}=await requireSupabase().auth.updateUser({password});if(error)throw error;setRecovery(false);setPassword('');setMessage('Senha atualizada.');}catch{setMessage('Não foi possível atualizar a senha. Tente novamente.');}finally{setBusy(false);}}
  return <Screen><Text style={styles.eyebrow}>ORBIT</Text><Text accessibilityRole="alert" style={styles.body}>{message}</Text>{recovery && <><TextInput accessibilityLabel="Nova senha" placeholder="Nova senha" style={styles.input} secureTextEntry value={password} onChangeText={setPassword}/><Button label="Salvar nova senha" disabled={busy} onPress={()=>{void update();}}/></>}{confirmed && <Link href="/onboarding" style={styles.link}>Escolher meus gostos →</Link>}<Link href="/" style={styles.link}>Voltar ao início</Link></Screen>;
}
