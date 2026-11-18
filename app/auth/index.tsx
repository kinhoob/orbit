import React, { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { Link, router } from 'expo-router';
import { Screen, Button, styles } from '../../src/components/ui';
import { requireSupabase } from '../../src/lib/supabase';
import { validateCredentials } from '../../src/features/auth/validation.mjs';
type Mode = 'login' | 'signup' | 'reset';
export default function AuthScreen() {
  const [mode,setMode]=useState<Mode>('login');
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const [failed,setFailed]=useState(false);
  async function submit() {
    setMessage(''); setFailed(false);
    const invalid=validateCredentials(email,mode==='reset' ? 'password' : password);
    if(invalid){setMessage(invalid);setFailed(true);return;}
    setBusy(true);
    try {
      const client=requireSupabase();
      const redirect=process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || 'orbit://auth/callback';
      const result=mode==='login' ? await client.auth.signInWithPassword({email:email.trim(),password}) : mode==='signup' ? await client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirect}}) : await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:redirect});
      if(result.error) throw result.error;
      if (mode === 'login') { router.replace('/(tabs)/profile'); return; }
      setMessage(mode==='signup' ? 'Cadastro enviado. Confira seu e-mail para confirmar a conta.' : 'Se houver uma conta com esse e-mail, você receberá o link de recuperação.');
    } catch {setFailed(true);setMessage('Não foi possível concluir. Confira os dados, a conexão e a configuração do Supabase.');}
    finally {setBusy(false);}
  }
  return <Screen><Link href="/" style={styles.link}>← Início</Link><Text style={styles.eyebrow}>ORBIT</Text><Text style={styles.title}>{mode==='login'?'Bom ter você por aqui.':mode==='signup'?'Crie seu universo.':'Recupere seu acesso.'}</Text>
    <Text style={styles.body}>E-mail</Text><TextInput accessibilityLabel="E-mail" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!busy}/>
    {mode!=='reset' && <><Text style={styles.body}>Senha · mínimo de 8 caracteres</Text><TextInput accessibilityLabel="Senha" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode==='signup'?'new-password':'current-password'} editable={!busy}/></>}
    <Button label={busy?'Aguarde…':mode==='login'?'Entrar':mode==='signup'?'Criar conta':'Enviar link'} onPress={()=>{void submit();}} disabled={busy}/>
    {!!message && <Text accessibilityRole="alert" style={failed?styles.error:styles.body}>{message}</Text>}
    {(['login','signup','reset'] as Mode[]).filter(item=>item!==mode).map(item=><Button key={item} label={item==='login'?'Já tenho conta':item==='signup'?'Quero criar uma conta':'Esqueci a senha'} disabled={busy} onPress={()=>{setMode(item);setMessage('');setPassword('');}}/>)}
  </Screen>;
}
