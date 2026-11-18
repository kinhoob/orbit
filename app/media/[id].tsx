import React, { useEffect, useState } from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Screen, styles } from '../../src/components/ui';
import { categories, type MediaItem } from '../../src/features/catalog/data';
import { useAuth } from '../../src/features/auth/provider';
import { requireSupabase, supabase } from '../../src/lib/supabase';
import { parseScore } from '../../src/domain/rating.mjs';

export default function MediaDetail() {
  const params=useLocalSearchParams<{id:string}>();const id=Array.isArray(params.id)?params.id[0]:params.id;
  const {session}=useAuth();const userId=session?.user.id;const cache=useQueryClient();
  const [score,setScore]=useState('');const [review,setReview]=useState('');const [visibility,setVisibility]=useState('public');
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const media=useQuery({queryKey:['media',id,userId],enabled:!!supabase&&!!id,queryFn:async()=>{
    const {data,error}=await requireSupabase().from('media_items').select('*').eq('id',id!).maybeSingle();if(error)throw error;return data as MediaItem|null;
  }});
  const state=useQuery({queryKey:['media-state',id,userId],enabled:!!userId&&!!id,queryFn:async()=>{
    const client=requireSupabase();const [saved,rating]=await Promise.all([
      client.from('saved_items').select('media_item_id').eq('user_id',userId!).eq('media_item_id',id!).maybeSingle(),
      client.from('ratings').select('score,review,visibility').eq('user_id',userId!).eq('media_item_id',id!).maybeSingle(),
    ]);if(saved.error)throw saved.error;if(rating.error)throw rating.error;return {saved:!!saved.data,rating:rating.data};
  }});
  useEffect(()=>{setScore(state.data?.rating ? String(state.data.rating.score) : '');setReview(state.data?.rating?.review || '');setVisibility(state.data?.rating?.visibility || 'public');setMessage('');},[state.data,id,userId]);
  async function invalidate(){await Promise.all([cache.invalidateQueries({queryKey:['media-state',id,userId]}),cache.invalidateQueries({queryKey:['saved',userId]})]);}
  async function toggleSave(){if(!userId||!id)return;setBusy(true);setMessage('');try{
    const client=requireSupabase();const result=state.data?.saved?await client.from('saved_items').delete().eq('user_id',userId).eq('media_item_id',id):await client.from('saved_items').upsert({user_id:userId,media_item_id:id},{onConflict:'user_id,media_item_id',ignoreDuplicates:true});
    if(result.error)throw result.error;await invalidate();setMessage(state.data?.saved?'Obra removida dos salvos.':'Obra salva na sua biblioteca.');
  }catch{setMessage('Não foi possível atualizar os salvos. Tente novamente.');}finally{setBusy(false);}}
  async function saveRating(){if(!userId||!id)return;const parsed=parseScore(score);if(parsed===null){setMessage('Informe uma nota de 0 a 10, com no máximo uma casa decimal.');return;}setBusy(true);setMessage('');try{
    const {error}=await requireSupabase().from('ratings').upsert({user_id:userId,media_item_id:id,score:parsed,review:review.trim(),visibility},{onConflict:'user_id,media_item_id'});if(error)throw error;await invalidate();setMessage('Sua avaliação foi salva.');
  }catch{setMessage('Não foi possível salvar a avaliação. Tente novamente.');}finally{setBusy(false);}}
  return <Screen><Link href="/(tabs)/discover" style={styles.link}>← Descobrir</Link>
    {!supabase?<Text style={styles.body}>O catálogo ainda não foi conectado.</Text>:media.isPending?<Text style={styles.body}>Carregando obra…</Text>:media.isError?<><Text style={styles.error}>Não foi possível abrir esta obra.</Text><Button label="Tentar novamente" onPress={()=>{void media.refetch();}}/></>:!media.data?<Text style={styles.body}>Esta obra não foi encontrada.</Text>:<>
      <Text style={styles.eyebrow}>{categories.find(c=>c.id===media.data?.category)?.label || 'OUTROS'}</Text><Text style={styles.title}>{media.data.title}</Text>
      {media.data.cover_url&&<Image source={{uri:media.data.cover_url}} accessibilityLabel={`Capa de ${media.data.title}`} style={{width:'100%',height:320,borderRadius:18}} resizeMode="contain"/>}
      <Text style={styles.body}>{media.data.description || 'Esta obra ainda não tem uma descrição.'}</Text>
      {!session?<Link href="/auth" style={styles.link}>Entre para salvar e avaliar →</Link>:state.isPending?<Text style={styles.body}>Carregando sua avaliação…</Text>:state.isError?<><Text style={styles.error}>Não foi possível carregar sua biblioteca.</Text><Button label="Tentar novamente" onPress={()=>{void state.refetch();}}/></>:<>
        <Button label={state.data?.saved?'Remover dos salvos':'Salvar na biblioteca'} disabled={busy} onPress={()=>{void toggleSave();}}/>
        <View style={styles.card}><Text style={[styles.title,{fontSize:25,lineHeight:30}]}>Sua experiência</Text><Text style={styles.body}>Nota de 0 a 10</Text><TextInput style={styles.input} accessibilityLabel="Nota de 0 a 10" keyboardType="decimal-pad" value={score} onChangeText={setScore} maxLength={4} editable={!busy}/><Text style={styles.body}>O que você achou?</Text><TextInput style={[styles.input,{minHeight:130,textAlignVertical:'top'}]} accessibilityLabel="Sua opinião" multiline value={review} onChangeText={setReview} maxLength={10000} editable={!busy}/>
        <Text style={styles.body}>Visibilidade: {visibility==='public'?'pública':visibility==='friends'?'amigos':'privada'}</Text>
        {(['public','friends','private'] as const).map(option=><Button key={option} label={`${visibility===option?'✓ ':''}${option==='public'?'Pública':option==='friends'?'Somente amigos':'Privada'}`} disabled={busy} onPress={()=>setVisibility(option)}/>)}
        <Button label={busy?'Salvando…':'Salvar avaliação'} disabled={busy} onPress={()=>{void saveRating();}}/></View>
      </>}
    </>}{!!message&&<Text accessibilityRole="alert" style={styles.body}>{message}</Text>}
  </Screen>;
}
