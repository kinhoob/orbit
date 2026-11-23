import React, { useEffect,useState } from 'react';
import { Text,TextInput,View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Screen,styles,Button } from '../../src/components/ui';
import { CatalogGrid } from '../../src/components/catalog';
import type { MediaItem } from '../../src/features/catalog/data';
import { Icon } from '../../src/components/icons';
import { MotionPressable } from '../../src/components/motion';
import { tokens } from '../../src/design/tokens';
import { useAuth } from '../../src/features/auth/provider';
import { requireSupabase } from '../../src/lib/supabase';
import { ProfileTimeline } from '../../src/components/profile-timeline';
import { ProfileTabs, PinnedFavorites } from '../../src/components/profile-tabs';
import { SharedCollections } from '../../src/components/shared-collections';
import { ProfileHero } from '../../src/components/profile-hero';
import { ProfileStatsRow } from '../../src/components/profile-stats';

export default function Profile() {
  const {session,loading}=useAuth();const cache=useQueryClient();
  const [name,setName]=useState('');const [username,setUsername]=useState('');const [bio,setBio]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [editing,setEditing]=useState(false);const [tab,setTab]=useState('timeline');
  const query=useQuery({queryKey:['profile',session?.user.id],enabled:!!session,queryFn:async()=>{const {data,error}=await requireSupabase().from('profiles').select('*').eq('id',session!.user.id).single();if(error)throw error;return data;}});
  const savedQuery=useQuery({queryKey:['saved',session?.user.id],enabled:!!session,queryFn:async()=>{
    const client=requireSupabase();const {data,error}=await client.from('saved_items').select('media_item_id').eq('user_id',session!.user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;
    const ids=(data || []).map(row=>row.media_item_id as string);if(!ids.length)return [];
    const result=await client.from('media_items').select('*').in('id',ids);if(result.error)throw result.error;
    return ids.map(id=>(result.data as MediaItem[]).find(item=>item.id===id)).filter((item):item is MediaItem=>!!item);
  }});
  useEffect(()=>{setName(query.data?.display_name || '');setUsername(query.data?.username || '');setBio(query.data?.bio || '');setMessage('');},[query.data,session?.user.id]);
  async function save(){if(!session)return;if(!/^[a-z0-9_]{3,30}$/.test(username)){setMessage('Use um username de 3 a 30 letras minúsculas, números ou _.');return;}setBusy(true);setMessage('');try{const {error}=await requireSupabase().from('profiles').update({display_name:name.trim(),username,bio:bio.trim()}).eq('id',session.user.id);if(error)throw error;await cache.invalidateQueries({queryKey:['profile',session.user.id]});await cache.invalidateQueries({queryKey:['account-menu',session.user.id]});setMessage('Perfil atualizado.');setEditing(false);}catch{setMessage('Não foi possível salvar. O username pode estar em uso.');}finally{setBusy(false);}}
  async function signout(){setBusy(true);try{const {error}=await requireSupabase().auth.signOut();if(error)throw error;cache.clear();}catch{setMessage('Não foi possível sair. Tente novamente.');}finally{setBusy(false);}}
  return <Screen><Text style={styles.eyebrow}>PERFIL</Text>
    {loading?<Text style={styles.body}>Carregando sessão…</Text>:!session?<View style={{gap:18}}>
      <View style={{width:72,height:72,borderRadius:36,backgroundColor:tokens.colors.secondary,alignItems:'center',justifyContent:'center'}}><Icon name="user" size={32} color={tokens.colors.muted} /></View>
      <Text style={styles.title}>Um universo só seu.</Text>
      <Text style={styles.body}>Crie seu perfil para registrar gostos e construir sua biblioteca.</Text>
      <Link href="/auth" style={styles.link}>Entrar ou criar conta →</Link>
    </View>:<>
      {query.isPending?<Text style={styles.body}>Carregando seu perfil…</Text>:query.isError?<><Text style={styles.error}>Não foi possível carregar seu perfil. Verifique se as migrations foram aplicadas.</Text><Button label="Tentar novamente" onPress={()=>{void query.refetch();}}/></>:<>
      <ProfileHero profile={{...query.data,display_name:name,username}} />
      {!!bio&&<Text style={styles.body}>{bio}</Text>}
      <ProfileStatsRow profileId={session.user.id} own />
      <Link href="/achievements" style={styles.link}>Conquistas e insígnias →</Link>
      <Link href="/customize" style={styles.link}>Personalizar perfil</Link>
      {!editing&&<MotionPressable accessibilityRole="button" onPress={()=>setEditing(true)} style={styles.buttonOutline}><Text style={styles.buttonOutlineText}>Editar perfil</Text></MotionPressable>}
      {editing&&<View style={{gap:14}}>
        <Text style={styles.body}>Nome</Text><TextInput style={styles.input} accessibilityLabel="Nome" value={name} onChangeText={setName} maxLength={80} editable={!busy}/>
        <Text style={styles.body}>Username</Text><TextInput style={styles.input} accessibilityLabel="Username" autoCapitalize="none" value={username} onChangeText={setUsername} maxLength={30} editable={!busy}/>
        <Text style={styles.body}>Biografia</Text><TextInput style={[styles.input,{minHeight:110,textAlignVertical:'top'}]} accessibilityLabel="Biografia" multiline value={bio} onChangeText={setBio} maxLength={500} editable={!busy}/>
        <Button label={busy?'Salvando…':'Salvar perfil'} disabled={busy} onPress={()=>{void save();}}/>
        <MotionPressable accessibilityRole="button" onPress={()=>{setEditing(false);setMessage('');}} style={styles.buttonOutline}><Text style={styles.buttonOutlineText}>Cancelar</Text></MotionPressable>
      </View>}
      </>}
      <PinnedFavorites profileId={session.user.id} own />
      <ProfileTabs own active={tab} onChange={setTab} />
      {tab==='timeline'&&<ProfileTimeline profileId={session.user.id} />}
      {tab==='collections'&&<><SharedCollections profileId={session.user.id} /><Link href="/collections" style={styles.link}>Todas as minhas coleções →</Link></>}
      {tab==='saved'&&<View style={{gap:12}}>
        <Text style={styles.eyebrow}>SEUS SALVOS</Text>
        <Text style={styles.body}>Privados, só aparecem no seu perfil. Até 100 obras recentes.</Text>
        {savedQuery.isPending?<Text style={styles.body}>Carregando sua biblioteca…</Text>:savedQuery.isError?<><Text style={styles.error}>Não foi possível carregar seus salvos.</Text><Button label="Tentar novamente" onPress={()=>{void savedQuery.refetch();}}/></>:savedQuery.data?.length?<CatalogGrid items={savedQuery.data}/>:<View style={{gap:16}}><View style={{width:72,height:72,borderRadius:36,backgroundColor:tokens.colors.secondary,alignItems:'center',justifyContent:'center'}}><Icon name="bookmark" size={30} color={tokens.colors.muted} /></View><Text style={styles.body}>Sua próxima descoberta ainda não está aqui. Salve uma obra para encontrá-la depois.</Text><Link href="/(tabs)/discover" style={styles.link}>Encontrar algo novo →</Link></View>}
      </View>}
      <Link href="/library" style={styles.link}>Minha biblioteca completa</Link>
      <Link href="/friends" style={styles.link}>Amizades →</Link><Button label="Sair da conta" disabled={busy} onPress={()=>{void signout();}}/>{!!message&&<Text accessibilityRole="alert" style={styles.body}>{message}</Text>}
    </>}
  </Screen>;
      }
