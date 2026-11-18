import React, { useEffect,useState } from 'react';
import { Text,TextInput } from 'react-native';
import { Link } from 'expo-router';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Screen,styles,Button } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/provider';
import { requireSupabase } from '../../src/lib/supabase';
export default function Profile() {
  const {session,loading}=useAuth();const cache=useQueryClient();
  const [name,setName]=useState('');const [username,setUsername]=useState('');const [bio,setBio]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  const query=useQuery({queryKey:['profile',session?.user.id],enabled:!!session,queryFn:async()=>{const {data,error}=await requireSupabase().from('profiles').select('display_name,username,bio').eq('id',session!.user.id).single();if(error)throw error;return data;}});
  useEffect(()=>{setName(query.data?.display_name || '');setUsername(query.data?.username || '');setBio(query.data?.bio || '');setMessage('');},[query.data,session?.user.id]);
  async function save(){if(!session)return;if(!/^[a-z0-9_]{3,30}$/.test(username)){setMessage('Use um username de 3 a 30 letras minúsculas, números ou _.');return;}setBusy(true);setMessage('');try{const {error}=await requireSupabase().from('profiles').update({display_name:name.trim(),username,bio:bio.trim()}).eq('id',session.user.id);if(error)throw error;await cache.invalidateQueries({queryKey:['profile',session.user.id]});setMessage('Perfil atualizado.');}catch{setMessage('Não foi possível salvar. O username pode estar em uso.');}finally{setBusy(false);}}
  async function signout(){setBusy(true);try{const {error}=await requireSupabase().auth.signOut();if(error)throw error;cache.clear();}catch{setMessage('Não foi possível sair. Tente novamente.');}finally{setBusy(false);}}
  return <Screen><Text style={styles.eyebrow}>PERFIL</Text><Text style={styles.title}>{name || 'Um universo só seu.'}</Text>
    {loading?<Text style={styles.body}>Carregando sessão…</Text>:!session?<><Text style={styles.body}>Crie seu perfil para registrar gostos e construir sua biblioteca.</Text><Link href="/auth" style={styles.link}>Entrar ou criar conta →</Link></>:<>
      <Text style={styles.body}>{session.user.email}</Text>{query.isPending?<Text style={styles.body}>Carregando seu perfil…</Text>:query.isError?<><Text style={styles.error}>Não foi possível carregar seu perfil. Verifique se as migrations foram aplicadas.</Text><Button label="Tentar novamente" onPress={()=>{void query.refetch();}}/></>:<>
      <Text style={styles.body}>Nome</Text><TextInput style={styles.input} accessibilityLabel="Nome" value={name} onChangeText={setName} maxLength={80} editable={!busy}/><Text style={styles.body}>Username</Text><TextInput style={styles.input} accessibilityLabel="Username" autoCapitalize="none" value={username} onChangeText={setUsername} maxLength={30} editable={!busy}/><Text style={styles.body}>Biografia</Text><TextInput style={[styles.input,{minHeight:110,textAlignVertical:'top'}]} accessibilityLabel="Biografia" multiline value={bio} onChangeText={setBio} maxLength={500} editable={!busy}/><Button label={busy?'Salvando…':'Salvar perfil'} disabled={busy} onPress={()=>{void save();}}/></>}
      <Button label="Sair da conta" disabled={busy} onPress={()=>{void signout();}}/>{!!message&&<Text accessibilityRole="alert" style={styles.body}>{message}</Text>}
    </>}
  </Screen>;
}
